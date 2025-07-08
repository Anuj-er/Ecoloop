import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, XCircle, AlertTriangle, Eye, Clock, 
  User, Building, ShoppingCart, Loader2 
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface MarketplaceItem {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  materialType: string;
  condition: string;
  quantity: number;
  pinCode: string;
  images: Array<{
    url: string;
    aiAnalysis?: {
      label: string;
      confidence: number;
      status: string;
      qualityScore?: number;
    };
  }>;
  seller: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    userType: string;
  };
  tags: string[];
  category: string;
  views: number;
  createdAt: string;
  status: string;
  reviewStatus: string;
  moderationNotes?: string;
  rejectionReason?: string;
}

export const MarketplaceAdminDashboard = () => {
  const [pendingItems, setPendingItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingItems, setReviewingItems] = useState<Set<string>>(new Set());
  const [moderationNotes, setModerationNotes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace/admin/pending-review');
      
      if (response.data.success) {
        setPendingItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast.error('Failed to load pending items');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (itemId: string, action: 'approve' | 'reject') => {
    setReviewingItems(prev => new Set([...prev, itemId]));

    try {
      const response = await api.put(`/marketplace/admin/${itemId}/review`, {
        action,
        moderationNotes: moderationNotes[itemId] || ''
      });

      if (response.data.success) {
        toast.success(`Item ${action}d successfully`);
        setPendingItems(prev => prev.filter(item => item._id !== itemId));
        setModerationNotes(prev => {
          const updated = { ...prev };
          delete updated[itemId];
          return updated;
        });
      }
    } catch (error: any) {
      console.error(`Error ${action}ing item:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} item`);
    } finally {
      setReviewingItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading pending items...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Marketplace Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Review marketplace items flagged by AI for quality or content issues
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">AI Flagged</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingItems.filter(item => 
                      item.images.some(img => 
                        img.aiAnalysis?.status === 'suspicious' || 
                        img.aiAnalysis?.confidence && img.aiAnalysis.confidence < 50
                      )
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Items */}
        {pendingItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items pending review</h3>
              <p className="text-gray-600">All marketplace items have been reviewed!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingItems.map((item) => (
              <Card key={item._id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Item Images */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {item.images.slice(0, 4).map((image, index) => (
                          <div key={index} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={image.url}
                              alt={`${item.title} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* AI Analysis Badge */}
                            {image.aiAnalysis && (
                              <div className="absolute top-2 right-2">
                                <Badge 
                                  className={`text-xs ${
                                    image.aiAnalysis.status === 'usable' 
                                      ? 'bg-green-100 text-green-800' 
                                      : image.aiAnalysis.status === 'suspicious'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {image.aiAnalysis.status === 'usable' ? (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                  )}
                                  {Math.round(image.aiAnalysis.confidence)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* AI Analysis Summary */}
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <div className="font-semibold mb-1">AI Analysis Results:</div>
                            {item.images.map((image, index) => (
                              image.aiAnalysis && (
                                <div key={index} className="mb-1">
                                  Image {index + 1}: {image.aiAnalysis.label} 
                                  ({Math.round(image.aiAnalysis.confidence)}% confidence)
                                  {image.aiAnalysis.status !== 'usable' && (
                                    <span className="text-red-600 ml-2">
                                      - {image.aiAnalysis.status}
                                    </span>
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>

                    {/* Item Details */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                          <div className="text-2xl font-bold text-green-600 mb-2">
                            {formatPrice(item.price, item.currency)}
                          </div>
                          <div className="flex flex-wrap gap-2">
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
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-gray-700">{item.description}</p>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Quantity:</span>
                          <span className="ml-2 font-medium">{item.quantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pin Code:</span>
                          <span className="ml-2 font-medium">{item.pinCode}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-600">Views:</span>
                          <span className="ml-1 font-medium">{item.views}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Seller Info */}
                      <div>
                        <h4 className="font-semibold mb-2">Seller</h4>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={item.seller.avatar} />
                            <AvatarFallback>
                              {item.seller.firstName?.[0]}{item.seller.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {item.seller.firstName} {item.seller.lastName}
                              </span>
                              {item.seller.userType === 'organization' ? (
                                <Building className="w-4 h-4 text-gray-500" />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <span className="text-sm text-gray-500">@{item.seller.username}</span>
                          </div>
                        </div>
                      </div>

                      {/* Moderation Notes */}
                      <div>
                        <h4 className="font-semibold mb-2">Moderation Notes</h4>
                        <Textarea
                          value={moderationNotes[item._id] || ''}
                          onChange={(e) => setModerationNotes(prev => ({
                            ...prev,
                            [item._id]: e.target.value
                          }))}
                          placeholder="Add notes about your decision..."
                          rows={3}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={() => handleReview(item._id, 'approve')}
                          disabled={reviewingItems.has(item._id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {reviewingItems.has(item._id) ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        
                        <Button
                          variant="destructive"
                          onClick={() => handleReview(item._id, 'reject')}
                          disabled={reviewingItems.has(item._id)}
                        >
                          {reviewingItems.has(item._id) ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
