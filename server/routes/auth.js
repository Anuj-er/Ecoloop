import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  logout,
  deleteAccount
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, updateAvatar);
router.put('/password', protect, changePassword);
router.post('/logout', protect, logout);
router.delete('/account', protect, deleteAccount);

export default router; 