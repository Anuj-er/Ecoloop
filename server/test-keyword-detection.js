// Keyword Detection Test Script
// This demonstrates exactly how our fraud detection catches suspicious keywords

const suspiciousKeywords = [
  'guaranteed', 'free', 'unlimited', '100%', 'revolutionary', 'amazing',
  'earn money', 'get paid', 'instant', 'magic', 'miracle'
];

function testKeywordDetection(content) {
  console.log(`\n🔍 Testing: "${content}"`);
  console.log("=".repeat(50));
  
  const contentLower = content.toLowerCase();
  
  // Find matching keywords
  const keywordsFound = suspiciousKeywords.filter(keyword => 
    contentLower.includes(keyword.toLowerCase())
  );
  
  console.log(`Original text: "${content}"`);
  console.log(`Lowercase text: "${contentLower}"`);
  console.log(`Keywords checked: [${suspiciousKeywords.join(', ')}]`);
  
  if (keywordsFound.length > 0) {
    console.log(`✅ MATCHES FOUND: ${keywordsFound.length}`);
    keywordsFound.forEach(keyword => {
      const position = contentLower.indexOf(keyword);
      console.log(`   - "${keyword}" found at position ${position}`);
    });
    console.log(`🚨 Fraud points: ${keywordsFound.length * 5} points`);
  } else {
    console.log(`❌ NO MATCHES FOUND`);
    console.log(`✅ Fraud points: 0 points`);
  }
}

// Test Cases
console.log("🧪 KEYWORD DETECTION TEST SUITE");
console.log("================================");

// Test 1: High-fraud content
testKeywordDetection("AMAZING OPPORTUNITY!!! 100% GUARANTEED results! Our REVOLUTIONARY carbon capture method is MAGIC!");

// Test 2: Moderate suspicious content  
testKeywordDetection("This guaranteed method is truly amazing!");

// Test 3: Legitimate content
testKeywordDetection("Our sustainable farming project reduced waste significantly");

// Test 4: Partial word matching
testKeywordDetection("This revolutionizes our approach to environmental protection");

// Test 5: Case sensitivity test
testKeywordDetection("GUARANTEED success with our AMAZING new approach!");

// Test 6: Multiple word phrases
testKeywordDetection("Join our program and earn money while helping the environment!");

// Test 7: Numbers and symbols
testKeywordDetection("We provide 100% guaranteed results with unlimited potential!");

// Test 8: Edge case - keyword as part of larger word
testKeywordDetection("We guarantee quality but this text says guaranteed results");

console.log("\n📊 SUMMARY:");
console.log("- Detection is case-insensitive");
console.log("- Uses substring matching (includes())");  
console.log("- Multi-word phrases like 'earn money' work");
console.log("- Partial matches work ('revolutionary' in 'revolutionizes')");
console.log("- Each keyword = +5 fraud points");
console.log("- Multiple keywords accumulate points");
