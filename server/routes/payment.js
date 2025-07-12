import express from 'express';
import {
  createPaymentIntent,
  verifyPayment,
  processCryptoPayment,
  confirmDelivery,
  getPaymentHistory,
  getPaymentDetails
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Fiat payment routes
router.post('/create-payment-intent', createPaymentIntent);
router.post('/verify', verifyPayment);

// Crypto payment routes
router.post('/crypto', processCryptoPayment);
router.post('/confirm-delivery', confirmDelivery);

// Payment history and details
router.get('/history', getPaymentHistory);
router.get('/:paymentId', getPaymentDetails);

export default router;
