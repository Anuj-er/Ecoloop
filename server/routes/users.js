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

const router = express.Router();

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