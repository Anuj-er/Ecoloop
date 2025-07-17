import express from 'express';
import {
  createMarketplaceItem,
  getMarketplaceItems,
  getMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  expressInterest,
  getMyMarketplaceItems,
  getPendingReviewItems,
  reviewMarketplaceItem
} from '../controllers/marketplaceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected but accessible to all authenticated users)
router.route('/')
  .get(protect, getMarketplaceItems)
  .post(protect, createMarketplaceItem);

router.get('/my-items', protect, getMyMarketplaceItems);

router.route('/:id')
  .get(protect, getMarketplaceItem)
  .put(protect, updateMarketplaceItem)
  .delete(protect, deleteMarketplaceItem);

router.post('/:id/interest', protect, expressInterest);

// Admin routes
router.get('/admin/pending-review', protect, getPendingReviewItems);
router.put('/admin/:id/review', protect, reviewMarketplaceItem);

export default router;
