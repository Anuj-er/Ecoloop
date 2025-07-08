/**
 * Client-side fraud detection service using TensorFlow.js
 * This provides immediate feedback to users about potentially fraudulent content
 * before it's sent to the server.
 */

// Simple rule-based fraud detection that doesn't require TensorFlow.js
// Can be enhanced with TensorFlow.js in the future for more sophisticated detection
export class ClientFraudDetection {
  /**
   * Analyze a post for potential fraud indicators
   * @param postData The post data to analyze
   * @returns Analysis result with fraud probability and warnings
   */
  static analyzePost(postData) {
    const contentAnalysis = this.analyzeContent(postData.content);
    const impactAnalysis = this.analyzeImpactClaims(postData.impact);
    
    const totalScore = (
      contentAnalysis.score * 0.5 + 
      impactAnalysis.score * 0.5
    );
    
    // Combine all warnings
    const warnings = [
      ...contentAnalysis.warnings,
      ...impactAnalysis.warnings
    ];
    
    return {
      fraudProbability: totalScore / 100,
      score: totalScore,
      isSuspicious: totalScore > 30, // Match backend threshold for consistency
      warnings: warnings,
      suggestions: this.generateSuggestions(contentAnalysis, impactAnalysis)
    };
  }
  
  /**
   * Analyze post content for suspicious patterns
   */
  static analyzeContent(content) {
    let score = 0;
    const warnings = [];
    
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
    
    if (keywordsFound.length > 0) {
      score += keywordsFound.length * 5;
      warnings.push(`Contains potentially exaggerated terms: ${keywordsFound.join(', ')}`);
    }
    
    // Check for excessive exclamation marks
    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      score += 5;
      if (exclamationCount > 6) {
        score += 10;
        warnings.push("Contains excessive exclamation marks");
      }
    }
    
    // Check for ALL CAPS sections
    const capsMatches = content.match(/[A-Z]{5,}/g);
    if (capsMatches && capsMatches.length > 0) {
      score += 5;
      warnings.push("Contains text in ALL CAPS");
    }
    
    // Check for repetition
    const words = content.toLowerCase().split(/\W+/);
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    const repeatedWords = Object.entries(wordCounts)
      .filter(([_, count]) => (count as number) > 3)
      .map(([word]) => word);
    
    if (repeatedWords.length > 0) {
      score += repeatedWords.length * 3;
      warnings.push(`Contains repetitive wording: "${repeatedWords.join(', ')}"`);
    }
    
    // Check content length - too short might be suspicious
    if (content.length < 20) {
      score += 10;
      warnings.push("Post content is very short");
    }
    
    return {
      score: Math.min(score, 100),
      warnings
    };
  }
  
  /**
   * Analyze impact claims for unrealistic values
   */
  static analyzeImpactClaims(impact) {
    let score = 0;
    const warnings = [];
    
    if (!impact) return { score: 0, warnings: [] };
    
    // Check for unrealistically high impact values
    if (impact.carbonSaved > 1000) {
      score += 20;
      warnings.push(`Carbon saved (${impact.carbonSaved} kg) seems unrealistically high`);
    }
    
    if (impact.wasteReduced > 5000) {
      score += 20;
      warnings.push(`Waste reduced (${impact.wasteReduced} kg) seems unrealistically high`);
    }
    
    if (impact.energySaved > 10000) {
      score += 20;
      warnings.push(`Energy saved (${impact.energySaved} kWh) seems unrealistically high`);
    }
    
    if (impact.peopleReached > 100000) {
      score += 20;
      warnings.push(`People reached (${impact.peopleReached}) seems unrealistically high`);
    }
    
    // Check for suspiciously round numbers
    if (impact.carbonSaved % 1000 === 0 && impact.carbonSaved > 0) {
      score += 10;
      warnings.push("Carbon saved value is suspiciously round");
    }
    
    if (impact.wasteReduced % 1000 === 0 && impact.wasteReduced > 0) {
      score += 10;
      warnings.push("Waste reduced value is suspiciously round");
    }
    
    return {
      score: Math.min(score, 100),
      warnings
    };
  }
  
  /**
   * Generate improvement suggestions based on analysis
   */
  static generateSuggestions(contentAnalysis, impactAnalysis) {
    const suggestions = [];
    
    // Content suggestions
    if (contentAnalysis.warnings.some(w => w.includes('exaggerated terms'))) {
      suggestions.push("Consider using more precise language rather than superlatives");
    }
    
    if (contentAnalysis.warnings.some(w => w.includes('exclamation marks'))) {
      suggestions.push("Reduce the number of exclamation marks to improve credibility");
    }
    
    if (contentAnalysis.warnings.some(w => w.includes('ALL CAPS'))) {
      suggestions.push("Avoid using ALL CAPS as it can seem unprofessional");
    }
    
    if (contentAnalysis.warnings.some(w => w.includes('repetitive wording'))) {
      suggestions.push("Vary your language to avoid repeating the same terms");
    }
    
    // Impact suggestions
    if (impactAnalysis.warnings.length > 0) {
      suggestions.push("Provide more realistic impact metrics with precise figures");
      suggestions.push("Consider adding details about how these impacts were measured");
    }
    
    return suggestions;
  }
}
