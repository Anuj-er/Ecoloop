import Connection from '../models/Connection.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Send connection request
// @route   POST /api/connections
// @access  Private
export const sendConnectionRequest = asyncHandler(async (req, res) => {
  const {
    recipientId,
    message,
    projectInterest,
    collaborationType,
    mutualInterests
  } = req.body;

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({
      success: false,
      message: 'Recipient not found'
    });
  }

  // Check if trying to connect with self
  if (recipientId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot send connection request to yourself'
    });
  }

  // Check if connection already exists
  const existingConnection = await Connection.findConnection(req.user._id, recipientId);
  if (existingConnection) {
    return res.status(400).json({
      success: false,
      message: 'Connection request already exists'
    });
  }

  const connection = await Connection.create({
    requester: req.user._id,
    recipient: recipientId,
    message,
    projectInterest,
    collaborationType,
    mutualInterests
  });

  await connection.populate('requester', 'username firstName lastName avatar organization');
  await connection.populate('recipient', 'username firstName lastName avatar organization');

  res.status(201).json({
    success: true,
    data: connection
  });
});

// @desc    Get user's connections
// @route   GET /api/connections
// @access  Private
export const getConnections = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const connections = await Connection.getUserConnections(req.user._id, status);

  res.json({
    success: true,
    count: connections.length,
    data: connections
  });
});

// @desc    Accept connection request
// @route   PUT /api/connections/:id/accept
// @access  Private
export const acceptConnection = asyncHandler(async (req, res) => {
  const connection = await Connection.findById(req.params.id);

  if (!connection) {
    return res.status(404).json({
      success: false,
      message: 'Connection request not found'
    });
  }

  // Check if user is the recipient
  if (connection.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to accept this connection'
    });
  }

  await connection.accept();
  await connection.populate('requester', 'username firstName lastName avatar organization');
  await connection.populate('recipient', 'username firstName lastName avatar organization');

  res.json({
    success: true,
    data: connection
  });
});

// @desc    Reject connection request
// @route   PUT /api/connections/:id/reject
// @access  Private
export const rejectConnection = asyncHandler(async (req, res) => {
  const connection = await Connection.findById(req.params.id);

  if (!connection) {
    return res.status(404).json({
      success: false,
      message: 'Connection request not found'
    });
  }

  // Check if user is the recipient
  if (connection.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to reject this connection'
    });
  }

  await connection.reject();

  res.json({
    success: true,
    message: 'Connection request rejected'
  });
});

// @desc    Send message to connection
// @route   POST /api/connections/:id/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  const connection = await Connection.findById(req.params.id);

  if (!connection) {
    return res.status(404).json({
      success: false,
      message: 'Connection not found'
    });
  }

  // Check if user is part of the connection and it's accepted
  if (connection.status !== 'accepted') {
    return res.status(400).json({
      success: false,
      message: 'Connection must be accepted to send messages'
    });
  }

  if (![connection.requester.toString(), connection.recipient.toString()].includes(req.user._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to send message to this connection'
    });
  }

  await connection.addMessage(req.user._id, message);
  await connection.populate('communicationHistory.sender', 'username firstName lastName avatar');

  const newMessage = connection.communicationHistory[connection.communicationHistory.length - 1];

  res.json({
    success: true,
    data: newMessage
  });
});

// @desc    Get connection recommendations
// @route   GET /api/connections/recommendations
// @access  Private
export const getConnectionRecommendations = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);
  
  // Get existing connections
  const existingConnections = await Connection.find({
    $or: [
      { requester: req.user._id },
      { recipient: req.user._id }
    ]
  });

  const connectedUserIds = existingConnections.map(conn => 
    conn.requester.toString() === req.user._id.toString() 
      ? conn.recipient.toString() 
      : conn.requester.toString()
  );

  // Find users with similar interests who are not already connected
  const recommendations = await User.find({
    _id: { 
      $ne: req.user._id,
      $nin: connectedUserIds
    },
    isActive: true,
    interests: { $in: currentUser.interests }
  })
  .select('username firstName lastName avatar bio interests userType organization sustainabilityMetrics')
  .populate('organization', 'name industry')
  .limit(10)
  .sort({ 'sustainabilityMetrics.projectsCompleted': -1 });

  res.json({
    success: true,
    count: recommendations.length,
    data: recommendations
  });
}); 