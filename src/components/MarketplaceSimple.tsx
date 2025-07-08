import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const MarketplaceSimple = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Simplified fetch function
  const fetchItems = async () => {
    try {
      console.log('MarketplaceSimple: Fetching items');
      setLoading(true);
      
      const response = await api.get('/marketplace');
      console.log('MarketplaceSimple API response:', response.data);
      
      if (response.data.success) {
        setItems(response.data.data || []);
      } else {
        throw new Error('API returned success=false');
      }
    } catch (err) {
      console.error('MarketplaceSimple fetch error:', err);
      setError(err.message || 'Error fetching items');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    console.log('MarketplaceSimple component mounted');
    fetchItems();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace (Simple)</h1>
            <p className="text-gray-600">Buy and sell eco-friendly materials and items</p>
          </div>
          <Button 
            onClick={fetchItems}
            className="mt-4 sm:mt-0"
          >
            Refresh Data
          </Button>
        </div>
        
        {/* Debug Info */}
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <div className="text-sm bg-white p-2 rounded mb-2">
              <p>Auth: {user ? 'Logged in' : 'Not logged in'}</p>
              <p>Username: {user?.username || 'None'}</p>
              <p>Loading state: {loading ? 'Loading...' : 'Not loading'}</p>
              <p>Items count: {Array.isArray(items) ? items.length : 'Not an array'}</p>
              <p>Error: {error ? error : 'None'}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Loading State */}
        {loading && (
          <Card className="text-center py-8 mb-6">
            <CardContent>
              <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold">Loading Marketplace Items...</h3>
            </CardContent>
          </Card>
        )}
        
        {/* Error State */}
        {!loading && error && (
          <Card className="text-center py-8 mb-6 border-red-300">
            <CardContent>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Marketplace</h3>
              <p className="mb-4">{error}</p>
              <Button onClick={fetchItems}>Try Again</Button>
            </CardContent>
          </Card>
        )}
        
        {/* Empty State */}
        {!loading && !error && Array.isArray(items) && items.length === 0 && (
          <Card className="text-center py-12 border-green-300">
            <CardContent>
              <h3 className="text-xl font-semibold mb-3">No marketplace items found</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                The marketplace is currently empty. Be the first to list an item for reuse or recycling!
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Items Listing - Very Simple */}
        {!loading && !error && Array.isArray(items) && items.length > 0 && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <Card key={item._id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                  <p className="mt-2 font-bold">₹{item.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
