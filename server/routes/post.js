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

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', createPost);
router.get('/', getPosts);
router.get('/feed', getFeed);
router.get('/trending', getTrendingPosts);
router.get('/:id', getPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', removeComment);
router.post('/:id/share', sharePost);

export default router; 