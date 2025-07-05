import User from '../models/User.js';
import Post from '../models/Post.js';
import Connection from '../models/Connection.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all users (with pagination and filters)
// @route   GET /api/users
// @access  Private
export const getUsers = asyncHandler(async (req, res) => {
  console.log('getUsers called with query:', req.query);
  console.log('User making request:', req.user?._id);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const {
    search,
    userType,
    interests,
    location,
    skills,
    verified
  } = req.query;

  // Build filter object
  const filter = { isActive: true };

  if (search) {
    // Use regex search instead of text search for better compatibility
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { bio: { $regex: search, $options: 'i' } }
    ];
  }

  if (userType) {
    filter.userType = userType;
  }

  if (interests) {
    filter.interests = { $in: interests.split(',') };
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (skills) {
    filter.skills = { $in: skills.split(',') };
  }

  if (verified !== undefined) {
    filter.isVerified = verified === 'true';
  }

  console.log('Filter object:', JSON.stringify(filter, null, 2));

  try {
    console.log('Counting documents...');
    const total = await User.countDocuments(filter);
    console.log('Total users found:', total);

    console.log('Finding users...');
    const users = await User.find(filter)
      .select('-password')
      .populate('organization', 'name industry size')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log('Users found:', users.length);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.json({
      success: true,
      count: users.length,
      pagination,
      data: users
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('organization', 'name website industry size')
    .populate('followers', 'username firstName lastName avatar')
    .populate('following', 'username firstName lastName avatar');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if current user is following this user
  let isFollowing = false;
  if (req.user) {
    isFollowing = user.followers.some(follower => 
      follower._id.toString() === req.user._id.toString()
    );
  }

  // Get user's recent posts
  const posts = await Post.find({ author: req.params.id, status: 'active' })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('author', 'username firstName lastName avatar');

  res.json({
    success: true,
    data: {
      user,
      isFollowing,
      recentPosts: posts
    }
  });
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, interests, location, userType } = req.query;

  const filter = { isActive: true };

  if (q) {
    filter.$text = { $search: q };
  }

  if (interests) {
    filter.interests = { $in: interests.split(',') };
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (userType) {
    filter.userType = userType;
  }

  const users = await User.find(filter)
    .select('username firstName lastName avatar bio location interests userType organization')
    .populate('organization', 'name industry')
    .limit(20)
    .sort({ score: { $meta: 'textScore' } });

  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Follow user
// @route   POST /api/users/:id/follow
// @access  Private
export const followUser = asyncHandler(async (req, res) => {
  const userToFollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!userToFollow) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (userToFollow._id.toString() === currentUser._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot follow yourself'
    });
  }

  // Check if already following
  if (currentUser.following.includes(userToFollow._id)) {
    return res.status(400).json({
      success: false,
      message: 'Already following this user'
    });
  }

  // Add to following
  currentUser.following.push(userToFollow._id);
  userToFollow.followers.push(currentUser._id);

  await Promise.all([currentUser.save(), userToFollow.save()]);

  res.json({
    success: true,
    message: 'User followed successfully'
  });
});

// @desc    Unfollow user
// @route   DELETE /api/users/:id/follow
// @access  Private
export const unfollowUser = asyncHandler(async (req, res) => {
  const userToUnfollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!userToUnfollow) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Remove from following
  currentUser.following = currentUser.following.filter(
    id => id.toString() !== userToUnfollow._id.toString()
  );
  userToUnfollow.followers = userToUnfollow.followers.filter(
    id => id.toString() !== currentUser._id.toString()
  );

  await Promise.all([currentUser.save(), userToUnfollow.save()]);

  res.json({
    success: true,
    message: 'User unfollowed successfully'
  });
});

// @desc    Get user's followers
// @route   GET /api/users/:id/followers
// @access  Private
export const getFollowers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('followers', 'username firstName lastName avatar bio');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    count: user.followers.length,
    data: user.followers
  });
});

// @desc    Get user's following
// @route   GET /api/users/:id/following
// @access  Private
export const getFollowing = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('following', 'username firstName lastName avatar bio');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    count: user.following.length,
    data: user.following
  });
});

// @desc    Get user's sustainability metrics
// @route   GET /api/users/:id/metrics
// @access  Private
export const getUserMetrics = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('sustainabilityMetrics');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get posts with impact data
  const posts = await Post.find({ 
    author: req.params.id, 
    status: 'active' 
  }).select('impact');

  // Calculate total impact from posts
  const totalImpact = posts.reduce((acc, post) => {
    acc.carbonSaved += post.impact.carbonSaved || 0;
    acc.wasteReduced += post.impact.wasteReduced || 0;
    acc.energySaved += post.impact.energySaved || 0;
    acc.peopleReached += post.impact.peopleReached || 0;
    return acc;
  }, {
    carbonSaved: 0,
    wasteReduced: 0,
    energySaved: 0,
    peopleReached: 0
  });

  res.json({
    success: true,
    data: {
      userMetrics: user.sustainabilityMetrics,
      postsImpact: totalImpact,
      totalPosts: posts.length
    }
  });
});

// @desc    Get recommended users
// @route   GET /api/users/recommended
// @access  Private
export const getRecommendedUsers = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);
  
  // Find users with similar interests
  const recommendedUsers = await User.find({
    _id: { $ne: currentUser._id },
    isActive: true,
    interests: { $in: currentUser.interests }
  })
  .select('username firstName lastName avatar bio interests userType organization')
  .populate('organization', 'name industry')
  .limit(10)
  .sort({ 'sustainabilityMetrics.projectsCompleted': -1 });

  res.json({
    success: true,
    count: recommendedUsers.length,
    data: recommendedUsers
  });
}); 