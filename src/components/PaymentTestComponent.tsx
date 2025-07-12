import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentModal } from "./PaymentModal";
import { MarketplaceItem } from "@/types/marketplace";
import { PaymentResult } from "@/services/paymentService";
import { CheckCircle, CreditCard, AlertCircle } from "lucide-react";

// Mock item for testing
const mockItem: MarketplaceItem = {
  _id: "test-item-123",
  title: "Eco-Friendly Reclaimed Wood",
  description: "High-quality reclaimed wood perfect for sustainable crafting and furniture making",
  price: 1500,
  currency: "INR",
  materialType: "wood",
  condition: "good",
  quantity: 5,
  pinCode: "110001",
  images: [{
    url: "/placeholder.svg",
    public_id: "test-image"
  }],
  seller: {
    _id: "seller-123",
    username: "ecoseller",
    firstName: "Eco",
    lastName: "Seller",
    userType: "individual"
  },
  tags: ["sustainable", "reclaimed", "eco-friendly"],
  category: "raw-materials",
  views: 42,
  interestedBuyers: [],
  status: "active",
  createdAt: new Date().toISOString()
};

export const PaymentTestComponent = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState<PaymentResult | null>(null);

  const handlePaymentSuccess = (result: PaymentResult) => {
    console.log('Payment successful:', result);
    setLastPaymentResult(result);
    alert(`🎉 Payment Successful!\nTransaction ID: ${result.transactionId}`);
  };

  const paymentMode = import.meta.env.VITE_PAYMENT_MODE;

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      
      {/* Payment Mode Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-semibold text-blue-900">
                {paymentMode === 'mock' ? '🧪 Mock Payment Mode Active' : '💳 Live Payment Mode'}
              </p>
              <p className="text-sm text-blue-700">
                {paymentMode === 'mock' 
                  ? 'No real payment gateway needed - perfect for testing!' 
                  : 'Using real payment gateway'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Item Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment System Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* Mock Item Display */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{mockItem.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{mockItem.description}</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {mockItem.materialType}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {mockItem.condition}
                  </Badge>
                </div>
                <p className="font-bold text-green-600 text-xl">
                  ₹{mockItem.price.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500">
                  Quantity available: {mockItem.quantity}
                </p>
              </div>
            </div>
            
            {/* Test Button */}
            <Button 
              onClick={() => setShowPaymentModal(true)}
              className="w-full h-12 text-lg"
              size="lg"
            >
              🛒 Test Buy Now - {paymentMode === 'mock' ? 'Mock Payment' : 'Real Payment'}
            </Button>
            
            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">🧪 Test Instructions:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Click "Test Buy Now" to open payment modal</li>
                <li>• Try both Traditional and Crypto payment tabs</li>
                {paymentMode === 'mock' ? (
                  <>
                    <li>• Mock payments have ~90% success rate</li>
                    <li>• Processing takes 1-2 seconds to simulate real payments</li>
                  </>
                ) : (
                  <li>• Use test card: 4111 1111 1111 1111</li>
                )}
              </ul>
            </div>

            {/* Last Payment Result */}
            {lastPaymentResult && (
              <div className={`p-4 rounded-lg border ${
                lastPaymentResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastPaymentResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    lastPaymentResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Last Payment: {lastPaymentResult.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <p className={`text-sm ${
                  lastPaymentResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {lastPaymentResult.success 
                    ? `Transaction ID: ${lastPaymentResult.transactionId}`
                    : `Error: ${lastPaymentResult.error}`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        item={mockItem}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
