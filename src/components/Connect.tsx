import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Users, Handshake, Package, Search, Truck, MessageCircle, CheckCircle, ArrowRight, Loader2, UserPlus, LogIn, Heart, Calendar, TrendingUp, Globe, RefreshCw, Clock } from "lucide-react";
import { connectionsAPI, usersAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const Connect = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDealDemo, setShowDealDemo] = useState(false);
  const [dealStep, setDealStep] = useState(1);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [existingConnections, setExistingConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [processingConnections, setProcessingConnections] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();

  // Load all data on component mount
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      loadAllUsers();
      loadExistingConnections();
    }
  }, [isAuthenticated, isLoading]);

  // Set up real-time polling for new users and connections
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Refresh data when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isLoading]);

  const refreshData = async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    
    setRefreshing(true);
    
    try {
      await Promise.all([
        loadAllUsers(),
        loadExistingConnections()
      ]);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    await refreshData();
    toast({
      title: "Data refreshed!",
      description: "Latest users and connections have been loaded.",
    });
  };

  const loadAllUsers = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to view users and connections.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await usersAPI.getUsers({ limit: 50 });
      setAllUsers(response.data.data || []);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      
      if (error.response?.status === 401) {
        toast({
          title: "Authentication required",
          description: "Please log in to view users and connections.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to load users",
          description: error.response?.data?.message || "Please refresh the page to try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExistingConnections = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await connectionsAPI.getConnections();
      const connections = response.data.data || [];
      
      // Sort connections: accepted first, then pending, then others
      const sortedConnections = connections.sort((a: any, b: any) => {
        if (a.status === 'accepted' && b.status !== 'accepted') return -1;
        if (a.status !== 'accepted' && b.status === 'accepted') return 1;
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setExistingConnections(sortedConnections);
    } catch (error) {
      console.error("Failed to load connections:", error);
    }
  };

  // Get connected user IDs to filter them out (only accepted connections)
  const getConnectedUserIds = () => {
    return existingConnections
      .filter(conn => conn.status === 'accepted') // Only consider accepted connections
      .map(conn => {
        // Determine which user is the other party in the connection
        return conn.requester._id === currentUser?._id ? conn.recipient._id : conn.requester._id;
      });
  };

  // Get pending connection user IDs (for showing "Request Sent" status)
  const getPendingConnectionUserIds = () => {
    return existingConnections
      .filter(conn => conn.status === 'pending')
      .map(conn => {
        // Only show "Request Sent" if current user is the requester
        if (conn.requester._id === currentUser?._id) {
          return conn.recipient._id;
        }
        return null;
      })
      .filter(id => id !== null);
  };

  // Filter users to show only those we can connect with
  const getAvailableUsers = () => {
    const connectedUserIds = getConnectedUserIds();
    const pendingUserIds = getPendingConnectionUserIds();
    
    return allUsers.filter(user => 
      user._id !== currentUser?._id && // Don't show current user
      !connectedUserIds.includes(user._id) && // Don't show already connected users
      user.isActive !== false // Only show active users
    ).map(user => {
      // Add connection status for UI display
      if (pendingUserIds.includes(user._id)) {
        return { ...user, connectionStatus: 'pending' };
      }
      return user;
    });
  };

  const filteredUsers = getAvailableUsers().filter(user => {
    const matchesFilter = filter === "all" || 
                         (filter === "individual" && user.userType === "individual") ||
                         (filter === "organization" && user.userType === "organization");
    
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.interests?.some((interest: string) => interest.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const handleConnect = async (userId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to send connection requests.",
        variant: "destructive",
      });
      return;
    }

    // Add to processing set
    setProcessingConnections(prev => new Set(prev).add(userId));

    try {
      await connectionsAPI.sendRequest({
        recipientId: userId,
        message: "I'm interested in connecting with you for potential collaboration.",
        projectInterest: "recycling",
        collaborationType: "partnership"
      });

      toast({
        title: "Connection request sent!",
        description: "The user will be notified of your request.",
      });

      // Update the user status to show request sent immediately
      setAllUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, connectionStatus: 'pending' } : user
      ));
      
      // Refresh connections to show the new pending request
      await loadExistingConnections();
      
      // Update the stats immediately
      setLastRefresh(new Date());
    } catch (error: any) {
      toast({
        title: "Failed to send request",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      setProcessingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    // Add to processing set
    setProcessingConnections(prev => new Set(prev).add(connectionId));

    try {
      const response = await connectionsAPI.acceptConnection(connectionId);
      
      toast({
        title: "Connection accepted!",
        description: "You are now connected with this user.",
      });
      
      // Update the connection in the existing connections list immediately
      setExistingConnections(prev => {
        const updatedConnections = prev.map(conn => 
          conn._id === connectionId 
            ? { ...conn, status: 'accepted', ...response.data.data.connection }
            : conn
        );
        
        // Sort connections: accepted first, then pending, then others
        return updatedConnections.sort((a: any, b: any) => {
          if (a.status === 'accepted' && b.status !== 'accepted') return -1;
          if (a.status !== 'accepted' && b.status === 'accepted') return 1;
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      
      // Refresh users data to remove the accepted user from discover tab
      await loadAllUsers();
      
      // Update the stats immediately
      setLastRefresh(new Date());
      
      // Show additional success message with connection count
      if (response.data.data.connectionCounts) {
        const { recipient } = response.data.data.connectionCounts;
        toast({
          title: "Connection updated!",
          description: `You now have ${recipient} total connections.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to accept connection",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      setProcessingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    // Add to processing set
    setProcessingConnections(prev => new Set(prev).add(connectionId));

    try {
      const response = await connectionsAPI.rejectConnection(connectionId);
      
      toast({
        title: "Connection rejected",
        description: "The connection request has been rejected.",
      });
      
      // Update the connection in the existing connections list
      setExistingConnections(prev => 
        prev.map(conn => 
          conn._id === connectionId 
            ? { ...conn, status: 'rejected', ...response.data.data.connection }
            : conn
        )
      );
      
      // Refresh both connections and users data for real-time updates
      await Promise.all([
        loadExistingConnections(),
        loadAllUsers()
      ]);
      
      // Update the stats immediately
      setLastRefresh(new Date());
      
      // Show additional success message with connection count
      if (response.data.data.connectionCounts) {
        const { recipient } = response.data.data.connectionCounts;
        toast({
          title: "Connection updated!",
          description: `You now have ${recipient} total connections.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to reject connection",
        description: error.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      setProcessingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };



  // Login Prompt for Unauthenticated Users
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Join the Eco Loop Community
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Connect with sustainability enthusiasts, organizations, and businesses. 
                  Start building meaningful connections for a greener future.
                </p>
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 text-lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Log In to Connect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Connections</h3>
            <p className="text-gray-600">Setting up your sustainable network...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Connect & Collaborate
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {refreshing ? 'Updating...' : 'Live'}
              </span>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover sustainability enthusiasts, organizations, and businesses to build meaningful partnerships
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                  <p className="text-sm opacity-90">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Handshake className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{existingConnections.length}</p>
                  <p className="text-sm opacity-90">Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="discover" className="text-lg font-semibold">
              <Users className="w-5 h-5 mr-2" />
              Discover Users
            </TabsTrigger>
            <TabsTrigger value="connections" className="text-lg font-semibold">
              <Handshake className="w-5 h-5 mr-2" />
              My Connections
            </TabsTrigger>
          </TabsList>

          {/* Discover Users Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* Search and Filter */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search by name, organization, or interests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full lg:w-[200px] h-12">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="individual">Individuals</SelectItem>
                      <SelectItem value="organization">Organizations</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white h-12 px-6"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  <span>Showing {filteredUsers.length} available users</span>
                </div>
              </CardContent>
            </Card>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full flex justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-500" />
                    <p className="text-gray-600">Loading users...</p>
                  </div>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <Card key={user._id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-16 h-16 border-4 border-green-100">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-400 text-white text-xl font-bold">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-1">{user.firstName} {user.lastName}</CardTitle>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {user.userType}
                              </Badge>
                              {user.organization && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.organization.name}
                                </Badge>
                              )}
                              {/* Show "New" badge for users registered in the last 24 hours */}
                              {new Date(user.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                                <Badge className="bg-green-100 text-green-800 text-xs animate-pulse">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{user.location || 'Location not specified'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={`text-xs ${
                              user.sustainabilityMetrics?.projectsCompleted > 10 ? 'bg-green-100 text-green-800' :
                              user.sustainabilityMetrics?.projectsCompleted > 5 ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {user.sustainabilityMetrics?.projectsCompleted || 0} Projects
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-700 line-clamp-2">{user.bio || 'No bio available'}</p>

                      <div className="flex flex-wrap gap-1">
                        {user.interests?.slice(0, 3).map((interest: string) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {user.interests?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.interests.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            {user.sustainabilityMetrics?.carbonFootprint ? 
                              `${user.sustainabilityMetrics.carbonFootprint}kg CO₂ saved` : 
                              'Active in sustainability'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            Member since {new Date(user.createdAt).getFullYear()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {user.connectionStatus === 'pending' ? (
                            <Button size="sm" variant="outline" disabled className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Request Sent
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleConnect(user._id)}
                              disabled={processingConnections.has(user._id)}
                              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                            >
                              {processingConnections.has(user._id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Connect
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters to find more users.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            {existingConnections.length > 0 ? (
              <div className="space-y-8">
                {/* Accepted Connections */}
                {existingConnections.filter(conn => conn.status === 'accepted').length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      Accepted Connections ({existingConnections.filter(conn => conn.status === 'accepted').length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {existingConnections
                        .filter(connection => connection.status === 'accepted')
                        .map(connection => {
                          const otherUser = connection.requester._id === currentUser?._id ? connection.recipient : connection.requester;
                          const isRequester = connection.requester._id === currentUser?._id;
                          
                          return (
                            <Card key={connection._id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
                              <CardHeader className="pb-4">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="w-16 h-16 border-4 border-green-100">
                                    <AvatarImage src={otherUser.avatar} />
                                    <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-400 text-white text-xl font-bold">
                                      {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <CardTitle className="text-xl mb-1">{otherUser.firstName} {otherUser.lastName}</CardTitle>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {otherUser.userType}
                                      </Badge>
                                      {otherUser.organization && (
                                        <Badge variant="secondary" className="text-xs">
                                          {otherUser.organization.name}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        Connected
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {isRequester ? 'You sent request' : 'They sent request'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  <span>{otherUser.location || 'Location not specified'}</span>
                                </div>

                                <p className="text-gray-700 line-clamp-2">{otherUser.bio || 'No bio available'}</p>

                                <div className="flex flex-wrap gap-1">
                                  {otherUser.interests?.slice(0, 3).map((interest: string) => (
                                    <Badge key={interest} variant="secondary" className="text-xs">
                                      {interest}
                                    </Badge>
                                  ))}
                                </div>

                                {/* Connection Details */}
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Connection Type:</span>
                                      <span className="font-medium">{connection.collaborationType || 'Partnership'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Project Interest:</span>
                                      <span className="font-medium">{connection.projectInterest || 'General'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Connected Since:</span>
                                      <span className="font-medium">{new Date(connection.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {connection.message && (
                                      <div className="mt-2 p-2 bg-white rounded border">
                                        <span className="text-xs text-gray-500">Message:</span>
                                        <p className="text-sm text-gray-700 mt-1">{connection.message}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <div className="flex space-x-2">
                                    <Button size="sm" variant="outline">
                                      <MessageCircle className="w-4 h-4 mr-1" />
                                      Message
                                    </Button>
                                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                                      <Handshake className="w-4 h-4 mr-1" />
                                      Collaborate
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Pending Connections */}
                {existingConnections.filter(conn => conn.status === 'pending').length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-yellow-500" />
                      Pending Connections ({existingConnections.filter(conn => conn.status === 'pending').length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {existingConnections
                        .filter(connection => connection.status === 'pending')
                        .map(connection => {
                          const otherUser = connection.requester._id === currentUser?._id ? connection.recipient : connection.requester;
                          const isRequester = connection.requester._id === currentUser?._id;
                          
                          return (
                            <Card key={connection._id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-yellow-500">
                              <CardHeader className="pb-4">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="w-16 h-16 border-4 border-yellow-100">
                                    <AvatarImage src={otherUser.avatar} />
                                    <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xl font-bold">
                                      {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <CardTitle className="text-xl mb-1">{otherUser.firstName} {otherUser.lastName}</CardTitle>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {otherUser.userType}
                                      </Badge>
                                      {otherUser.organization && (
                                        <Badge variant="secondary" className="text-xs">
                                          {otherUser.organization.name}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                        Pending
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {isRequester ? 'You sent request' : 'They sent request'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  <span>{otherUser.location || 'Location not specified'}</span>
                                </div>

                                <p className="text-gray-700 line-clamp-2">{otherUser.bio || 'No bio available'}</p>

                                <div className="flex flex-wrap gap-1">
                                  {otherUser.interests?.slice(0, 3).map((interest: string) => (
                                    <Badge key={interest} variant="secondary" className="text-xs">
                                      {interest}
                                    </Badge>
                                  ))}
                                </div>

                                {/* Connection Details */}
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Connection Type:</span>
                                      <span className="font-medium">{connection.collaborationType || 'Partnership'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Project Interest:</span>
                                      <span className="font-medium">{connection.projectInterest || 'General'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Requested On:</span>
                                      <span className="font-medium">{new Date(connection.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {connection.message && (
                                      <div className="mt-2 p-2 bg-white rounded border">
                                        <span className="text-xs text-gray-500">Message:</span>
                                        <p className="text-sm text-gray-700 mt-1">{connection.message}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <div className="flex space-x-2">
                                    {!isRequester && (
                                      <Button 
                                        size="sm" 
                                        className="bg-green-500 hover:bg-green-600 text-white"
                                        onClick={() => handleAcceptConnection(connection._id)}
                                        disabled={processingConnections.has(connection._id)}
                                      >
                                        {processingConnections.has(connection._id) ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            Accepting...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Accept
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleRejectConnection(connection._id)}
                                      disabled={processingConnections.has(connection._id)}
                                    >
                                      {processingConnections.has(connection._id) ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                          Rejecting...
                                        </>
                                      ) : (
                                        'Reject'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Handshake className="w-12 h-12 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Connections Yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start building your sustainable network by connecting with other users. 
                    Discover potential collaborators and partners for your eco-friendly projects.
                  </p>
                  <Button 
                    onClick={() => {
                      const discoverTab = document.querySelector('[data-value="discover"]') as HTMLElement;
                      if (discoverTab) discoverTab.click();
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Discover Users
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
