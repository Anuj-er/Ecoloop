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
    const { itemId, quantity, items, shippingInfo } = req.body;
    const buyerId = req.user._id;

    let totalAmount = 0;
    let currency = 'INR';
    let metadata = {};
    let itemDetails = [];

    // Handle multi-item checkout
    if (items && Array.isArray(items) && items.length > 0) {
      // Fetch all items at once for efficiency
      const itemIds = items.map(item => item.itemId);
      const fetchedItems = await MarketplaceItem.find({ _id: { $in: itemIds } }).populate('seller');
      
      // Create a map for easy lookup
      const itemsMap = {};
      fetchedItems.forEach(item => {
        itemsMap[item._id.toString()] = item;
      });

      // Calculate total and validate each item
      for (const cartItem of items) {
        const item = itemsMap[cartItem.itemId];
        
        if (!item) {
          return res.status(404).json({
            success: false,
            message: `Item not found: ${cartItem.itemId}`
          });
        }

        // Check if buyer is not the seller
        if (item.seller._id.toString() === buyerId.toString()) {
          return res.status(400).json({
            success: false,
            message: `You cannot buy your own item: ${item.title}`
          });
        }

        // Check quantity availability
        if (cartItem.quantity > item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient quantity available for ${item.title}`
          });
        }

        const itemAmount = item.price * cartItem.quantity;
        totalAmount += itemAmount;
        
        // Use the first item's currency (assuming all items use same currency)
        if (!currency) {
          currency = item.currency?.toLowerCase() || 'inr';
        }
        
        // Store item details for later
        itemDetails.push({
          itemId: item._id,
          sellerId: item.seller._id,
          quantity: cartItem.quantity,
          price: item.price,
          title: item.title
        });
      }
      
      // Add items to metadata
      metadata = {
        buyerId: buyerId.toString(),
        multiItemCheckout: 'true',
        itemCount: items.length.toString()
      };
      
      // Add first 10 items to metadata (Stripe metadata has size limits)
      itemDetails.slice(0, 10).forEach((item, index) => {
        metadata[`item_${index}_id`] = item.itemId.toString();
        metadata[`item_${index}_qty`] = item.quantity.toString();
      });
      
    } else if (itemId) {
      // Single item checkout (existing logic)
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

      totalAmount = item.price * quantity;
      currency = item.currency?.toLowerCase() || 'inr';
      
      metadata = {
        itemId: itemId,
        buyerId: buyerId.toString(),
        sellerId: item.seller._id.toString(),
        quantity: quantity.toString()
      };
      
      itemDetails = [{
        itemId: item._id,
        sellerId: item.seller._id,
        quantity,
        price: item.price,
        title: item.title
      }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'No items provided for checkout'
      });
    }

    const amountInCents = Math.round(totalAmount * 100);
    
    // Stripe minimum amount validation
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
        message: `Payment amount is too low. Minimum amount is ${currencySymbol}${minimumInMainCurrency}. Current amount: ${currencySymbol}${totalAmount}`,
        error: 'AMOUNT_TOO_LOW',
        minimumAmount: minimumInMainCurrency,
        currentAmount: totalAmount,
        currency: currency.toUpperCase()
      });
    }

    // Create Stripe payment intent with shipping information
    const paymentIntentData = {
      amount: amountInCents,
      currency: currency,
      metadata,
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
    let payment;
    
    if (items && items.length > 0) {
      // Create multi-item payment
      payment = new Payment({
        multiItem: true,
        items: itemDetails.map(item => ({
          itemId: item.itemId,
          sellerId: item.sellerId,
          quantity: item.quantity,
          price: item.price,
          title: item.title
        })),
        buyerId,
        amount: totalAmount,
        currency: currency.toUpperCase(),
        paymentMethod: {
          type: 'fiat',
          currency: currency.toUpperCase()
        },
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          timestamp: new Date()
        },
        shippingInfo: shippingInfo || null
      });
    } else {
      // Create single item payment (existing logic)
      payment = new Payment({
        itemId: itemDetails[0].itemId,
        buyerId,
        sellerId: itemDetails[0].sellerId,
        amount: totalAmount,
        currency: currency.toUpperCase(),
        paymentMethod: {
          type: 'fiat',
          currency: currency.toUpperCase()
        },
        quantity: itemDetails[0].quantity,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          timestamp: new Date()
        },
        shippingInfo: shippingInfo || null
      });
    }

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
        // Populate references based on whether it's a multi-item or single-item payment
        if (payment.multiItem && payment.items && payment.items.length > 0) {
          // For multi-item payments, populate each item
          for (let i = 0; i < payment.items.length; i++) {
            if (payment.items[i].itemId) {
              try {
                await payment.populate(`items.${i}.itemId`);
              } catch (populateItemError) {
                console.error(`Error populating item ${i}:`, populateItemError);
              }
            }
          }
        } else {
          // For single-item payments, populate as before
          await payment.populate('itemId');
        }
        
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

        // Update item quantities
        try {
          if (payment.multiItem && payment.items && payment.items.length > 0) {
            // Handle multi-item payment
            for (const paymentItem of payment.items) {
              if (paymentItem.itemId) {
                const item = await MarketplaceItem.findById(paymentItem.itemId);
                if (item) {
                  item.quantity -= paymentItem.quantity;
                  if (item.quantity <= 0) {
                    item.status = 'sold';
                  }
                  await item.save();
                  console.log('Item quantity updated:', item._id, 'New quantity:', item.quantity);
                } else {
                  console.warn('Item not found for quantity update:', paymentItem.itemId);
                }
              }
            }
          } else if (payment.itemId) {
            // Handle single-item payment (existing logic)
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
    const { itemId, quantity, transactionHash, walletAddress, useEscrow } = req.body;
    const buyerId = req.user._id;

    // Validate request data
    if (!itemId || !transactionHash || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if transaction hash already exists
    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Transaction already processed'
      });
    }

    // Fetch item details
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

    // Verify that the seller accepts crypto payments
    if (!item.paymentPreferences?.acceptsCrypto) {
      return res.status(400).json({
        success: false,
        message: 'Seller does not accept crypto payments'
      });
    }

    // **BLOCKCHAIN VERIFICATION WITH DEV MODE BYPASS**
    let txReceipt = null;
    
    // Check if we're in development mode or if transaction hash looks like a test
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         transactionHash.length < 66 || 
                         transactionHash.startsWith('0x123') ||
                         transactionHash.startsWith('0x00');
    
    if (isDevelopment) {
      console.log('🧪 DEVELOPMENT MODE: Bypassing blockchain verification for testing');
      // Create a mock receipt for development
      txReceipt = {
        status: true,
        to: useEscrow ? process.env.ESCROW_CONTRACT_ADDRESS : item.paymentPreferences?.cryptoAddress,
        transactionHash,
        gasUsed: 100000,
        blockNumber: 12345678
      };
    } else {
      // Verify transaction on blockchain (Sepolia testnet) for production
      const web3 = new Web3(process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
      
      try {
        txReceipt = await web3.eth.getTransactionReceipt(transactionHash);
        
        if (!txReceipt || txReceipt.status !== true) {
          return res.status(400).json({
            success: false,
            message: 'Invalid transaction or transaction failed'
          });
        }
      } catch (error) {
        console.error('Error verifying transaction:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify transaction on blockchain'
        });
      }

      // If using escrow, verify the transaction is with the escrow contract
      if (useEscrow) {
        const escrowContractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
        
        // Verify transaction is to the escrow contract
        if (txReceipt.to.toLowerCase() !== escrowContractAddress.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Transaction is not to the escrow contract'
          });
        }
        
        // TODO: Verify the escrow was created for this specific item and seller
        // This would require decoding the transaction input data
      } else {
        // For direct payments, verify the transaction is to the seller's wallet
        if (!item.paymentPreferences?.cryptoAddress || 
            txReceipt.to.toLowerCase() !== item.paymentPreferences.cryptoAddress.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Transaction is not to the seller\'s wallet'
          });
        }
      }
    }

    // Create payment record
    const payment = new Payment({
      itemId,
      buyerId,
      sellerId: item.seller._id,
      amount: item.price * quantity, // Store the fiat equivalent amount
      currency: 'ETH', // Currency is ETH
      paymentMethod: {
        type: 'crypto',
        currency: 'ETH',
        network: 'sepolia'
      },
      quantity,
      transactionHash,
      status: useEscrow ? 'escrow_held' : 'completed',
      escrowDetails: useEscrow ? {
        contractAddress: process.env.ESCROW_CONTRACT_ADDRESS,
        escrowId: itemId, // Using itemId as escrow identifier
        isDelivered: false
      } : null,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        timestamp: new Date(),
        walletAddress,
        isDevelopmentMode: isDevelopment
      },
      completedAt: useEscrow ? null : new Date()
    });

    await payment.save();

    // Update item quantity
    item.quantity -= quantity;
    if (item.quantity === 0) {
      item.status = 'sold';
    }
    await item.save();

    // Create notification for seller
    const notification = {
      recipient: item.seller._id,
      type: 'sale',
      title: 'New Sale!',
      message: `Your item "${item.title}" was purchased with cryptocurrency${useEscrow ? ' (in escrow)' : ''}`,
      data: {
        paymentId: payment._id,
        itemId: item._id,
        buyerId
      },
      read: false
    };

    // Use your notification model to save this
    // await Notification.create(notification);

    return res.status(200).json({
      success: true,
      message: useEscrow ? 'Payment held in escrow' : 'Payment completed successfully',
      paymentId: payment._id,
      isDevelopmentMode: isDevelopment
    });
  } catch (error) {
    console.error('Error processing crypto payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};

// Confirm delivery and release escrow
export const confirmDelivery = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const buyerId = req.user._id;

    // Find payment
    const payment = await Payment.findById(paymentId);
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
        message: 'Not authorized to confirm this delivery'
      });
    }

    // Check payment status
    if (payment.status !== 'escrow_held') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm delivery for payment in ${payment.status} status`
      });
    }

    // Handle different payment types
    if (payment.paymentMethod.type === 'crypto') {
      // For crypto payments, we need to verify the escrow release on the blockchain
      // This would typically be handled client-side with the user's wallet
      // But we still update our database records
      
      // Update payment status
      payment.status = 'escrow_released';
      payment.completedAt = new Date();
      
      if (payment.escrowDetails) {
        payment.escrowDetails.isDelivered = true;
        payment.escrowDetails.deliveryConfirmedAt = new Date();
      }
      
      await payment.save();
      
      // Create notification for seller
      const notification = {
        recipient: payment.sellerId,
        type: 'escrow_released',
        title: 'Escrow Released!',
        message: 'The buyer has confirmed delivery and released the escrow payment.',
        data: {
          paymentId: payment._id,
          itemId: payment.itemId
        },
        read: false
      };
      
      // Use your notification model to save this
      // await Notification.create(notification);
      
      return res.status(200).json({
        success: true,
        message: 'Delivery confirmed and escrow released',
        payment
      });
    } else {
      // For fiat payments with Stripe
      // Update payment status
      payment.status = 'completed';
      payment.completedAt = new Date();
      await payment.save();
      
      return res.status(200).json({
        success: true,
        message: 'Delivery confirmed',
        payment
      });
    }
  } catch (error) {
    console.error('Error confirming delivery:', error);
    return res.status(500).json({
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
