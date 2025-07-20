import express from 'express';
import { 
  createPaymentIntent, 
  verifyPayment, 
  processCryptoPayment, 
  confirmDelivery,
  getPaymentHistory,
  getPaymentDetails,
  checkEscrowBalance,
  getSellerEscrows,
  adminUpdateEscrowStatus,
  checkEscrowDetails
} from '../controllers/paymentController.js';
import { protect, adminProtect } from '../middleware/auth.js';

const router = express.Router();

// Create payment intent (Stripe)
router.post('/create-payment-intent', protect, createPaymentIntent);

// Verify payment completion
router.post('/verify-payment', protect, verifyPayment);

// Process crypto payment
router.post('/process-crypto-payment', protect, processCryptoPayment);

// Confirm delivery (release escrow)
router.post('/confirm-delivery', protect, confirmDelivery);

// Get payment history
router.get('/history', protect, getPaymentHistory);

// Get payment details
router.get('/details/:paymentId', protect, getPaymentDetails);

// Check escrow details for a specific payment
router.get('/escrow-details/:paymentId', protect, checkEscrowDetails);

// Check escrow balance
router.get('/escrow-balance', protect, checkEscrowBalance);

// Get seller escrows
router.get('/seller-escrows', protect, getSellerEscrows);

// Admin endpoint to update escrow status
router.post('/admin/update-escrow-status', adminProtect, adminUpdateEscrowStatus);

export default router;
