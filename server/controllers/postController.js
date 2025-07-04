import Post from '../models/Post.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadMultipleImages, deleteMultipleImages } from '../utils/cloudinary.js';

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
export const createPost = asyncHandler(async (req, res) => {
  const {
    content,
    media,
    category,
    tags,
    location,
    impact
  } = req.body;

  // Validate required fields
  if (!content || !category) {
    return res.status(400).json({
      success: false,
      message: 'Content and category are required'
    });
  }

  // Validate category
  const validCategories = ['achievement', 'project', 'tip', 'question', 'event', 'news', 'challenge'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    });
  }

  // Media should already be uploaded via upload API
  console.log('Creating post with media:', media);
  const post = await Post.create({
    author: req.user._id,
    content,
    media: media || [],
    category,
    tags: tags || [],
    location: location || '',
    impact: impact || {
      carbonSaved: 0,
      wasteReduced: 0,
      energySaved: 0,
      peopleReached: 0
    }
  });

  // Populate author info
  await post.populate('author', 'username firstName lastName avatar');

  res.status(201).json({
    success: true,
    data: post
  });
});

// @desc    Get all posts (with pagination and filters)
// @route   GET /api/posts
// @access  Private
export const getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const {
    author,
    category,
    tags,
    search,
    location,
    verified
  } = req.query;

  // Build filter object
  const filter = { status: 'active' };

  if (author) {
    filter.author = author;
  }

  if (category) {
    filter.category = category;
  }

  if (tags) {
    filter.tags = { $in: tags.split(',') };
  }

  if (search) {
    filter.$text = { $search: search };
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (verified !== undefined) {
    filter.isVerified = verified === 'true';
  }

  const total = await Post.countDocuments(filter);
  const posts = await Post.find(filter)
    .populate('author', 'username firstName lastName avatar userType organization')
    .populate('comments.user', 'username firstName lastName avatar')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Pagination result
  const pagination = {};
  const endIndex = startIndex + limit;

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.json({
    success: true,
    count: posts.length,
    pagination,
    data: posts
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username firstName lastName avatar userType organization')
    .populate('comments.user', 'username firstName lastName avatar')
    .populate('likes', 'username firstName lastName avatar')
    .populate('shares', 'username firstName lastName avatar');

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check if current user has liked the post
  let isLiked = false;
  if (req.user) {
    isLiked = post.likes.some(like => 
      like._id.toString() === req.user._id.toString()
    );
  }

  res.json({
    success: true,
    data: {
      post,
      isLiked
    }
  });
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = asyncHandler(async (req, res) => {
  const {
    content,
    media,
    category,
    tags,
    location,
    impact
  } = req.body;

  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this post'
    });
  }

  // Handle media updates
  let updatedMedia = post.media;
  if (media !== undefined) {
    // Delete old media from Cloudinary if new media is provided
    if (post.media && post.media.length > 0) {
      const publicIds = post.media.map(m => m.public_id).filter(Boolean);
      if (publicIds.length > 0) {
        try {
          await deleteMultipleImages(publicIds);
        } catch (error) {
          console.error('Failed to delete old media:', error);
        }
      }
    }

    // Upload new media if provided
    if (media && media.length > 0) {
      try {
        updatedMedia = await uploadMultipleImages(media, 'eco-loop/posts');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload new media files'
        });
      }
    } else {
      updatedMedia = [];
    }
  }

  post.content = content || post.content;
  post.media = updatedMedia;
  post.category = category || post.category;
  post.tags = tags || post.tags;
  post.location = location || post.location;
  post.impact = impact || post.impact;

  const updatedPost = await post.save();
  await updatedPost.populate('author', 'username firstName lastName avatar');

  res.json({
    success: true,
    data: updatedPost
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Check ownership
  if (post.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this post'
    });
  }

  // Delete media from Cloudinary
  if (post.media && post.media.length > 0) {
    const publicIds = post.media.map(m => m.public_id).filter(Boolean);
    if (publicIds.length > 0) {
      try {
        await deleteMultipleImages(publicIds);
      } catch (error) {
        console.error('Failed to delete media from Cloudinary:', error);
      }
    }
  }

  // Soft delete - change status to archived
  post.status = 'archived';
  await post.save();

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
export const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  const isLiked = post.likes.includes(req.user._id);

  if (isLiked) {
    await post.removeLike(req.user._id);
    res.json({
      success: true,
      message: 'Post unliked',
      liked: false
    });
  } else {
    await post.addLike(req.user._id);
    res.json({
      success: true,
      message: 'Post liked',
      liked: true
    });
  }
});

// @desc    Add comment to post
// @route   POST /api/posts/:id/comments
// @access  Private
export const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  await post.addComment(req.user._id, content);
  await post.populate('comments.user', 'username firstName lastName avatar');

  res.json({
    success: true,
    data: post.comments[post.comments.length - 1]
  });
});

// @desc    Remove comment from post
// @route   DELETE /api/posts/:id/comments/:commentId
// @access  Private
export const removeComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  const comment = post.comments.id(req.params.commentId);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check if user owns the comment
  if (comment.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this comment'
    });
  }

  await post.removeComment(req.params.commentId);

  res.json({
    success: true,
    message: 'Comment removed successfully'
  });
});

// @desc    Share post
// @route   POST /api/posts/:id/share
// @access  Private
export const sharePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  if (!post.shares.includes(req.user._id)) {
    post.shares.push(req.user._id);
    await post.save();
  }

  res.json({
    success: true,
    message: 'Post shared successfully'
  });
});

// @desc    Get user's feed (posts from followed users)
// @route   GET /api/posts/feed
// @access  Private
export const getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const currentUser = await User.findById(req.user._id);
  const followingIds = currentUser.following;

  // Get posts from followed users and current user
  const filter = {
    status: 'active',
    author: { $in: [...followingIds, req.user._id] }
  };

  const total = await Post.countDocuments(filter);
  const posts = await Post.find(filter)
    .populate('author', 'username firstName lastName avatar userType organization')
    .populate('comments.user', 'username firstName lastName avatar')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Pagination result
  const pagination = {};
  const endIndex = startIndex + limit;

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.json({
    success: true,
    count: posts.length,
    pagination,
    data: posts
  });
});

// @desc    Get trending posts
// @route   GET /api/posts/trending
// @access  Private
export const getTrendingPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const days = parseInt(req.query.days, 10) || 7;

  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);

  const posts = await Post.aggregate([
    {
      $match: {
        status: 'active',
        createdAt: { $gte: dateFilter }
      }
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $size: '$likes' },
            { $multiply: [{ $size: '$comments' }, 2] },
            { $multiply: [{ $size: '$shares' }, 3] }
          ]
        }
      }
    },
    {
      $sort: { engagementScore: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author'
      }
    },
    {
      $unwind: '$author'
    },
    {
      $project: {
        'author.password': 0
      }
    }
  ]);

  res.json({
    success: true,
    count: posts.length,
    data: posts
  });
}); 