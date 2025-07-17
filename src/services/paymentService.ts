import Web3 from 'web3';
import { ethers } from 'ethers';

// Smart contract ABI for a simple escrow contract
const ESCROW_CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_seller", "type": "address"},
      {"internalType": "string", "name": "_itemId", "type": "string"}
    ],
    "name": "createEscrow",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_itemId", "type": "string"}],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_itemId", "type": "string"}],
    "name": "getEscrowDetails",
    "outputs": [
      {"internalType": "address", "name": "buyer", "type": "address"},
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "bool", "name": "isDelivered", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract address (you'll need to deploy your own contract)
const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || null;

export interface PaymentMethod {
  type: 'crypto' | 'fiat';
  currency: string;
  network?: string;
}

export interface PaymentDetails {
  itemId: string;
  sellerId: string;
  buyerId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  shippingInfo?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  transactionHash?: string;
  error?: string;
}

class PaymentService {
  private web3: Web3 | null = null;
  private escrowContract: any = null;

  constructor() {
    this.initializeWeb3();
  }

  private async initializeWeb3() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.web3 = new Web3((window as any).ethereum);
      
      // Only initialize contract if we have a valid contract address
      if (ESCROW_CONTRACT_ADDRESS && ESCROW_CONTRACT_ADDRESS !== '0x...' && ESCROW_CONTRACT_ADDRESS.length === 42) {
        try {
          this.escrowContract = new this.web3.eth.Contract(
            ESCROW_CONTRACT_ABI,
            ESCROW_CONTRACT_ADDRESS
          );
        } catch (error) {
          console.warn('Failed to initialize escrow contract:', error);
        }
      } else {
        console.warn('No valid escrow contract address provided. Crypto payments will not work.');
      }
    }
  }

  // Check if MetaMask is available
  public isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
  }

  // Connect to MetaMask
  public async connectWallet(): Promise<string[]> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    }

    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      return accounts;
    } catch (error) {
      throw new Error('Failed to connect wallet: ' + (error as Error).message);
    }
  }

  // Get wallet balance
  public async getWalletBalance(address: string): Promise<string> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    const balance = await this.web3.eth.getBalance(address);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  // Process cryptocurrency payment with escrow
  public async processCryptoPayment(paymentDetails: PaymentDetails): Promise<PaymentResult> {
    if (!this.web3 || !this.escrowContract) {
      return { success: false, error: 'Web3 not initialized' };
    }

    try {
      const accounts = await this.connectWallet();
      const buyerAddress = accounts[0];
      
      // Convert amount to Wei (assuming payment is in ETH)
      const amountInWei = this.web3.utils.toWei(paymentDetails.amount.toString(), 'ether');

      // Create escrow transaction
      const transaction = await this.escrowContract.methods
        .createEscrow(paymentDetails.sellerId, paymentDetails.itemId)
        .send({
          from: buyerAddress,
          value: amountInWei,
          gas: 300000
        });

      return {
        success: true,
        transactionHash: transaction.transactionHash,
        transactionId: transaction.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: 'Crypto payment failed: ' + (error as Error).message
      };
    }
  }

  // Confirm delivery (releases escrow)
  public async confirmDelivery(itemId: string): Promise<PaymentResult> {
    if (!this.web3 || !this.escrowContract) {
      return { success: false, error: 'Web3 not initialized' };
    }

    try {
      const accounts = await this.connectWallet();
      const buyerAddress = accounts[0];

      const transaction = await this.escrowContract.methods
        .confirmDelivery(itemId)
        .send({
          from: buyerAddress,
          gas: 150000
        });

      return {
        success: true,
        transactionHash: transaction.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: 'Delivery confirmation failed: ' + (error as Error).message
      };
    }
  }

  // Get escrow details
  public async getEscrowDetails(itemId: string) {
    if (!this.escrowContract) {
      throw new Error('Contract not initialized');
    }

    return await this.escrowContract.methods.getEscrowDetails(itemId).call();
  }

  // Convert ETH to USD (simple mock - in production, use real exchange rates)
  public async convertEthToUsd(ethAmount: number): Promise<number> {
    // Mock conversion rate - in production, fetch from API
    const ETH_TO_USD = 2000; // Example rate
    return ethAmount * ETH_TO_USD;
  }

  // Convert USD to ETH
  public async convertUsdToEth(usdAmount: number): Promise<number> {
    const ETH_TO_USD = 2000; // Example rate
    return usdAmount / ETH_TO_USD;
  }
}

export default new PaymentService();
