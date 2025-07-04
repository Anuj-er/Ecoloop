import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { postsAPI, uploadAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Upload, MapPin, TrendingUp } from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

interface CloudinaryMedia {
  url: string;
  public_id: string;
  width: number;
  height: number;
}

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    content: "",
    category: "achievement",
    location: "",
    tags: [] as string[],
    impact: {
      carbonSaved: 0,
      wasteReduced: 0,
      energySaved: 0,
      peopleReached: 0
    }
  });
  
  const [media, setMedia] = useState<CloudinaryMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState("");

  const availableCategories = [
    { value: "achievement", label: "Achievement" },
    { value: "project", label: "Project" },
    { value: "tip", label: "Tip" },
    { value: "question", label: "Question" },
    { value: "event", label: "Event" },
    { value: "news", label: "News" },
    { value: "challenge", label: "Challenge" }
  ];

  const availableTags = [
    'recycling', 'renewable-energy', 'sustainable-fashion', 'zero-waste', 
    'green-tech', 'organic-farming', 'eco-tourism', 'clean-water', 
    'carbon-neutral', 'biodiversity'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('impact.')) {
      const impactField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        impact: {
          ...prev.impact,
          [impactField]: parseFloat(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tags: checked 
        ? [...prev.tags, tag]
        : prev.tags.filter(t => t !== tag)
    }));
  };

  const addCustomTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleMediaUpload called', e.target.files);
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    console.log('Files selected:', files.length);
    setUploadingMedia(true);
    try {
      const fileArray = Array.from(files);
      console.log('Uploading files:', fileArray.map(f => f.name));
      const response = await uploadAPI.uploadImages(fileArray);
      
      if (response.data.success) {
        console.log('Upload successful:', response.data.data);
        setMedia(prev => [...prev, ...response.data.data]);
        toast({
          title: "Media Uploaded!",
          description: `${fileArray.length} file(s) uploaded successfully.`,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Failed to upload media files",
        variant: "destructive"
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create post data without media first
      const postData: any = {
        ...formData,
        location: formData.location || user?.location || ""
      };

      // Add media URLs if they exist (they should already be uploaded)
      if (media && media.length > 0) {
        console.log('Adding media to post:', media);
        postData.media = media;
      }

      await postsAPI.createPost(postData);
      
      toast({
        title: "Post Created!",
        description: "Your post has been shared successfully.",
      });
      
      // Reset form
      setFormData({
        content: "",
        category: "achievement",
        location: "",
        tags: [],
        impact: {
          carbonSaved: 0,
          wasteReduced: 0,
          energySaved: 0,
          peopleReached: 0
        }
      });
      setMedia([]);
      
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Post creation error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Create New Post</CardTitle>
            <CardDescription>
              Share your sustainability journey with the community
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-gray-500">@{user?.username}</p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Share your sustainability achievements, projects, tips, or questions..."
                value={formData.content}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  name="location"
                  placeholder="Where did this happen?"
                  value={formData.location}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tags.includes(tag)}
                      onChange={(e) => handleTagChange(tag, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add custom tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <Button type="button" onClick={addCustomTag} variant="outline">
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Impact Metrics */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <Label>Impact Metrics (optional)</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="impact.carbonSaved">Carbon Saved (kg CO2)</Label>
                  <Input
                    id="impact.carbonSaved"
                    name="impact.carbonSaved"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.impact.carbonSaved}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impact.wasteReduced">Waste Reduced (kg)</Label>
                  <Input
                    id="impact.wasteReduced"
                    name="impact.wasteReduced"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.impact.wasteReduced}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impact.energySaved">Energy Saved (kWh)</Label>
                  <Input
                    id="impact.energySaved"
                    name="impact.energySaved"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.impact.energySaved}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impact.peopleReached">People Reached</Label>
                  <Input
                    id="impact.peopleReached"
                    name="impact.peopleReached"
                    type="number"
                    min="0"
                    value={formData.impact.peopleReached}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Media (optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload images to enhance your post
                </p>
                  <input
                    type="file"
                  accept="image/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                  disabled={uploadingMedia}
                  id="media-upload"
                  />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={uploadingMedia}
                  onClick={() => {
                    console.log('Button clicked, triggering file input');
                    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
                    if (fileInput) {
                      console.log('File input found, clicking...');
                      fileInput.click();
                    } else {
                      console.log('File input not found');
                    }
                  }}
                >
                    <Camera className="w-4 h-4 mr-2" />
                  {uploadingMedia ? "Uploading..." : "Choose Files"}
                  </Button>
              </div>
              
              {media.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {media.map((item, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={item.url} 
                        alt={`Media ${index + 1}`} 
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !formData.content.trim()}>
                {isLoading ? "Creating..." : "Create Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}; 