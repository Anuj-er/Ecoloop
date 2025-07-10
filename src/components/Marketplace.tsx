import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter, MapPin, Eye, Heart, ShoppingCart, AlertTriangle, Package, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SellItemModal } from "./SellItemModal";
import { MarketplaceItemCard } from "./MarketplaceItemCard";
import { MarketplaceItemDetail } from "./MarketplaceItemDetail";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarketplaceItem } from "@/types/marketplace";

export const Marketplace = () => {
  console.log('Marketplace component rendering');
  
  // Add error state to track any errors
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [myItems, setMyItems] = useState<MarketplaceItem[]>([]);
  const [filteredMyItems, setFilteredMyItems] = useState<MarketplaceItem[]>([]);
  const [myItemsFilter, setMyItemsFilter] = useState('all'); // 'all', 'active', 'sold', 'pending_review', 'rejected', 'inactive'
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    materialType: 'all',
    category: 'all',
    condition: 'all',
    minPrice: '',
    maxPrice: '',
    pinCode: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const materialTypes = [
    'cloth', 'wood', 'metal', 'plastic', 'glass', 'paper', 
    'electronics', 'fabric', 'leather', 'other'
  ];

  const categories = [
    'raw-materials', 'finished-goods', 'tools', 'equipment', 
    'craft-supplies', 'textiles', 'furniture', 'electronics'
  ];

  const conditions = ['new', 'like-new', 'good', 'fair', 'poor'];

  const fetchItems = async (page = 1) => {
    try {
      // Reset error state
      setError(null);
      
      console.log('Fetching marketplace items...');
      
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please log in to view marketplace items');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('limit', '12');
      
      if (searchTerm) params.append('search', searchTerm);
      if (filters.materialType && filters.materialType !== 'all') params.append('materialType', filters.materialType);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.condition && filters.condition !== 'all') params.append('condition', filters.condition);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.pinCode) params.append('pinCode', filters.pinCode);

      console.log('Making API request to:', `/marketplace?${params.toString()}`);
      console.log('Using headers:', { Authorization: `Bearer ${token}` });
      
      try {
        const response = await api.get(`/marketplace?${params.toString()}`);
        console.log('API response:', response.data);
        
        if (response.data.success) {
          // Make sure we set an empty array if data is null/undefined
          const allItems = response.data.data || [];
          
          // Filter out user's own items from the public marketplace
          const filteredItems = allItems.filter(item => 
            item.seller && item.seller._id !== user?._id
          );
          
          setItems(filteredItems);
          setTotalPages(Math.ceil(response.data.pagination?.total / 12) || 1);
          
          // Log the items array to confirm it's being set correctly
          console.log('Items set (excluding own items):', filteredItems);
        } else {
          throw new Error(`API returned success=false: ${response.data.message || 'Unknown error'}`);
        }
      } catch (apiError: any) {
        console.error('API request failed:', apiError);
        console.error('Response status:', apiError.response?.status);
        console.error('Response data:', apiError.response?.data);
        
        if (apiError.response?.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`API Error: ${apiError.response?.data?.message || apiError.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchItems:', error);
      toast.error(error.message || 'Failed to load marketplace items');
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch user's own items
  const fetchMyItems = async () => {
    try {
      setError(null);
      setMyItemsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please log in to view your listings');
        return;
      }
      
      console.log('Fetching user\'s marketplace items...');
      
      const response = await api.get('/marketplace/my-items');
      console.log('My items API response:', response.data);
      
      if (response.data.success) {
        setMyItems(response.data.data || []);
        console.log('My items set:', response.data.data || []);
      } else {
        throw new Error(`API returned success=false: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error fetching my items:', error);
      toast.error(error.response?.data?.message || 'Failed to load your listings');
    } finally {
      setMyItemsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Marketplace useEffect running');
    console.log('Auth state:', { isAuthenticated: !!user, user });
    
    // Check for token in localStorage to debug
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    // Only fetch items if we have a token
    if (token) {
      if (activeTab === 'browse') {
        fetchItems(currentPage);
      } else if (activeTab === 'my-listings') {
        fetchMyItems();
      }
    } else {
      console.log('No token available, skipping fetch');
      setLoading(false);
    }
    
    return () => {
      console.log('Marketplace useEffect cleanup');
    };
  }, [currentPage, searchTerm, filters, user, activeTab]);

  // Filter user's own items based on status
  useEffect(() => {
    if (myItemsFilter === 'all') {
      setFilteredMyItems(myItems);
    } else {
      setFilteredMyItems(myItems.filter(item => item.status === myItemsFilter));
    }
  }, [myItems, myItemsFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    // If 'all' is selected, set to empty string (which means no filter)
    const effectiveValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: effectiveValue }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      materialType: 'all',
      category: 'all',
      condition: 'all',
      minPrice: '',
      maxPrice: '',
      pinCode: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleItemClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
  };

  const handleItemSold = async (itemId: string) => {
    // Refresh the items list
    await fetchItems(currentPage);
    toast.success('Item marked as sold!');
  };

  // Function to handle item actions for user's own items
  const handleItemAction = async (itemId: string, action: 'sold' | 'inactive' | 'delete') => {
    try {
      if (action === 'delete') {
        await api.delete(`/marketplace/${itemId}`);
        toast.success('Item deleted successfully');
      } else {
        await api.put(`/marketplace/${itemId}`, { status: action });
        toast.success(`Item marked as ${action}`);
      }
      
      // Refresh my items
      fetchMyItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} item`);
    }
  };

  // Check authentication first
  const token = localStorage.getItem('token');
  
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Marketplace</h1>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-gray-600 mb-4">
                  Please log in to view marketplace items and features.
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => window.location.href = '/login'}>
                    Log In
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/register'}>
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  if (selectedItem) {
    return (
      <MarketplaceItemDetail 
        item={selectedItem} 
        onBack={() => setSelectedItem(null)}
        onItemSold={handleItemSold}
      />
    );
  }

  // Show error if one exists
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-800">Error Loading Marketplace</h2>
              <p className="mb-2">There was a problem loading the marketplace:</p>
              <div className="bg-white p-3 rounded mb-4 border border-red-200">
                <p className="font-mono text-sm text-red-600">{error.message}</p>
              </div>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Force an empty rendering state for safety
  const renderItems = Array.isArray(items) ? items : [];
  
  // Log the state for debugging
  console.log('Marketplace render state:', {
    loading,
    itemsCount: renderItems.length,
    isArrayItems: Array.isArray(items),
    error: error?.message,
    authenticated: !!user,
    hasToken: !!localStorage.getItem('token')
  });
  
  // Log marketplace info to console for debugging purposes
  // but don't display it in the UI
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Marketplace] Debug info:', {
        user: user?.username || 'Not logged in',
        itemsCount: renderItems.length,
        loading,
        error: error?.message || 'None'
      });
    }
  }, [user, renderItems.length, loading, error]);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace</h1>
              <p className="text-gray-600">Buy and sell eco-friendly materials and items</p>
            </div>
            <Button 
              onClick={() => setShowSellModal(true)}
              className="bg-green-600 hover:bg-green-700 mt-4 sm:mt-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Sell Item
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Browse Items
              </TabsTrigger>
              <TabsTrigger value="my-listings" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                My Listings
              </TabsTrigger>
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="space-y-6">
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-6">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search for items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit">Search</Button>
                </div>
              </form>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Select value={filters.materialType} onValueChange={(value) => handleFilterChange('materialType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {materialTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.condition} onValueChange={(value) => handleFilterChange('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {conditions.map(condition => (
                    <SelectItem key={condition} value={condition}>
                      {condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Min Price"
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />

              <Input
                placeholder="Max Price"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Pin Code"
                  value={filters.pinCode}
                  onChange={(e) => handleFilterChange('pinCode', e.target.value)}
                />
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="text-center py-12 border-green-300">
            <CardContent>
              <ShoppingCart className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">No marketplace items found</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'Try adjusting your search criteria or removing some filters' 
                  : 'The marketplace is currently empty. Be the first to list an item for reuse or recycling!'}
              </p>
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={() => setShowSellModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Sell First Item
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="border-green-600 text-green-700"
                >
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {renderItems.map((item) => (
                item && item._id ? (
                  <MarketplaceItemCard
                    key={item._id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ) : (
                  <Card key={Math.random()} className="border-red-300 p-4">
                    <p className="text-sm text-red-600">Invalid item data</p>
                  </Card>
                )
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* My Listings Tab */}
      <TabsContent value="my-listings" className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Listings</h2>
            <p className="text-gray-600">Manage your posted items</p>
          </div>
          <Button 
            onClick={() => setShowSellModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </div>

        {/* Statistics Cards */}
        {!myItemsLoading && myItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {myItems.filter(item => item.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {myItems.filter(item => item.status === 'sold').length}
                </div>
                <div className="text-sm text-gray-600">Sold</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {myItems.filter(item => item.status === 'pending_review').length}
                </div>
                <div className="text-sm text-gray-600">Under Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {myItems.reduce((total, item) => total + (item.views || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Views</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter for My Items */}
        {!myItemsLoading && myItems.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <label className="text-sm font-medium">Filter by status:</label>
                <Select value={myItemsFilter} onValueChange={setMyItemsFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items ({myItems.length})</SelectItem>
                    <SelectItem value="active">Active ({myItems.filter(item => item.status === 'active').length})</SelectItem>
                    <SelectItem value="sold">Sold ({myItems.filter(item => item.status === 'sold').length})</SelectItem>
                    <SelectItem value="pending_review">Under Review ({myItems.filter(item => item.status === 'pending_review').length})</SelectItem>
                    <SelectItem value="rejected">Rejected ({myItems.filter(item => item.status === 'rejected').length})</SelectItem>
                    <SelectItem value="inactive">Inactive ({myItems.filter(item => item.status === 'inactive').length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {myItemsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your listings...</p>
          </div>
        ) : myItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
              <p className="text-gray-600 mb-6">Start selling by creating your first listing</p>
              <Button 
                onClick={() => setShowSellModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMyItems.map((item) => (
              <div key={item._id} className="relative">
                <MarketplaceItemCard
                  item={item}
                  onClick={() => handleItemClick(item)}
                />
                
                {/* Status Badge for own items */}
                <div className="absolute top-2 right-2">
                  {item.status === 'pending_review' && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Eye className="w-3 h-3 mr-1" />
                      Under Review
                    </Badge>
                  )}
                  {item.status === 'rejected' && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                  {item.status === 'sold' && (
                    <Badge variant="default" className="bg-green-600">
                      Sold
                    </Badge>
                  )}
                  {item.status === 'inactive' && (
                    <Badge variant="outline">
                      Inactive
                    </Badge>
                  )}
                </div>

                {/* Action buttons for own items */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 flex gap-1">
                    {item.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemAction(item._id, 'sold');
                          }}
                          className="flex-1 text-xs"
                        >
                          Mark Sold
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemAction(item._id, 'inactive');
                          }}
                          className="flex-1 text-xs"
                        >
                          Deactivate
                        </Button>
                      </>
                    )}
                    {(item.status === 'inactive' || item.status === 'rejected') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this item?')) {
                            handleItemAction(item._id, 'delete');
                          }
                        }}
                        className="flex-1 text-xs"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>

    {/* Sell Item Modal */}
    <SellItemModal
      isOpen={showSellModal}
      onClose={() => setShowSellModal(false)}
      onSuccess={() => {
        setShowSellModal(false);
        // Refresh both tabs
        if (activeTab === 'browse') {
          fetchItems(currentPage);
        } else {
          fetchMyItems();
        }
      }}
    />
  </div>
</div>
  );
};
