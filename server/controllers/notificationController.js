import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const { type, category, isRead, priority } = req.query;

  // Build filter
  const filter = {
    recipient: req.user._id,
    isDeleted: false
  };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (priority) filter.priority = priority;

  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .populate('sender', 'username firstName lastName avatar')
    .populate('recipient', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  // Pagination
  const pagination = {};
  if (endIndex < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.json({
    success: true,
    count: notifications.length,
    pagination,
    data: notifications
  });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
    isDeleted: false
  });

  res.json({
    success: true,
    count
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  notification.isDeleted = true;
  await notification.save();

  res.json({
    success: true,
    message: 'Notification deleted'
  });
});

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  const { isRead } = req.query;
  
  const filter = {
    recipient: req.user._id,
    isDeleted: false
  };

  if (isRead !== undefined) {
    filter.isRead = isRead === 'true';
  }

  await Notification.updateMany(filter, { isDeleted: true });

  res.json({
    success: true,
    message: 'Notifications deleted'
  });
});

// Utility function to create notifications
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Populate sender info for immediate use
    await notification.populate('sender', 'username firstName lastName avatar');
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Predefined notification templates
export const notificationTemplates = {
  connectionRequest: (sender, recipient) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'connection_request',
    title: 'New Connection Request',
    message: `${sender.firstName} ${sender.lastName} wants to connect with you`,
    category: 'social',
    priority: 'medium',
    data: {}
  }),

  connectionAccepted: (sender, recipient) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'connection_accepted',
    title: 'Connection Accepted',
    message: `${sender.firstName} ${sender.lastName} accepted your connection request`,
    category: 'social',
    priority: 'medium',
    data: {}
  }),

  connectionRejected: (sender, recipient) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'connection_rejected',
    title: 'Connection Declined',
    message: `${sender.firstName} ${sender.lastName} declined your connection request`,
    category: 'social',
    priority: 'low',
    data: {}
  }),

  newMessage: (sender, recipient, messageId) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'new_message',
    title: 'New Message',
    message: `${sender.firstName} ${sender.lastName} sent you a message`,
    category: 'social',
    priority: 'high',
    data: { messageId }
  }),

  achievementUnlocked: (recipient, achievement) => ({
    recipient: recipient._id,
    sender: recipient._id, // Self notification
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    message: `Congratulations! You've unlocked the "${achievement}" achievement`,
    category: 'achievement',
    priority: 'medium',
    data: { achievement }
  }),

  systemAnnouncement: (recipient, title, message) => ({
    recipient: recipient._id,
    sender: recipient._id, // System notification
    type: 'system_announcement',
    title,
    message,
    category: 'system',
    priority: 'medium',
    data: {}
  }),

  materialListed: (sender, recipient, materialName) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'material_listed',
    title: 'New Material Available',
    message: `${sender.firstName} ${sender.lastName} listed "${materialName}" for exchange`,
    category: 'business',
    priority: 'medium',
    data: {}
  }),

  skillSwapRequest: (sender, recipient, skill) => ({
    recipient: recipient._id,
    sender: sender._id,
    type: 'skill_swap_request',
    title: 'Skill Swap Request',
    message: `${sender.firstName} ${sender.lastName} wants to exchange ${skill} skills with you`,
    category: 'business',
    priority: 'medium',
    data: {}
  })
};

// Bulk notification creation
export const createBulkNotifications = async (notifications) => {
  try {
    const createdNotifications = await Notification.insertMany(notifications);
    return createdNotifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

// Get notification statistics
export const getNotificationStats = async (userId) => {
  const stats = await Notification.aggregate([
    {
      $match: {
        recipient: userId,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          isRead: '$isRead'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats;
}; 