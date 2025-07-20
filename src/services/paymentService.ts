/**
 * EcoLoop Payment Service
 * 
 * This service handles cryptocurrency payments through the deployed EcoLoop Escrow contract.
 * 
 * Features:
 * - Crypto payments with MetaMask integration
 * - Escrow functionality for secure transactions
 * - Emergency refunds within 7 days
 * - Balance withdrawal for sellers
 * - Support for Ethereum on Sepolia testnet
 * 
 * Contract Address: 0xf8692A160805884D1e30a7c7C8da971cb7772696 (Sepolia)
 * 
 * Fixed Issues:
 * - Updated ABI to match deployed contract
 * - Added missing contract functions (withdraw, emergencyRefund, getBalance)
 * - Proper TypeScript types and error handling
 * - Contract address validation and initialization
 */

import Web3 from 'web3';
import { ethers } from 'ethers';

// Smart contract ABI for EcoLoop Escrow contract
const ESCROW_CONTRACT_ABI: any[] = [
  {
    "type": "event",
    "name": "DeliveryConfirmed",
    "inputs": [
      {"name": "itemId", "type": "string", "indexed": false},
      {"name": "buyer", "type": "address", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "EscrowCompleted",
    "inputs": [
      {"name": "itemId", "type": "string", "indexed": false},
      {"name": "seller", "type": "address", "indexed": false},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "EscrowCreated",
    "inputs": [
      {"name": "itemId", "type": "string", "indexed": false},
      {"name": "buyer", "type": "address", "indexed": false},
      {"name": "seller", "type": "address", "indexed": false},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "FundsWithdrawn",
    "inputs": [
      {"name": "user", "type": "address", "indexed": false},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "function",
    "name": "balances",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "confirmDelivery",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_itemId", "type": "string"}],
    "outputs": []
  },
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
    "name": "emergencyRefund",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_itemId", "type": "string"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "escrows",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "string"}],
    "outputs": [
      {"name": "buyer", "type": "address"},
      {"name": "seller", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "itemId", "type": "string"},
      {"name": "isDelivered", "type": "bool"},
      {"name": "isCompleted", "type": "bool"},
      {"name": "createdAt", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "getBalance",
    "stateMutability": "view",
    "inputs": [{"name": "_user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "getEscrowDetails",
    "stateMutability": "view",
    "inputs": [{"name": "_itemId", "type": "string"}],
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

// Contract address from deployment
const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '0xf8692A160805884D1e30a7c7C8da971cb7772696';

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

export interface EscrowDetails {
  buyer: string;
  seller: string;
  amount: string;
  isDelivered: boolean;
  isCompleted: boolean;
  createdAt: string;
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
      
      // Initialize contract with the deployed address
      if (ESCROW_CONTRACT_ADDRESS && ESCROW_CONTRACT_ADDRESS.length === 42) {
        try {
          this.escrowContract = new this.web3.eth.Contract(
            ESCROW_CONTRACT_ABI,
            ESCROW_CONTRACT_ADDRESS
          );
          console.log('Escrow contract initialized successfully at:', ESCROW_CONTRACT_ADDRESS);
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
      
      console.log("Confirming delivery for escrow ID:", itemId);
      console.log("Buyer address:", buyerAddress);
      
      // Get escrow details before confirmation
      try {
        const escrowBefore = await this.escrowContract.methods.getEscrowDetails(itemId).call();
        console.log("Escrow before confirmation:", {
          buyer: escrowBefore[0],
          seller: escrowBefore[1],
          amount: this.web3.utils.fromWei(escrowBefore[2], 'ether'),
          isDelivered: escrowBefore[3],
          isCompleted: escrowBefore[4],
          createdAt: new Date(Number(escrowBefore[5]) * 1000).toISOString()
        });
        
        // Check seller's balance before confirmation
        const sellerBalanceBefore = await this.escrowContract.methods.getBalance(escrowBefore[1]).call();
        console.log("Seller balance before confirmation:", this.web3.utils.fromWei(sellerBalanceBefore, 'ether'), "ETH");
      } catch (error) {
        console.log("Could not get escrow details before confirmation:", error);
      }

      const transaction = await this.escrowContract.methods
        .confirmDelivery(itemId)
        .send({
          from: buyerAddress,
          gas: 150000
        });
      
      console.log("Confirmation transaction:", transaction);
      
      // Get escrow details after confirmation
      try {
        const escrowAfter = await this.escrowContract.methods.getEscrowDetails(itemId).call();
        console.log("Escrow after confirmation:", {
          buyer: escrowAfter[0],
          seller: escrowAfter[1],
          amount: this.web3.utils.fromWei(escrowAfter[2], 'ether'),
          isDelivered: escrowAfter[3],
          isCompleted: escrowAfter[4],
          createdAt: new Date(Number(escrowAfter[5]) * 1000).toISOString()
        });
        
        // Check seller's balance after confirmation
        const sellerBalanceAfter = await this.escrowContract.methods.getBalance(escrowAfter[1]).call();
        console.log("Seller balance after confirmation:", this.web3.utils.fromWei(sellerBalanceAfter, 'ether'), "ETH");
      } catch (error) {
        console.log("Could not get escrow details after confirmation:", error);
      }

      return {
        success: true,
        transactionHash: transaction.transactionHash
      };
    } catch (error) {
      console.error("Error confirming delivery:", error);
      return {
        success: false,
        error: 'Delivery confirmation failed: ' + (error as Error).message
      };
    }
  }

  // Get escrow details (updated to match deployed contract)
  public async getEscrowDetails(itemId: string): Promise<EscrowDetails> {
    if (!this.escrowContract) {
      throw new Error('Contract not initialized');
    }

    const result = await this.escrowContract.methods.getEscrowDetails(itemId).call();
    return {
      buyer: result[0],
      seller: result[1],
      amount: result[2],
      isDelivered: result[3],
      isCompleted: result[4],
      createdAt: result[5]
    };
  }

  // Get user's available balance for withdrawal
  public async getUserBalance(address: string): Promise<string> {
    if (!this.web3 || !this.escrowContract) {
      throw new Error('Web3 or contract not initialized');
    }

    console.log("Checking balance for address:", address);
    console.log("Contract address:", this.escrowContract._address);
    
    try {
      // Normalize address to lowercase
      const normalizedAddress = address.toLowerCase();
      console.log("Normalized address:", normalizedAddress);
      
      const balance = await this.escrowContract.methods.getBalance(address).call();
      console.log("Raw balance from contract:", balance);
      
      // Try with checksum address
      const checksumAddress = this.web3.utils.toChecksumAddress(address);
      console.log("Checksum address:", checksumAddress);
      
      const balanceWithChecksum = await this.escrowContract.methods.getBalance(checksumAddress).call();
      console.log("Balance with checksum address:", balanceWithChecksum);
      
      // Return the larger of the two balances
      const finalBalance = BigInt(balance) > BigInt(balanceWithChecksum) ? balance : balanceWithChecksum;
      return this.web3.utils.fromWei(finalBalance, 'ether');
    } catch (error) {
      console.error("Error getting balance from contract:", error);
      throw error;
    }
  }

  // Withdraw available balance
  public async withdrawBalance(): Promise<PaymentResult> {
    if (!this.web3 || !this.escrowContract) {
      return { success: false, error: 'Web3 not initialized' };
    }

    try {
      const accounts = await this.connectWallet();
      const userAddress = accounts[0];
      
      console.log("Withdrawing funds for address:", userAddress);
      
      // Check balance before withdrawal
      const balanceBefore = await this.escrowContract.methods.getBalance(userAddress).call();
      console.log("Balance before withdrawal:", this.web3.utils.fromWei(balanceBefore, 'ether'), "ETH");
      
      if (BigInt(balanceBefore) === 0n) {
        return { success: false, error: 'No funds available to withdraw' };
      }

      const transaction = await this.escrowContract.methods
        .withdraw()
        .send({
          from: userAddress,
          gas: 150000
        });
      
      console.log("Withdrawal transaction:", transaction);

      // Check balance after withdrawal
      const balanceAfter = await this.escrowContract.methods.getBalance(userAddress).call();
      console.log("Balance after withdrawal:", this.web3.utils.fromWei(balanceAfter, 'ether'), "ETH");

      return {
        success: true,
        transactionHash: transaction.transactionHash
      };
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      return {
        success: false,
        error: 'Withdrawal failed: ' + (error as Error).message
      };
    }
  }

  // Emergency refund (within 7 days if not delivered)
  public async emergencyRefund(itemId: string): Promise<PaymentResult> {
    if (!this.web3 || !this.escrowContract) {
      return { success: false, error: 'Web3 not initialized' };
    }

    try {
      const accounts = await this.connectWallet();
      const buyerAddress = accounts[0];

      const transaction = await this.escrowContract.methods
        .emergencyRefund(itemId)
        .send({
          from: buyerAddress,
          gas: 200000
        });

      return {
        success: true,
        transactionHash: transaction.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: 'Emergency refund failed: ' + (error as Error).message
      };
    }
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
