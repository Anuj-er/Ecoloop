import express from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  removeComment,
  sharePost,
  getFeed,
  getTrendingPosts
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { fraudDetection } from '../middleware/fraudDetection.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Apply fraud detection middleware to post creation and updates
router.post('/', fraudDetection, createPost);
router.get('/', getPosts);
router.get('/feed', getFeed);
router.get('/trending', getTrendingPosts);
router.get('/:id', getPost);
router.put('/:id', fraudDetection, updatePost);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', removeComment);
router.post('/:id/share', sharePost);

export default router; 