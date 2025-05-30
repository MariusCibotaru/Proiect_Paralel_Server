// extractOutputPath.js
const line = '[INFO] Transposed matrix saved to:/home/test4/results/out_20250530_175535.txt'.trim();

// Avoid removing spaces to match the original log format
const regex = /\[INFO\] Transposed matrix saved to:([^\n]*)/; // Capture everything after 'to:'

const match = line.match(regex);

if (match) {
  console.log('✅ Output file path:', match[1].trim());
} else {
  console.log('❌ No match found.');
}