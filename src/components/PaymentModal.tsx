import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Wallet, AlertCircle, CheckCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { MarketplaceItem } from "@/types/marketplace";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import paymentService, { PaymentDetails, PaymentResult } from "@/services/paymentService";
import { paymentAPI } from "@/lib/api";
import MockPaymentService from "@/services/mockPaymentService";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_key_here');

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
  items?: MarketplaceItem[];
  quantities?: {[key: string]: number};
  onPaymentSuccess: (result: PaymentResult) => void;
}

// Stripe payment form component
const StripePaymentForm = ({ 
  item, 
  items,
  quantities,
  quantity, 
  totalPrice, 
  onSuccess, 
  onError, 
  isProcessing, 
  setIsProcessing,
  shippingInfo
}: {
  item: MarketplaceItem | null;
  items?: MarketplaceItem[];
  quantities?: {[key: string]: number};
  quantity: number;
  totalPrice: number;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
  shippingInfo: any;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  // Determine if we're in multi-item checkout mode
  const isMultiItemCheckout = !!items && items.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent on backend
      let response;
      
      if (isMultiItemCheckout && items) {
        console.log('Creating multi-item payment intent for', items.length, 'items');
        
        // Create a payload with all items and their quantities
        const itemsData = items.map(item => ({
          itemId: item._id,
          quantity: quantities?.[item._id] || 1
        }));
        
        response = await paymentAPI.createPaymentIntent({
          items: itemsData,
          shippingInfo
        });
      } else if (item) {
        console.log('Creating payment intent for item:', item._id, 'quantity:', quantity);
        
        response = await paymentAPI.createPaymentIntent({
          itemId: item._id,
          quantity,
          shippingInfo
        });
      } else {
        throw new Error('No items selected for checkout');
      }

      console.log('Payment intent response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      const { clientSecret, paymentId } = response.data;
      console.log('Payment intent created:', { paymentId, clientSecret: clientSecret ? 'present' : 'missing' });

      // Confirm payment with Stripe
      console.log('Confirming payment with Stripe...');
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: shippingInfo.fullName,
            email: shippingInfo.email,
            address: {
              line1: shippingInfo.addressLine1,
              line2: shippingInfo.addressLine2,
              city: shippingInfo.city,
              state: shippingInfo.state,
              postal_code: shippingInfo.postalCode,
              country: shippingInfo.country
            }
          },
        }
      });

      if (error) {
        console.error('Stripe payment error:', error);
        onError(error.message || 'Payment failed');
        return;
      }

      console.log('Payment intent status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        // Verify payment on backend
        console.log('Verifying payment on backend...');
        try {
          const verifyResponse = await paymentAPI.verifyPayment({
            paymentIntentId: paymentIntent.id,
            paymentId
          });

          console.log('Payment verification response:', verifyResponse.data);

          if (verifyResponse.data.success) {
            console.log('Payment successful!');
            onSuccess({
              success: true,
              transactionId: paymentIntent.id
            });
          } else {
            console.error('Payment verification failed:', verifyResponse.data.message);
            onError(verifyResponse.data.message || 'Payment verification failed');
          }
        } catch (verifyError: any) {
          console.error('Payment verification error:', verifyError);
          if (verifyError.response?.data?.message) {
            onError(`Verification error: ${verifyError.response.data.message}`);
          } else if (verifyError.message) {
            onError(`Verification error: ${verifyError.message}`);
          } else {
            onError('Payment verification failed - please contact support');
          }
        }
      } else {
        console.error('Payment not completed, status:', paymentIntent.status);
        onError(`Payment not completed. Status: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Handle specific minimum amount error
      if (error.response?.data?.error === 'AMOUNT_TOO_LOW') {
        const { minimumAmount, currentAmount, currency } = error.response.data;
        onError(`Payment amount too low. Minimum: ${currency === 'INR' ? '₹' : '$'}${minimumAmount}, Current: ${currency === 'INR' ? '₹' : '$'}${currentAmount}`);
      } else if (error.response?.data?.message) {
        onError(error.response.data.message);
      } else {
        onError((error as Error).message || 'Payment failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ₹${totalPrice.toLocaleString('en-IN')}`
        )}
      </Button>
    </form>
  );
};

export const PaymentModal = ({ isOpen, onClose, item, items, quantities, onPaymentSuccess }: PaymentModalProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [ethPrice, setEthPrice] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'crypto' | 'fiat'>('fiat');
  const [quantity, setQuantity] = useState(1);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment'>('shipping');
  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN', // ISO country code
    phone: '',
    email: user?.email || ''
  });

  // Determine if we're in multi-item checkout mode
  const isMultiItemCheckout = !!items && items.length > 0;
  
  // Calculate totals for multi-item checkout
  const calculateTotalPrice = () => {
    if (isMultiItemCheckout && items && quantities) {
      return items.reduce((total, item) => {
        const itemQuantity = quantities[item._id] || 1;
        return total + (item.price * itemQuantity);
      }, 0);
    }
    
    return item ? item.price * quantity : 0;
  };

  // Country code to name mapping
  const countryNames: Record<string, string> = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia'
  };

  useEffect(() => {
    if (isOpen) {
      checkWalletConnection();
      convertPriceToEth();
    }
  }, [isOpen, calculateTotalPrice()]);

  const checkWalletConnection = async () => {
    if (paymentService.isMetaMaskAvailable()) {
      try {
        const accounts = await paymentService.connectWallet();
        if (accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
          const balance = await paymentService.getWalletBalance(accounts[0]);
          setWalletBalance(balance);
        }
      } catch (error) {
        console.log('Wallet not connected');
      }
    }
  };

  const convertPriceToEth = async () => {
    try {
      const totalPrice = calculateTotalPrice();
      const ethAmount = await paymentService.convertUsdToEth(totalPrice);
      setEthPrice(ethAmount);
    } catch (error) {
      console.error('Failed to convert price to ETH:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setIsProcessing(true);
      const accounts = await paymentService.connectWallet();
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        const balance = await paymentService.getWalletBalance(accounts[0]);
        setWalletBalance(balance);
        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process fiat payment using Stripe with backend integration
  const processFiatPayment = async (): Promise<PaymentResult> => {
    // Check if we're in mock mode
    const paymentMode = import.meta.env.VITE_PAYMENT_MODE;
    
    if (paymentMode === 'mock') {
      toast.info('Using mock payment for testing...');
      return await MockPaymentService.processMockPayment(calculateTotalPrice(), item?.currency || 'INR');
    }

    // For Stripe, this will be handled by the StripePaymentForm component
    return { success: false, error: 'Use Stripe payment form' };
  };

  const handleCryptoPayment = async () => {
    if (!user) {
      toast.error('Please login to make a purchase');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentDetails: PaymentDetails = {
        itemId: item?._id,
        sellerId: item?.seller._id,
        buyerId: user._id,
        amount: ethPrice,
        currency: 'ETH',
        paymentMethod: {
          type: 'crypto',
          currency: 'ETH',
          network: 'ethereum'
        },
        shippingInfo
      };
      
      const result = await paymentService.processCryptoPayment(paymentDetails);

      if (result.success) {
        toast.success('Payment successful!');
        onPaymentSuccess(result);
        onClose();
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      toast.error('Payment failed: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePaymentSuccess = (result: PaymentResult) => {
    console.log('Stripe payment successful:', result);
    toast.success('Payment successful! Your order is being processed.');
    onPaymentSuccess(result);
    onClose();
  };

  const handleStripePaymentError = (error: string) => {
    console.error('Stripe payment error:', error);
    toast.error(error);
  };

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateShippingInfo = () => {
    const requiredFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'phone', 'email'];
    const missingFields = requiredFields.filter(field => !shippingInfo[field as keyof typeof shippingInfo]);
    
    if (missingFields.length > 0) {
      const formattedFields = missingFields.map(field => 
        field.replace(/([A-Z])/g, ' $1').toLowerCase()
      ).join(', ');
      
      toast.error(`Please fill in the following fields: ${formattedFields}`);
      return false;
    }
    
    return true;
  };

  const handleContinueToPayment = () => {
    if (validateShippingInfo()) {
      setCurrentStep('payment');
    }
  };

  const totalPrice = calculateTotalPrice();
  const totalEthPrice = ethPrice * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby="payment-dialog-description">
        <div className="flex h-[80vh] max-h-[600px]">
          {/* Left panel - Order summary */}
          <div className="w-1/3 bg-gray-50 p-6 border-r">
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
              
              {isMultiItemCheckout && items ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">{items.length} items in cart</p>
                  <div className="max-h-[200px] overflow-y-auto space-y-3">
                    {items.map(cartItem => (
                      <div key={cartItem._id} className="flex gap-2 pb-2 border-b">
                        <img
                          src={cartItem.images?.[0]?.url || '/placeholder.svg'}
                          alt={cartItem.title}
                          className="w-10 h-10 object-cover rounded-sm"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium truncate">{cartItem.title}</p>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>x{quantities?.[cartItem._id] || 1}</span>
                            <span>₹{cartItem.price.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : item ? (
                <div className="flex gap-3 mb-4">
                  <img
                    src={item.images?.[0]?.url || '/placeholder.svg'}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{item.materialType}</Badge>
                      <Badge variant="outline" className="text-xs">{item.condition}</Badge>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 text-sm border-t border-b py-3 my-3">
                {isMultiItemCheckout ? (
                  items?.map(cartItem => (
                    <div key={cartItem._id} className="flex justify-between text-xs">
                      <span className="truncate max-w-[120px]">{cartItem.title}:</span>
                      <span>₹{(cartItem.price * (quantities?.[cartItem._id] || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  ))
                ) : item ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span>₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                  </>
                ) : null}
                
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {!isMultiItemCheckout && item && (
                <div className="text-xs text-gray-500">
                  <p className="mb-2">Seller: {item.seller.firstName} {item.seller.lastName}</p>
                  <p>Item will be shipped from pincode {item.pinCode}</p>
                </div>
              )}
            </div>

            <div className="mt-auto">
              {currentStep === 'payment' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setCurrentStep('shipping')}
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Back to Shipping
                </Button>
              )}
            </div>
          </div>

          {/* Right panel - Form content */}
          <div className="w-2/3 p-6 overflow-y-auto">
            <DialogHeader className="mb-6 pb-2 border-b">
              <DialogTitle>
                {currentStep === 'shipping' ? 'Shipping Information' : 'Payment Method'}
              </DialogTitle>
              <DialogDescription id="payment-dialog-description" className="text-sm">
                {currentStep === 'shipping' 
                  ? 'Please enter your shipping details to continue with your purchase.' 
                  : 'Complete your purchase by selecting a payment method.'}
              </DialogDescription>
            </DialogHeader>

            {currentStep === 'shipping' ? (
              /* Shipping Information Form */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name*</Label>
                    <Input 
                      id="fullName"
                      name="fullName"
                      value={shippingInfo.fullName}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email*</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number*</Label>
                    <Input 
                      id="phone"
                      name="phone"
                      value={shippingInfo.phone}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country*</Label>
                    <Input 
                      id="country"
                      name="country"
                      value={countryNames[shippingInfo.country] || shippingInfo.country}
                      onChange={handleShippingInfoChange}
                      disabled
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1*</Label>
                    <Input 
                      id="addressLine1"
                      name="addressLine1"
                      value={shippingInfo.addressLine1}
                      onChange={handleShippingInfoChange}
                      placeholder="Street address, P.O. box, etc."
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input 
                      id="addressLine2"
                      name="addressLine2"
                      value={shippingInfo.addressLine2}
                      onChange={handleShippingInfoChange}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City*</Label>
                    <Input 
                      id="city"
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your city"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State*</Label>
                    <Input 
                      id="state"
                      name="state"
                      value={shippingInfo.state}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your state"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code*</Label>
                    <Input 
                      id="postalCode"
                      name="postalCode"
                      value={shippingInfo.postalCode}
                      onChange={handleShippingInfoChange}
                      placeholder="Enter your postal code"
                    />
                  </div>
                </div>
                
                <div className="pt-4 mt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={handleContinueToPayment}
                  >
                    Continue to Payment
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Payment Method Selection */
              <div className="space-y-6">
                {/* Shipping Summary */}
                <div className="bg-gray-50 p-3 rounded-md mb-6">
                  <h4 className="font-medium text-sm mb-2">Shipping To:</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{shippingInfo.fullName}</p>
                    <p>{shippingInfo.addressLine1}</p>
                    {shippingInfo.addressLine2 && <p>{shippingInfo.addressLine2}</p>}
                    <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}</p>
                    <p>{countryNames[shippingInfo.country] || shippingInfo.country}</p>
                  </div>
                </div>

                <Tabs value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'crypto' | 'fiat')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="fiat" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Card Payment
                    </TabsTrigger>
                    <TabsTrigger value="crypto" className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Cryptocurrency
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fiat" className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Secure payment via Stripe
                    </div>
                    
                    {/* Check if we're in mock mode */}
                    {import.meta.env.VITE_PAYMENT_MODE === 'mock' ? (
                      <Button
                        onClick={async () => {
                          setIsProcessing(true);
                          const result = await processFiatPayment();
                          if (result.success) {
                            handleStripePaymentSuccess(result);
                          } else {
                            handleStripePaymentError(result.error || 'Payment failed');
                          }
                          setIsProcessing(false);
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Pay ₹${calculateTotalPrice().toLocaleString('en-IN')} (Mock)`
                        )}
                      </Button>
                    ) : (
                      <Elements stripe={stripePromise}>
                        <StripePaymentForm
                          item={item}
                          items={items}
                          quantities={quantities}
                          quantity={quantity}
                          totalPrice={calculateTotalPrice()}
                          onSuccess={handleStripePaymentSuccess}
                          onError={handleStripePaymentError}
                          isProcessing={isProcessing}
                          setIsProcessing={setIsProcessing}
                          shippingInfo={shippingInfo}
                        />
                      </Elements>
                    )}
                  </TabsContent>

                  <TabsContent value="crypto" className="space-y-4">
                    {!paymentService.isMetaMaskAvailable() ? (
                      <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">MetaMask Required</p>
                          <p className="text-sm text-yellow-600">
                            Please install MetaMask to pay with cryptocurrency.
                          </p>
                        </div>
                      </div>
                    ) : !walletConnected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                          <Wallet className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-800">Connect Your Wallet</p>
                            <p className="text-sm text-blue-600">
                              Connect your MetaMask wallet to pay with ETH.
                            </p>
                          </div>
                        </div>
                        <Button onClick={connectWallet} disabled={isProcessing} className="w-full">
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect Wallet'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">Wallet Connected</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Wallet Address:</span>
                            <span className="font-mono">
                              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Balance:</span>
                            <span>{parseFloat(walletBalance).toFixed(4)} ETH</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Price in ETH:</span>
                            <span>{totalEthPrice.toFixed(6)} ETH</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleCryptoPayment}
                          disabled={isProcessing || parseFloat(walletBalance) < totalEthPrice}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Pay ${totalEthPrice.toFixed(6)} ETH`
                          )}
                        </Button>
                        
                        {parseFloat(walletBalance) < totalEthPrice && (
                          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                            Insufficient ETH balance for this purchase.
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
