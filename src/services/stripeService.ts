import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_key_here');

export interface StripePaymentDetails {
  itemId: string;
  sellerId: string;
  buyerId: string;
  amount: number;
  currency: string;
  quantity: number;
}

export interface StripePaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

class StripeService {
  private stripe: Stripe | null = null;

  async initializeStripe(): Promise<Stripe | null> {
    if (!this.stripe) {
      this.stripe = await stripePromise;
    }
    return this.stripe;
  }

  async confirmPayment(clientSecret: string, paymentMethod?: any): Promise<StripePaymentResult> {
    try {
      const stripe = await this.initializeStripe();
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe failed to initialize'
        };
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: paymentMethod ? {
          payment_method: paymentMethod
        } : {
          return_url: window.location.origin,
        },
        redirect: 'if_required'
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (paymentIntent?.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id
        };
      }

      return {
        success: false,
        error: 'Payment not completed'
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async createPaymentMethod(cardElement: any): Promise<{ paymentMethod?: any; error?: any }> {
    try {
      const stripe = await this.initializeStripe();
      if (!stripe) {
        return { error: { message: 'Stripe failed to initialize' } };
      }

      return await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
    } catch (error) {
      return { error: { message: (error as Error).message } };
    }
  }

  async getPublishableKey(): Promise<string> {
    return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_key_here';
  }
}

export default new StripeService();
