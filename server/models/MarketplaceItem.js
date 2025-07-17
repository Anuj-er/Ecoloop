import mongoose from 'mongoose';

const marketplaceItemSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Item title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Item description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  materialType: {
    type: String,
    required: [true, 'Material type is required'],
    enum: ['cloth', 'wood', 'metal', 'plastic', 'glass', 'paper', 'electronics', 'fabric', 'leather', 'other']
  },
  pinCode: {
    type: String,
    required: [true, 'Pin code is required'],
    match: [/^\d{6}$/, 'Pin code must be 6 digits']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  paymentPreferences: {
    acceptsFiat: {
      type: Boolean,
      default: true
    },
    acceptsCrypto: {
      type: Boolean,
      default: false
    },
    cryptoAddress: {
      type: String,
      default: null
    },
    escrowEnabled: {
      type: Boolean,
      default: true
    }
  },
  condition: {
    type: String,
    required: [true, 'Item condition is required'],
    enum: ['new', 'like-new', 'good', 'fair', 'poor']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    },
    width: Number,
    height: Number,
    format: String,
    aiAnalysis: {
      label: String,
      confidence: Number,
      status: {
        type: String,
        enum: ['approved', 'review', 'rejected', 'error', 'usable', 'blurry', 'low_quality', 'suspicious'],
        default: 'usable'
      },
      qualityScore: Number,
      category: String,
      message: String,
      review_reason: String,
      detected_item: String,
      matched_keyword: String
    }
  }],
  status: {
    type: String,
    enum: ['active', 'sold', 'inactive', 'pending_review', 'rejected'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  interestedBuyers: [{
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    contactInfo: {
      phone: String,
      email: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    enum: ['recycled', 'upcycled', 'sustainable', 'eco-friendly', 'handmade', 'vintage', 'organic', 'biodegradable']
  }],
  category: {
    type: String,
    enum: ['raw-materials', 'finished-goods', 'tools', 'equipment', 'craft-supplies', 'textiles', 'furniture', 'electronics']
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: {
      type: String,
      enum: ['cm', 'inch', 'meter'],
      default: 'cm'
    }
  },
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableUntil: {
    type: Date
  },
  moderationNotes: String,
  reviewStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes for search and filtering
marketplaceItemSchema.index({ materialType: 1, status: 1 });
marketplaceItemSchema.index({ pinCode: 1 });
marketplaceItemSchema.index({ seller: 1 });
marketplaceItemSchema.index({ createdAt: -1 });
marketplaceItemSchema.index({ title: 'text', description: 'text' });

// Virtual for calculating time since posted
marketplaceItemSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Middleware to increment views
marketplaceItemSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

export default mongoose.model('MarketplaceItem', marketplaceItemSchema);
