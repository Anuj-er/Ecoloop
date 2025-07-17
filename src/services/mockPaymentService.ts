import { PaymentResult } from "./paymentService";

// Mock payment service for instant testing
export class MockPaymentService {
  
  // Simulate payment processing with realistic delays
  static async processMockPayment(amount: number, currency: string = 'INR'): Promise<PaymentResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 90% success rate for testing
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionHash: undefined
      };
    } else {
      return {
        success: false,
        error: 'Mock payment failed - this is a simulated failure for testing'
      };
    }
  }

  // Mock payment with custom scenarios
  static async processTestPayment(scenario: 'success' | 'failure' | 'timeout' = 'success'): Promise<PaymentResult> {
    
    switch (scenario) {
      case 'success':
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          success: true,
          transactionId: `mock_success_${Date.now()}`,
        };
        
      case 'failure':
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: false,
          error: 'Insufficient funds - Mock Error'
        };
        
      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 5000));
        return {
          success: false,
          error: 'Payment timeout - Mock Error'
        };
        
      default:
        return this.processMockPayment(100);
    }
  }
}

export default MockPaymentService;
