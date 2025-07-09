import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FraudAlert } from "@/components/ui/fraud-alert";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, AlertTriangle, CheckCircle, XCircle, LineChart, UserCheck, Clock, ShieldAlert, ShoppingCart, Eye } from "lucide-react";
import api from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const fraudTypeLabels = {
  suspicious_content: "Suspicious Content",
  unrealistic_claims: "Unrealistic Claims",
  low_user_trust: "Low User Trust",
  suspicious_behavior: "Suspicious Behavior",
  high_carbon_claim: "High Carbon Claim",
  high_waste_claim: "High Waste Reduction Claim",
  high_energy_claim: "High Energy Saving Claim"
};

export const FraudDetectionDashboard = () => {
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [pendingMarketplaceItems, setPendingMarketplaceItems] = useState([]);
  const [fraudStats, setFraudStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);
  const [reviewingPostId, setReviewingPostId] = useState(null);
  const [reviewingItemId, setReviewingItemId] = useState(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    
    loadFlaggedPosts();
    loadFraudStats();
    loadPendingMarketplaceItems();
  }, [isAdmin]);

  const loadFlaggedPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/flagged-posts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setFlaggedPosts(response.data.data);
      }
    } catch (error) {
      console.error("Error loading flagged posts:", error);
      toast({
        title: "Error",
        description: "Failed to load flagged posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFraudStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/fraud-stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setFraudStats(response.data.data);
      }
    } catch (error) {
      console.error("Error loading fraud stats:", error);
      toast({
        title: "Error",
        description: "Failed to load fraud statistics",
        variant: "destructive"
      });
    }
  };

  const loadPendingMarketplaceItems = async () => {
    try {
      setMarketplaceLoading(true);
      const response = await api.get('/marketplace/admin/pending-review');
      
      if (response.data.success) {
        setPendingMarketplaceItems(response.data.data);
      }
    } catch (error) {
      console.error('Error loading pending marketplace items:', error);
      toast({
        title: "Error",
        description: "Failed to load pending marketplace items",
        variant: "destructive",
      });
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const handleReviewPost = async (postId, decision) => {
    setReviewingPostId(postId);
    
    try {
      const response = await axios.put(`${API_BASE_URL}/admin/flagged-posts/${postId}/review`, 
        { decision },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Remove post from list
        setFlaggedPosts(prev => prev.filter(post => post._id !== postId));
        
        // Show success message
        toast({
          title: decision === 'approve' ? "Post Approved" : "Post Rejected",
          description: `The post has been ${decision === 'approve' ? 'approved' : 'rejected'}.`,
        });
        
        // Refresh stats
        loadFraudStats();
      }
    } catch (error) {
      console.error("Error reviewing post:", error);
      toast({
        title: "Error",
        description: "Failed to review post",
        variant: "destructive"
      });
    } finally {
      setReviewingPostId(null);
    }
  };

  const handleMarketplaceReview = async (itemId, action) => {
    setReviewingItemId(itemId);
    
    try {
      const response = await api.put(`/marketplace/admin/${itemId}/review`, {
        action,
        moderationNotes: `AI review: ${action}d by admin`
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Item ${action}d successfully`,
        });
        
        // Remove from pending list
        setPendingMarketplaceItems(prev => prev.filter(item => item._id !== itemId));
      }
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} item`,
        variant: "destructive",
      });
    } finally {
      setReviewingItemId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-20">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-20">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Shield className="mr-2 h-8 w-8 text-amber-500" />
        Fraud Detection Dashboard
      </h1>
      
      <Tabs defaultValue="flagged" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="flagged">Flagged Posts</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace Review</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flagged" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-600 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Posts Requiring Review
              </CardTitle>
              <CardDescription>
                Review these posts that were flagged by our fraud detection system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading flagged posts...</p>
                </div>
              ) : flaggedPosts.length > 0 ? (
                <div className="space-y-6">
                  {flaggedPosts.map(post => (
                    <Card key={post._id} className="border-l-4 border-amber-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={post.author?.avatar} />
                              <AvatarFallback>
                                {post.author?.firstName?.charAt(0) || post.author?.username?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">
                                {post.author?.firstName} {post.author?.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">@{post.author?.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Fraud Score: {Math.round(post.fraudAnalysis?.fraudScore || 0)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-gray-800">{post.content}</p>
                        
                        {/* Display media if available */}
                        {post.media && post.media.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {post.media.map((item, index) => (
                              <img
                                key={index}
                                src={item.url}
                                alt={`Post media ${index + 1}`}
                                className="w-full h-40 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Fraud flags */}
                        <FraudAlert 
                          fraudScore={post.fraudAnalysis?.fraudScore || 0}
                          fraudFlags={post.fraudAnalysis?.fraudFlags?.map(flag => fraudTypeLabels[flag] || flag)}
                          severity={post.fraudAnalysis?.fraudScore > 70 ? 'high' : 'medium'}
                          showDetails={true}
                        />
                          
                        {/* Impact claims */}
                        {post.impact && (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Carbon Saved:</span>{" "}
                              {post.impact.carbonSaved || 0} kg
                            </div>
                            <div>
                              <span className="font-medium">Waste Reduced:</span>{" "}
                              {post.impact.wasteReduced || 0} kg
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleReviewPost(post._id, 'reject')}
                            disabled={reviewingPostId === post._id}
                          >
                            <XCircle className="mr-2 w-4 h-4" />
                            Reject Post
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleReviewPost(post._id, 'approve')}
                            disabled={reviewingPostId === post._id}
                          >
                            <CheckCircle className="mr-2 w-4 h-4" />
                            Approve Post
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-1">No flagged posts to review</p>
                  <p className="text-gray-600">All posts have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="marketplace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Marketplace Items Pending Review
              </CardTitle>
              <CardDescription>
                Review marketplace items that were flagged by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marketplaceLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading marketplace items...</p>
                </div>
              ) : pendingMarketplaceItems.length > 0 ? (
                <div className="space-y-6">
                  {pendingMarketplaceItems.map(item => (
                    <Card key={item._id} className="border-l-4 border-red-500">
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
                                          image.aiAnalysis.status === 'approved' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {image.aiAnalysis.status === 'approved' ? (
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                        ) : (
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                        )}
                                        {Math.round(image.aiAnalysis.confidence || 0)}%
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
                                        Image {index + 1}: {image.aiAnalysis.label || 'Unknown'} 
                                        ({Math.round(image.aiAnalysis.confidence || 0)}% confidence)
                                        {image.aiAnalysis.status !== 'approved' && (
                                          <span className="text-red-600 ml-2">
                                            - Needs Review
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
                                  ₹{item.price?.toLocaleString('en-IN') || 0}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {item.materialType?.charAt(0).toUpperCase() + item.materialType?.slice(1)}
                                  </Badge>
                                  <Badge className="bg-gray-100 text-gray-800">
                                    {item.condition?.split('-').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
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
                                <span className="ml-1 font-medium">{item.views || 0}</span>
                              </div>
                            </div>

                            {/* Seller Info */}
                            <div>
                              <h4 className="font-semibold mb-2">Seller</h4>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={item.seller?.avatar} />
                                  <AvatarFallback>
                                    {item.seller?.firstName?.[0]}{item.seller?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {item.seller?.firstName} {item.seller?.lastName}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-500">@{item.seller?.username}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                              <Button
                                onClick={() => handleMarketplaceReview(item._id, 'approve')}
                                disabled={reviewingItemId === item._id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {reviewingItemId === item._id ? (
                                  <>Loading...</>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve & Publish
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="destructive"
                                onClick={() => handleMarketplaceReview(item._id, 'reject')}
                                disabled={reviewingItemId === item._id}
                              >
                                {reviewingItemId === item._id ? (
                                  <>Loading...</>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No items pending review</h3>
                  <p className="text-gray-600">All marketplace items have been reviewed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="statistics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600 flex items-center">
                  <LineChart className="w-5 h-5 mr-2" />
                  Fraud Detection Statistics
                </CardTitle>
                <CardDescription>
                  Overall statistics about our fraud detection system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fraudStats ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Posts</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {fraudStats.totalPosts}
                        </p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Flagged Posts</p>
                        <p className="text-2xl font-bold text-amber-700">
                          {fraudStats.flaggedPosts} <span className="text-sm font-normal">({fraudStats.flaggedPercentage}%)</span>
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Reviewed</p>
                        <p className="text-2xl font-bold text-green-700">
                          {fraudStats.reviewedPosts}
                        </p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Rejected</p>
                        <p className="text-2xl font-bold text-red-700">
                          {fraudStats.rejectedPosts}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <h4 className="font-medium mb-2">Review Time</h4>
                      <div className="flex items-center text-green-700 space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Avg. {fraudStats.avgReviewTimeHours || 0} hours
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Common Fraud Flags
                </CardTitle>
                <CardDescription>
                  Most frequent flags raised by the detection system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fraudStats?.commonFlags ? (
                  <div className="space-y-3">
                    {fraudStats.commonFlags.map((flag, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            {fraudTypeLabels[flag.name] || flag.name}
                          </span>
                          <span className="text-sm text-gray-500">{flag.count}</span>
                        </div>
                        <Progress 
                          value={flag.count / (Math.max(...fraudStats.commonFlags.map(f => f.count)) || 1) * 100} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                    
                    {fraudStats.commonFlags.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No fraud flags detected yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
