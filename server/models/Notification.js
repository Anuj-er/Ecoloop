import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'connection_request',
      'connection_accepted',
      'connection_rejected',
      'new_message',
      'deal_proposal',
      'deal_accepted',
      'deal_rejected',
      'material_listed',
      'skill_swap_request',
      'system_announcement',
      'achievement_unlocked',
      'project_completed'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    // Additional data specific to notification type
    connectionId: mongoose.Schema.Types.ObjectId,
    dealId: mongoose.Schema.Types.ObjectId,
    materialId: mongoose.Schema.Types.ObjectId,
    postId: mongoose.Schema.Types.ObjectId,
    messageId: mongoose.Schema.Types.ObjectId,
    achievement: String,
    project: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['social', 'business', 'system', 'achievement'],
    default: 'social'
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isDeleted: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Notification', notificationSchema); 