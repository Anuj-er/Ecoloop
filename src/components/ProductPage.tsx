import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, MapPin, Eye, Clock, User, Building, Heart, 
  MessageCircle, Share2, Phone, Mail, CheckCircle, AlertTriangle,
  ShoppingCart, CreditCard
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarketplaceItem } from "@/types/marketplace";
import { PaymentModal } from "./PaymentModal";
import { isAmountAboveMinimum } from "@/utils/paymentUtils";
import { CO2SavingsPopup } from './CO2SavingsPopup';

export const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cartItems, setCartItems] = useState<MarketplaceItem[]>([]);
  const [showCO2Modal, setShowCO2Modal] = useState(false);
  const [co2ModalProps, setCO2ModalProps] = useState({ co2Saved: 0, material: '', quantity: 0 });

  // Get user-specific cart key
  const getCartKey = () => {
    return user ? `cart_${user._id}` : 'cart_guest';
  };

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/marketplace/${id}`);
        
        if (response.data.success) {
          setItem(response.data.data);
        } else {
          setError('Failed to load product details');
        }
      } catch (error: any) {
        console.error('Error fetching product:', error);
        setError(error.response?.data?.message || 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    // Load cart from localStorage using user-specific key
    if (user) {
      const savedCart = localStorage.getItem(getCartKey());
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Failed to parse cart data', e);
          localStorage.removeItem(getCartKey());
        }
      }
    }

    fetchItem();
  }, [id, user]);

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

  const handleAddToCart = () => {
    if (!item) return;
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }

    if (item.seller._id === user._id) {
      toast.error('You cannot purchase your own item');
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = cartItems.findIndex(cartItem => cartItem._id === item._id);
    
    let updatedCart;
    if (existingItemIndex >= 0) {
      // Update quantity if item already in cart
      updatedCart = [...cartItems];
      toast.success('Item quantity updated in cart');
    } else {
      // Add new item to cart
      updatedCart = [...cartItems, item];
      toast.success('Item added to cart');
    }
    
    setCartItems(updatedCart);
    localStorage.setItem(getCartKey(), JSON.stringify(updatedCart));
  };

  const handleBuyNow = () => {
    if (!item) return;
    if (!user) {
      toast.error('Please log in to make a purchase');
      return;
    }

    if (item.seller._id === user._id) {
      toast.error('You cannot buy your own item');
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (result: any, co2Saved: number, material: string, quantity: number) => {
    console.log('handlePaymentSuccess called', { co2Saved, material, quantity });
    toast.success('Payment successful!');
    setShowPaymentModal(false);
    setCO2ModalProps({ co2Saved, material, quantity });
    setShowCO2Modal(true);
    
    // Update user's total CO2 saved in the context
    if (user && co2Saved > 0) {
      const newTotalCO2 = (user.totalCO2Saved || 0) + co2Saved;
      updateUser({ totalCO2Saved: newTotalCO2 });
    }
    
    // No automatic redirect - let the CO2 popup handle the redirect when user closes it
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
          
          <Card className="border-red-300">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Product</h2>
              <p className="text-gray-600 mb-4">{error || 'Product not found'}</p>
              <Button onClick={() => navigate('/marketplace')}>
                Return to Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">{/* Back Button */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
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
                    <Badge 
                      className={`absolute top-2 right-2 text-xs ${
                        item.images[selectedImageIndex].aiAnalysis.status === 'usable' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      AI: {Math.round(item.images[selectedImageIndex].aiAnalysis.confidence)}%
                    </Badge>
                  )}

                  {/* Material Type Badge */}
                  <Badge className="absolute top-2 left-2 bg-blue-100 text-blue-800 text-xs">
                    {item.materialType.charAt(0).toUpperCase() + item.materialType.slice(1)}
                  </Badge>

                  {/* Condition Badge */}
                  <Badge className={`absolute bottom-2 right-2 text-xs ${getConditionColor(item.condition)}`}>
                    {item.condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                </div>
              </Card>

              {/* Thumbnail Images */}
              {item.images && item.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {item.images.map((image, index) => (
                    <div 
                      key={index}
                      className={`aspect-square bg-gray-200 cursor-pointer rounded-md overflow-hidden border-2 ${
                        selectedImageIndex === index ? 'border-primary' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={`${item.title} - image ${index + 1}`}
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

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    {item.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                  <div className="flex items-center text-sm text-gray-500">
                    <Eye className="w-4 h-4 mr-1" />
                    <span>{item.views} views</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatTimeAgo(item.createdAt)}</span>
                  </div>
                </div>

                <div className="text-3xl font-bold text-green-600 mb-4">
                  {formatPrice(item.price, item.currency)}
                </div>

                <p className="text-gray-700 mb-6">{item.description}</p>

                {/* Product Specifications */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-sm">
                    <span className="text-gray-500">Material:</span>
                    <span className="ml-2 font-medium">{item.materialType.charAt(0).toUpperCase() + item.materialType.slice(1)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Condition:</span>
                    <span className="ml-2 font-medium">
                      {item.condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Quantity Available:</span>
                    <span className="ml-2 font-medium">{item.quantity}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Location:</span>
                    <span className="ml-2 font-medium">{item.pinCode}</span>
                  </div>
                </div>

                {/* Seller Information */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={item.seller.avatarUrl} />
                        <AvatarFallback>
                          {item.seller.firstName?.[0]}{item.seller.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{item.seller.firstName} {item.seller.lastName}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-3 h-3 mr-1" />
                          <span>Seller</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Purchase Options */}
                <div className="space-y-4">
                  {!isAmountAboveMinimum(item.price, item.currency) && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                      ⚠️ Price below minimum payment amount. Contact seller for offline purchase.
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <Label htmlFor="quantity" className="text-sm font-medium">
                      Quantity:
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), item.quantity))}
                      className="w-20"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddToCart}
                      variant="outline"
                      className="flex-1"
                      disabled={!user || item.seller._id === user._id}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                    
                    <Button
                      onClick={handleBuyNow}
                      className="flex-1"
                      disabled={!user || item.seller._id === user._id || !isAmountAboveMinimum(item.price, item.currency)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Product Information Tabs */}
          <div className="mt-10">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
                <TabsTrigger value="returns">Returns & Policies</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="p-4 bg-white rounded-md mt-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Product Details</h3>
                  <p>{item.description}</p>
                  
                  {item.dimensions && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Dimensions</h4>
                      <ul className="list-disc pl-5 text-sm">
                        {item.dimensions.length && <li>Length: {item.dimensions.length} {item.dimensions.unit || 'cm'}</li>}
                        {item.dimensions.width && <li>Width: {item.dimensions.width} {item.dimensions.unit || 'cm'}</li>}
                        {item.dimensions.height && <li>Height: {item.dimensions.height} {item.dimensions.unit || 'cm'}</li>}
                        {item.dimensions.weight && <li>Weight: {item.dimensions.weight} {item.dimensions.unit === 'kg' ? 'kg' : 'g'}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="shipping" className="p-4 bg-white rounded-md mt-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Shipping Information</h3>
                  <p>Standard shipping is available for this item. Shipping costs will be calculated at checkout based on your location.</p>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Estimated delivery: 3-5 business days</li>
                    <li>Shipping available across India</li>
                    <li>Free shipping for orders above ₹1000</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="returns" className="p-4 bg-white rounded-md mt-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Returns & Policies</h3>
                  <p>Returns accepted within 7 days of delivery for unused items in original packaging.</p>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Contact seller within 7 days of receiving item</li>
                    <li>Return shipping cost is buyer's responsibility</li>
                    <li>Refund will be processed within 3-5 business days after item is received</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && item && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            item={item}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
        
        {/* CO2 Savings Popup */}
        <CO2SavingsPopup
          isOpen={showCO2Modal}
          onClose={() => setShowCO2Modal(false)}
          co2Saved={co2ModalProps.co2Saved}
          materialType={co2ModalProps.material}
          quantity={co2ModalProps.quantity}
          totalCO2Saved={user?.totalCO2Saved}
        />
      </div>
    </>
  );
}; 