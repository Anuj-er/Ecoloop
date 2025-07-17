import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Clock, CheckCircle, XCircle, MapPin, Calendar,
  Download, Eye, Star, MessageCircle, RotateCcw, CreditCard,
  X, ChevronLeft, ChevronRight, Shield, CheckCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface Purchase {
  _id: string;
  itemId?: {
    _id: string;
    title: string;
    description: string;
    images: Array<{
      url: string;
      public_id: string;
    }>;
    seller: {
      _id: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    pinCode: string;
  };
  // For multi-item purchases
  multiItem?: boolean;
  items?: Array<{
    itemId: {
      _id: string;
      title: string;
      description: string;
      images: Array<{
        url: string;
        public_id: string;
      }>;
      seller: {
        _id: string;
        username: string;
        firstName: string;
        lastName: string;
        avatar?: string;
      };
      pinCode: string;
    };
    quantity: number;
    price: number;
    title: string;
  }>;
  amount: number;
  currency: string;
  quantity: number;
  status: string;
  transactionId?: string;
  completedAt?: string;
  createdAt: string;
  failureReason?: string;
}

interface PurchaseStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalSpent: number;
}

// Image Collage Component
const ImageCollage = ({ images, alt }: { images: Array<{url: string, public_id: string}>, alt: string }) => {
  if (!images || images.length === 0) {
    return (
      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
    );
  }
  
  if (images.length === 1) {
    return (
      <img
        src={images[0].url}
        alt={alt}
        className="w-20 h-20 object-cover rounded-lg border"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder.svg';
        }}
      />
    );
  }
  
  // For multiple images, create a collage
  return (
    <div className="w-20 h-20 grid grid-cols-2 grid-rows-2 gap-0.5 rounded-lg overflow-hidden border">
      {images.slice(0, 4).map((image, index) => (
        <div 
          key={image.public_id} 
          className="relative overflow-hidden"
          style={{ 
            position: 'relative',
            height: '100%',
            width: '100%'
          }}
        >
          <img
            src={image.url}
            alt={`${alt} ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-xs font-medium">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Purchase Details Modal Component
const PurchaseDetailsModal = ({ 
  isOpen, 
  onClose, 
  purchase 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  purchase: Purchase | null 
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  
  if (!purchase) return null;
  
  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'escrow_released': 
        return 'bg-green-100 text-green-800';
      case 'pending': 
      case 'escrow_held': 
        return 'bg-yellow-100 text-yellow-800';
      case 'failed': 
        return 'bg-red-100 text-red-800';
      case 'refunded': 
        return 'bg-blue-100 text-blue-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'escrow_released': 
        return <CheckCircle className="w-4 h-4" />;
      case 'pending': 
      case 'escrow_held': 
        return <Clock className="w-4 h-4" />;
      case 'failed': 
        return <XCircle className="w-4 h-4" />;
      case 'refunded': 
        return <RotateCcw className="w-4 h-4" />;
      default: 
        return <Package className="w-4 h-4" />;
    }
  };
  
  // Get current item based on whether it's a multi-item purchase or not
  const currentItem = purchase.multiItem && purchase.items 
    ? purchase.items[activeItemIndex].itemId
    : purchase.itemId;
  
  // Get all images for the current item
  const images = currentItem?.images || [];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {purchase.multiItem && purchase.items 
                  ? `Purchase of ${purchase.items.length} items` 
                  : purchase.itemId?.title || "Purchase Details"}
              </h2>
              <div className="flex items-center mt-1">
                <Badge className={getStatusColor(purchase.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(purchase.status)}
                    <span>{purchase.status.replace('_', ' ').charAt(0).toUpperCase() + purchase.status.replace('_', ' ').slice(1)}</span>
                  </div>
                </Badge>
                <span className="text-sm text-gray-500 ml-2">
                  {formatDate(purchase.createdAt)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Image Gallery */}
            <div className="md:w-1/2 bg-gray-50 p-6 flex flex-col">
              {/* Item Selector for multi-item purchases */}
              {purchase.multiItem && purchase.items && purchase.items.length > 1 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Items in this purchase:</h3>
                  <div className="flex flex-wrap gap-2">
                    {purchase.items.map((item, index) => (
                      <Button
                        key={index}
                        variant={activeItemIndex === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setActiveItemIndex(index);
                          setActiveImageIndex(0);
                        }}
                      >
                        Item {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Main Image */}
              <div className="flex-1 flex items-center justify-center mb-4">
                {images.length > 0 ? (
                  <div className="relative w-full">
                    <img
                      src={images[activeImageIndex].url}
                      alt={currentItem?.title || "Product image"}
                      className="max-h-[300px] mx-auto object-contain rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                    
                    {/* Image Navigation */}
                    {images.length > 1 && (
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-80"
                          onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-80"
                          onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {images.map((image, index) => (
                    <div
                      key={image.public_id}
                      className={`w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 ${
                        activeImageIndex === index ? 'border-primary' : 'border-transparent'
                      }`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Purchase Details */}
            <div className="md:w-1/2 p-6 overflow-y-auto">
              {purchase.multiItem && purchase.items ? (
                /* Multi-item purchase details */
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {purchase.items[activeItemIndex].title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {currentItem?.description}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs text-gray-500">Price</h4>
                        <p className="font-medium text-green-600">
                          {formatPrice(purchase.items[activeItemIndex].price, purchase.currency)}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs text-gray-500">Quantity</h4>
                        <p className="font-medium">{purchase.items[activeItemIndex].quantity}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs text-gray-500">Seller</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={currentItem?.seller.avatar} />
                          <AvatarFallback className="text-xs">
                            {currentItem?.seller.firstName?.[0]}{currentItem?.seller.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {currentItem?.seller.firstName} {currentItem?.seller.lastName}
                        </span>
                      </div>
                    </div>
                    
                    {currentItem?.pinCode && (
                      <div>
                        <h4 className="text-xs text-gray-500">Shipping From</h4>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {currentItem.pinCode}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Order Summary</h3>
                    <div className="space-y-2">
                      {purchase.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.title} x{item.quantity}
                          </span>
                          <span>{formatPrice(item.price * item.quantity, purchase.currency)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(purchase.amount, purchase.currency)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {purchase.transactionId && (
                    <div>
                      <h4 className="text-xs text-gray-500">Transaction ID</h4>
                      <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                        {purchase.transactionId}
                      </p>
                    </div>
                  )}
                  
                  {purchase.status === 'failed' && purchase.failureReason && (
                    <div className="bg-red-50 p-3 rounded">
                      <h4 className="text-sm font-medium text-red-800 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Failure Reason
                      </h4>
                      <p className="text-sm text-red-600 mt-1">{purchase.failureReason}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Single-item purchase details */
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {purchase.itemId?.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {purchase.itemId?.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs text-gray-500">Price</h4>
                      <p className="font-medium text-green-600">
                        {formatPrice(purchase.amount / purchase.quantity, purchase.currency)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs text-gray-500">Quantity</h4>
                      <p className="font-medium">{purchase.quantity}</p>
                    </div>
                    <div>
                      <h4 className="text-xs text-gray-500">Total</h4>
                      <p className="font-semibold text-green-600">
                        {formatPrice(purchase.amount, purchase.currency)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs text-gray-500">Date</h4>
                      <p className="font-medium">{formatDate(purchase.createdAt)}</p>
                    </div>
                  </div>
                  
                  {purchase.itemId?.seller && (
                    <div>
                      <h4 className="text-xs text-gray-500">Seller</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={purchase.itemId.seller.avatar} />
                          <AvatarFallback className="text-xs">
                            {purchase.itemId.seller.firstName?.[0]}{purchase.itemId.seller.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {purchase.itemId.seller.firstName} {purchase.itemId.seller.lastName}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {purchase.itemId?.pinCode && (
                    <div>
                      <h4 className="text-xs text-gray-500">Shipping From</h4>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {purchase.itemId.pinCode}
                      </p>
                    </div>
                  )}
                  
                  {purchase.transactionId && (
                    <div>
                      <h4 className="text-xs text-gray-500">Transaction ID</h4>
                      <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                        {purchase.transactionId}
                      </p>
                    </div>
                  )}
                  
                  {purchase.status === 'failed' && purchase.failureReason && (
                    <div className="bg-red-50 p-3 rounded">
                      <h4 className="text-sm font-medium text-red-800 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Failure Reason
                      </h4>
                      <p className="text-sm text-red-600 mt-1">{purchase.failureReason}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-8 flex gap-2">
                {purchase.status === 'completed' && !purchase.multiItem && (
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Leave Review
                  </Button>
                )}
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  Contact Seller
                </Button>
                {purchase.status === 'pending' && (
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Track Order
                  </Button>
                )}
                {purchase.status === 'escrow_held' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={async () => {
                      if (confirm("Confirm delivery and release payment to the seller?")) {
                        try {
                          const response = await api.post('/payments/confirm-delivery', {
                            transactionId: purchase.transactionId
                          });
                          
                          if (response.data.success) {
                            toast.success('Payment released to the seller');
                            // Update local state or refetch purchases
                            fetchPurchases();
                          } else {
                            toast.error(response.data.message || 'Failed to confirm delivery');
                          }
                        } catch (error: any) {
                          toast.error(error.response?.data?.message || error.message || 'Failed to confirm delivery');
                        }
                      }
                    }}
                  >
                    <CheckCheck className="w-3 h-3" />
                    Confirm Delivery
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Purchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PurchaseStats>({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalSpent: 0
  });
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const navigate = useNavigate();

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/payments/history');
      
      if (response.data.success) {
        const purchaseData = response.data.data || [];
        setPurchases(purchaseData);
        
        // Calculate stats
        const stats = purchaseData.reduce((acc: PurchaseStats, purchase: Purchase) => {
          acc.total++;
          if (purchase.status === 'completed' || purchase.status === 'escrow_released') {
            acc.completed++;
            acc.totalSpent += purchase.amount;
          } else if (purchase.status === 'pending' || purchase.status === 'escrow_held') {
            acc.pending++;
          } else if (purchase.status === 'failed') {
            acc.failed++;
          }
          return acc;
        }, {
          total: 0,
          completed: 0,
          pending: 0,
          failed: 0,
          totalSpent: 0
        });
        
        setStats(stats);
      } else {
        throw new Error(response.data.message || 'Failed to fetch purchases');
      }
    } catch (error: any) {
      console.error('Error fetching purchases:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load purchases');
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'escrow_released': 
        return 'bg-green-100 text-green-800';
      case 'pending': 
      case 'escrow_held': 
        return 'bg-yellow-100 text-yellow-800';
      case 'failed': 
        return 'bg-red-100 text-red-800';
      case 'refunded': 
        return 'bg-blue-100 text-blue-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'escrow_released': 
        return <CheckCircle className="w-4 h-4" />;
      case 'pending': 
      case 'escrow_held': 
        return <Clock className="w-4 h-4" />;
      case 'failed': 
        return <XCircle className="w-4 h-4" />;
      case 'refunded': 
        return <RotateCcw className="w-4 h-4" />;
      default: 
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterPurchases = (status?: string) => {
    if (!status || status === 'all') return purchases;
    
    // Group related statuses
    if (status === 'completed') {
      return purchases.filter(purchase => 
        purchase.status === 'completed' || purchase.status === 'escrow_released'
      );
    }
    if (status === 'pending') {
      return purchases.filter(purchase => 
        purchase.status === 'pending' || purchase.status === 'escrow_held'
      );
    }
    
    return purchases.filter(purchase => purchase.status === status);
  };

  // Confirm delivery function for escrow payments
  const confirmDelivery = async (paymentId: string) => {
    try {
      setLoading(true);
      
      const response = await api.post('/payments/confirm-delivery', { paymentId });
      
      if (response.data.success) {
        toast.success('Delivery confirmed! Escrow funds have been released to the seller.');
        fetchPurchases(); // Refresh the purchase list
      } else {
        throw new Error(response.data.message || 'Failed to confirm delivery');
      }
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to confirm delivery');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to view your purchase history.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="border-red-300 bg-red-50">
            <CardContent className="py-12 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-red-800">Error Loading Purchases</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchPurchases}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase History</h1>
          <p className="text-gray-600">Track your orders and view your purchase history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalSpent, 'INR')}</p>
            </div>
          </div>
        </div>

        {/* Purchase List with Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
                <TabsTrigger value="refunded">Refunded</TabsTrigger>
              </TabsList>
            </div>

            {['all', 'completed', 'pending', 'failed', 'refunded'].map((status) => (
              <TabsContent key={status} value={status} className="px-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-6">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filterPurchases(status === 'all' ? undefined : status).length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {status === 'all' ? '' : status} purchases found
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      {status === 'all' 
                        ? "You haven't made any purchases yet. Browse the marketplace to find items to buy." 
                        : `No ${status} purchases to display.`}
                    </p>
                    <Button onClick={() => navigate('/marketplace')}>
                      Browse Marketplace
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filterPurchases(status === 'all' ? undefined : status).map((purchase) => (
                      <div key={purchase._id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex gap-6">
                          {/* Item Image - Using the new ImageCollage component */}
                          <div className="flex-shrink-0">
                            {purchase.multiItem && purchase.items && purchase.items.length > 0 ? (
                              // Multi-item purchase - show collage of first item's images
                              <ImageCollage 
                                images={purchase.items[0].itemId.images} 
                                alt={purchase.items[0].title} 
                              />
                            ) : purchase.itemId ? (
                              // Single-item purchase
                              <ImageCollage 
                                images={purchase.itemId.images} 
                                alt={purchase.itemId.title} 
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Purchase Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">
                                  {purchase.multiItem && purchase.items ? 
                                    `${purchase.items.length} items purchased` : 
                                    purchase.itemId?.title || "Purchase"}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                                  {purchase.multiItem && purchase.items ? 
                                    purchase.items.map(item => item.title).join(", ") : 
                                    purchase.itemId?.description || ""}
                                </p>
                              </div>
                              <Badge className={`ml-2 ${getStatusColor(purchase.status)}`}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(purchase.status)}
                                  <span>{purchase.status.replace('_', ' ').charAt(0).toUpperCase() + purchase.status.replace('_', ' ').slice(1)}</span>
                                </div>
                              </Badge>
                            </div>

                            {/* Purchase Meta Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div className="flex flex-col">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-semibold text-green-600">
                                  {formatPrice(purchase.amount, purchase.currency)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">Quantity</span>
                                <span className="font-medium">
                                  {purchase.multiItem && purchase.items ? 
                                    purchase.items.reduce((total, item) => total + item.quantity, 0) : 
                                    purchase.quantity}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-gray-500">Date</span>
                                <span className="font-medium">{formatDate(purchase.createdAt)}</span>
                              </div>
                              {(purchase.itemId?.pinCode || (purchase.items && purchase.items[0]?.itemId?.pinCode)) && (
                                <div className="flex flex-col">
                                  <span className="text-gray-500">Shipping From</span>
                                  <span className="font-medium flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {purchase.multiItem && purchase.items ? 
                                      purchase.items[0].itemId.pinCode : 
                                      purchase.itemId?.pinCode}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Seller Info */}
                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                              {purchase.multiItem && purchase.items ? (
                                <div className="flex items-center">
                                  <span>Multiple sellers</span>
                                </div>
                              ) : purchase.itemId?.seller ? (
                                <>
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={purchase.itemId.seller.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {purchase.itemId.seller.firstName?.[0]}{purchase.itemId.seller.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    Sold by {purchase.itemId.seller.firstName} {purchase.itemId.seller.lastName}
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {/* Transaction Details */}
                            {purchase.transactionId && (
                              <div className="text-xs text-gray-500 mb-3 font-mono">
                                Transaction: {purchase.transactionId.substring(0, 8)}...{purchase.transactionId.substring(purchase.transactionId.length - 8)}
                              </div>
                            )}

                            {/* Failure Reason */}
                            {purchase.status === 'failed' && purchase.failureReason && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3 flex items-start">
                                <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{purchase.failureReason}</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs"
                                onClick={() => {
                                  setSelectedPurchase(purchase);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                              {purchase.status === 'completed' && !purchase.multiItem && (
                                <Button variant="outline" size="sm" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Leave Review
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-xs">
                                <MessageCircle className="w-3 h-3 mr-1" />
                                Contact Seller
                              </Button>
                              {purchase.status === 'pending' && (
                                <Button variant="outline" size="sm" className="text-xs">
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Track Order
                                </Button>
                              )}
                              {purchase.status === 'escrow_held' && (
                                <Button 
                                  size="sm" 
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async () => {
                                    if (confirm("Have you received the item? This will release the escrowed payment to the seller.")) {
                                      try {
                                        setLoading(true);
                                        const response = await api.post('/payments/confirm-delivery', {
                                          paymentId: purchase._id
                                        });
                                        
                                        if (response.data.success) {
                                          toast.success('Delivery confirmed! Payment has been released to the seller.');
                                          fetchPurchases();
                                        } else {
                                          toast.error(response.data.message || 'Failed to confirm delivery');
                                        }
                                      } catch (error: any) {
                                        console.error('Error confirming delivery:', error);
                                        toast.error(error.response?.data?.message || 'Failed to confirm delivery');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  disabled={loading}
                                >
                                  <Shield className="w-3 h-3 mr-1" />
                                  Confirm Delivery
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
        
        {/* Purchase Details Modal */}
        <PurchaseDetailsModal 
          isOpen={showDetailsModal} 
          onClose={() => setShowDetailsModal(false)} 
          purchase={selectedPurchase} 
        />
      </div>
    </div>
  );
};
