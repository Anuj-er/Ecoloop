import Post from '../models/Post.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get flagged posts for review
// @route   GET /api/admin/flagged-posts
// @access  Admin
export const getFlaggedPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Get posts that have been flagged
  const posts = await Post.find({ 
    status: 'flagged',
    'fraudAnalysis.reviewStatus': 'pending'
  })
    .populate('author', 'username firstName lastName avatar userType organization')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Post.countDocuments({ 
    status: 'flagged',
    'fraudAnalysis.reviewStatus': 'pending'
  });

  res.json({
    success: true,
    count: posts.length,
    total,
    data: posts
  });
});

// @desc    Review a flagged post
// @route   PUT /api/admin/flagged-posts/:id/review
// @access  Admin
export const reviewFlaggedPost = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'Decision must be either approve or reject'
    });
  }
  
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }
  
  // Update post based on decision
  if (decision === 'approve') {
    post.status = 'active';
    post.fraudAnalysis.reviewStatus = 'cleared';
  } else {
    post.status = 'archived';
    post.fraudAnalysis.reviewStatus = 'reviewed';
  }
  
  post.fraudAnalysis.reviewedBy = req.user._id;
  post.fraudAnalysis.reviewedAt = new Date();
  
  await post.save();
  
  res.json({
    success: true,
    data: post
  });
});

// @desc    Get fraud detection statistics
// @route   GET /api/admin/fraud-stats
// @access  Admin
export const getFraudStats = asyncHandler(async (req, res) => {
  const totalPosts = await Post.countDocuments();
  const flaggedPosts = await Post.countDocuments({ status: 'flagged' });
  const reviewedPosts = await Post.countDocuments({ 
    'fraudAnalysis.reviewStatus': { $in: ['reviewed', 'cleared'] } 
  });
  const rejectedPosts = await Post.countDocuments({ 
    'fraudAnalysis.reviewStatus': 'reviewed',
    status: 'archived'
  });
  
  // Get average fraud scores
  const avgScoreResult = await Post.aggregate([
    {
      $group: {
        _id: null,
        averageScore: { $avg: '$fraudAnalysis.fraudScore' }
      }
    }
  ]);
  
  const avgFraudScore = avgScoreResult.length > 0 ? 
    avgScoreResult[0].averageScore : 0;
  
  // Get most common fraud flags
  const flagsResult = await Post.aggregate([
    { $unwind: '$fraudAnalysis.fraudFlags' },
    {
      $group: {
        _id: '$fraudAnalysis.fraudFlags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  res.json({
    success: true,
    data: {
      totalPosts,
      flaggedPosts,
      flaggedPercentage: totalPosts > 0 ? (flaggedPosts / totalPosts * 100).toFixed(1) : 0,
      reviewedPosts,
      rejectedPosts,
      avgFraudScore,
      commonFlags: flagsResult.map(flag => ({ 
        name: flag._id, 
        count: flag.count 
      }))
    }
  });
});
