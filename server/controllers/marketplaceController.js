import MarketplaceItem from '../models/MarketplaceItem.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadMultipleImages, deleteMultipleImages } from '../utils/cloudinary.js';
import axios from 'axios';

// Configuration for AI image analysis service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// @desc    Analyze image using AI microservice
// @route   Helper function
// @access  Private
const analyzeImageWithAI = async (imageUrl) => {
  try {
    console.log(`Sending image to AI service: ${imageUrl}`);
    
    const response = await axios.post(`${AI_SERVICE_URL}/analyze-marketplace`, {
      image_url: imageUrl
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('AI Analysis Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    
    // If AI service is unavailable, return a default "safe" response
    return {
      label: 'unknown',
      confidence: 50,
      status: 'usable',
      qualityScore: 75,
      recommendations: ['AI service unavailable, but the image has been accepted.'],
      error: 'AI service unavailable'
    };
  }
};

// @desc    Create new marketplace item
// @route   POST /api/marketplace
// @access  Private
export const createMarketplaceItem = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    quantity,
    materialType,
    pinCode,
    price,
    condition,
    images,
    tags,
    category,
    dimensions,
    availableUntil
  } = req.body;

  // Validate required fields
  if (!title || !description || !quantity || !materialType || !pinCode || !price || !condition) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be provided'
    });
  }

  // Validate images
  if (!images || images.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one image is required'
    });
  }

  // Analyze each image with AI
  const analyzedImages = [];
  let hasLowQualityImage = false;
  let aiWarnings = [];

  for (const image of images) {
    const aiAnalysis = await analyzeImageWithAI(image.url);
    console.log('AI Analysis for image:', image.url, aiAnalysis);      // Check if image needs to be rejected or flagged
    if (aiAnalysis.status !== 'approved') {
      // For rejected images (status is 'rejected'), block the post immediately
      if (aiAnalysis.status === 'rejected') {
        hasLowQualityImage = true;
      }
      // For review images, we'll flag them but allow submission
      else if (aiAnalysis.status === 'review') {
        // Will be handled later in the code as suspicious images
      }
      
      // Extract the file name from the URL to make feedback more specific
      const fileName = image.url.split('/').pop().split('?')[0] || "Image";
      
      // Use the AI service's specific recommendations directly rather than hardcoded tips
      let detailedMessage = '';
      let actionableTips = [];
      
      // Use recommendations directly from the AI service if available
      if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
        detailedMessage = aiAnalysis.recommendations[0]; // Primary recommendation as the main message
        actionableTips = aiAnalysis.recommendations; // All recommendations as actionable tips
      } else {
        // Fallback to older format for compatibility - use specific_issue if available
        let specificIssue = aiAnalysis.specific_issue || '';
        
        // Provide detailed feedback based on the specific issue
        if (aiAnalysis.status === 'blurry' || specificIssue === 'blurry') {
          detailedMessage = `Your image "${fileName}" appears to be blurry. We need a clearer picture.`;
          actionableTips = [
            'Hold your camera steady or use a surface for support',
            'Make sure your camera lens is clean and free from smudges',
            'Ensure good lighting to allow the camera to focus properly'
          ];
        } else if (aiAnalysis.status === 'low_quality' || specificIssue.includes('quality')) {
          // Get specific quality issues if available
          if (aiAnalysis.quality_analysis && aiAnalysis.quality_analysis.issues) {
            const issues = aiAnalysis.quality_analysis.issues;
            const qualityScore = aiAnalysis.quality_analysis.quality_score || 0;
            
            if (specificIssue === 'too_dark' || issues.includes('Image too dark')) {
              detailedMessage = `Your image "${fileName}" is too dark (quality score: ${qualityScore.toFixed(0)}/100).`;
              actionableTips = [
                'Take photos in a well-lit area with natural light if possible',
                'Turn on additional lights if indoors',
                'Avoid backlighting that causes shadows on your item'
              ];
            } else if (specificIssue === 'too_bright' || issues.includes('Image too bright')) {
              detailedMessage = `Your image "${fileName}" is too bright or washed out (quality score: ${qualityScore.toFixed(0)}/100).`;
              actionableTips = [
                'Avoid direct sunlight or harsh lighting',
                'Don\'t use flash too close to the item',
                'Find more balanced, diffused lighting conditions'
              ];
            } else if (specificIssue === 'too_small' || issues.includes('Image too small')) {
              detailedMessage = `Your image "${fileName}" has low resolution (quality score: ${qualityScore.toFixed(0)}/100).`;
              actionableTips = [
                'Use a higher resolution camera or phone',
                'Avoid cropping images to very small sizes',
                'Check your camera settings for higher quality options'
              ];
            } else {
              const issuesList = issues.join(', ');
              detailedMessage = `Your image "${fileName}" has quality issues: ${issuesList} (quality score: ${qualityScore.toFixed(0)}/100).`;
              actionableTips = [
                'Use better lighting for your photos',
                'Hold your camera steady to avoid blur',
                'Make sure the item is clearly visible and fills most of the frame'
              ];
            }
          } else {
            detailedMessage = `Your image "${fileName}" quality is too low (below our minimum standards).`;
            actionableTips = [
              'Use a better camera if available',
              'Ensure good lighting conditions',
              'Make sure your lens is clean and focused on the item'
            ];
          }
        } else if (aiAnalysis.status === 'suspicious' || specificIssue === 'suspicious') {
          detailedMessage = `Your image "${fileName}" was flagged for review (confidence: ${aiAnalysis.confidence.toFixed(0)}%).`;
          actionableTips = [
            'Ensure your image contains only recyclable materials',
            'Avoid images with unrelated objects, text, or people',
            'Take a photo that clearly shows just the item you\'re listing'
          ];
        } else if (aiAnalysis.status === 'inappropriate_content') {
          if (specificIssue === 'document') {
            detailedMessage = `Your image "${fileName}" appears to be a document or ID. Documents are not allowed.`;
            actionableTips = [
              'Upload images of the actual recyclable material instead',
              'Do not upload any personal documents, IDs, or certificates',
              'Make sure your photos show only the item you want to sell'
            ];
          } else {
            detailedMessage = `Your image "${fileName}" contains inappropriate content that isn't allowed.`;
            actionableTips = [
              'Upload only images of recyclable materials',
              'Ensure the content follows our community guidelines',
              'Remove any sensitive or inappropriate content from the image'
            ];
          }
        } else if (aiAnalysis.status === 'low_confidence' || aiAnalysis.confidence < 30) {
          detailedMessage = `We couldn't identify what's in your image "${fileName}" (${aiAnalysis.confidence.toFixed(0)}% confidence).`;
          if (aiAnalysis.label) {
            detailedMessage += ` Our system detected "${aiAnalysis.label}" but with very low confidence.`;
          }
          actionableTips = [
            'Center the item in the frame and ensure it\'s clearly visible',
            'Remove distracting backgrounds or other objects',
            'Take the photo from a better angle that shows the item clearly',
            'Make sure you\'re photographing recyclable materials related to your listing'
          ];
        }
      }
      
      // Create warning object with all relevant data
      aiWarnings.push({
        imageUrl: image.url,
        issue: aiAnalysis.specific_issue || aiAnalysis.status,
        confidence: aiAnalysis.confidence,
        message: detailedMessage || `Image quality issue detected with "${fileName}" (${aiAnalysis.status})`,
        tips: actionableTips,
        recommendations: aiAnalysis.recommendations || [],
        rawAnalysis: {
          label: aiAnalysis.label,
          rawLabel: aiAnalysis.raw_label,
          status: aiAnalysis.status,
          qualityScore: aiAnalysis.quality_analysis ? aiAnalysis.quality_analysis.quality_score : 0,
          specific_issue: aiAnalysis.specific_issue
        }
      });
    }

    // Store all relevant AI analysis information with new response format
    analyzedImages.push({
      ...image,
      aiAnalysis: {
        label: aiAnalysis.detected_item || aiAnalysis.label || 'unknown',
        confidence: aiAnalysis.confidence || 0,
        status: aiAnalysis.status || 'unknown',
        category: aiAnalysis.category || 'unknown',
        qualityScore: aiAnalysis.confidence || 75, // Use confidence as quality score
        specific_issue: aiAnalysis.reason || aiAnalysis.review_reason || '',
        recommendations: aiAnalysis.message ? [aiAnalysis.message] : [],
        review_reason: aiAnalysis.review_reason || '',
        rejection_category: aiAnalysis.rejection_category || '',
        detailed_reason: aiAnalysis.detailed_reason || ''
      }
    });
  }

  // If there are rejected (low quality) images, return warning and block post
  if (hasLowQualityImage) {
    // Create a more user-friendly message with details from all warnings
    const mainMessages = aiWarnings.map(warning => warning.message);
    const detailedMessage = mainMessages.join('\n\n');
    
    console.log('Blocking post due to image quality issues:', aiWarnings);
    
    return res.status(400).json({
      success: false,
      message: `Image quality issues detected. Please address the following:\n${detailedMessage}`,
      warnings: aiWarnings.map(warning => ({
        ...warning,
        // Include the AI recommendations directly if available
        tips: warning.recommendations && warning.recommendations.length > 0 
          ? warning.recommendations 
          : warning.tips || [
              'Take a clear, well-lit photo',
              'Ensure your item is the main focus of the image',
              'Hold your camera steady to avoid blur'
            ]
      })),
      blockPost: true,
      detailedAnalysis: true,
      aiDetails: true
    });
  }

  // Check if any image needs review
  const suspiciousImages = analyzedImages.filter(img => 
    img.aiAnalysis.status === 'review' || 
    img.aiAnalysis.status === 'suspicious' || 
    img.aiAnalysis.confidence < 30
  );
  
  const hasSuspiciousImage = suspiciousImages.length > 0;
  
  // Debug logging
  console.log('=== AI Analysis Debug ===');
  console.log('Total images analyzed:', analyzedImages.length);
  console.log('Suspicious images found:', suspiciousImages.length);
  console.log('Has suspicious image:', hasSuspiciousImage);
  
  analyzedImages.forEach((img, index) => {
    console.log(`Image ${index + 1}:`, {
      status: img.aiAnalysis.status,
      confidence: img.aiAnalysis.confidence,
      label: img.aiAnalysis.label,
      category: img.aiAnalysis.category
    });
  });
  
  if (hasSuspiciousImage) {
    console.log('Suspicious images details:', suspiciousImages.map(img => ({
      status: img.aiAnalysis.status,
      reason: img.aiAnalysis.review_reason
    })));
  }
  console.log('========================');
  
  // Add detailed warnings for suspicious images
  if (hasSuspiciousImage) {
    for (const img of suspiciousImages) {
      let suspiciousReason = '';
      
      // Use any recommendations from AI service if available
      if (img.aiAnalysis.recommendations && img.aiAnalysis.recommendations.length > 0) {
        suspiciousReason = img.aiAnalysis.recommendations[0];
      } else {
        if (img.aiAnalysis.status === 'pending_review' || img.aiAnalysis.status === 'suspicious') {
          suspiciousReason = 'Image content flagged for review';
          
          // Use specific_issue if available
          if (img.aiAnalysis.specific_issue) {
            suspiciousReason += `: ${img.aiAnalysis.specific_issue}`;
          }
          // Fall back to suspicious indicators if available
          else if (img.aiAnalysis.suspicious_analysis && img.aiAnalysis.suspicious_analysis.indicators) {
            suspiciousReason += `: ${img.aiAnalysis.suspicious_analysis.indicators.join(', ')}`;
          }
        } else if (img.aiAnalysis.confidence < 30) {
          suspiciousReason = `Low confidence in image classification (${img.aiAnalysis.confidence.toFixed(2)}%)`;
        }
      }
      
      // Only push to aiWarnings if not already there
      const imageUrlExists = aiWarnings.some(warning => warning.imageUrl === img.url);
      if (!imageUrlExists) {
        aiWarnings.push({
          imageUrl: img.url,
          issue: img.aiAnalysis.specific_issue || 'suspicious_or_low_confidence',
          confidence: img.aiAnalysis.confidence,
          message: suspiciousReason,
          recommendations: img.aiAnalysis.recommendations || [],
          needsReview: true
        });
      }
    }
  }

  // Use consistent status naming:
  // - 'pending_review' for items needing review
  // - 'active' for approved items
  const itemStatus = hasSuspiciousImage ? 'pending_review' : 'active';
  const reviewStatus = hasSuspiciousImage ? 'pending' : 'approved';

  // Create marketplace item
  const marketplaceItem = await MarketplaceItem.create({
    seller: req.user._id,
    title,
    description,
    quantity,
    materialType,
    pinCode,
    price,
    condition,
    images: analyzedImages,
    tags: tags || [],
    category,
    dimensions,
    availableUntil,
    status: itemStatus,
    reviewStatus
  });

  // Populate seller info
  await marketplaceItem.populate('seller', 'username firstName lastName avatar userType');

  // If item needs review, notify about pending status
  if (hasSuspiciousImage) {
    // Create more informative message about why items need review
    let reviewReasons = aiWarnings
      .filter(warning => warning.needsReview)
      .map(warning => warning.message);
    
    let reviewMessage = reviewReasons.length > 0 
      ? `Item submitted for review: ${reviewReasons.join('; ')}` 
      : 'Item submitted for review due to image analysis results';
      
    return res.status(201).json({
      success: true,
      message: reviewMessage,
      data: marketplaceItem,
      needsReview: true,
      reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
    });
  }

  res.status(201).json({
    success: true,
    message: 'Marketplace item created successfully',
    data: marketplaceItem
  });
});

// @desc    Get all marketplace items (with pagination and filters)
// @route   GET /api/marketplace
// @access  Private
export const getMarketplaceItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const startIndex = (page - 1) * limit;

  const {
    materialType,
    category,
    condition,
    minPrice,
    maxPrice,
    pinCode,
    search,
    seller,
    tags
  } = req.query;

  // Build filter object
  const filter = { 
    status: 'active',
    reviewStatus: 'approved',
    // Exclude items listed by the current user
    seller: { $ne: req.user._id }
  };

  if (materialType) {
    filter.materialType = materialType;
  }

  if (category) {
    filter.category = category;
  }

  if (condition) {
    filter.condition = condition;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (pinCode) {
    filter.pinCode = pinCode;
  }

  if (seller) {
    filter.seller = seller;
  }

  if (tags) {
    filter.tags = { $in: tags.split(',') };
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const total = await MarketplaceItem.countDocuments(filter);
  const items = await MarketplaceItem.find(filter)
    .populate('seller', 'username firstName lastName avatar userType organization')
    .populate('interestedBuyers.buyer', 'username firstName lastName avatar')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Pagination result
  const pagination = {};
  const endIndex = startIndex + limit;

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.json({
    success: true,
    count: items.length,
    pagination,
    data: items
  });
});

// @desc    Get single marketplace item
// @route   GET /api/marketplace/:id
// @access  Private
export const getMarketplaceItem = asyncHandler(async (req, res) => {
  const item = await MarketplaceItem.findById(req.params.id)
    .populate('seller', 'username firstName lastName avatar userType organization bio location')
    .populate('interestedBuyers.buyer', 'username firstName lastName avatar');

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Marketplace item not found'
    });
  }

  // Increment views (only if not the seller viewing their own item)
  if (item.seller._id.toString() !== req.user._id.toString()) {
    await item.incrementViews();
  }

  res.json({
    success: true,
    data: item
  });
});

// @desc    Update marketplace item
// @route   PUT /api/marketplace/:id
// @access  Private
export const updateMarketplaceItem = asyncHandler(async (req, res) => {
  const item = await MarketplaceItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Marketplace item not found'
    });
  }

  // Check if user owns the item
  if (item.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this item'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['title', 'description', 'quantity', 'price', 'condition', 'tags', 'status', 'availableUntil'];
  const updates = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedItem = await MarketplaceItem.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('seller', 'username firstName lastName avatar userType');

  res.json({
    success: true,
    data: updatedItem
  });
});

// @desc    Delete marketplace item
// @route   DELETE /api/marketplace/:id
// @access  Private
export const deleteMarketplaceItem = asyncHandler(async (req, res) => {
  const item = await MarketplaceItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Marketplace item not found'
    });
  }

  // Check if user owns the item or is admin
  if (item.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this item'
    });
  }

  // Delete images from Cloudinary
  if (item.images && item.images.length > 0) {
    const publicIds = item.images.map(img => img.public_id);
    await deleteMultipleImages(publicIds);
  }

  await MarketplaceItem.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Marketplace item deleted successfully'
  });
});

// @desc    Express interest in buying item
// @route   POST /api/marketplace/:id/interest
// @access  Private
export const expressInterest = asyncHandler(async (req, res) => {
  const { message, contactInfo } = req.body;

  const item = await MarketplaceItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Marketplace item not found'
    });
  }

  // Check if user is not the seller
  if (item.seller.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot express interest in your own item'
    });
  }

  // Check if user already expressed interest
  const existingInterest = item.interestedBuyers.find(
    buyer => buyer.buyer.toString() === req.user._id.toString()
  );

  if (existingInterest) {
    return res.status(400).json({
      success: false,
      message: 'You have already expressed interest in this item'
    });
  }

  // Add interested buyer
  item.interestedBuyers.push({
    buyer: req.user._id,
    message: message || '',
    contactInfo: contactInfo || {}
  });

  await item.save();

  // Populate the new interest entry
  await item.populate('interestedBuyers.buyer', 'username firstName lastName avatar');

  res.json({
    success: true,
    message: 'Interest expressed successfully',
    data: item
  });
});

// @desc    Get user's marketplace items
// @route   GET /api/marketplace/my-items
// @access  Private
export const getMyMarketplaceItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await MarketplaceItem.countDocuments({ seller: req.user._id });
  const items = await MarketplaceItem.find({ seller: req.user._id })
    .populate('interestedBuyers.buyer', 'username firstName lastName avatar')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// @desc    Get items pending review (Admin only)
// @route   GET /api/marketplace/admin/pending-review
// @access  Private/Admin
export const getPendingReviewItems = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  const items = await MarketplaceItem.find({ 
    reviewStatus: 'pending',
    status: 'pending_review'
  })
    .populate('seller', 'username firstName lastName avatar userType')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// @desc    Review marketplace item (Admin only)
// @route   PUT /api/marketplace/admin/:id/review
// @access  Private/Admin
export const reviewMarketplaceItem = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  const { action, moderationNotes } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be either "approve" or "reject"'
    });
  }

  const item = await MarketplaceItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Marketplace item not found'
    });
  }

  // Update item based on admin action
  if (action === 'approve') {
    item.reviewStatus = 'approved';
    item.status = 'active';
    item.moderationNotes = moderationNotes || 'Approved by admin after review';
  } else {
    item.reviewStatus = 'rejected';
    item.status = 'rejected';
    item.rejectionReason = moderationNotes || 'Rejected by admin';
    item.moderationNotes = moderationNotes;
  }

  await item.save();

  res.json({
    success: true,
    message: `Item ${action}d successfully`,
    data: item
  });
});
