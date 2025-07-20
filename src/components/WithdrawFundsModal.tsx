import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, Wallet, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import paymentService from "@/services/paymentService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface WithdrawFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WithdrawFundsModal = ({ isOpen, onClose, onSuccess }: WithdrawFundsModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    if (isOpen) {
      checkWalletAndBalance();
    }
  }, [isOpen]);

  const checkWalletAndBalance = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if MetaMask is available
      if (!paymentService.isMetaMaskAvailable()) {
        setError("MetaMask not detected. Please install MetaMask to withdraw your funds.");
        setIsLoading(false);
        return;
      }
      
      // Connect wallet
      const accounts = await paymentService.connectWallet();
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      
      console.log("Connected wallet address:", accounts[0]);
      
      // Get balance
      const balanceInEth = await paymentService.getUserBalance(accounts[0]);
      console.log("Retrieved balance:", balanceInEth, "ETH");
      setBalance(balanceInEth);
      
    } catch (error: any) {
      console.error("Error checking balance:", error);
      setError(error.message || "Failed to check balance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!walletConnected) {
      await checkWalletAndBalance();
      return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    
    try {
      const result = await paymentService.withdrawBalance();
      
      if (result.success) {
        toast.success("Funds withdrawn successfully!");
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        throw new Error(result.error || "Failed to withdraw funds");
      }
    } catch (error: any) {
      setError(error.message || "Failed to withdraw funds");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Escrow Funds</DialogTitle>
          <DialogDescription>
            Withdraw your available funds from completed escrow transactions
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="bg-blue-50 border-blue-200 mb-4">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> You must connect the same wallet address that you used when listing your items. 
            Funds are sent to the wallet address specified during item listing.
          </AlertDescription>
        </Alert>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-gray-500">Checking your balance...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {walletConnected && (
                <div className="mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center mb-2">
                      <Wallet className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500">Connected Wallet</span>
                    </div>
                    <p className="text-sm font-mono break-all">{walletAddress}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Available Balance</h3>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{balance}</span>
                      <span className="ml-2 text-gray-500">ETH</span>
                    </div>
                    {parseFloat(balance) === 0 && (
                      <div className="text-sm text-gray-500 mt-1 space-y-2">
                        <p>You don't have any funds available to withdraw with this wallet address.</p>
                        <p>Make sure you're using the same wallet address that you used when listing your items.</p>
                        <p>If you've changed wallets, you'll need to connect the original wallet to withdraw your funds.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                {!walletConnected && (
                  <Button onClick={checkWalletAndBalance}>
                    Connect Wallet
                  </Button>
                )}
                
                {walletConnected && parseFloat(balance) === 0 && (
                  <Button 
                    variant="outline"
                    onClick={checkWalletAndBalance}
                  >
                    Try Again
                  </Button>
                )}
                
                {walletConnected && parseFloat(balance) > 0 && (
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={isWithdrawing || parseFloat(balance) === 0}
                  >
                    {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Withdraw Funds
                  </Button>
                )}
                
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 