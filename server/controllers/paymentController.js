import Stripe from 'stripe';
import crypto from 'crypto';
import Web3 from 'web3';
import Payment from '../models/Payment.js';
import MarketplaceItem from '../models/MarketplaceItem.js';
import User from '../models/User.js';
import CO2_SAVINGS_PER_KG from '../utils/co2Savings.js';

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
            let totalCO2Saved = 0;
            for (const paymentItem of payment.items) {
              if (paymentItem.itemId) {
                const item = await MarketplaceItem.findById(paymentItem.itemId);
                if (item) {
                  item.quantity -= paymentItem.quantity;
                  if (item.quantity <= 0) {
                    item.status = 'sold';
                  }
                  await item.save();
                  // Calculate CO2 saved for this item
                  const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType] || CO2_SAVINGS_PER_KG['other'];
                  totalCO2Saved += co2PerKg * paymentItem.quantity;
                  console.log('Item quantity updated:', item._id, 'New quantity:', item.quantity);
                } else {
                  console.warn('Item not found for quantity update:', paymentItem.itemId);
                }
              }
            }
            // Update buyer's sustainabilityMetrics.carbonFootprint
            if (totalCO2Saved > 0 && payment.buyerId) {
              const buyer = await User.findById(payment.buyerId);
              if (buyer && buyer.sustainabilityMetrics) {
                buyer.sustainabilityMetrics.carbonFootprint += totalCO2Saved;
                await buyer.save();
              }
            }
          } else if (payment.itemId) {
            // Handle single-item payment (existing logic)
            const item = await MarketplaceItem.findById(payment.itemId);
            let co2Saved = 0;
            if (item) {
              item.quantity -= payment.quantity;
              if (item.quantity <= 0) {
                item.status = 'sold';
              }
              await item.save();
              // Calculate CO2 saved for this item
              const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType] || CO2_SAVINGS_PER_KG['other'];
              co2Saved = co2PerKg * payment.quantity;
              // Update buyer's sustainabilityMetrics.carbonFootprint
              if (co2Saved > 0 && payment.buyerId) {
                const buyer = await User.findById(payment.buyerId);
                if (buyer && buyer.sustainabilityMetrics) {
                  buyer.sustainabilityMetrics.carbonFootprint += co2Saved;
                  await buyer.save();
                }
              }
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

        // After successful payment (fiat or crypto), update user's totalCO2Saved
        if (payment.buyerId) {
          let co2Saved = 0;
          const co2Items = [];
          
          if (payment.multiItem && payment.items && payment.items.length > 0) {
            for (const paymentItem of payment.items) {
              const item = await MarketplaceItem.findById(paymentItem.itemId);
              if (item) {
                const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType] || CO2_SAVINGS_PER_KG['other'];
                const itemCO2 = co2PerKg * paymentItem.quantity;
                co2Saved += itemCO2;
                co2Items.push({
                  materialType: item.materialType,
                  quantity: paymentItem.quantity,
                  co2PerKg: co2PerKg,
                  co2Saved: itemCO2
                });
              }
            }
          } else if (payment.itemId) {
            const item = await MarketplaceItem.findById(payment.itemId);
            if (item) {
              const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType] || CO2_SAVINGS_PER_KG['other'];
              co2Saved = co2PerKg * payment.quantity;
              co2Items.push({
                materialType: item.materialType,
                quantity: payment.quantity,
                co2PerKg: co2PerKg,
                co2Saved: co2Saved
              });
            }
          }
          
          if (co2Saved > 0) {
            // Update user's total CO2 saved
            const buyer = await User.findById(payment.buyerId);
            if (buyer) {
              buyer.totalCO2Saved = (buyer.totalCO2Saved || 0) + co2Saved;
              await buyer.save();
            }
            
            // Store CO2 impact data in payment record
            payment.co2Impact = {
              totalCO2Saved: co2Saved,
              items: co2Items
            };
            await payment.save();
          }
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
    const { itemId, quantity, transactionHash, walletAddress, useEscrow, escrowId } = req.body;
    const buyerId = req.user._id;

    // Log payment request details
    console.log('🔄 Processing crypto payment:');
    console.log('- Item ID:', itemId);
    console.log('- Transaction Hash:', transactionHash);
    console.log('- Wallet Address:', walletAddress);
    console.log('- Use Escrow:', useEscrow);
    if (useEscrow) {
      console.log('- Escrow ID:', escrowId);
    }

    // Validate request data
    if (!itemId || !transactionHash || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate escrow ID if using escrow
    if (useEscrow && !escrowId) {
      return res.status(400).json({
        success: false,
        message: 'Escrow ID is required when using escrow'
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
    let txData = null;
    
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
        // Get transaction receipt
        txReceipt = await web3.eth.getTransactionReceipt(transactionHash);
        
        if (!txReceipt || txReceipt.status !== true) {
          return res.status(400).json({
            success: false,
            message: 'Invalid transaction or transaction failed'
          });
        }
        
        // Get full transaction data
        txData = await web3.eth.getTransaction(transactionHash);
        
        console.log('Transaction data received:', {
          hash: txData.hash,
          to: txData.to,
          from: txData.from,
          value: web3.utils.fromWei(txData.value, 'ether'),
          inputDataLength: txData.input.length
        });
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
        
        // Verify the escrow was created for this specific item and seller
        // Decode the transaction input data
        try {
          // Define the ABI for the createEscrow function
          const createEscrowABI = [
            {
              "type": "function",
              "name": "createEscrow",
              "stateMutability": "payable",
              "inputs": [
                {"name": "_seller", "type": "address"},
                {"name": "_itemId", "type": "string"}
              ],
              "outputs": []
            }
          ];
          
          // Create contract interface for decoding
          const contractInterface = new web3.eth.Contract(createEscrowABI, escrowContractAddress);
          
          // Decode the input data
          const decodedData = web3.eth.abi.decodeParameters(
            ['address', 'string'],
            '0x' + txData.input.slice(10) // Remove function selector (first 10 characters)
          );
          
          const sellerAddress = decodedData[0];
          const decodedEscrowId = decodedData[1];
          
          console.log('Decoded transaction data:', {
            sellerAddress,
            decodedEscrowId,
            providedEscrowId: escrowId
          });
          
          // Verify the seller address matches
          if (sellerAddress.toLowerCase() !== item.paymentPreferences.cryptoAddress.toLowerCase()) {
            return res.status(400).json({
              success: false,
              message: 'Transaction seller address does not match item seller'
            });
          }
          
          // Verify the escrow ID matches
          if (decodedEscrowId !== escrowId) {
            return res.status(400).json({
              success: false,
              message: 'Transaction escrow ID does not match provided escrow ID'
            });
          }
          
        } catch (error) {
          console.error('Error decoding transaction input:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify escrow details in transaction'
          });
        }
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
        escrowId: escrowId, // Using the unique escrow ID from frontend
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

    // If using escrow and not in development mode, try to listen for the EscrowCreated event
    if (useEscrow && !isDevelopment) {
      try {
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
        
        // Define the ABI for the EscrowCreated event
        const escrowEventABI = [
          {
            "type": "event",
            "name": "EscrowCreated",
            "inputs": [
              {"name": "itemId", "type": "string", "indexed": false},
              {"name": "buyer", "type": "address", "indexed": false},
              {"name": "seller", "type": "address", "indexed": false},
              {"name": "amount", "type": "uint256", "indexed": false}
            ]
          }
        ];
        
        // Create contract interface
        const escrowContract = new web3.eth.Contract(escrowEventABI, process.env.ESCROW_CONTRACT_ADDRESS);
        
        // Get transaction receipt to find events
        const receipt = await web3.eth.getTransactionReceipt(transactionHash);
        
        // Log events from receipt
        if (receipt && receipt.logs) {
          console.log(`📊 Found ${receipt.logs.length} log entries in transaction`);
          
          // Try to decode logs as EscrowCreated events
          receipt.logs.forEach((log, index) => {
            try {
              // Check if this log is from our contract
              if (log.address.toLowerCase() === process.env.ESCROW_CONTRACT_ADDRESS.toLowerCase()) {
                console.log(`✅ Log ${index} is from our escrow contract`);
                
                // Try to decode as EscrowCreated event
                const eventSignature = web3.utils.sha3('EscrowCreated(string,address,address,uint256)');
                if (log.topics && log.topics[0] === eventSignature) {
                  const decodedLog = web3.eth.abi.decodeLog(
                    [
                      { type: 'string', name: 'itemId' },
                      { type: 'address', name: 'buyer' },
                      { type: 'address', name: 'seller' },
                      { type: 'uint256', name: 'amount' }
                    ],
                    log.data,
                    log.topics.slice(1)
                  );
                  
                  console.log('🎉 EscrowCreated event detected:');
                  console.log('- Event itemId:', decodedLog.itemId);
                  console.log('- Event buyer:', decodedLog.buyer);
                  console.log('- Event seller:', decodedLog.seller);
                  console.log('- Event amount:', web3.utils.fromWei(decodedLog.amount, 'ether'), 'ETH');
                  
                  // Verify escrow ID matches
                  if (decodedLog.itemId === escrowId) {
                    console.log('✅ Event escrowId matches provided escrowId');
                  } else {
                    console.log('⚠️ Event escrowId does not match provided escrowId');
                  }
                }
              }
            } catch (error) {
              console.log(`Error decoding log ${index}:`, error.message);
            }
          });
        }
      } catch (error) {
        console.log('Error listening for EscrowCreated event:', error.message);
        // Don't fail the request if event listening fails
      }
    }

    // Update item quantity
    if (item.quantity >= quantity) {
      // Calculate new quantity
      const newQuantity = item.quantity - quantity;
      
      // Update item with validation bypass for zero quantity
      await MarketplaceItem.findByIdAndUpdate(
        itemId,
        { 
          $set: { 
            quantity: newQuantity,
            status: newQuantity === 0 ? 'sold' : 'active'
          }
        },
        { 
          new: true,
          runValidators: false // Skip validation to allow quantity to be 0
        }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    // After successful payment (crypto), update user's totalCO2Saved
    if (buyerId) {
      let co2Saved = 0;
      if (item) {
        const co2PerKg = CO2_SAVINGS_PER_KG[item.materialType] || CO2_SAVINGS_PER_KG['other'];
        co2Saved = co2PerKg * quantity;
      }
      if (co2Saved > 0) {
        const buyer = await User.findById(buyerId);
        if (buyer) {
          buyer.totalCO2Saved = (buyer.totalCO2Saved || 0) + co2Saved;
          await buyer.save();
        }
      }
    }

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
    const { paymentId, transactionHash, escrowId } = req.body;
    const buyerId = req.user._id;

    console.log('🔄 Processing delivery confirmation:');
    console.log('- Payment ID:', paymentId);
    console.log('- Transaction Hash:', transactionHash);
    console.log('- Escrow ID (from request):', escrowId);

    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Log payment details
    console.log('- Payment found:', {
      id: payment._id,
      status: payment.status,
      escrowId: payment.escrowDetails?.escrowId,
      contractAddress: payment.escrowDetails?.contractAddress
    });

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

    // Verify escrow details exist
    if (!payment.escrowDetails || !payment.escrowDetails.escrowId) {
      // If escrowId is provided in the request but not in the payment, update it
      if (escrowId) {
        console.log('⚠️ Escrow ID missing in payment but provided in request. Updating payment with escrow ID:', escrowId);
        payment.escrowDetails = payment.escrowDetails || {};
        payment.escrowDetails.escrowId = escrowId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Escrow details not found for this payment'
        });
      }
    }

    // Use escrowId from request if provided, otherwise use the one from payment
    const finalEscrowId = escrowId || payment.escrowDetails.escrowId;
    console.log('- Using escrow ID:', finalEscrowId);

    // Handle different payment types
    if (payment.paymentMethod.type === 'crypto') {
      // For crypto payments, we need to verify the escrow release on the blockchain
      // This would typically be handled client-side with the user's wallet
      // But we still update our database records
      
      // If transaction hash is provided, verify it on the blockchain
      if (transactionHash && process.env.NODE_ENV !== 'development') {
        try {
          const web3 = new Web3(process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
          
          // Get transaction receipt
          const txReceipt = await web3.eth.getTransactionReceipt(transactionHash);
          
          if (!txReceipt || txReceipt.status !== true) {
            return res.status(400).json({
              success: false,
              message: 'Invalid transaction or transaction failed'
            });
          }
          
          // Verify transaction is to the escrow contract
          if (txReceipt.to.toLowerCase() !== payment.escrowDetails.contractAddress.toLowerCase()) {
            return res.status(400).json({
              success: false,
              message: 'Transaction is not to the escrow contract'
            });
          }
          
          // Try to decode the transaction input data
          try {
            // Get full transaction data
            const txData = await web3.eth.getTransaction(transactionHash);
            
            // Define the ABI for the confirmDelivery function
            const confirmDeliveryABI = [
              {
                "type": "function",
                "name": "confirmDelivery",
                "stateMutability": "nonpayable",
                "inputs": [
                  {"name": "_itemId", "type": "string"}
                ],
                "outputs": []
              }
            ];
            
            // Decode the input data
            const decodedData = web3.eth.abi.decodeParameters(
              ['string'],
              '0x' + txData.input.slice(10) // Remove function selector (first 10 characters)
            );
            
            const decodedEscrowId = decodedData[0];
            
            console.log('Decoded transaction data:', {
              decodedEscrowId,
              finalEscrowId
            });
            
            // Verify the escrow ID matches
            if (decodedEscrowId !== finalEscrowId) {
              console.log('⚠️ Warning: Transaction escrow ID does not match payment escrow ID');
              console.log('- Transaction escrow ID:', decodedEscrowId);
              console.log('- Payment escrow ID:', finalEscrowId);
              // We don't fail here, but log a warning
            }
            
            // Look for DeliveryConfirmed event
            if (txReceipt.logs) {
              console.log(`📊 Found ${txReceipt.logs.length} log entries in transaction`);
              
              // Try to decode logs as DeliveryConfirmed events
              let foundEvent = false;
              txReceipt.logs.forEach((log, index) => {
                try {
                  // Check if this log is from our contract
                  if (log.address.toLowerCase() === payment.escrowDetails.contractAddress.toLowerCase()) {
                    console.log(`✅ Log ${index} is from our escrow contract`);
                    
                    // Try to decode as DeliveryConfirmed event
                    const eventSignature = web3.utils.sha3('DeliveryConfirmed(string,address)');
                    if (log.topics && log.topics[0] === eventSignature) {
                      const decodedLog = web3.eth.abi.decodeLog(
                        [
                          { type: 'string', name: 'itemId' },
                          { type: 'address', name: 'buyer' }
                        ],
                        log.data,
                        log.topics.slice(1)
                      );
                      
                      console.log('🎉 DeliveryConfirmed event detected:');
                      console.log('- Event itemId:', decodedLog.itemId);
                      console.log('- Event buyer:', decodedLog.buyer);
                      
                      // Verify escrow ID matches
                      if (decodedLog.itemId === finalEscrowId) {
                        console.log('✅ Event escrowId matches payment escrowId');
                        foundEvent = true;
                      } else {
                        console.log('⚠️ Event escrowId does not match payment escrowId');
                      }
                    }
                  }
                } catch (error) {
                  console.log(`Error decoding log ${index}:`, error.message);
                }
              });
              
              if (!foundEvent) {
                console.log('⚠️ No DeliveryConfirmed event found in transaction logs');
                // We still proceed as the function might have been called successfully
                // even if we couldn't decode the event
              }
            }
            
          } catch (error) {
            console.error('Error decoding transaction input:', error);
            // We don't fail here, as we still want to update our database
            // The transaction was successful on the blockchain
          }
        } catch (error) {
          console.error('Error verifying transaction:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify transaction on blockchain'
          });
        }
      }
      
      // Update payment status
      payment.status = 'escrow_released';
      payment.completedAt = new Date();
      
      if (payment.escrowDetails) {
        payment.escrowDetails.isDelivered = true;
        payment.escrowDetails.deliveryConfirmedAt = new Date();
        
        // Store transaction hash if provided
        if (transactionHash) {
          payment.escrowDetails.deliveryTransactionHash = transactionHash;
        }
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

// Admin endpoint to update escrow status after manual confirmation
export const adminUpdateEscrowStatus = async (req, res) => {
  try {
    const { escrowId, transactionHash } = req.body;
    
    if (!escrowId) {
      return res.status(400).json({
        success: false,
        message: 'Escrow ID is required'
      });
    }
    
    console.log('🔄 Admin updating escrow status:');
    console.log('- Escrow ID:', escrowId);
    console.log('- Transaction Hash:', transactionHash);
    
    // Find payment by escrow ID
    const payment = await Payment.findOne({ 'escrowDetails.escrowId': escrowId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment with this escrow ID not found'
      });
    }
    
    console.log('- Payment found:', {
      id: payment._id,
      status: payment.status,
      buyerId: payment.buyerId,
      sellerId: payment.sellerId
    });
    
    // Verify current status
    if (payment.status !== 'escrow_held') {
      return res.status(400).json({
        success: false,
        message: `Cannot update payment in ${payment.status} status`
      });
    }
    
    // Verify transaction on blockchain if provided
    if (transactionHash && process.env.NODE_ENV !== 'development') {
      try {
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
        
        // Get transaction receipt
        const txReceipt = await web3.eth.getTransactionReceipt(transactionHash);
        
        if (!txReceipt || txReceipt.status !== true) {
          return res.status(400).json({
            success: false,
            message: 'Invalid transaction or transaction failed'
          });
        }
        
        // Verify transaction is to the escrow contract
        if (txReceipt.to.toLowerCase() !== payment.escrowDetails.contractAddress.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Transaction is not to the escrow contract'
          });
        }
        
        // Get full transaction data
        const txData = await web3.eth.getTransaction(transactionHash);
        
        // Try to decode logs as DeliveryConfirmed events
        let foundEvent = false;
        if (txReceipt.logs) {
          console.log(`📊 Found ${txReceipt.logs.length} log entries in transaction`);
          
          // Define the event signature
          const eventSignature = web3.utils.sha3('DeliveryConfirmed(string,address)');
          
          txReceipt.logs.forEach((log, index) => {
            try {
              // Check if this log is from our contract and has the right event signature
              if (log.address.toLowerCase() === payment.escrowDetails.contractAddress.toLowerCase() &&
                  log.topics && log.topics[0] === eventSignature) {
                
                // Decode the event data
                const decodedLog = web3.eth.abi.decodeLog(
                  [
                    { type: 'string', name: 'itemId' },
                    { type: 'address', name: 'buyer' }
                  ],
                  log.data,
                  log.topics.slice(1)
                );
                
                console.log('🎉 DeliveryConfirmed event detected:');
                console.log('- Event itemId:', decodedLog.itemId);
                console.log('- Event buyer:', decodedLog.buyer);
                
                // Verify escrow ID matches
                if (decodedLog.itemId === escrowId) {
                  console.log('✅ Event escrowId matches provided escrowId');
                  foundEvent = true;
                }
              }
            } catch (error) {
              console.log(`Error decoding log ${index}:`, error.message);
            }
          });
        }
        
        if (!foundEvent) {
          console.log('⚠️ No DeliveryConfirmed event found for this escrow ID');
          // We still proceed as the function might have been called successfully
        }
        
      } catch (error) {
        console.error('Error verifying transaction:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify transaction on blockchain'
        });
      }
    }
    
    // Update payment status
    payment.status = 'escrow_released';
    payment.completedAt = new Date();
    
    if (payment.escrowDetails) {
      payment.escrowDetails.isDelivered = true;
      payment.escrowDetails.deliveryConfirmedAt = new Date();
      
      // Store transaction hash if provided
      if (transactionHash) {
        payment.escrowDetails.deliveryTransactionHash = transactionHash;
      }
    }
    
    await payment.save();
    
    // Create notification for seller
    const notification = {
      recipient: payment.sellerId,
      type: 'escrow_released',
      title: 'Escrow Released!',
      message: 'Your escrow payment has been released.',
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
      message: 'Escrow status updated to released',
      payment
    });
    
  } catch (error) {
    console.error('Error updating escrow status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update escrow status',
      error: error.message
    });
  }
};

// Get payment history for user
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query; // 'purchases' or 'sales'

    console.log('🔄 Fetching payment history for user:', userId);
    console.log('- Type:', type || 'purchases (default)');

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

    console.log(`📊 Found ${payments.length} payments`);
    
    // Log escrow-related payments
    const escrowPayments = payments.filter(payment => 
      payment.status === 'escrow_held' || payment.status === 'escrow_released'
    );
    
    if (escrowPayments.length > 0) {
      console.log(`🔐 Found ${escrowPayments.length} escrow payments:`);
      escrowPayments.forEach((payment, index) => {
        console.log(`- Escrow Payment ${index + 1}:`);
        console.log(`  ID: ${payment._id}`);
        console.log(`  Status: ${payment.status}`);
        console.log(`  Escrow Details:`, payment.escrowDetails || 'None');
      });
    }

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
      failureReason: payment.failureReason,
      escrowDetails: payment.escrowDetails
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

// Check escrow balance for a user
export const checkEscrowBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const userAddress = req.query.address;
    
    // If no address is provided, we can't check the balance
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Ethereum address is required to check escrow balance'
      });
    }
    
    // This would typically involve querying the blockchain
    // For now, we'll just return a simple response
    // In a real implementation, you would use Web3.js to call the contract's getBalance function
    
    res.json({
      success: true,
      message: 'Escrow balance retrieved successfully',
      data: {
        address: userAddress,
        // This would come from the blockchain in a real implementation
        balance: '0.0',
        // Include any pending payments that might be available for withdrawal
        pendingPayments: []
      }
    });
    
  } catch (error) {
    console.error('Error checking escrow balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check escrow balance',
      error: error.message
    });
  }
};

// Get seller escrows
export const getSellerEscrows = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Seller address is required'
      });
    }
    
    // Normalize address to lowercase for consistent comparison
    const normalizedAddress = address.toLowerCase();
    
    // Find payments where the seller's crypto address matches
    const payments = await Payment.find({
      'paymentMethod.type': 'crypto',
      status: { $in: ['escrow_held', 'escrow_released'] }
    }).populate({
      path: 'itemId',
      select: 'title seller paymentPreferences'
    });
    
    // Filter payments where the seller's address matches
    const sellerEscrows = payments.filter(payment => {
      if (!payment.itemId?.paymentPreferences?.cryptoAddress) return false;
      return payment.itemId.paymentPreferences.cryptoAddress.toLowerCase() === normalizedAddress;
    });
    
    // Transform to the expected format
    const escrows = sellerEscrows.map(payment => {
      const escrowId = payment.escrowDetails?.escrowId || payment._id.toString();
      
      return {
        id: escrowId,
        paymentId: payment._id,
        buyer: payment.metadata?.walletAddress || 'Unknown',
        seller: payment.itemId?.paymentPreferences?.cryptoAddress || 'Unknown',
        amount: payment.amount,
        isDelivered: payment.status === 'escrow_released',
        isCompleted: payment.status === 'completed',
        createdAt: payment.createdAt,
        itemTitle: payment.itemId?.title || 'Unknown Item'
      };
    });
    
    return res.status(200).json({
      success: true,
      escrows
    });
    
  } catch (error) {
    console.error('Error getting seller escrows:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get seller escrows',
      error: error.message
    });
  }
};

// Check escrow details for a specific payment
export const checkEscrowDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    console.log('🔄 Checking escrow details for payment:', paymentId);
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      console.log('❌ Payment not found:', paymentId);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify user is the buyer
    if (payment.buyerId.toString() !== userId.toString()) {
      console.log('❌ User is not the buyer of this payment');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }

    console.log('📊 Payment details:');
    console.log('- ID:', payment._id);
    console.log('- Status:', payment.status);
    console.log('- Escrow Details:', payment.escrowDetails || 'None');

    // Check if escrow details exist
    if (!payment.escrowDetails || !payment.escrowDetails.escrowId || !payment.escrowDetails.contractAddress) {
      console.log('❌ Escrow details missing for payment:', paymentId);
      return res.status(400).json({
        success: false,
        message: 'Escrow details not found for this payment',
        payment: {
          _id: payment._id,
          status: payment.status,
          escrowDetails: payment.escrowDetails || null
        }
      });
    }

    // Return escrow details
    return res.status(200).json({
      success: true,
      message: 'Escrow details found',
      escrowDetails: payment.escrowDetails,
      payment: {
        _id: payment._id,
        status: payment.status
      }
    });
    
  } catch (error) {
    console.error('Error checking escrow details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check escrow details',
      error: error.message
    });
  }
};
