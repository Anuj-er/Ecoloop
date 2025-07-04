import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Phone, Mail, Calendar, Star, Package, Users, Handshake, Edit, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileCompletionModal } from "./ProfileCompletionModal";
import { CreatePostModal } from "./CreatePostModal";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI, postsAPI, connectionsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Award, Globe, Building } from "lucide-react";
import { MessageCircle, Share2, Heart, Plus, Eye, Trash2 } from "lucide-react";

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userConnections, setUserConnections] = useState([]);
  const [userMetrics, setUserMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if profile is complete
  const isProfileComplete = user && 
    user.bio && 
    user.location && 
    user.interests?.length > 0 && 
    user.skills?.length > 0;

  useEffect(() => {
    if (user) {
      loadUserData();
      // Show completion modal if profile is incomplete
      if (!isProfileComplete) {
        setShowCompletionModal(true);
      }
    }
  }, [user, isProfileComplete]);

  const loadUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load user posts
      const postsResponse = await postsAPI.getPosts({ author: user._id });
      setUserPosts(postsResponse.data.data);

      // Load user connections
      const connectionsResponse = await connectionsAPI.getConnections({ status: 'accepted' });
      setUserConnections(connectionsResponse.data.data);

      // Load user metrics
      const metricsResponse = await usersAPI.getUserMetrics(user._id);
      setUserMetrics(metricsResponse.data.data);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostLike = async (postId: string) => {
    try {
      await postsAPI.likePost(postId);
      // Refresh posts
      loadUserData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      });
    }
  };

  const handlePostShare = async (postId: string) => {
    try {
      await postsAPI.sharePost(postId);
      toast({
        title: "Shared!",
        description: "Post shared successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await postsAPI.deletePost(postId);
      toast({
        title: "Deleted!",
        description: "Post deleted successfully",
      });
      setShowDeleteModal(false);
      setPostToDelete(null);
      loadUserData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (post: any) => {
    setPostToDelete(post);
    setShowDeleteModal(true);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Profile Not Found</h1>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 bg-gradient-to-b from-green-50 to-amber-50">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl">
                    {user.firstName?.charAt(0) || user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className="text-gray-600 mb-2">@{user.username}</p>
                  {user.bio && (
                    <p className="text-gray-700 mb-3 max-w-2xl">{user.bio}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {user.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {user.location}
                      </div>
                    )}
                    {user.organization?.name && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-1" />
                        {user.organization.name}
                      </div>
                    )}
                    {user.organization?.website && (
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-1" />
                        <a 
                          href={user.organization.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Skills and Interests */}
            <div className="mt-6">
              {user.skills?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {user.interests?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                        {interest.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Carbon Saved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(userMetrics?.userMetrics?.carbonFootprint || 0)} kg
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Waste Reduced</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(userMetrics?.userMetrics?.wasteReduced || 0)} kg
                  </p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Energy Saved</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatNumber(userMetrics?.userMetrics?.energySaved || 0)} kWh
                  </p>
                </div>
                <Eye className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projects</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {userMetrics?.userMetrics?.projectsCompleted || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Posts</h2>
              <Button onClick={() => setShowCreatePostModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">Loading posts...</div>
            ) : userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post: any) => (
                  <Card key={post._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.firstName?.charAt(0) || user.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">{user.firstName} {user.lastName}</span>
                            <Badge variant="outline" className="text-xs">
                              {post.category}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-3">{post.content}</p>
                          {post.media?.length > 0 && (
                            <div className="mb-3">
                              <img 
                                src={post.media[0].url} 
                                alt="Post media" 
                                className="rounded-lg max-w-md"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <button 
                                onClick={() => handlePostLike(post._id)}
                                className="flex items-center space-x-1 hover:text-red-600"
                              >
                                <Heart className="w-4 h-4" />
                                <span>{post.likeCount || 0}</span>
                              </button>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{post.commentCount || 0}</span>
                              </div>
                              <button 
                                onClick={() => handlePostShare(post._id)}
                                className="flex items-center space-x-1 hover:text-green-600"
                              >
                                <Share2 className="w-4 h-4" />
                                <span>{post.shareCount || 0}</span>
                              </button>
                              <button 
                                onClick={() => confirmDelete(post)}
                                className="flex items-center space-x-1 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 mb-4">No posts yet</p>
                  <Button onClick={() => setShowCreatePostModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Post
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <h2 className="text-xl font-semibold">Connections</h2>
            {isLoading ? (
              <div className="text-center py-8">Loading connections...</div>
            ) : userConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userConnections.map((connection: any) => {
                  const otherUser = connection.requester._id === user._id 
                    ? connection.recipient 
                    : connection.requester;
                  
                  return (
                    <Card key={connection._id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>
                              {otherUser.firstName?.charAt(0) || otherUser.username?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium">{otherUser.firstName} {otherUser.lastName}</h3>
                            <p className="text-sm text-gray-600">@{otherUser.username}</p>
                            {otherUser.organization?.name && (
                              <p className="text-xs text-gray-500">{otherUser.organization.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No connections yet</p>
                  <p className="text-sm text-gray-500">Start connecting with other sustainability professionals!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <h2 className="text-xl font-semibold">Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <h3 className="font-medium">First Post</h3>
                  <p className="text-sm text-gray-600">Created your first sustainability post</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-medium">Network Builder</h3>
                  <p className="text-sm text-gray-600">Connected with 5+ professionals</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="font-medium">Impact Maker</h3>
                  <p className="text-sm text-gray-600">Reduced 1000+ kg of waste</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">You liked a post about sustainable packaging</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">You connected with Ravi Kumar</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">You shared a post about solar energy</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Completion Modal */}
      {!isProfileComplete && (
        <ProfileCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onComplete={() => {
            setShowCompletionModal(false);
            loadUserData();
          }}
        />
      )}

      {/* Profile Edit Modal */}
      {showEditModal && (
        <ProfileCompletionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onComplete={() => {
            setShowEditModal(false);
            loadUserData();
          }}
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={() => {
          setShowCreatePostModal(false);
          loadUserData();
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && postToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Post</CardTitle>
              <CardDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {postToDelete.content}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPostToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeletePost(postToDelete._id)}
                >
                  Delete Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
