import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FraudAlert } from "@/components/ui/fraud-alert";
import { CreatePostModal } from "./CreatePostModal";
import { useAuth } from "@/contexts/AuthContext";
import { postsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Filter,
  Search,
  TrendingUp,
  Award,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  Send,
  X,
  ShieldAlert
} from "lucide-react";

export const Feed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [filters, setFilters] = useState({
    category: "all",
    search: "",
    sortBy: "latest"
  });

  useEffect(() => {
    loadPosts();
  }, [filters]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      
      if (filters.category !== "all") {
        params.category = filters.category;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }
      
      if (filters.sortBy === "trending") {
        const response = await postsAPI.getTrendingPosts();
        setPosts(response.data.data);
      } else {
        const response = await postsAPI.getPosts(params);
        setPosts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostLike = async (postId: string) => {
    try {
      await postsAPI.likePost(postId);
      // Update local state instead of reloading all posts
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            const isLiked = post.likes?.some((like: any) => like._id === user?._id);
            if (isLiked) {
              // Unlike: remove user from likes array
              return {
                ...post,
                likes: post.likes?.filter((like: any) => like._id !== user?._id) || []
              };
            } else {
              // Like: add user to likes array
              return {
                ...post,
                likes: [...(post.likes || []), user]
              };
            }
          }
          return post;
        })
      );
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
      
      // Update local state instead of reloading all posts
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            const isShared = post.shares?.some((share: any) => share._id === user?._id);
            if (!isShared) {
              return {
                ...post,
                shares: [...(post.shares || []), user]
              };
            }
          }
          return post;
        })
      );
      
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
      loadPosts();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'achievement':
        return <Award className="w-4 h-4" />;
      case 'project':
        return <TrendingUp className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'achievement':
        return 'bg-green-100 text-green-800';
      case 'project':
        return 'bg-blue-100 text-blue-800';
      case 'tip':
        return 'bg-yellow-100 text-yellow-800';
      case 'question':
        return 'bg-purple-100 text-purple-800';
      case 'event':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const response = await postsAPI.addComment(postId, { content });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      
      // Update local state with the new comment
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), response.data.data]
            };
          }
          return post;
        })
      );
      
      toast({
        title: "Comment added!",
        description: "Your comment has been posted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const handleRemoveComment = async (postId: string, commentId: string) => {
    try {
      await postsAPI.removeComment(postId, commentId);
      
      // Update local state by removing the comment
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: post.comments?.filter((comment: any) => comment._id !== commentId) || []
            };
          }
          return post;
        })
      );
      
      toast({
        title: "Comment removed!",
        description: "Comment has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove comment",
        variant: "destructive"
      });
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="min-h-screen pt-20 px-4 bg-gradient-to-b from-green-50 to-amber-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Sustainability Feed</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="tip">Tip</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="challenge">Challenge</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="most-liked">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post: any) => (
              <Card key={post._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.author?.avatar} />
                        <AvatarFallback>
                          {post.author?.firstName?.charAt(0) || post.author?.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">
                            {post.author?.firstName} {post.author?.lastName}
                          </h3>
                          {post.author?.isVerified && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>@{post.author?.username}</span>
                          {post.author?.organization?.name && (
                            <>
                              <span>•</span>
                              <span>{post.author.organization.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {post.author?._id === user?._id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => confirmDelete(post)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Category Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`${getCategoryColor(post.category)} flex items-center space-x-1`}>
                      {getCategoryIcon(post.category)}
                      <span className="capitalize">{post.category}</span>
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-gray-800 leading-relaxed">{post.content}</p>
                  
                  {/* Fraud Detection Alert */}
                  {post.fraudAnalysis && post.fraudAnalysis.fraudScore > 40 && (
                    <div className="my-3 animate-pulse-slow">
                      <FraudAlert 
                        fraudScore={post.fraudAnalysis.fraudScore} 
                        fraudFlags={post.fraudAnalysis.fraudFlags}
                        severity={post.fraudAnalysis.fraudScore > 70 ? 'high' : 'medium'}
                        compact={post.fraudAnalysis.fraudScore < 60}
                      />
                      {post.fraudAnalysis.fraudScore > 70 && (
                        <p className="text-xs text-red-600 mt-1 text-center">
                          This post has been flagged for review by moderators.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Media */}
                  {post.media && post.media.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {console.log('Rendering media for post:', post._id, post.media)}
                      {post.media.map((media: any, index: number) => (
                        <img
                          key={index}
                          src={media.url}
                          alt={`Post media ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Location */}
                  {post.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      {post.location}
                    </div>
                  )}

                  {/* Impact Stats */}
                  {post.impact && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Carbon Saved</p>
                        <p className="font-semibold text-green-600">
                          {formatNumber(post.impact.carbonSaved || 0)} kg
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Waste Reduced</p>
                        <p className="font-semibold text-blue-600">
                          {formatNumber(post.impact.wasteReduced || 0)} kg
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Energy Saved</p>
                        <p className="font-semibold text-yellow-600">
                          {formatNumber(post.impact.energySaved || 0)} kWh
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">People Reached</p>
                        <p className="font-semibold text-purple-600">
                          {formatNumber(post.impact.peopleReached || 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-6">
                      <button 
                        onClick={() => handlePostLike(post._id)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">{formatNumber(post.likes?.length || 0)}</span>
                      </button>
                      <button 
                        onClick={() => toggleComments(post._id)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{formatNumber(post.comments?.length || 0)}</span>
                      </button>
                      <button 
                        onClick={() => handlePostShare(post._id)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm">{formatNumber(post.shares?.length || 0)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments[post._id] && (
                    <div className="border-t pt-4 space-y-4">
                      {/* Comment Input */}
                      <div className="flex space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback className="text-xs">
                            {user?.firstName?.charAt(0) || user?.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex space-x-2">
                          <Textarea
                            placeholder="Write a comment..."
                            value={commentInputs[post._id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ 
                              ...prev, 
                              [post._id]: e.target.value 
                            }))}
                            className="min-h-[60px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post._id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleAddComment(post._id)}
                            disabled={!commentInputs[post._id]?.trim()}
                            size="sm"
                            className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                                                    {/* Comments List */}
                              {post.comments && post.comments.length > 0 ? (
                                <div className="space-y-3">
                                  {post.comments.map((comment: any) => (
                                    <div key={comment._id} className="flex space-x-3 group">
                                      <Avatar className="w-8 h-8 flex-shrink-0">
                                        <AvatarImage src={comment.user?.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {comment.user?.firstName?.charAt(0) || comment.user?.username?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors duration-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm text-gray-900">
                                              {comment.user?.firstName} {comment.user?.lastName}
                                            </span>
                                            <span className="text-xs text-gray-500 flex-shrink-0">
                                              {formatDate(comment.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                                        </div>
                                                                        {comment.user?._id === user?._id && (
                                          <div className="mt-2 flex justify-end">
                                            <button
                                              onClick={() => handleRemoveComment(post._id, comment._id)}
                                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                                            >
                                              <X className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          </div>
                                        )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No comments yet. Be the first to comment!
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-4">
                Be the first to share your sustainability journey!
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={loadPosts}
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
