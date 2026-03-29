#!/usr/bin/env node
/**
 * Merge TfL cameras from tfl-cameras.json into index.js CURATED_WEBCAMS array.
 * 
 * Usage: node scripts/merge-tfl-cameras.js
 */

const fs = require('fs');
const path = require('path');

const tflPath = path.join(__dirname, '..', 'tfl-cameras.json');
const indexPath = path.join(__dirname, '..', 'index.js');

if (!fs.existsSync(tflPath)) {
  console.error('Error: tfl-cameras.json not found. Run discover-tfl-cameras.js first.');
  process.exit(1);
}

const tflCams = JSON.parse(fs.readFileSync(tflPath, 'utf8'));
console.log(`Loaded ${tflCams.length} TfL cameras`);

// Read index.js
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Count existing TfL entries
const existingTfl = (indexContent.match(/id: "tfl-/g) || []).length;
console.log(`Existing TfL entries in index.js: ${existingTfl}`);

// Generate the camera entries as JS code
const entries = tflCams.map(c => {
  // Escape any quotes in the name
  const name = c.name.replace(/"/g, '\\"');
  return `  {
    id: "${c.id}",
    name: "${name}",
    url: "${c.url}",
    category: "${c.category}",
    location: "${c.location}",
    timezone: "${c.timezone}",
    verified: ${c.verified},
    auth: ${JSON.stringify(c.auth)}
  }`;
});

// Find the CURATED_WEBCAMS array and append before the closing ];
const arrayEnd = indexContent.indexOf('];', indexContent.indexOf('const CURATED_WEBCAMS'));
if (arrayEnd === -1) {
  console.error('Error: Could not find CURATED_WEBCAMS array end in index.js');
  process.exit(1);
}

// Find the last entry's closing brace before ];
const insertPoint = indexContent.lastIndexOf('},', arrayEnd);
if (insertPoint === -1) {
  console.error('Error: Could not find insertion point in CURATED_WEBCAMS array');
  process.exit(1);
}

const newEntries = ',\n' + entries.join(',\n');
indexContent = indexContent.slice(0, insertPoint + 1) + newEntries + indexContent.slice(insertPoint + 1);

fs.writeFileSync(indexPath, indexContent);
const newTfl = (indexContent.match(/id: "tfl-/g) || []).length;
console.log(`Added ${newTfl - existingTfl} TfL cameras to index.js`);
console.log(`Total TfL entries: ${newTfl}`);
