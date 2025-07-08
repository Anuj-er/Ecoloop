import express from 'express';
import {
  getFlaggedPosts,
  reviewFlaggedPost,
  getFraudStats
} from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);

// Fraud detection routes
router.get('/flagged-posts', getFlaggedPosts);
router.put('/flagged-posts/:id/review', reviewFlaggedPost);
router.get('/fraud-stats', getFraudStats);

export default router;
