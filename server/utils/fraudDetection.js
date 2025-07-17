// Utility functions for fraud detection
import { User, Post } from '../models/index.js';

/**
 * Rule-based fraud detection
 * A no-cost approach to detect potentially fraudulent posts
 */
export const detectPostFraud = async (postData, userId) => {
  const fraudScore = {
    contentScore: analyzeContent(postData.content),
    impactScore: analyzeImpact(postData.impact),
    userScore: await analyzeUserTrust(userId),
    behaviorScore: await analyzeBehavior(userId)
  };

  // Calculate overall fraud score (0-100, higher means more likely fraud)
  const overallScore = calculateOverallFraudScore(fraudScore);

  return {
    fraudProbability: overallScore / 100,
    fraudScore: fraudScore,
    isSuspicious: overallScore > 30,
    fraudFlags: generateFraudFlags(fraudScore, postData),
    status: overallScore > 30 ? 'flagged' : 'active'
  };
};

/**
 * Analyze post content for suspicious patterns
 */
function analyzeContent(content) {
  let score = 0;
  
  // Check for suspicious keywords
  const suspiciousKeywords = [
    'guaranteed', 'free', 'unlimited', '100%', 'revolutionary', 'amazing',
    'earn money', 'get paid', 'instant', 'magic', 'miracle'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Count suspicious keywords
  const keywordsFound = suspiciousKeywords.filter(keyword => 
    contentLower.includes(keyword.toLowerCase())
  );
  
  score += keywordsFound.length * 5; // 5 points per suspicious keyword
  
  // Check for excessive exclamation marks
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 3) score += 5;
  if (exclamationCount > 6) score += 10;
  
  // Check for ALL CAPS sections
  const capsMatches = content.match(/[A-Z]{5,}/g);
  if (capsMatches && capsMatches.length > 0) score += 5;
  
  // Check for repetition
  const words = content.toLowerCase().split(/\W+/);
  const wordCounts = {};
  words.forEach(word => {
    if (word.length > 3) { // Only check words with more than 3 characters
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  const repeatedWords = Object.values(wordCounts).filter(count => count > 3);
  score += repeatedWords.length * 3;
  
  // Check content length - too short might be suspicious
  if (content.length < 20) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Analyze impact metrics for unrealistic claims
 */
function analyzeImpact(impact) {
  let score = 0;
  
  // Check for unrealistically high impact values
  if (impact.carbonSaved > 1000) score += 20;
  if (impact.wasteReduced > 5000) score += 20;
  if (impact.energySaved > 10000) score += 20;
  if (impact.peopleReached > 100000) score += 20;
  
  // Check for suspiciously round numbers
  if (impact.carbonSaved % 1000 === 0 && impact.carbonSaved > 0) score += 10;
  if (impact.wasteReduced % 1000 === 0 && impact.wasteReduced > 0) score += 10;
  if (impact.energySaved % 1000 === 0 && impact.energySaved > 0) score += 10;
  if (impact.peopleReached % 1000 === 0 && impact.peopleReached > 0) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Analyze user trust based on history and profile
 */
async function analyzeUserTrust(userId) {
  let score = 0;
  
  try {
    const user = await User.findById(userId);
    
    // New users are higher risk
    const accountAgeDays = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) score += 40;
    else if (accountAgeDays < 7) score += 20;
    else if (accountAgeDays < 30) score += 10;
    
    // Incomplete profiles are higher risk
    if (!user.bio || user.bio.length < 10) score += 10;
    if (!user.avatar) score += 10;
    if (!user.location) score += 10;
    if (!user.interests || user.interests.length === 0) score += 10;
    
    // Verified users are lower risk
    if (user.isVerified) score -= 20;
    
  } catch (error) {
    console.error('Error analyzing user trust:', error);
    score += 20; // Higher score if user can't be analyzed
  }
  
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Analyze user posting behavior
 */
async function analyzeBehavior(userId) {
  let score = 0;
  
  try {
    // Get user's recent posts
    const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const postsLastDay = await Post.countDocuments({
      author: userId,
      createdAt: { $gte: lastDay }
    });
    
    // Too many posts in a short time is suspicious
    if (postsLastDay > 5) score += 20;
    if (postsLastDay > 10) score += 30;
    
    // Check for similar content in previous posts
    const recentPosts = await Post.find({
      author: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).select('content');
    
    // Check for identical posts
    const contents = recentPosts.map(post => post.content);
    const uniqueContents = new Set(contents);
    
    if (uniqueContents.size < contents.length) {
      score += 40; // Duplicate content detected
    }
    
  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    score += 10; // Higher score if behavior can't be analyzed
  }
  
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculate overall fraud score from individual components
 */
function calculateOverallFraudScore(scores) {
  return Math.round(
    0.3 * scores.contentScore +
    0.3 * scores.impactScore +
    0.2 * scores.userScore +
    0.2 * scores.behaviorScore
  );
}

/**
 * Generate specific fraud flags
 */
function generateFraudFlags(scores, postData) {
  const flags = [];
  
  if (scores.contentScore > 40) flags.push('suspicious_content');
  if (scores.impactScore > 40) flags.push('unrealistic_claims');
  if (scores.userScore > 40) flags.push('low_user_trust');
  if (scores.behaviorScore > 40) flags.push('suspicious_behavior');
  
  // Check for specific issues
  if (scores.impactScore > 30) {
    const impact = postData.impact;
    
    if (impact.carbonSaved > 1000) flags.push('high_carbon_claim');
    if (impact.wasteReduced > 5000) flags.push('high_waste_claim');
    if (impact.energySaved > 10000) flags.push('high_energy_claim');
  }
  
  return flags;
}
