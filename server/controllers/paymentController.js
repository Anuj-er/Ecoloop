import Stripe from 'stripe';
import crypto from 'crypto';
import Web3 from 'web3';
import Payment from '../models/Payment.js';
import MarketplaceItem from '../models/MarketplaceItem.js';
import User from '../models/User.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here');

// Initialize Web3 (for blockchain verification)
const web3 = new Web3(process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your_project_id');

// Create Stripe payment intent for fiat payments
export const createPaymentIntent = async (req, res) => {
  try {
    const { itemId, quantity, shippingInfo } = req.body;
    const buyerId = req.user._id;

    // Validate item
    const item = await MarketplaceItem.findById(itemId).populate('seller');
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if buyer is not the seller
    if (item.seller._id.toString() === buyerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot buy your own item'
      });
    }

    // Check quantity availability
    if (quantity > item.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    const amount = item.price * quantity;
    const amountInCents = Math.round(amount * 100);
    
    // Stripe minimum amount validation
    const currency = (item.currency?.toLowerCase() || 'inr');
    const minimumAmounts = {
      'inr': 5000, // ₹50 in paise
      'usd': 50,   // $0.50 in cents
      'eur': 50,   // €0.50 in cents
      'gbp': 30    // £0.30 in pence
    };
    
    const minimumAmount = minimumAmounts[currency] || 5000;
    
    if (amountInCents < minimumAmount) {
      const minimumInMainCurrency = minimumAmount / 100;
      const currencySymbol = {
        'inr': '₹',
        'usd': '$',
        'eur': '€',
        'gbp': '£'
      }[currency] || currency.toUpperCase();
      
      return res.status(400).json({
        success: false,
        message: `Payment amount is too low. Minimum amount is ${currencySymbol}${minimumInMainCurrency}. Current amount: ${currencySymbol}${amount}`,
        error: 'AMOUNT_TOO_LOW',
        minimumAmount: minimumInMainCurrency,
        currentAmount: amount,
        currency: currency.toUpperCase()
      });
    }

    // Create Stripe payment intent with shipping information
    const paymentIntentData = {
      amount: amountInCents,
      currency: currency,
      metadata: {
        itemId: itemId,
        buyerId: buyerId.toString(),
        sellerId: item.seller._id.toString(),
        quantity: quantity.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      }
    };

    // Add shipping information if provided
    if (shippingInfo) {
      paymentIntentData.shipping = {
        name: shippingInfo.fullName,
        address: {
          line1: shippingInfo.addressLine1,
          line2: shippingInfo.addressLine2 || '',
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.postalCode,
          country: shippingInfo.country
        },
        phone: shippingInfo.phone
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    // Create payment record
    const payment = new Payment({
      itemId,
      buyerId,
      sellerId: item.seller._id,
      amount,
      currency: item.currency || 'INR',
      paymentMethod: {
        type: 'fiat',
        currency: item.currency || 'INR'
      },
      quantity,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date()
      },
      shippingInfo: shippingInfo || null
    });

    await payment.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Verify Stripe payment
export const verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;

    console.log('Payment verification request:', { paymentIntentId, paymentId });

    if (!paymentId) {
      console.error('Missing paymentId in request');
      return res.status(400).json({
        success: false,
        message: 'Missing payment ID'
      });
    }

    if (!paymentIntentId) {
      console.error('Missing paymentIntentId in request');
      return res.status(400).json({
        success: false,
        message: 'Missing payment intent ID'
      });
    }

    try {
      // Find payment record
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        console.error('Payment record not found:', paymentId);
        return res.status(404).json({
          success: false,
          message: 'Payment record not found'
        });
      }

      console.log('Found payment record:', payment._id, 'Status:', payment.status);

      try {
        // Populate references
        await payment.populate('itemId');
        await payment.populate('buyerId');
        await payment.populate('sellerId');
      } catch (populateError) {
        console.error('Error populating payment references:', populateError);
        // Continue with the payment verification even if population fails
      }

      try {
        // Retrieve payment intent from Stripe to verify status
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        console.log('Stripe payment intent status:', paymentIntent.status);
        console.log('Payment intent ID match:', paymentIntent.id, '===', payment.stripePaymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
          payment.status = 'failed';
          payment.failureReason = `Payment status: ${paymentIntent.status}`;
          await payment.save();

          return res.status(400).json({
            success: false,
            message: `Payment not completed. Status: ${paymentIntent.status}`
          });
        }

        // Verify that the payment intent matches our record
        if (paymentIntent.id !== payment.stripePaymentIntentId) {
          console.error('Payment ID mismatch:', {
            stripeId: paymentIntent.id,
            recordId: payment.stripePaymentIntentId
          });
          return res.status(400).json({
            success: false,
            message: 'Payment verification failed - ID mismatch'
          });
        }

        // Update payment record
        payment.status = 'completed';
        payment.transactionId = paymentIntent.id;
        payment.stripeChargeId = paymentIntent.latest_charge || null;
        payment.completedAt = new Date();
        
        await payment.save();

        console.log('Payment marked as completed:', payment._id);

        // Update item quantity if possible
        try {
          if (payment.itemId) {
            const item = await MarketplaceItem.findById(payment.itemId);
            if (item) {
              item.quantity -= payment.quantity;
              if (item.quantity <= 0) {
                item.status = 'sold';
              }
              await item.save();
              console.log('Item quantity updated:', item._id, 'New quantity:', item.quantity);
            } else {
              console.warn('Item not found for quantity update:', payment.itemId);
            }
          } else {
            console.warn('No itemId in payment record:', payment._id);
          }
        } catch (itemUpdateError) {
          console.error('Error updating item quantity:', itemUpdateError);
          // Continue with the payment verification even if item update fails
        }

        res.json({
          success: true,
          message: 'Payment verified successfully',
          payment: {
            _id: payment._id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            transactionId: payment.transactionId,
            completedAt: payment.completedAt
          }
        });
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        res.status(500).json({
          success: false,
          message: 'Stripe API error',
          error: stripeError.message
        });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Process crypto payment
export const processCryptoPayment = async (req, res) => {
  try {
    const { itemId, quantity, transactionHash, walletAddress } = req.body;
    const buyerId = req.user._id;

    // Validate item
    const item = await MarketplaceItem.findById(itemId).populate('seller');
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if buyer is not the seller
    if (item.seller._id.toString() === buyerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot buy your own item'
      });
    }

    // Verify transaction on blockchain (simplified)
    // In production, you would verify the transaction details thoroughly
    try {
      const transaction = await web3.eth.getTransaction(transactionHash);
      if (!transaction) {
        return res.status(400).json({
          success: false,
          message: 'Transaction not found on blockchain'
        });
      }
    } catch (blockchainError) {
      console.log('Blockchain verification skipped for demo:', blockchainError.message);
    }

    const amount = item.price * quantity;

    // Create payment record
    const payment = new Payment({
      itemId,
      buyerId,
      sellerId: item.seller._id,
      amount,
      currency: 'ETH',
      paymentMethod: {
        type: 'crypto',
        currency: 'ETH',
        network: 'ethereum'
      },
      quantity,
      transactionHash,
      status: 'escrow_held', // For crypto payments, use escrow
      escrowDetails: {
        contractAddress: process.env.ESCROW_CONTRACT_ADDRESS,
        escrowId: itemId
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date()
      }
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Crypto payment processed successfully',
      payment
    });

  } catch (error) {
    console.error('Crypto payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process crypto payment',
      error: error.message
    });
  }
};

// Confirm delivery and release escrow
export const confirmDelivery = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const buyerId = req.user._id;

    const payment = await Payment.findById(paymentId)
      .populate('itemId')
      .populate('sellerId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify buyer
    if (payment.buyerId.toString() !== buyerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Update payment status
    payment.status = 'escrow_released';
    payment.escrowDetails.isDelivered = true;
    payment.escrowDetails.deliveryConfirmedAt = new Date();
    await payment.save();

    // Update item quantity
    const item = await MarketplaceItem.findById(payment.itemId);
    item.quantity -= payment.quantity;
    if (item.quantity <= 0) {
      item.status = 'sold';
    }
    await item.save();

    res.json({
      success: true,
      message: 'Delivery confirmed and escrow released',
      payment
    });

  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm delivery',
      error: error.message
    });
  }
};

// Get payment history for user
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query; // 'purchases' or 'sales'

    let query = {};
    if (type === 'purchases') {
      query.buyerId = userId;
    } else if (type === 'sales') {
      query.sellerId = userId;
    } else {
      // For purchases page, only show purchases by default
      query.buyerId = userId;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'itemId',
        select: 'title description images price seller pinCode',
        populate: {
          path: 'seller',
          select: 'firstName lastName avatar username'
        }
      })
      .populate('buyerId', 'firstName lastName avatar username')
      .populate('sellerId', 'firstName lastName avatar username')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform the data to match frontend expectations
    const transformedPayments = payments.map(payment => ({
      _id: payment._id,
      itemId: payment.itemId,
      amount: payment.amount,
      currency: payment.currency,
      quantity: payment.quantity,
      status: payment.status,
      transactionId: payment.transactionId,
      completedAt: payment.completedAt,
      createdAt: payment.createdAt,
      failureReason: payment.failureReason
    }));

    res.json({
      success: true,
      data: transformedPayments
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findById(paymentId)
      .populate('itemId')
      .populate('buyerId', 'firstName lastName avatar')
      .populate('sellerId', 'firstName lastName avatar');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is involved in this payment
    if (payment.buyerId._id.toString() !== userId.toString() && 
        payment.sellerId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: error.message
    });
  }
};
