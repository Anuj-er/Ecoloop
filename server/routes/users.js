import express from 'express';
import {
  getUsers,
  getUser,
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserMetrics,
  getRecommendedUsers
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Test endpoint (no auth required)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Users route is working',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint (no auth required)
router.get('/db-test', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      message: 'Database connection working',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// All routes are protected
router.use(protect);

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/recommended', getRecommendedUsers);
router.get('/:id', getUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id/metrics', getUserMetrics);

// Social actions
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);

export default router; 