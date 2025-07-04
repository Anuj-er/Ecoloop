import express from 'express';
import {
  sendConnectionRequest,
  getConnections,
  acceptConnection,
  rejectConnection,
  sendMessage,
  getConnectionRecommendations
} from '../controllers/connectionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', sendConnectionRequest);
router.get('/', getConnections);
router.put('/:id/accept', acceptConnection);
router.put('/:id/reject', rejectConnection);
router.post('/:id/messages', sendMessage);
router.get('/recommendations', getConnectionRecommendations);

export default router; 