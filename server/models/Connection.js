import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: [500, 'Connection message cannot exceed 500 characters'],
    default: ''
  },
  projectInterest: {
    type: String,
    enum: ['recycling', 'renewable-energy', 'sustainable-fashion', 'zero-waste', 'green-tech', 'organic-farming', 'eco-tourism', 'clean-water'],
    required: false
  },
  collaborationType: {
    type: String,
    enum: ['partnership', 'supplier', 'customer', 'mentorship', 'consultation', 'joint-project'],
    required: false
  },
  mutualInterests: [{
    type: String,
    enum: ['recycling', 'renewable-energy', 'sustainable-fashion', 'zero-waste', 'green-tech', 'organic-farming', 'eco-tourism', 'clean-water']
  }],
  sharedProjects: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    role: String,
    startDate: Date,
    endDate: Date
  }],
  communicationHistory: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    createdAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure unique connections
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Index for status-based queries
connectionSchema.index({ status: 1, createdAt: -1 });

// Method to accept connection
connectionSchema.methods.accept = function() {
  this.status = 'accepted';
  this.lastInteraction = new Date();
  return this.save();
};

// Method to reject connection
connectionSchema.methods.reject = function() {
  this.status = 'rejected';
  this.lastInteraction = new Date();
  return this.save();
};

// Method to block connection
connectionSchema.methods.block = function() {
  this.status = 'blocked';
  this.lastInteraction = new Date();
  return this.save();
};

// Method to add message to communication history
connectionSchema.methods.addMessage = function(senderId, message) {
  this.communicationHistory.push({
    sender: senderId,
    message: message
  });
  this.lastInteraction = new Date();
  return this.save();
};

// Method to mark messages as read
connectionSchema.methods.markAsRead = function(userId) {
  this.communicationHistory.forEach(msg => {
    if (msg.sender.toString() !== userId.toString() && !msg.isRead) {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Static method to find connections between two users
connectionSchema.statics.findConnection = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id },
      { requester: user2Id, recipient: user1Id }
    ]
  });
};

// Static method to get all connections for a user
connectionSchema.statics.getUserConnections = function(userId, status = null) {
  const query = {
    $or: [
      { requester: userId },
      { recipient: userId }
    ]
  };
  
  // Only filter by status if it's provided
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('requester', 'username firstName lastName avatar organization')
    .populate('recipient', 'username firstName lastName avatar organization')
    .sort({ createdAt: -1 });
};

export default mongoose.model('Connection', connectionSchema); 