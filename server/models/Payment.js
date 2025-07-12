import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Flag to indicate if this is a multi-item payment
  multiItem: {
    type: Boolean,
    default: false
  },
  // For multi-item payments, store item details in an array
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceItem'
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    quantity: {
      type: Number,
      min: 1
    },
    price: {
      type: Number,
      min: 0
    },
    title: String
  }],
  // Original fields for single-item payments
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceItem',
    // Not required if multiItem is true
    required: function() { return !this.multiItem; }
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Not required if multiItem is true
    required: function() { return !this.multiItem; }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['INR', 'USD', 'ETH', 'BTC']
  },
  paymentMethod: {
    type: {
      type: String,
      required: true,
      enum: ['crypto', 'fiat']
    },
    currency: String,
    network: String
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded', 'escrow_held', 'escrow_released'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    sparse: true
  },
  transactionHash: {
    type: String,
    sparse: true
  },
  stripePaymentIntentId: String,
  stripeChargeId: String,
  escrowDetails: {
    contractAddress: String,
    escrowId: String,
    isDelivered: {
      type: Boolean,
      default: false
    },
    deliveryConfirmedAt: Date
  },
  quantity: {
    type: Number,
    // Not required if multiItem is true
    required: function() { return !this.multiItem; },
    min: 1
  },
  shippingInfo: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
    email: String
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timestamp: Date
  },
  notes: String,
  refundReason: String,
  failureReason: String,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
paymentSchema.index({ buyerId: 1, createdAt: -1 });
paymentSchema.index({ sellerId: 1, createdAt: -1 });
paymentSchema.index({ itemId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ transactionHash: 1 });
paymentSchema.index({ 'items.itemId': 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
