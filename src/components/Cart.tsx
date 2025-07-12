import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, Trash2, ArrowLeft, CreditCard, 
  AlertTriangle, Package, ChevronRight, Minus, Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarketplaceItem } from "@/types/marketplace";
import { PaymentModal } from "./PaymentModal";
import { isAmountAboveMinimum } from "@/utils/paymentUtils";

export const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [cartItems, setCartItems] = useState<MarketplaceItem[]>([]);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isCheckoutAll, setIsCheckoutAll] = useState(false);

  // Get user-specific cart key
  const getCartKey = () => {
    return user ? `cart_${user._id}` : 'cart_guest';
  };

  useEffect(() => {
    if (user) {
      // Load cart from localStorage using user-specific key
      const savedCart = localStorage.getItem(getCartKey());
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartItems(items);
          
          // Initialize quantities
          const initialQuantities: {[key: string]: number} = {};
          items.forEach((item: MarketplaceItem) => {
            initialQuantities[item._id] = 1;
          });
          setQuantities(initialQuantities);
        } catch (e) {
          console.error('Failed to parse cart data', e);
          localStorage.removeItem(getCartKey());
        }
      }
    }
  }, [user]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item._id !== itemId);
    setCartItems(updatedCart);
    localStorage.setItem(getCartKey(), JSON.stringify(updatedCart));
    toast.success('Item removed from cart');
  };

  const handleQuantityChange = (itemId: string, newQuantity: number, maxQuantity: number) => {
    const validQuantity = Math.min(Math.max(1, newQuantity), maxQuantity);
    setQuantities(prev => ({
      ...prev,
      [itemId]: validQuantity
    }));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const quantity = quantities[item._id] || 1;
      return total + (item.price * quantity);
    }, 0);
  };

  const calculateShipping = (subtotal: number) => {
    // Free shipping for orders above ₹1000
    return subtotal >= 1000 ? 0 : 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    return subtotal + shipping;
  };

  const handleCheckout = (item: MarketplaceItem) => {
    if (!user) {
      toast.error('Please log in to checkout');
      return;
    }

    setSelectedItem(item);
    setIsCheckoutAll(false);
    setShowPaymentModal(true);
  };

  const handleCheckoutAll = () => {
    if (!user) {
      toast.error('Please log in to checkout');
      return;
    }

    // Check if any items are below minimum payment amount
    const hasBelowMinimumItems = cartItems.some(item => !isAmountAboveMinimum(item.price, item.currency));
    if (hasBelowMinimumItems) {
      toast.error('Some items are below the minimum payment amount and cannot be purchased online.');
      return;
    }

    setIsCheckoutAll(true);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (result: any) => {
    toast.success('Payment successful!');
    setShowPaymentModal(false);
    
    // Remove the purchased item(s) from cart
    if (isCheckoutAll) {
      // Clear the entire cart
      setCartItems([]);
      localStorage.setItem(getCartKey(), JSON.stringify([]));
    } else if (selectedItem) {
      // Remove just the selected item
      handleRemoveItem(selectedItem._id);
    }
    
    navigate('/purchases');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please log in to view your cart.</p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button variant="outline" onClick={() => navigate('/register')}>
                  Register
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
          
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your Cart is Empty</h2>
              <p className="text-gray-600 mb-4">Browse the marketplace to add items to your cart.</p>
              <Button onClick={() => navigate('/marketplace')}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
            <p className="text-gray-600 mt-1">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                  Items
                </h2>
              </div>
              
              {cartItems.length > 0 ? (
                <div>
                  {cartItems.map((item, index) => (
                    <div 
                      key={item._id}
                      className={`p-6 ${index < cartItems.length - 1 ? 'border-b' : ''}`}
                    >
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div 
                          className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden cursor-pointer flex-shrink-0"
                          onClick={() => navigate(`/product/${item._id}`)}
                        >
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={item.images[0].url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        
                        {/* Item Details */}
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div 
                              className="font-medium text-lg mb-1 cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/product/${item._id}`)}
                            >
                              {item.title}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item._id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                              {item.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </Badge>
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-none">
                              {item.materialType.charAt(0).toUpperCase() + item.materialType.slice(1)}
                            </Badge>
                            <Badge className="text-xs bg-green-100 text-green-800 border-none">
                              {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-r-none"
                                  onClick={() => handleQuantityChange(
                                    item._id, 
                                    (quantities[item._id] || 1) - 1,
                                    item.quantity
                                  )}
                                  disabled={(quantities[item._id] || 1) <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={quantities[item._id] || 1}
                                  onChange={(e) => handleQuantityChange(
                                    item._id, 
                                    parseInt(e.target.value) || 1,
                                    item.quantity
                                  )}
                                  className="w-12 h-8 text-center rounded-none border-x-0"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-l-none"
                                  onClick={() => handleQuantityChange(
                                    item._id, 
                                    (quantities[item._id] || 1) + 1,
                                    item.quantity
                                  )}
                                  disabled={(quantities[item._id] || 1) >= item.quantity}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-xs text-gray-500">
                                (Max: {item.quantity})
                              </span>
                            </div>
                            
                            <div className="font-semibold text-green-600 text-lg">
                              {formatPrice(item.price * (quantities[item._id] || 1), item.currency)}
                            </div>
                          </div>
                          
                          {!isAmountAboveMinimum(item.price, item.currency) && (
                            <div className="text-xs text-amber-600 mt-2 flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Price below minimum payment amount. Contact seller for offline purchase.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Your Cart is Empty</h3>
                  <p className="text-gray-600 mb-6">Browse the marketplace to add items to your cart.</p>
                  <Button onClick={() => navigate('/marketplace')}>
                    Browse Marketplace
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Order Summary</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(calculateSubtotal(), 'INR')}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      {calculateShipping(calculateSubtotal()) === 0 
                        ? <span className="text-green-600">Free</span> 
                        : formatPrice(calculateShipping(calculateSubtotal()), 'INR')}
                    </span>
                  </div>
                  
                  <div className="border-t pt-4 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal(), 'INR')}</span>
                  </div>
                  
                  <div className="pt-6">
                    {cartItems.some(item => !isAmountAboveMinimum(item.price, item.currency)) && (
                      <div className="text-sm flex items-start p-3 rounded bg-amber-50 border border-amber-200 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-amber-800">
                          Some items are below the minimum payment amount and cannot be purchased online.
                        </span>
                      </div>
                    )}
                    
                    {cartItems.length > 0 && (
                      <div className="space-y-3">
                        {/* Checkout All Button */}
                        {cartItems.length > 1 && (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={cartItems.some(item => !isAmountAboveMinimum(item.price, item.currency))}
                            onClick={handleCheckoutAll}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Checkout All Items (₹{calculateTotal().toLocaleString('en-IN')})
                          </Button>
                        )}

                        {/* Individual Item Purchase Buttons */}
                        {cartItems.map((item) => (
                          <Button
                            key={item._id}
                            className="w-full"
                            disabled={!isAmountAboveMinimum(item.price, item.currency)}
                            onClick={() => handleCheckout(item)}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Buy {item.title.length > 20 ? `${item.title.substring(0, 20)}...` : item.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          item={selectedItem}
          items={isCheckoutAll ? cartItems : undefined}
          quantities={quantities}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}; 