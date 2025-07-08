import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './models/Post.js';
import { detectPostFraud } from './utils/fraudDetection.js';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;

    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function analyzeExistingPosts() {
  await connectDB();

  try {
    // Get all posts that don't have fraud analysis or have default values
    const postsToAnalyze = await Post.find({
      $or: [
        { 'fraudAnalysis.fraudScore': { $exists: false } },
        { 'fraudAnalysis.fraudScore': 0 },
        { status: { $ne: 'flagged' } }
      ]
    }).populate('author', 'email');

    console.log(`Found ${postsToAnalyze.length} posts to analyze`);

    let flaggedCount = 0;
    let processedCount = 0;

    for (const post of postsToAnalyze) {
      try {
        // Prepare post data for fraud detection
        const postData = {
          content: post.content,
          impact: post.impact || {
            carbonSaved: 0,
            wasteReduced: 0,
            energySaved: 0
          }
        };

        // Run fraud detection
        const fraudAnalysis = await detectPostFraud(postData, post.author._id);

        // Update the post with fraud analysis
        const updateData = {
          'fraudAnalysis.fraudScore': Math.round(fraudAnalysis.fraudProbability * 100),
          'fraudAnalysis.fraudFlags': fraudAnalysis.fraudFlags,
          'fraudAnalysis.reviewStatus': 'pending'
        };

        // If flagged, update status
        if (fraudAnalysis.isSuspicious) {
          updateData.status = 'flagged';
          flaggedCount++;
        }

        await Post.findByIdAndUpdate(post._id, updateData);
        
        processedCount++;
        
        console.log(`${processedCount}/${postsToAnalyze.length} - Post: "${post.content.substring(0, 50)}..." - Score: ${Math.round(fraudAnalysis.fraudProbability * 100)} - ${fraudAnalysis.isSuspicious ? 'FLAGGED' : 'OK'}`);
        
      } catch (error) {
        console.error(`Error processing post ${post._id}:`, error);
      }
    }

    console.log('\n📊 Analysis Complete:');
    console.log(`✅ Processed: ${processedCount} posts`);
    console.log(`🚨 Flagged: ${flaggedCount} posts`);
    console.log(`✅ Clean: ${processedCount - flaggedCount} posts`);

    // Show flagged posts summary
    const flaggedPosts = await Post.find({ status: 'flagged' })
      .populate('author', 'email username')
      .select('content fraudAnalysis.fraudScore fraudAnalysis.fraudFlags');

    console.log('\n🚨 Flagged Posts Summary:');
    flaggedPosts.forEach((post, index) => {
      console.log(`${index + 1}. Score: ${post.fraudAnalysis.fraudScore} - Author: ${post.author.email}`);
      console.log(`   Content: "${post.content.substring(0, 100)}..."`);
      console.log(`   Flags: ${post.fraudAnalysis.fraudFlags.join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the analysis
analyzeExistingPosts();
