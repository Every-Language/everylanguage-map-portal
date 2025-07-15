/**
 * Test examples for filename parsing service
 * Run this file to see parsing results for various filename patterns
 */

import { parseFilename, parseFilenames, getParsingStats } from './filenameParser';

// Test filenames with various patterns
const testFilenames = [
  // High confidence patterns
  'EN_Genesis_1_V1-5.mp3',
  'Spanish_Matthew_5_V1-12.wav',
  'Genesis_Chapter1_Verses1-3.m4a',
  'John_3_V16.mp3',
  
  // Medium confidence patterns
  'EN_Matthew_5.mp3',
  'Genesis_Chapter1.wav',
  'John_3.m4a',
  'PSA_150.mp3',
  
  // Low confidence patterns
  'Genesis.mp3',
  'Matthew_Recording.wav',
  'JOH.m4a',
  
  // No match patterns
  'audio_file_123.mp3',
  'recording.wav',
  'test.m4a',
  
  // Edge cases
  '1KINGS_12_V1-20.mp3',
  'REV_22_V1-21.wav',
  'SONG_OF_SONGS_1.mp3'
];

console.log('=== Filename Parsing Service Test ===\n');

// Test individual parsing
console.log('Individual Parsing Results:');
console.log('─'.repeat(80));

testFilenames.forEach(filename => {
  const result = parseFilename(filename);
  console.log(`\nFilename: ${filename}`);
  console.log(`├─ Confidence: ${result.confidence}`);
  console.log(`├─ Pattern: ${result.matchedPattern || 'None'}`);
  console.log(`├─ Book: ${result.detectedBook || 'None'}`);
  console.log(`├─ Chapter: ${result.detectedChapter || 'None'}`);
  console.log(`├─ Verses: ${result.detectedVerses?.join(', ') || 'None'}`);
  console.log(`├─ Verse Range: ${result.verseRange || 'None'}`);
  if (result.errors && result.errors.length > 0) {
    console.log(`└─ Errors: ${result.errors.join(', ')}`);
  } else {
    console.log(`└─ Status: ✓ Valid`);
  }
});

// Test batch parsing and statistics
console.log('\n\n=== Batch Parsing Statistics ===');
console.log('─'.repeat(50));

const batchResults = parseFilenames(testFilenames);
const stats = getParsingStats(batchResults);

console.log(`Total Files: ${stats.total}`);
console.log(`High Confidence: ${stats.highConfidence} (${Math.round((stats.highConfidence / stats.total) * 100)}%)`);
console.log(`Medium Confidence: ${stats.mediumConfidence} (${Math.round((stats.mediumConfidence / stats.total) * 100)}%)`);
console.log(`Low Confidence: ${stats.lowConfidence} (${Math.round((stats.lowConfidence / stats.total) * 100)}%)`);
console.log(`No Match: ${stats.noMatch} (${Math.round((stats.noMatch / stats.total) * 100)}%)`);
console.log(`With Errors: ${stats.withErrors}`);
console.log(`\nDetected Elements:`);
console.log(`├─ Books: ${stats.booksDetected}`);
console.log(`├─ Chapters: ${stats.chaptersDetected}`);
console.log(`└─ Verse Ranges: ${stats.versesDetected}`);

const successRate = Math.round(((stats.highConfidence + stats.mediumConfidence) / stats.total) * 100);
console.log(`\nOverall Success Rate: ${successRate}%`);

if (successRate >= 80) {
  console.log('🎉 Excellent parsing performance!');
} else if (successRate >= 60) {
  console.log('✅ Good parsing performance');
} else {
  console.log('⚠️  Consider improving filename conventions');
}

console.log('\n=== Test Complete ===');

export {}; // Make this a module 