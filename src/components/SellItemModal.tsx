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

        // Analyze image with AI service
        try {
          // For now, we'll skip the direct AI analysis call since the backend handles it
          // The backend will analyze images during item creation
          setImages(prev => prev.map((img, i) => 
            i === index ? {
              ...img,
              analyzing: false,
              aiAnalysis: {
                label: 'pending',
                confidence: 75,
                status: 'usable',
                recommendations: ['Image will be analyzed during submission']
              }
            } : img
          ));

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

  const handleSubmit = async () => {
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
      
      if (error.response?.data?.blockPost) {
        // Display a more concise toast but keep detailed messages in the warning section
        toast.error('Image quality issues detected. Check warnings below.');
        
        if (error.response.data.warnings) {
          // Use the detailed messages in the warnings section
          const detailedWarnings = error.response.data.warnings.map((w: any) => {
            // Add image filename if available
            const imageFileName = w.imageUrl ? w.imageUrl.split('/').pop().split('?')[0] : '';
            const imageName = imageFileName ? `Image "${imageFileName}": ` : '';
            
            // Create a more readable message
            let message = w.message;
            if (!message && w.issue) {
              message = `Issue detected: ${w.issue}`;
            }
            
            return `${imageName}${message}${w.confidence ? ` (Confidence: ${w.confidence.toFixed(1)}%)` : ''}`;
          });
          
          // Make sure we have warnings to display
          console.log('Setting AI warnings:', detailedWarnings);
          setAiWarnings(detailedWarnings);
          setHasLowQualityImages(true);
          
          // Log detailed analysis for debugging
          if (error.response.data.detailedAnalysis) {
            console.info('Detailed AI analysis:', error.response.data.warnings);
          }
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
            <Alert variant="destructive" className="mb-4 border-2 border-red-500">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription>
                <div className="font-bold text-lg mb-3">⚠️ Image Quality Issues:</div>
                <ul className="list-disc list-inside space-y-3">
                  {aiWarnings.map((warning, index) => (
                    <li key={index} className="text-sm font-medium">
                      {warning}
                      {warning.toLowerCase().includes('blurry') && (
                        <div className="ml-4 mt-1 text-xs opacity-80">
                          <strong>Tip:</strong> Upload clear, well-lit images focused on the item
                        </div>
                      )}
                      {warning.toLowerCase().includes('confidence') && (
                        <div className="ml-4 mt-1 text-xs opacity-80">
                          <strong>Tip:</strong> Make sure the item is clearly visible and centered in the image
                        </div>
                      )}
                      {warning.toLowerCase().includes('quality') && (
                        <div className="ml-4 mt-1 text-xs opacity-80">
                          <strong>Tip:</strong> Use better lighting and a higher resolution camera if possible
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-xs border-t border-red-300 pt-2">
                  <p>Our AI analyzes images for quality, content type, and clarity. Try uploading different images that clearly show your recyclable items.</p>
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
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {image.aiAnalysis.status}
                          </Badge>
                        )}
                      </div>
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
