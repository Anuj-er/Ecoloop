import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Debug endpoint to test admin authentication
router.get('/debug', protect, (req, res) => {
  console.log('Debug endpoint hit');
  console.log('User:', req.user);
  
  res.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: req.user._id,
      email: req.user.email,
      isAdmin: ['admin@ecoloop.com', 'admin@example.com'].includes(req.user.email)
    }
  });
});

// Debug admin endpoint
router.get('/debug-admin', protect, requireAdmin, (req, res) => {
  console.log('Admin debug endpoint hit');
  console.log('User:', req.user);
  
  res.json({
    success: true,
    message: 'Admin access working',
    user: {
      id: req.user._id,
      email: req.user.email
    }
  });
});

export default router;
