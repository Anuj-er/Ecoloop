import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, AlertTriangle, CheckCircle, Camera, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import { toast } from "sonner";
import { getMinimumAmount, isAmountAboveMinimum } from "@/utils/paymentUtils";

// Define interface for warning details
interface WarningDetail {
  message: string;
  warningType: string;
  specificTips: string[];
  fileName: string;
  rawWarning: any;
}

// Add to Window interface to enable typesafe global variable
declare global {
  interface Window {
    lastWarningDetails?: WarningDetail[];
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImageUpload {
  file: File;
  preview: string;
  uploaded?: {
    url: string;
    public_id: string;
  };
  aiAnalysis?: {
    label: string;
    confidence: number;
    status: string;
    originalStatus?: string;
    category?: string;
    recommendations: string[];
    specific_issue?: string;
    document_detection_method?: string;
    document_confidence?: number;
    quality_analysis?: {
      quality_score: number;
      issues: string[];
    };
  };
  uploading?: boolean;
  analyzing?: boolean;
  allRecommendations?: string[];
}

export const SellItemModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: 1,
    materialType: '',
    pinCode: '',
    price: 0,
    condition: '',
    category: '',
    tags: [] as string[],
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0
    }
  });

  const [images, setImages] = useState<ImageUpload[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [hasLowQualityImages, setHasLowQualityImages] = useState(false);

  const materialTypes = [
    'cloth', 'wood', 'metal', 'plastic', 'glass', 'paper', 
    'electronics', 'fabric', 'leather', 'other'
  ];

  const categories = [
    'raw-materials', 'finished-goods', 'tools', 'equipment', 
    'craft-supplies', 'textiles', 'furniture', 'electronics'
  ];

  const conditions = ['new', 'like-new', 'good', 'fair', 'poor'];

  const availableTags = [
    'recycled', 'upcycled', 'sustainable', 'eco-friendly', 
    'handmade', 'vintage', 'organic', 'biodegradable'
  ];

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('dimensions.')) {
      const dimField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimField]: parseFloat(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const newImages: ImageUpload[] = [];
    
    for (let i = 0; i < files.length && images.length + newImages.length < 5; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select only image files');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        continue;
      }

      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
        uploading: true
      });
    }

    setImages(prev => [...prev, ...newImages]);

    // Upload each image
    for (let i = 0; i < newImages.length; i++) {
      const imageIndex = images.length + i;
      await uploadSingleImage(newImages[i], imageIndex);
    }
  };

  const uploadSingleImage = async (imageUpload: ImageUpload, index: number) => {
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('image', imageUpload.file);

      const uploadResponse = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.data.success) {
        const uploadedImage = uploadResponse.data.data;

        // Update image with upload data
        setImages(prev => prev.map((img, i) => 
          i === index ? {
            ...img,
            uploaded: uploadedImage,
            uploading: false,
            analyzing: true
          } : img
        ));

        // Real-time image analysis
        try {
          // Call the AI analysis endpoint directly
          const aiResponse = await api.post('/upload/analyze/image', {
            image_url: uploadedImage.url
          });
          
          if (aiResponse.data) {
            const aiResult = aiResponse.data;
            console.log('Real-time AI analysis:', aiResult);
            
            // Handle the enhanced response format from our AI service
            const status = aiResult.status; // 'approved', 'review', 'rejected', 'error'
            const message = aiResult.message || 'Analysis complete';
            const confidence = aiResult.confidence || 0;
            const category = aiResult.category || 'unknown';
            const detectedItem = aiResult.detected_item || 'unknown';
            const reviewReason = aiResult.review_reason || '';
            const matchedKeyword = aiResult.matched_keyword || '';
            const rejectionCategory = aiResult.rejection_category || '';
            const detailedReason = aiResult.detailed_reason || '';
            
            // Determine display status based on AI analysis
            let displayStatus, displayMessage, toastMessage;
            
            if (status === 'approved') {
              displayStatus = 'approved';
              displayMessage = message;
              toastMessage = message;
            } else if (status === 'rejected') {
              displayStatus = 'rejected';
              // Enhanced rejection messages with category info
              if (rejectionCategory) {
                displayMessage = `REJECTED: ${detailedReason}`;
                toastMessage = `${message} (${rejectionCategory.replace('_', ' ')})`;
              } else {
                displayMessage = message;
                toastMessage = message;
              }
            } else if (status === 'review') {
              displayStatus = 'warning';
              displayMessage = `Admin Review Required: ${reviewReason || 'Material needs verification'}`;
              toastMessage = message;
            } else {
              // Error case
              displayStatus = 'warning';
              displayMessage = 'Analysis failed - will be reviewed manually';
              toastMessage = message;
            }
            
            // Update image with AI analysis results
            setImages(prev => prev.map((img, i) => 
              i === index ? {
                ...img,
                analyzing: false,
                aiAnalysis: {
                  label: detectedItem,
                  confidence: confidence,
                  status: displayStatus,
                  originalStatus: status, // Keep original for backend
                  category: category,
                  matchedKeyword: matchedKeyword,
                  rejectionCategory: rejectionCategory,
                  detailedReason: detailedReason,
                  recommendations: [displayMessage],
                  specific_issue: aiResult.reason || reviewReason,
                  quality_analysis: {
                    quality_score: confidence,
                    issues: status === 'rejected' ? [aiResult.reason || detailedReason || 'Content not allowed'] : []
                  }
                }
              } : img
            ));              
            
            // Show user-friendly feedback based on status
            if (displayStatus === 'approved') {
              toast.success(toastMessage, { 
                duration: 4000
              });
            } else if (displayStatus === 'warning') {
              toast.warning(toastMessage, { 
                duration: 6000,
                action: {
                  label: "Got it",
                  onClick: () => console.log('User acknowledged warning')
                }
              });
            } else {
              toast.error(toastMessage, { 
                duration: 10000,  // Longer duration for rejections
                action: {
                  label: "Remove Image",
                  onClick: () => removeImage(index)
                }
              });
            }
            
            // Store detailed information for UI display
            setImages(prev => prev.map((img, i) => 
              i === index ? {
                ...img,
                allRecommendations: [toastMessage, displayMessage].filter(Boolean)
              } : img
            ));
          } else {
            // Fallback if analysis fails
            setImages(prev => prev.map((img, i) => 
              i === index ? {
                ...img,
                analyzing: false,
                aiAnalysis: {
                  label: 'pending',
                  confidence: 75,
                  status: 'review',
                  recommendations: ['Full analysis will happen on submission']
                }
              } : img
            ));
          }
        } catch (aiError) {
          console.warn('AI analysis failed, but proceeding with upload:', aiError);
          setImages(prev => prev.map((img, i) => 
            i === index ? {
              ...img,
              analyzing: false,
              aiAnalysis: {
                label: 'unknown',
                confidence: 50,
                status: 'usable',
                recommendations: ['AI analysis unavailable']
              }
            } : img
          ));
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
      
      // Remove failed upload
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = images[index];
    URL.revokeObjectURL(imageToRemove.preview);
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // Remove related warnings
    setAiWarnings(prev => prev.filter(warning => !warning.includes(`Image ${index + 1}:`)));
    
    // Check if we still have low quality images
    const remainingImages = images.filter((_, i) => i !== index);
    const stillHasLowQuality = remainingImages.some(img => 
      img.aiAnalysis?.status === 'blurry' || img.aiAnalysis?.status === 'low_quality'
    );
    setHasLowQualityImages(stillHasLowQuality);
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddCustomTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      addTag(tagInput.trim());
      setTagInput('');
    }
  };

  const isFormValid = () => {
    // Block submission only if there are truly rejected images
    const hasRejectedImages = images.some(img => img.aiAnalysis?.status === 'rejected');
    
    if (hasRejectedImages) {
      return false; // Cannot submit with rejected images
    }
    
    return (
      formData.title &&
      formData.description &&
      formData.materialType &&
      formData.pinCode &&
      formData.price > 0 &&
      formData.condition &&
      images.length > 0 &&
      images.every(img => img.uploaded && !img.uploading && !img.analyzing)
    );
  };

  // Function to scroll to warnings
  const scrollToWarnings = () => {
    const warningElement = document.getElementById('image-upload-warnings');
    if (warningElement) {
      warningElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for rejected images first
    const rejectedImages = images.filter(img => img.aiAnalysis?.status === 'rejected');
    
    if (rejectedImages.length > 0) {
      toast.error('Cannot submit with rejected images. Please remove them and upload appropriate recyclable material images.');
      return;
    }

    if (!isFormValid()) {
      toast.error('Please fill all required fields');
      return;
    }

    // Check for warning images and show confirmation popup
    const warningImages = images.filter(img => img.aiAnalysis?.status === 'warning');
    
    if (warningImages.length > 0) {
      const confirmed = window.confirm(
        `⚠️ ADMIN REVIEW REQUIRED\n\n` +
        `${warningImages.length} image(s) detected potential issues and will need admin approval before your item goes live.\n\n` +
        `Your item will be submitted but won't appear in the marketplace until an admin reviews and approves it.\n\n` +
        `Do you want to continue?`
      );
      
      if (!confirmed) {
        return; // User cancelled
      }
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        needsReview: warningImages.length > 0, // Flag for admin review
        images: images.map(img => ({
          url: img.uploaded!.url,
          public_id: img.uploaded!.public_id,
          aiAnalysis: {
            ...img.aiAnalysis,
            status: img.aiAnalysis?.originalStatus || img.aiAnalysis?.status // Use original status for backend
          }
        }))
      };

      const response = await api.post('/marketplace', submitData);

      if (response.data.success) {
        if (warningImages.length > 0) {
          toast.success('Item submitted for admin review. You\'ll be notified once approved!');
        } else {
          toast.success('Item listed successfully and is now live!');
        }
        
        onSuccess();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating marketplace item:', error);
      
      if (error.response?.data?.blockPost) {          // Display a more concise toast but keep detailed messages in the warning section
        toast.error('Image quality issues detected. Please check the warnings below for details.', {
          duration: 5000,
          style: { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171' },
        });
        
        if (error.response.data.warnings) {
          console.log('Raw warnings from backend:', error.response.data.warnings);
          
          // Create a more detailed warning structure
          const warningDetails = error.response.data.warnings.map((w: any) => {
            const imageFileName = w.imageUrl ? w.imageUrl.split('/').pop().split('?')[0] : 'Unknown';
            let warningType = '';
            
            // Determine the specific warning type
            if (w.issue === 'blurry') warningType = 'blurry';
            else if (w.issue === 'low_quality') warningType = 'quality';
            else if (w.issue === 'suspicious') warningType = 'suspicious';
            else if ((w.confidence || 0) < 30) warningType = 'confidence';
            
            // Create specific tips based on quality analysis
            let specificTips = [];
            if (w.rawAnalysis && w.rawAnalysis.quality_analysis && w.rawAnalysis.quality_analysis.issues) {
              if (w.rawAnalysis.quality_analysis.issues.includes('Image too dark')) {
                warningType += ' dark';
                specificTips.push('The image is too dark. Try taking the photo in better lighting.');
              }
              if (w.rawAnalysis.quality_analysis.issues.includes('Image too bright')) {
                warningType += ' bright';
                specificTips.push('The image is too bright. Try avoiding direct light sources.');
              }
            }
            
            // Use the message if available, otherwise create a descriptive one
            let message = w.message || '';
            if (!message) {
              if (w.issue === 'blurry') {
                message = `Image "${imageFileName}" is too blurry. Please retake with better focus.`;
              } else if (w.issue === 'low_quality') {
                message = `Image "${imageFileName}" has poor quality. Try with better lighting and a steady hand.`;
              } else if (w.issue === 'suspicious') {
                message = `Image "${imageFileName}" was flagged for review.`;
              } else if ((w.confidence || 0) < 30) {
                message = `We couldn't clearly identify your item in "${imageFileName}" (${w.confidence?.toFixed(1)}% confidence).`;
              } else {
                message = `Issue with image "${imageFileName}": ${w.issue || 'Unknown issue'}`;
              }
            }
            
            // Include confidence in the message if available
            if (w.confidence !== undefined && !message.includes('confidence') && warningType === 'confidence') {
              message += ` (${w.confidence.toFixed(1)}% confidence)`;
            }
            
            // Return enhanced warning data
            return {
              message,
              warningType,
              specificTips,
              fileName: imageFileName,
              rawWarning: w
            };
          });
          
          // Extract just the messages for the state
          const detailedWarnings = warningDetails.map(w => w.message);
          console.log('Processed warnings:', warningDetails);
          
          // Store the full warning details for debugging
          window.lastWarningDetails = warningDetails;
          
          // Make sure we have warnings to display
          setAiWarnings(detailedWarnings);
          setHasLowQualityImages(true);
          
          // Move to the warnings section - smooth scroll to make it visible
          setTimeout(() => {
            scrollToWarnings();
          }, 100);
        }
      } else {
        toast.error('Failed to create listing. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      quantity: 1,
      materialType: '',
      pinCode: '',
      price: 0,
      condition: '',
      category: '',
      tags: [],
      dimensions: { length: 0, width: 0, height: 0, weight: 0 }
    });
    
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setTagInput('');
    setAiWarnings([]);
    setHasLowQualityImages(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sell Your Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Warnings */}
          {aiWarnings.length > 0 && (
            <Alert variant="destructive" className="mb-4 border-2 border-red-500 shadow-md">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <AlertDescription className="mt-2">
                <div className="font-bold text-lg mb-3 text-red-600">⚠️ Image Quality Issues Detected</div>
                <div className="bg-red-50 p-3 rounded-md">
                  <ul className="list-disc list-inside space-y-3">
                    {aiWarnings.map((warning, index) => (
                      <li key={index} className="text-sm font-medium">
                        <div className="font-semibold">{warning}</div>
                        
                        {/* Show specific tips based on the issue type */}
                        <div className="ml-4 mt-1 p-2 bg-white rounded border border-red-200 text-sm">
                          <strong className="text-red-600">How to fix:</strong>
                          {warning.toLowerCase().includes('blurry') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Use a steady hand or tripod when taking photos</li>
                              <li>Ensure good lighting to allow faster shutter speed</li>
                              <li>Focus directly on the item before taking the photo</li>
                            </ul>
                          )}
                          {warning.toLowerCase().includes('confidence') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Center the item in the frame</li>
                              <li>Remove clutter/distracting objects from the background</li>
                              <li>Capture the item from multiple angles</li>
                            </ul>
                          )}
                          {warning.toLowerCase().includes('quality') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Use better lighting (natural light works best)</li>
                              <li>Use a higher resolution camera if available</li>
                              <li>Clean your camera lens before taking the photo</li>
                            </ul>
                          )}
                          {warning.toLowerCase().includes('dark') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Take photos in a well-lit area</li>
                              <li>Turn on additional lights if indoors</li>
                              <li>Avoid backlighting that darkens the item</li>
                            </ul>
                          )}
                          {warning.toLowerCase().includes('bright') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Avoid direct sunlight on the item</li>
                              <li>Don't use flash too close to the item</li>
                              <li>Find more balanced lighting conditions</li>
                            </ul>
                          )}
                          {warning.toLowerCase().includes('suspicious') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Ensure your image contains only recyclable materials</li>
                              <li>Avoid images with unrelated objects or people</li>
                              <li>Take a photo of just the item you're listing</li>
                            </ul>
                          )}
                          {!warning.toLowerCase().includes('blurry') && 
                           !warning.toLowerCase().includes('confidence') && 
                           !warning.toLowerCase().includes('quality') &&
                           !warning.toLowerCase().includes('dark') &&
                           !warning.toLowerCase().includes('bright') &&
                           !warning.toLowerCase().includes('suspicious') && (
                            <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                              <li>Take a clear, well-lit photo of your item</li>
                              <li>Make sure the item fills most of the frame</li>
                              <li>Avoid blurry or dark images</li>
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-3 text-sm border-t border-red-300 pt-2 flex items-center">
                  <Camera className="h-4 w-4 mr-2 text-red-600" />
                  <p>Our AI analyzes images for quality, content type, and clarity. Please upload images that clearly show your recyclable items.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter item title"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder={`Enter price (minimum ${getMinimumAmount('INR').symbol}${getMinimumAmount('INR').amount})`}
                min={getMinimumAmount('INR').amount}
                step="0.01"
              />
              {formData.price > 0 && !isAmountAboveMinimum(formData.price, 'INR') && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ Price is below minimum payment amount ({getMinimumAmount('INR').symbol}{getMinimumAmount('INR').amount}). Buyers will not be able to purchase this item online.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your item..."
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Material and Condition */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Material Type *</Label>
              <Select value={formData.materialType} onValueChange={(value) => handleInputChange('materialType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition *</Label>
              <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(condition => (
                    <SelectItem key={condition} value={condition}>
                      {condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                placeholder="Enter quantity"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input
                id="pinCode"
                value={formData.pinCode}
                onChange={(e) => handleInputChange('pinCode', e.target.value)}
                placeholder="Enter 6-digit pin code"
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>
          </div>

          {/* Images Upload */}
          <div className="space-y-4">
            <Label>Images * (Max 5)</Label>
            
            {/* AI Warnings in image section */}
            {aiWarnings.length > 0 && (
              <Alert id="image-upload-warnings" variant="destructive" className="mb-4 border-2 border-red-500 shadow-md">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <AlertDescription className="mt-2">
                  <div className="font-bold text-lg mb-2 text-red-600">⚠️ Image Quality Issues Detected</div>
                  
                  {/* Add summary of issues */}
                  <div className="mb-3 text-sm text-gray-700">
                    <p className="mb-1">Our AI analysis has detected the following issues:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {window.lastWarningDetails && window.lastWarningDetails
                        .filter((detail, i, arr) => 
                          // Unique warning types
                          arr.findIndex(d => d.warningType === detail.warningType) === i
                        )
                        .map((detail, i) => (
                          <Badge key={i} className="bg-red-50 text-red-700 border border-red-200">
                            {detail.warningType.includes('blurry') ? 'Blurry Image' :
                             detail.warningType.includes('document') ? 'Document Detected' :
                             detail.warningType.includes('dark') ? 'Too Dark' :
                             detail.warningType.includes('bright') ? 'Too Bright' :
                             detail.warningType.includes('quality') ? 'Low Quality' :
                             detail.warningType.includes('suspicious') ? 'Suspicious Content' :
                             detail.warningType.includes('confidence') ? 'Low Confidence' :
                             'Quality Issue'}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3 text-gray-700 border-t border-red-200 pt-2">Detailed AI feedback for each image:</p>
                  <div className="bg-red-50 p-3 rounded-md">
                    <ul className="list-disc list-inside space-y-3">
                      {aiWarnings.map((warning, index) => {
                        // Get warning details from window.lastWarningDetails if available
                        const warningDetails = window.lastWarningDetails && window.lastWarningDetails[index];
                        const warningType = warningDetails?.warningType || '';
                        
                        return (
                          <li key={index} className="text-sm font-medium">
                            <div className="font-semibold flex items-center gap-2">
                              <span className="text-red-600">•</span> {warning}
                              
                              {/* Show metrics badge if available */}
                              {warningDetails?.rawWarning?.aiAnalysis?.confidence && (
                                <Badge className={`${
                                  warningDetails.rawWarning.aiAnalysis.confidence < 30 ? 'bg-red-100 text-red-800' : 
                                  warningDetails.rawWarning.aiAnalysis.confidence < 60 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-blue-100 text-blue-800'
                                } text-xs ml-2`}>
                                  {Math.round(warningDetails.rawWarning.aiAnalysis.confidence)}% confidence
                                </Badge>
                              )}
                            </div>
                            
                            {/* Show specific tips based on the issue type */}
                            <div className="ml-4 mt-1 p-3 bg-white rounded border border-red-200 text-sm shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <strong className="text-red-600 flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  How to fix:
                                </strong>
                                
                                {/* Add link to specific recommendations if image has them */}
                                {images.find(img => img.allRecommendations?.length > 0) && (
                                  <span className="text-xs text-blue-600">See all AI recommendations</span>
                                )}
                              </div>
                              
                              {warningType.includes('blurry') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Hold your camera still - use both hands or rest against a surface</li>
                                  <li>Use better lighting to help your camera focus</li>
                                  <li>Tap on the item on your screen to focus before taking the photo</li>
                                  <li className="font-medium text-red-600">For best results: Use a tripod or place your phone on a stable surface</li>
                                </ul>
                              )}
                              
                              {warningType.includes('confidence') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Make sure your item fills at least 70% of the frame</li>
                                  <li>Remove any distracting items from the background</li>
                                  <li>Use a plain background if possible (white/neutral color)</li>
                                  <li>Take the photo directly facing the item</li>
                                  <li className="font-medium text-red-600">For best results: Take multiple photos from different angles</li>
                                </ul>
                              )}
                              
                              {warningType.includes('document') && (
                                <div className="ml-2 mt-1 text-sm bg-red-50 border border-red-200 p-3 rounded-md">
                                  <p className="font-bold text-red-600 mb-2">⚠️ Document Detected - Not Allowed ⚠️</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>This appears to be a document, ID, certificate or paper with text</li>
                                    <li>Documents are strictly prohibited and cannot be uploaded</li>
                                    <li>Our marketplace only accepts photos of actual recyclable materials</li>
                                    <li>You must remove this image to submit your listing</li>
                                    <li className="font-medium text-red-600 mt-2">Take a photo of the actual material you're selling instead</li>
                                  </ul>
                                </div>
                              )}
                              
                              {warningType.includes('quality') && !warningType.includes('dark') && !warningType.includes('bright') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Use the main camera instead of the front camera if possible</li>
                                  <li>Clean your camera lens before taking photos</li>
                                  <li>Make sure the camera resolution is set to high quality</li>
                                  <li className="font-medium text-red-600">For best results: Use a recent smartphone with a good camera</li>
                                </ul>
                              )}
                              
                              {warningType.includes('dark') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Move to a well-lit area or turn on more lights</li>
                                  <li>Position yourself so light falls on the item, not behind it</li>
                                  <li>Try taking the photo during daylight hours near a window</li>
                                  <li className="font-medium text-red-600">For best results: Use natural daylight whenever possible</li>
                                </ul>
                              )}
                              
                              {warningType.includes('bright') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Avoid direct sunlight on the item</li>
                                  <li>Turn off flash or move further away from the item</li>
                                  <li>Try taking the photo in more diffused lighting</li>
                                  <li className="font-medium text-red-600">For best results: Find a shaded area or use curtains to diffuse sunlight</li>
                                </ul>
                              )}
                              
                              {warningType.includes('suspicious') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Make sure your photo shows only recyclable materials</li>
                                  <li>Remove any unrelated objects from the frame</li>
                                  <li>Take a close-up of just the item you're listing</li>
                                  <li className="font-medium text-red-600">For best results: Focus on just the recyclable material</li>
                                </ul>
                              )}
                              
                              {/* If we don't have specific warning types or as a fallback */}
                              {(!warningType || (!warningType.includes('blurry') && 
                               !warningType.includes('confidence') && 
                               !warningType.includes('quality') &&
                               !warningType.includes('dark') &&
                               !warningType.includes('bright') &&
                               !warningType.includes('suspicious') &&
                               !warningType.includes('document'))) && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                  <li>Take your photo in good lighting conditions</li>
                                  <li>Make sure the item is clearly visible and fills most of the frame</li>
                                  <li>Use a high-quality camera and hold it steady</li>
                                  <li>Make sure you're photographing only recyclable materials</li>
                                  <li className="font-medium text-red-600">For best results: Follow all image guidelines for better listings</li>
                                </ul>
                              )}
                              
                              {/* Display AI recommendations from the image if available */}
                              {warningDetails?.fileName && (
                                <div className="mt-3 text-xs border-t border-red-100 pt-2">
                                  <div className="flex items-center">
                                    <strong className="text-red-600 mr-1">AI image analysis:</strong>
                                    <span className="bg-gray-100 px-1 rounded text-xs">{warningDetails.fileName}</span>
                                  </div>
                                  
                                  {/* Show all recommendations for this image */}
                                  {images.find(img => 
                                    img.uploaded?.url.includes(warningDetails.fileName) && 
                                    img.allRecommendations?.length > 0
                                  )?.allRecommendations.map((rec, i) => (
                                    <div key={i} className="mt-1 ml-2 text-gray-700">
                                      {i === 0 ? <strong>• {rec}</strong> : `• ${rec}`}
                                    </div>
                                  ))}
                                  
                                  {/* Add specific tips if available */}
                                  {warningDetails?.specificTips && warningDetails.specificTips.length > 0 && (
                                    <div className="mt-2">
                                      <ul className="list-disc list-inside ml-2">
                                        {warningDetails.specificTips.map((tip, i) => (
                                          <li key={i}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  
                  <div className="mt-4 text-sm border-t border-red-300 pt-3">
                    <div className="flex items-center mb-2">
                      <Camera className="h-4 w-4 mr-2 text-red-600" />
                      <p className="font-medium">EcoLoop AI Image Guidelines</p>
                    </div>
                    
                    <div className="bg-white p-3 rounded-md shadow-sm border border-red-100">
                      <p className="mb-2">For high-quality listings that get approved quickly:</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Use natural, even lighting (avoid harsh shadows)</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Ensure the item fills most of the frame</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Hold your camera steady or use a surface</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Use a plain background when possible</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Show only recyclable materials (no documents)</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Take photos from multiple angles</span>
                        </div>
                      </div>
                      
                      <p className="mt-3 text-xs text-gray-500">Our AI analyzes images for quality, content type, clarity, brightness, and more to ensure high-quality listings.</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {images.length < 5 && (
              <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
                <CardContent className="p-6">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-lg font-medium mb-1">Upload Images</div>
                      <div className="text-sm text-gray-500">
                        Click to select images (Max 5MB each)
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-left">
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Well-lit, clear photos</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Item centered in frame</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Plain background</span>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                          <span>Multiple angles help</span>
                        </div>
                      </div>
                    </div>
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Loading States */}
                    {(image.uploading || image.analyzing) && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          <div className="text-sm">
                            {image.uploading ? 'Uploading...' : 'Analyzing...'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* AI Status */}
                    {image.aiAnalysis && (
                      <div className="absolute top-2 left-2">
                        {image.aiAnalysis.status === 'approved' ? (
                          <Badge 
                            className="bg-green-500 text-white text-sm font-bold border-2 border-green-600 shadow-lg cursor-help"
                            title={`✅ ${image.aiAnalysis.recommendations?.[0] || 'Approved for marketplace'}\n\nDetected: ${image.aiAnalysis.label} (${image.aiAnalysis.confidence?.toFixed(1)}% confidence)\nCategory: ${image.aiAnalysis.category || 'unknown'}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            APPROVED
                          </Badge>
                        ) : image.aiAnalysis.status === 'warning' ? (
                          <Badge 
                            className="bg-yellow-500 text-white text-sm font-bold border-2 border-yellow-600 shadow-lg cursor-help"
                            title={`⚠️ ${image.aiAnalysis.recommendations?.[0] || 'Needs admin review'}\n\nDetected: ${image.aiAnalysis.label} (${image.aiAnalysis.confidence?.toFixed(1)}% confidence)\nCategory: ${image.aiAnalysis.category || 'unknown'}\nReason: ${image.aiAnalysis.specific_issue || 'Manual verification required'}`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Badge>
                        ) : (
                          <Badge 
                            className="bg-red-500 text-white text-sm font-bold border-2 border-red-600 shadow-lg cursor-help"
                            title={`❌ ${image.aiAnalysis.recommendations?.[0] || 'Rejected - not suitable for marketplace'}\n\nDetected: ${image.aiAnalysis.label}\nReason: ${image.aiAnalysis.specific_issue || 'Unsuitable content'}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            REJECTED
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Category and confidence display for approved items */}
                    {image.aiAnalysis && image.aiAnalysis.status === 'approved' && image.aiAnalysis.category && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-blue-500 text-white text-xs">
                          {image.aiAnalysis.category}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Add warning border for problematic images */}
                    {image.aiAnalysis && image.aiAnalysis.status === 'rejected' && (
                      <div className="absolute inset-0 border-3 border-red-500 rounded-lg animate-pulse shadow-lg"></div>
                    )}
                    {image.aiAnalysis && image.aiAnalysis.status === 'warning' && (
                      <div className="absolute inset-0 border-3 border-yellow-500 rounded-lg animate-pulse shadow-lg"></div>
                    )}
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label>Tags</Label>
            
            {/* Predefined Tags */}
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={formData.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => formData.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add custom tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
              />
              <Button type="button" variant="outline" onClick={handleAddCustomTag}>
                Add
              </Button>
            </div>

            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} className="bg-blue-100 text-blue-800">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
            </Button>
            <div className="relative group">            <div className="relative group">
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid() || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Listing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    List Item
                  </>
                )}
              </Button>
              
              {/* Tooltip explaining submission status */}
              {images.some(img => img.aiAnalysis?.status === 'rejected') && (
                <div className="absolute bottom-full mb-2 right-0 w-64 p-2 bg-red-50 border border-red-200 rounded-md shadow-lg text-xs invisible group-hover:visible transition-all z-20">
                  <p className="font-semibold text-red-600">Cannot submit with rejected images</p>
                  <p className="mt-1">Please remove rejected images and upload appropriate recyclable material photos.</p>
                </div>
              )}
              {images.some(img => img.aiAnalysis?.status === 'warning') && !images.some(img => img.aiAnalysis?.status === 'rejected') && (
                <div className="absolute bottom-full mb-2 right-0 w-64 p-2 bg-yellow-50 border border-yellow-200 rounded-md shadow-lg text-xs invisible group-hover:visible transition-all z-20">
                  <p className="font-semibold text-yellow-600">Admin review required</p>
                  <p className="mt-1">Some images need verification. Your item will be reviewed before going live.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
