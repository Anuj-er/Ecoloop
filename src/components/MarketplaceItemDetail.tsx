import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, MapPin, Eye, Clock, User, Building, Heart, 
  MessageCircle, Share2, Phone, Mail, CheckCircle, AlertTriangle 
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarketplaceItem } from "@/types/marketplace";

// Using shared interface

interface Props {
  item: MarketplaceItem;
  onBack: () => void;
  onItemSold: (itemId: string) => void;
}

export const MarketplaceItemDetail = ({ item, onBack, onItemSold }: Props) => {
  const { user } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
  const [submittingInterest, setSubmittingInterest] = useState(false);

  const isOwner = user?._id === item.seller._id;
  const hasExpressedInterest = item.interestedBuyers?.some(
    buyer => buyer.buyer._id === user?._id
  );

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'like-new': return 'bg-blue-100 text-blue-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-orange-100 text-orange-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleExpressInterest = async () => {
    if (!interestMessage.trim()) {
      toast.error('Please write a message');
      return;
    }

    setSubmittingInterest(true);

    try {
      const response = await api.post(`/marketplace/${item._id}/interest`, {
        message: interestMessage,
        contactInfo
      });

      if (response.data.success) {
        toast.success('Interest expressed successfully!');
        setShowInterestModal(false);
        setInterestMessage('');
        setContactInfo({ phone: '', email: '' });
        // In a real app, we'd refresh the item data here
      }
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      toast.error(error.response?.data?.message || 'Failed to express interest');
    } finally {
      setSubmittingInterest(false);
    }
  };

  const handleMarkAsSold = async () => {
    try {
      const response = await api.put(`/marketplace/${item._id}`, {
        status: 'sold'
      });

      if (response.data.success) {
        toast.success('Item marked as sold!');
        onItemSold(item._id);
      }
    } catch (error: any) {
      console.error('Error marking as sold:', error);
      toast.error('Failed to mark item as sold');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <Card className="overflow-hidden">
              <div className="relative aspect-square bg-gray-200">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[selectedImageIndex]?.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span>No Image</span>
                  </div>
                )}

                {/* AI Analysis Badge */}
                {item.images[selectedImageIndex]?.aiAnalysis && (
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className={`text-xs ${
                        item.images[selectedImageIndex].aiAnalysis.status === 'usable' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.images[selectedImageIndex].aiAnalysis.status === 'usable' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      AI: {Math.round(item.images[selectedImageIndex].aiAnalysis.confidence)}%
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Thumbnail Images */}
            {item.images && item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square border-2 rounded-lg overflow-hidden ${
                      selectedImageIndex === index 
                        ? 'border-blue-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`${item.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-green-600 mb-4">
                {formatPrice(item.price, item.currency)}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-blue-100 text-blue-800">
                  {item.materialType.charAt(0).toUpperCase() + item.materialType.slice(1)}
                </Badge>
                <Badge className={getConditionColor(item.condition)}>
                  {item.condition.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Badge>
                {item.category && (
                  <Badge variant="outline">
                    {item.category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Key Information */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <span className="ml-2 font-medium">{item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Pin Code:</span>
                    <span className="ml-1 font-medium">{item.pinCode}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Views:</span>
                    <span className="ml-1 font-medium">{item.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Posted:</span>
                    <span className="ml-1 font-medium">{formatTimeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>

            {/* Dimensions */}
            {item.dimensions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dimensions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {item.dimensions.length > 0 && (
                      <div>
                        <span className="text-gray-600">Length:</span>
                        <span className="ml-2 font-medium">{item.dimensions.length} cm</span>
                      </div>
                    )}
                    {item.dimensions.width > 0 && (
                      <div>
                        <span className="text-gray-600">Width:</span>
                        <span className="ml-2 font-medium">{item.dimensions.width} cm</span>
                      </div>
                    )}
                    {item.dimensions.height > 0 && (
                      <div>
                        <span className="text-gray-600">Height:</span>
                        <span className="ml-2 font-medium">{item.dimensions.height} cm</span>
                      </div>
                    )}
                    {item.dimensions.weight > 0 && (
                      <div>
                        <span className="text-gray-600">Weight:</span>
                        <span className="ml-2 font-medium">{item.dimensions.weight} kg</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {isOwner ? (
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleMarkAsSold}
                    disabled={item.status === 'sold'}
                  >
                    {item.status === 'sold' ? 'Marked as Sold' : 'Mark as Sold'}
                  </Button>
                  {item.interestedBuyers && item.interestedBuyers.length > 0 && (
                    <div className="text-sm text-gray-600 text-center">
                      {item.interestedBuyers.length} people are interested
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Dialog open={showInterestModal} onOpenChange={setShowInterestModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={hasExpressedInterest || item.status === 'sold'}
                      >
                        {hasExpressedInterest ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Interest Expressed
                          </>
                        ) : item.status === 'sold' ? (
                          'Sold'
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Express Interest
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Express Interest in {item.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="message">Message *</Label>
                          <Textarea
                            id="message"
                            value={interestMessage}
                            onChange={(e) => setInterestMessage(e.target.value)}
                            placeholder="Tell the seller why you're interested..."
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="phone">Phone (Optional)</Label>
                            <Input
                              id="phone"
                              value={contactInfo.phone}
                              onChange={(e) => setContactInfo(prev => ({...prev, phone: e.target.value}))}
                              placeholder="Your phone number"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={contactInfo.email}
                              onChange={(e) => setContactInfo(prev => ({...prev, email: e.target.value}))}
                              placeholder="Your email"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowInterestModal(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleExpressInterest}
                            disabled={submittingInterest}
                          >
                            {submittingInterest ? 'Sending...' : 'Send Interest'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seller Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Seller Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={item.seller.avatar} />
                <AvatarFallback>
                  {item.seller.firstName?.[0]}{item.seller.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">
                    {item.seller.firstName} {item.seller.lastName}
                  </h3>
                  {item.seller.userType === 'organization' && (
                    <Building className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-2">@{item.seller.username}</p>
                
                {item.seller.bio && (
                  <p className="text-gray-700 text-sm mb-2">{item.seller.bio}</p>
                )}
                
                {item.seller.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{item.seller.location}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interested Buyers (Owner View) */}
        {isOwner && item.interestedBuyers && item.interestedBuyers.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Interested Buyers ({item.interestedBuyers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {item.interestedBuyers.map((interest, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={interest.buyer.avatar} />
                        <AvatarFallback>
                          {interest.buyer.firstName?.[0]}{interest.buyer.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {interest.buyer.firstName} {interest.buyer.lastName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(interest.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 text-sm mb-2">{interest.message}</p>
                        
                        {interest.contactInfo && (
                          <div className="flex gap-4 text-sm">
                            {interest.contactInfo.phone && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Phone className="w-3 h-3" />
                                <span>{interest.contactInfo.phone}</span>
                              </div>
                            )}
                            {interest.contactInfo.email && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Mail className="w-3 h-3" />
                                <span>{interest.contactInfo.email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
