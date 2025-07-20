import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Wallet, AlertCircle, CheckCircle, ArrowLeft, ChevronRight, Info } from "lucide-react";
import { MarketplaceItem } from "@/types/marketplace";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import paymentService, { PaymentDetails, PaymentResult } from "@/services/paymentService";
import { paymentAPI } from "@/lib/api";
import MockPaymentService from "@/services/mockPaymentService";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ethers } from 'ethers';
import { usersAPI } from '@/lib/api';
import Confetti from 'react-confetti';
import { CO2SavingsPopup } from './CO2SavingsPopup';

// CO2 savings per kg for different materials
const CO2_SAVINGS_PER_KG = {
  cloth: 5.0,
  metal: 9.0,
  plastic: 2.5,
  glass: 0.7,
  paper: 3.0,
  wood: 1.1,
  electronics: 12.0,
  leather: 6.0,
  fabric: 4.0,
  other: 1.0
};

// Extend Window interface to include ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

// ABI for the EcoLoopEscrow contract
const ESCROW_CONTRACT_ABI = [
  {
    "type": "function",
    "name": "createEscrow",
    "stateMutability": "payable",
    "inputs": [
      {"name": "_seller", "type": "address"},
      {"name": "_itemId", "type": "string"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "confirmDelivery",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "_itemId", "type": "string"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getEscrowDetails",
    "stateMutability": "view",
    "inputs": [
      {"name": "_itemId", "type": "string"}
    ],
    "outputs": [
      {"name": "buyer", "type": "address"},
      {"name": "seller", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "isDelivered", "type": "bool"},
      {"name": "isCompleted", "type": "bool"},
      {"name": "createdAt", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "withdraw",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  }
];

// Contract address for the EcoLoopEscrow contract on Sepolia
const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_key_here');

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
  items?: MarketplaceItem[];
  quantities?: {[key: string]: number};
  onPaymentSuccess: (result: PaymentResult, co2Saved: number, material: string, quantity: number) => void;
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

// Crypto payment form component
const CryptoPaymentForm = ({ 
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
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [ethAmount, setEthAmount] = useState('0');
  const [ethPrice, setEthPrice] = useState(0);
  const [useEscrow, setUseEscrow] = useState(true);
  const { user } = useAuth();
  
  // Determine if we're in multi-item checkout mode
  const isMultiItemCheckout = !!items && items.length > 0;

  useEffect(() => {
    // Check if wallet is already connected
    checkWalletConnection();
    
    // Convert price to ETH
    convertPriceToEth();
  }, []);
  
  const checkWalletConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
          
          // Get wallet balance
          const balance = await paymentService.getWalletBalance(accounts[0]);
          setWalletBalance(balance);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };
  
  const convertPriceToEth = async () => {
    try {
      // Get current ETH price
      const ethToInr = 200000; // Mock rate: 1 ETH = 200,000 INR
      setEthPrice(ethToInr);
      
      // Convert total price to ETH
      const ethAmount = totalPrice / ethToInr;
      setEthAmount(ethAmount.toFixed(6));
    } catch (error) {
      console.error('Error converting price to ETH:', error);
    }
  };
  
  const connectWallet = async () => {
    try {
      setIsProcessing(true);
      
      // Check if on Sepolia testnet
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Sepolia testnet chain ID is 0xaa36a7 (11155111 in decimal)
        if (chainId !== '0xaa36a7') {
          try {
            // Try to switch to Sepolia
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            });
          } catch (switchError: any) {
            // If Sepolia is not added, add it
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xaa36a7',
                    chainName: 'Sepolia Testnet',
                    nativeCurrency: {
                      name: 'Sepolia ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://sepolia.infura.io/v3/'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              });
            } else {
              throw switchError;
            }
          }
        }
        
        // Connect wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        
        // Get wallet balance
        const balance = await paymentService.getWalletBalance(accounts[0]);
        setWalletBalance(balance);
        
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('Please install MetaMask to make crypto payments');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletBalance('0');
    toast.success('Wallet disconnected');
  };
  
  const handleCryptoPayment = async () => {
    if (!walletConnected) {
      onError('Please connect your wallet first');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let transactionHash;
      let escrowId;
      
      // Debug logging
      console.log('🔍 Payment Debug Info:');
      console.log('- Item:', item);
      console.log('- Use Escrow:', useEscrow);
      console.log('- Escrow Contract Address:', ESCROW_CONTRACT_ADDRESS);
      console.log('- Seller Crypto Address:', item?.paymentPreferences?.cryptoAddress);
      console.log('- Wallet Address:', walletAddress);
      console.log('- ETH Amount:', ethAmount);
      
      if (useEscrow) {
        // Use escrow contract for payment
        if (!window.ethereum) throw new Error('MetaMask not installed');
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Create contract instance
        const escrowContract = new ethers.Contract(
          ESCROW_CONTRACT_ADDRESS,
          ESCROW_CONTRACT_ABI,
          signer
        );
        
        // Get seller's address
        const sellerAddress = item?.paymentPreferences?.cryptoAddress;
        if (!sellerAddress) throw new Error('Seller crypto address not found');
        
        // Get buyer's address
        const currentAddress = await signer.getAddress();
        
        // Check if buyer and seller are the same
        if (sellerAddress.toLowerCase() === currentAddress.toLowerCase()) {
          throw new Error('You cannot buy your own item');
        }
        
        console.log('📋 Checking for existing escrow...');
        
        // Create a unique escrow ID by combining item ID, buyer address, and timestamp
        // Format: itemId-buyerAddress-timestamp
        // This format must be consistent across frontend, backend, and contract
        const timestamp = Date.now();
        escrowId = `${item?._id}-${currentAddress.toLowerCase()}-${timestamp}`;
        
        console.log('Using unique escrow ID:', escrowId);
        console.log('- Item ID:', item?._id);
        console.log('- Buyer address:', currentAddress.toLowerCase());
        console.log('- Timestamp:', timestamp);
        
        // Check if escrow already exists for this unique ID
        try {
          const escrowDetails = await escrowContract.getEscrowDetails(escrowId);
          const escrowExists = escrowDetails.buyer !== '0x0000000000000000000000000000000000000000';
          
          if (escrowExists) {
            console.log('⚠️ You already have an escrow for this item:');
            console.log('- Buyer:', escrowDetails.buyer);
            console.log('- Seller:', escrowDetails.seller);
            console.log('- Amount:', ethers.utils.formatEther(escrowDetails.amount), 'ETH');
            console.log('- Is Delivered:', escrowDetails.isDelivered);
            console.log('- Is Completed:', escrowDetails.isCompleted);
            
            if (escrowDetails.isCompleted) {
              // If escrow is already completed, allow creating a new one (this is a new purchase)
              console.log('✅ Previous escrow is completed, allowing new purchase');
            } else {
              // If escrow exists but is not completed, don't allow creating a new one
              throw new Error('You already have an active escrow for this item. Please check your purchase history.');
            }
          }
        } catch (error: any) {
          // If it's our custom error about existing escrow, throw it
          if (error.message.includes('already have an active escrow')) {
            throw error;
          }
          // Otherwise, continue (might be a contract call error for non-existent escrow)
          console.log('No existing escrow found for unique ID (or error checking):', error.message);
        }
        
        console.log('📋 Creating new escrow with:');
        console.log('- Seller Address:', sellerAddress);
        console.log('- Unique Escrow ID:', escrowId);
        console.log('- Amount:', ethAmount, 'ETH');
        
        // Create escrow transaction with unique ID
        const tx = await escrowContract.createEscrow(
          sellerAddress,
          escrowId,
          {
            value: ethers.utils.parseEther(ethAmount),
            gasLimit: 300000
          }
        );
        
        console.log('⏳ Transaction sent:', tx.hash);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        transactionHash = receipt.transactionHash;
        
        console.log('✅ Escrow created:', transactionHash);
      } else {
        // Direct payment
        if (!window.ethereum) throw new Error('MetaMask not installed');
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Get seller's address
        const sellerAddress = item?.paymentPreferences?.cryptoAddress;
        if (!sellerAddress) throw new Error('Seller crypto address not found');
        
        console.log('💸 Sending direct payment to:', sellerAddress);
        
        // Send ETH directly to seller
        const tx = await signer.sendTransaction({
          to: sellerAddress,
          value: ethers.utils.parseEther(ethAmount)
        });
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        transactionHash = receipt.transactionHash;
        
        console.log('✅ Direct payment sent:', transactionHash);
      }
      
      if (!transactionHash) throw new Error('Transaction failed');
      
      // Notify backend about the crypto payment
      const paymentData: any = {
        itemId: item?._id,
        quantity,
        transactionHash,
        walletAddress,
        useEscrow
      };
      
      // Add escrow ID if using escrow
      if (useEscrow && escrowId) {
        paymentData.escrowId = escrowId;
      }
      
      console.log('📤 Sending to backend:', paymentData);
      
      const response = await paymentAPI.processCryptoPayment(paymentData);
      
      console.log('📥 Backend response:', response.data);
      
      if (response.data.success) {
        onSuccess({
          success: true,
          transactionHash,
          transactionId: response.data.paymentId
        });
      } else {
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      setIsProcessing(false);
      
      // Parse error message for better user experience
      let errorMessage = error.message || 'Payment failed';
      
      // Check for specific error messages from the contract
      if (errorMessage.includes('Buyer and seller cannot be the same')) {
        errorMessage = 'You cannot buy your own item. Please use a different wallet address.';
      } else if (errorMessage.includes('Escrow already exists for this item')) {
        errorMessage = 'You already have an active escrow for this item. Please check your purchase history.';
      } else if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in your wallet.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Your wallet has insufficient funds for this transaction.';
      } else if (errorMessage.includes('CALL_EXCEPTION')) {
        // For generic contract errors, try to extract the reason
        const reasonMatch = error.message.match(/reason="([^"]+)"/);
        if (reasonMatch && reasonMatch[1]) {
          errorMessage = `Contract error: ${reasonMatch[1]}`;
        } else {
          errorMessage = 'Transaction failed. Please check your wallet and try again.';
        }
      }
      
      console.error('❌ Crypto payment error:', error);
      toast.error(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Crypto Payment (ETH on Sepolia Testnet)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Amount:</span>
            <span className="font-semibold">{ethAmount} ETH</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Conversion Rate:</span>
            <span>1 ETH = ₹{ethPrice.toLocaleString('en-IN')}</span>
          </div>
          
          {item?.paymentPreferences?.escrowEnabled && (
            <div className="flex items-center space-x-2 border p-2 rounded-md bg-blue-50">
              <input
                type="checkbox"
                id="useEscrow"
                checked={useEscrow}
                onChange={(e) => setUseEscrow(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useEscrow" className="flex items-center cursor-pointer">
                <Info className="w-4 h-4 mr-1 text-blue-500" />
                Use Escrow Protection
              </Label>
            </div>
          )}
          
          {useEscrow && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                Escrow protection holds your payment until you confirm delivery of the item. This protects both buyers and sellers.
              </AlertDescription>
            </Alert>
          )}
          
          {walletConnected ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Wallet:</span>
                <span className="font-mono text-sm truncate max-w-[200px]">{walletAddress}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Balance:</span>
                <span>{parseFloat(walletBalance).toFixed(4)} ETH</span>
              </div>
              
              {parseFloat(walletBalance) < parseFloat(ethAmount) && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-sm">
                    Insufficient balance. You need at least {ethAmount} ETH.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCryptoPayment}
                  disabled={isProcessing || parseFloat(walletBalance) < parseFloat(ethAmount)}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${ethAmount} ETH`
                  )}
                </Button>
                
                <Button
                  onClick={disconnectWallet}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </Button>
          )}
          
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              This is using the Sepolia testnet. Make sure your wallet is configured for Sepolia.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export const PaymentModal = ({ isOpen, onClose, item, items, quantities, onPaymentSuccess }: PaymentModalProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [showCO2Modal, setShowCO2Modal] = useState(false);
  const [co2Saved, setCo2Saved] = useState(0);
  const [material, setMaterial] = useState('');
  const [quantityVal, setQuantityVal] = useState(0);

  // Determine if we're in multi-item checkout mode
  const isMultiItemCheckout = !!items && items.length > 0;
  
  // Calculate totals for multi-item checkout
  const calculateTotalPrice = () => {
    if (isMultiItemCheckout && items) {
      return items.reduce((total, item) => {
        const itemQuantity = quantities?.[item._id] || 1;
        return total + (item.price * itemQuantity);
      }, 0);
    } else if (item) {
      return item.price * quantity;
    }
    return 0;
  };

  const totalPrice = calculateTotalPrice();
  
  // Determine available payment methods based on seller preferences
  const getAvailablePaymentMethods = () => {
    if (isMultiItemCheckout && items) {
      // For multi-item checkout, only show payment methods that all sellers accept
      const allAcceptFiat = items.every(item => item.paymentPreferences?.acceptsFiat !== false);
      const allAcceptCrypto = items.every(item => item.paymentPreferences?.acceptsCrypto === true);
      
      return {
        fiat: allAcceptFiat,
        crypto: allAcceptCrypto
      };
    } else if (item) {
      return {
        fiat: item.paymentPreferences?.acceptsFiat !== false,
        crypto: item.paymentPreferences?.acceptsCrypto === true
      };
    }
    
    // Default if no item data available
    return { fiat: true, crypto: false };
  };
  
  const availablePaymentMethods = getAvailablePaymentMethods();
  
  // Set default payment method based on available methods
  useEffect(() => {
    if (!availablePaymentMethods.fiat && availablePaymentMethods.crypto) {
      setSelectedPaymentMethod('crypto');
    } else {
      setSelectedPaymentMethod('fiat');
    }
  }, [availablePaymentMethods]);

  const handleStripePaymentSuccess = async (result: PaymentResult) => {
    // Calculate CO2 saved for this transaction
    let mat = '';
    let qty = 0;
    let co2 = 0;
    if (isMultiItemCheckout && items) {
      const firstItem = items[0];
      mat = firstItem.materialType;
      qty = quantities?.[firstItem._id] || 1;
      const co2PerKg = CO2_SAVINGS_PER_KG[mat] || CO2_SAVINGS_PER_KG['other'];
      co2 = co2PerKg * qty;
    } else if (item) {
      mat = item.materialType;
      qty = quantity;
      const co2PerKg = CO2_SAVINGS_PER_KG[mat] || CO2_SAVINGS_PER_KG['other'];
      co2 = co2PerKg * qty;
    }
    onPaymentSuccess(result, co2, mat, qty);
  };

  const handleStripePaymentError = (error: string) => {
    toast.error(error);
    setIsProcessing(false);
  };
  
  const handleCryptoPaymentSuccess = (result: PaymentResult) => {
    // Calculate CO2 savings for crypto payment
    let co2Saved = 0;
    let materialType = 'other';
    let totalQuantity = 0;

    if (items && quantities) {
      // Multi-item purchase
      items.forEach(item => {
        const qty = quantities[item._id] || 0;
        const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType as keyof typeof CO2_SAVINGS_PER_KG] || CO2_SAVINGS_PER_KG.other;
        co2Saved += co2PerKg * qty;
        totalQuantity += qty;
        materialType = item.materialType; // Use last item's material type for display
      });
    } else if (item) {
      // Single item purchase
      const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType as keyof typeof CO2_SAVINGS_PER_KG] || CO2_SAVINGS_PER_KG.other;
      co2Saved = co2PerKg * quantity;
      materialType = item.materialType;
      totalQuantity = quantity;
    }

    onPaymentSuccess(result, co2Saved, materialType, totalQuantity);
    onClose();
  };

  const handleCryptoPaymentError = (error: string) => {
    toast.error(error);
    setIsProcessing(false);
  };

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateShippingInfo = () => {
    const requiredFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'phone'];
    for (const field of requiredFields) {
      if (!shippingInfo[field as keyof typeof shippingInfo]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(shippingInfo.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }
    
    return true;
  };

  const handleContinueToPayment = () => {
    if (validateShippingInfo()) {
      setCurrentStep('payment');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 'shipping' ? 'Shipping Information' : 'Complete Payment'}
            </DialogTitle>
            <DialogDescription>
              {currentStep === 'shipping' 
                ? 'Enter your shipping details to continue' 
                : `Total: ₹${totalPrice.toLocaleString('en-IN')}`}
            </DialogDescription>
          </DialogHeader>

          {currentStep === 'shipping' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    value={shippingInfo.fullName} 
                    onChange={handleShippingInfoChange}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input 
                    id="addressLine1" 
                    name="addressLine1" 
                    value={shippingInfo.addressLine1} 
                    onChange={handleShippingInfoChange}
                    placeholder="Street address, P.O. box"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                  <Input 
                    id="addressLine2" 
                    name="addressLine2" 
                    value={shippingInfo.addressLine2} 
                    onChange={handleShippingInfoChange}
                    placeholder="Apartment, suite, unit, building, floor"
                  />
                </div>
                
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    value={shippingInfo.city} 
                    onChange={handleShippingInfoChange}
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    value={shippingInfo.state} 
                    onChange={handleShippingInfoChange}
                    placeholder="State"
                  />
                </div>
                
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input 
                    id="postalCode" 
                    name="postalCode" 
                    value={shippingInfo.postalCode} 
                    onChange={handleShippingInfoChange}
                    placeholder="Postal code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    name="country" 
                    value={shippingInfo.country} 
                    onChange={handleShippingInfoChange}
                    placeholder="Country code (e.g. IN)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={shippingInfo.phone} 
                    onChange={handleShippingInfoChange}
                    placeholder="Phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    value={shippingInfo.email} 
                    onChange={handleShippingInfoChange}
                    placeholder="Email address"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleContinueToPayment}>
                  Continue to Payment
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentStep('shipping')}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Shipping
              </Button>
              
              {/* Payment Method Selection */}
              <Tabs 
                defaultValue={selectedPaymentMethod} 
                onValueChange={(value) => setSelectedPaymentMethod(value as 'fiat' | 'crypto')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger 
                    value="fiat" 
                    disabled={!availablePaymentMethods.fiat}
                    className="flex items-center justify-center"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Card Payment
                  </TabsTrigger>
                  <TabsTrigger 
                    value="crypto" 
                    disabled={!availablePaymentMethods.crypto}
                    className="flex items-center justify-center"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Crypto (ETH)
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="fiat" className="mt-4">
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm
                      item={item}
                      items={items}
                      quantities={quantities}
                      quantity={quantity}
                      totalPrice={totalPrice}
                      onSuccess={handleStripePaymentSuccess}
                      onError={handleStripePaymentError}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      shippingInfo={shippingInfo}
                    />
                  </Elements>
                </TabsContent>
                
                <TabsContent value="crypto" className="mt-4">
                  <CryptoPaymentForm
                    item={item}
                    items={items}
                    quantities={quantities}
                    quantity={quantity}
                    totalPrice={totalPrice}
                    onSuccess={handleCryptoPaymentSuccess}
                    onError={handleCryptoPaymentError}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    shippingInfo={shippingInfo}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
