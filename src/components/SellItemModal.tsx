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
    recommendations: string[];
  };
  uploading?: boolean;
  analyzing?: boolean;
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
            
            // Check for potential document images (non-recyclable materials)
            const rawLabel = aiResult.raw_label ? aiResult.raw_label.toLowerCase() : '';
            const isLikelyDocument = 
              rawLabel.includes('document') || 
              rawLabel.includes('text') || 
              rawLabel.includes('paper') ||
              rawLabel.includes('book') || 
              rawLabel.includes('sheet') ||
              rawLabel.includes('certificate') ||
              rawLabel.includes('card');
              
            // Additional check for documents using confidence patterns
            let documentDetected = false;
            if (isLikelyDocument && aiResult.all_predictions) {
              const documentKeywords = ['document', 'text', 'paper', 'book', 'sheet', 'certificate', 'card', 'letter'];
              const hasMultipleDocumentMatches = aiResult.all_predictions.filter((p: any) => 
                documentKeywords.some(keyword => p.label.toLowerCase().includes(keyword))
              ).length >= 2;
              
              if (hasMultipleDocumentMatches) {
                documentDetected = true;
                // Override the status for documents
                aiResult.status = 'inappropriate_content';
              }
            }
            
            // Update image with AI analysis results
            setImages(prev => prev.map((img, i) => 
              i === index ? {
                ...img,
                analyzing: false,
                aiAnalysis: {
                  label: aiResult.label || 'unknown',
                  confidence: aiResult.confidence || 50,
                  status: documentDetected ? 'inappropriate_content' : (aiResult.status || 'usable'),
                  recommendations: aiResult.recommendations || []
                }
              } : img
            ));
            
            // If there's an issue, show a warning about this specific image
            if (aiResult.status && aiResult.status !== 'usable') {
              const fileName = uploadedImage.url.split('/').pop().split('?')[0];
              let warningMessage = '';
              
              if (documentDetected || aiResult.status === 'inappropriate_content') {
                warningMessage = `Image "${fileName}" appears to be a document or non-recyclable item. Please upload photos of recyclable materials only.`;
              } else if (aiResult.status === 'blurry') {
                warningMessage = `Image "${fileName}" appears blurry. Try holding your camera steady.`;
              } else if (aiResult.status === 'low_quality') {
                let specificIssue = '';
                if (aiResult.quality_analysis && aiResult.quality_analysis.issues) {
                  if (aiResult.quality_analysis.issues.includes('Image too dark')) {
                    specificIssue = ' (too dark)';
                  } else if (aiResult.quality_analysis.issues.includes('Image too bright')) {
                    specificIssue = ' (too bright/washed out)';
                  }
                }
                warningMessage = `Image "${fileName}" has low quality${specificIssue}. Try better lighting conditions.`;
              } else if (aiResult.status === 'suspicious') {
                warningMessage = `Image "${fileName}" contains content that doesn't appear to be recyclable material.`;
              } else if (aiResult.status === 'low_confidence') {
                warningMessage = `Image "${fileName}" couldn't be clearly identified (${aiResult.confidence?.toFixed(1)}% confidence).`;
              }
              
              if (warningMessage) {
                toast.warning(warningMessage, { duration: 5000 });
              }
            }
          } else {
            // Fallback if analysis fails
            setImages(prev => prev.map((img, i) => 
              i === index ? {
                ...img,
                analyzing: false,
                aiAnalysis: {
                  label: 'pending',
                  confidence: 75,
                  status: 'usable',
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

    if (!isFormValid()) {
      toast.error('Please fill all required fields and fix image issues');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        images: images.map(img => ({
          url: img.uploaded!.url,
          public_id: img.uploaded!.public_id,
          aiAnalysis: img.aiAnalysis
        }))
      };

      const response = await api.post('/marketplace', submitData);

      if (response.data.success) {
        if (response.data.needsReview) {
          toast.success('Item submitted for review due to AI analysis results');
        } else {
          toast.success('Item listed successfully!');
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
                placeholder="Enter price"
                min="0"
              />
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
                  <div className="font-bold text-lg mb-3 text-red-600">⚠️ Image Quality Issues Detected</div>
                  <p className="text-sm mb-2 text-gray-700">Click on each warning below to see how to fix the issue:</p>
                  <div className="bg-red-50 p-3 rounded-md">
                    <ul className="list-disc list-inside space-y-3">
                      {aiWarnings.map((warning, index) => {
                        // Get warning details from window.lastWarningDetails if available
                        const warningDetails = window.lastWarningDetails && window.lastWarningDetails[index];
                        const warningType = warningDetails?.warningType || '';
                        
                        return (
                          <li key={index} className="text-sm font-medium">
                            <div className="font-semibold">{warning}</div>
                            
                            {/* Show specific tips based on the issue type */}
                            <div className="ml-4 mt-1 p-2 bg-white rounded border border-red-200 text-sm">
                              <strong className="text-red-600">How to fix:</strong>
                              
                              {warningType.includes('blurry') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Hold your camera still - use both hands or rest against a surface</li>
                                  <li>Use better lighting to help your camera focus</li>
                                  <li>Tap on the item on your screen to focus before taking the photo</li>
                                </ul>
                              )}
                              
                              {warningType.includes('confidence') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Make sure your item fills at least 70% of the frame</li>
                                  <li>Remove any distracting items from the background</li>
                                  <li>Use a plain background if possible (white/neutral color)</li>
                                  <li>Take the photo directly facing the item</li>
                                </ul>
                              )}
                              
                              {warningType.includes('quality') && !warningType.includes('dark') && !warningType.includes('bright') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Use the main camera instead of the front camera if possible</li>
                                  <li>Clean your camera lens before taking photos</li>
                                  <li>Make sure the camera resolution is set to high quality</li>
                                </ul>
                              )}
                              
                              {warningType.includes('dark') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Move to a well-lit area or turn on more lights</li>
                                  <li>Position yourself so light falls on the item, not behind it</li>
                                  <li>Try taking the photo during daylight hours near a window</li>
                                </ul>
                              )}
                              
                              {warningType.includes('bright') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Avoid direct sunlight on the item</li>
                                  <li>Turn off flash or move further away from the item</li>
                                  <li>Try taking the photo in more diffused lighting</li>
                                </ul>
                              )}
                              
                              {warningType.includes('suspicious') && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Make sure your photo shows only recyclable materials</li>
                                  <li>Remove any unrelated objects from the frame</li>
                                  <li>Take a close-up of just the item you're listing</li>
                                </ul>
                              )}
                              
                              {/* If we don't have specific warning types or as a fallback */}
                              {(!warningType || (!warningType.includes('blurry') && 
                               !warningType.includes('confidence') && 
                               !warningType.includes('quality') &&
                               !warningType.includes('dark') &&
                               !warningType.includes('bright') &&
                               !warningType.includes('suspicious'))) && (
                                <ul className="list-disc list-inside ml-2 mt-1 text-sm">
                                  <li>Take your photo in good lighting conditions</li>
                                  <li>Make sure the item is clearly visible and fills most of the frame</li>
                                  <li>Use a high-quality camera and hold it steady</li>
                                  <li>Make sure you're photographing only recyclable materials</li>
                                </ul>
                              )}
                              
                              {/* Add specific tips if available */}
                              {warningDetails?.specificTips && warningDetails.specificTips.length > 0 && (
                                <div className="mt-2 text-xs border-t border-red-100 pt-1">
                                  <strong>AI detected:</strong>
                                  <ul className="list-disc list-inside ml-2">
                                    {warningDetails.specificTips.map((tip, i) => (
                                      <li key={i}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  
                  <div className="mt-3 text-sm border-t border-red-300 pt-2 flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-red-600" />
                    <p>Our AI analyzes images for quality, content type, and clarity. Please upload images that clearly show your recyclable items.</p>
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
                        {image.aiAnalysis.status === 'usable' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            AI: {Math.round(image.aiAnalysis.confidence)}%
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge 
                              className="bg-red-100 text-red-800 text-xs cursor-pointer hover:bg-red-200"
                              onClick={() => scrollToWarnings()}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {image.aiAnalysis.status === 'blurry' ? 'Blurry' : 
                               image.aiAnalysis.status === 'low_quality' ? 'Low Quality' : 
                               image.aiAnalysis.status === 'suspicious' ? 'Review Needed' : 
                               image.aiAnalysis.status === 'low_confidence' ? 'Unclear Image' : 
                               image.aiAnalysis.status}
                              <span className="ml-1 text-xs">(Fix)</span>
                            </Badge>
                            
                            {/* Show confidence separately if it's low */}
                            {image.aiAnalysis.confidence < 50 && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                {Math.round(image.aiAnalysis.confidence)}% Confidence
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add a warning border around problematic images */}
                    {image.aiAnalysis && image.aiAnalysis.status !== 'usable' && (
                      <div className="absolute inset-0 border-2 border-red-500 rounded-lg animate-pulse"></div>
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
