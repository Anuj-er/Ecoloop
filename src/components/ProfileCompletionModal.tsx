import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI, uploadAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Camera, X } from "lucide-react";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const ProfileCompletionModal = ({ isOpen, onClose, onComplete }: ProfileCompletionModalProps) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    interests: user?.interests || [],
    skills: user?.skills || [],
    organization: {
      name: user?.organization?.name || "",
      website: user?.organization?.website || "",
      industry: user?.organization?.industry || "",
      size: user?.organization?.size || "small"
    }
  });
  
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('org.')) {
      const orgField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        organization: {
          ...prev.organization,
          [orgField]: value
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

  const handleInterestChange = (interest: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interests: checked 
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest)
    }));
  };

  const handleSkillChange = (skill: string) => {
    if (skill.trim() && !formData.skills.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      
      if (response.data.success) {
        const newAvatarUrl = response.data.data.url;
        setAvatar(newAvatarUrl);
        
        // Update the user context immediately so the avatar shows up
        if (updateUser) {
          updateUser({ ...user, avatar: newAvatarUrl });
        }
        
        toast({
          title: "Avatar Uploaded!",
          description: "Your profile picture has been updated successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        ...formData,
        avatar
      };

      const response = await authAPI.updateProfile(updateData);
      updateUser(response.data.data);
      
      toast({
        title: "Profile Updated!",
        description: "Your profile has been completed successfully.",
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableInterests = [
    'recycling', 'renewable-energy', 'sustainable-fashion', 'zero-waste', 
    'green-tech', 'organic-farming', 'eco-tourism', 'clean-water'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Help others discover you by completing your profile
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <label className={`absolute bottom-0 right-0 ${uploadingAvatar ? 'bg-gray-400' : 'bg-green-600'} text-white p-1 rounded-full cursor-pointer ${uploadingAvatar ? 'cursor-not-allowed' : ''}`}>
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div>
                <h3 className="font-medium">{user?.username}</h3>
                <p className="text-sm text-gray-500">Click camera to upload photo</p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Tell us about yourself and your sustainability goals..."
                value={formData.bio}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="City, Country"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            {/* Organization Info (if organization user) */}
            {user?.userType === 'organization' && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium">Organization Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="org.name">Organization Name</Label>
                  <Input
                    id="org.name"
                    name="org.name"
                    value={formData.organization.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org.website">Website</Label>
                  <Input
                    id="org.website"
                    name="org.website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.organization.website}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org.industry">Industry</Label>
                    <Input
                      id="org.industry"
                      name="org.industry"
                      value={formData.organization.industry}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org.size">Size</Label>
                    <Select
                      value={formData.organization.size}
                      onValueChange={(value) => handleSelectChange("organization.size", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Interests */}
            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableInterests.map((interest) => (
                  <label key={interest} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(interest)}
                      onChange={(e) => handleInterestChange(interest, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{interest.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.skills.map((skill, index) => (
                  <div key={index} className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a skill and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSkillChange((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Complete Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}; 