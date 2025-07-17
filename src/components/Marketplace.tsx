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
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarketplaceItem } from "@/types/marketplace";

export const Marketplace = () => {
  console.log('Marketplace component rendering');
  
  // Add error state to track any errors
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [myItems, setMyItems] = useState<MarketplaceItem[]>([]);
  const [filteredMyItems, setFilteredMyItems] = useState<MarketplaceItem[]>([]);
  const [myItemsFilter, setMyItemsFilter] = useState('all'); // 'all', 'active', 'sold', 'pending_review', 'rejected', 'inactive'
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
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

  // Fetch items when component mounts
  useEffect(() => {
    fetchItems();
  }, [currentPage]);

  // Fetch my items when active tab changes
  useEffect(() => {
    if (activeTab === 'my-listings' && user) {
      fetchMyItems();
    }
  }, [activeTab, user]);

  // Filter my items when filter or my items change
  useEffect(() => {
    if (myItems.length > 0) {
      filterMyItems();
    }
  }, [myItemsFilter, myItems]);

  const fetchItems = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (filters.materialType !== 'all') {
        queryParams.append('materialType', filters.materialType);
      }
      
      if (filters.category !== 'all') {
        queryParams.append('category', filters.category);
      }
      
      if (filters.condition !== 'all') {
        queryParams.append('condition', filters.condition);
      }
      
      if (filters.minPrice) {
        queryParams.append('minPrice', filters.minPrice);
      }
      
      if (filters.maxPrice) {
        queryParams.append('maxPrice', filters.maxPrice);
      }
      
      if (filters.pinCode) {
        queryParams.append('pinCode', filters.pinCode);
      }
      
      const response = await api.get(`/marketplace?${queryParams.toString()}`);
      
      if (response.data.success) {
        setItems(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setCurrentPage(response.data.pagination.currentPage);
      } else {
        throw new Error(response.data.message || 'Failed to fetch marketplace items');
      }
    } catch (error: any) {
      console.error('Error fetching marketplace items:', error);
      setError(error);
      toast.error('Failed to load marketplace items');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyItems = async () => {
    try {
      setMyItemsLoading(true);
      const response = await api.get('/marketplace/my-items');
      
      if (response.data.success) {
        setMyItems(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to fetch your listings');
      }
    } catch (error: any) {
      console.error('Error fetching my listings:', error);
      toast.error('Failed to load your listings');
    } finally {
      setMyItemsLoading(false);
    }
  };

  const filterMyItems = () => {
    if (myItemsFilter === 'all') {
      setFilteredMyItems(myItems);
      return;
    }
    
    const filtered = myItems.filter(item => {
      switch (myItemsFilter) {
        case 'active':
          return item.status === 'active';
        case 'sold':
          return item.status === 'sold';
        case 'pending_review':
          return item.status === 'pending_review';
        case 'rejected':
          return item.status === 'rejected';
        case 'inactive':
          return item.status === 'inactive';
        default:
          return true;
      }
    });
    
    setFilteredMyItems(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    fetchItems(1);
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
    fetchItems(1);
  };

  const handleItemSold = async (itemId: string) => {
    await handleItemAction(itemId, 'sold');
    // Refresh the listings
    fetchMyItems();
  };

  const handleItemAction = async (itemId: string, action: 'sold' | 'inactive' | 'delete') => {
    try {
      if (action === 'delete') {
        await api.delete(`/marketplace/${itemId}`);
        toast.success('Item deleted successfully');
      } else {
        await api.put(`/marketplace/${itemId}`, { status: action });
        toast.success(`Item marked as ${action} successfully`);
      }
      fetchMyItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} item`);
    }
  };

  const handleViewCart = () => {
    navigate('/cart');
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
            <div className="flex gap-2 mt-4 sm:mt-0">
              <Button 
                variant="outline"
                onClick={handleViewCart}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                View Cart
              </Button>
              <Button 
                onClick={() => setShowSellModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Sell Item
              </Button>
            </div>
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

              <div>
                <Input
                  placeholder="Min Price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="mb-2"
                />
              </div>

              <div>
                <Input
                  placeholder="Max Price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  className="mb-2"
                />
              </div>

              <div>
                <Input
                  placeholder="Pin Code"
                  value={filters.pinCode}
                  onChange={(e) => setFilters(prev => ({ ...prev, pinCode: e.target.value }))}
                  className="mb-2"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Clear Filters
              </Button>
            </div>
                </CardContent>
              </Card>

              {/* Items Grid */}
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : renderItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Items Found</h2>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || filters.materialType !== 'all' || filters.category !== 'all' || filters.condition !== 'all' || filters.minPrice || filters.maxPrice || filters.pinCode
                        ? 'Try adjusting your search or filters'
                        : 'Be the first to list an item in the marketplace!'}
                    </p>
                    {(searchTerm || filters.materialType !== 'all' || filters.category !== 'all' || filters.condition !== 'all' || filters.minPrice || filters.maxPrice || filters.pinCode) && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
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
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      variant={myItemsFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={myItemsFilter === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('active')}
                    >
                      Active
                    </Button>
                    <Button
                      variant={myItemsFilter === 'sold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('sold')}
                    >
                      Sold
                    </Button>
                    <Button
                      variant={myItemsFilter === 'pending_review' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('pending_review')}
                    >
                      Pending Review
                    </Button>
                    <Button
                      variant={myItemsFilter === 'rejected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('rejected')}
                    >
                      Rejected
                    </Button>
                    <Button
                      variant={myItemsFilter === 'inactive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMyItemsFilter('inactive')}
                    >
                      Inactive
                    </Button>
                  </div>

                  {myItemsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredMyItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Listings Found</h3>
                      <p className="text-gray-600 mb-4">
                        {myItemsFilter !== 'all'
                          ? `You don't have any ${myItemsFilter.replace('_', ' ')} listings`
                          : "You haven't listed any items for sale yet"}
                      </p>
                      <Button onClick={() => setShowSellModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Sell Item
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMyItems.map((item) => (
                        <MarketplaceItemCard
                          key={item._id}
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>

      {/* Sell Item Modal */}
      {showSellModal && (
                  <SellItemModal
            isOpen={showSellModal}
            onClose={() => setShowSellModal(false)}
            onSuccess={() => {
              fetchItems();
              fetchMyItems();
            }}
          />
      )}
    </div>
  );
};
