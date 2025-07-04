import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, userType, organization } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email or username'
    });
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    userType,
    organization
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        organization: user.organization,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid user data'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Update last active
  user.lastActive = new Date();
  await user.save();

  res.json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      organization: user.organization,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      interests: user.interests,
      skills: user.skills,
      sustainabilityMetrics: user.sustainabilityMetrics,
      isVerified: user.isVerified,
      token: generateToken(user._id)
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    bio,
    location,
    interests,
    skills,
    organization,
    avatar
  } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.interests = interests || user.interests;
    user.skills = skills || user.skills;
    user.organization = organization || user.organization;
    user.avatar = avatar || user.avatar;

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: updatedUser
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
});

// @desc    Update user avatar
// @route   PUT /api/auth/avatar
// @access  Private
export const updateAvatar = asyncHandler(async (req, res) => {
  const { avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    user.avatar = avatar;
    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        avatar: updatedUser.avatar
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // Update last active
  const user = await User.findById(req.user._id);
  if (user) {
    user.lastActive = new Date();
    await user.save();
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Delete account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
}); 