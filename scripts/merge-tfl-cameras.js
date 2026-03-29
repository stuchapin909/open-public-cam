#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tflPath = path.join(__dirname, "..", "tfl-cameras.json");
const indexPath = path.join(__dirname, "..", "index.js");

if (!fs.existsSync(tflPath)) {
  console.error("Error: tfl-cameras.json not found. Run discover-tfl-cameras.js first.");
  process.exit(1);
}

const tflCams = JSON.parse(fs.readFileSync(tflPath, "utf8"));
console.log(`Loaded ${tflCams.length} TfL cameras`);

let indexContent = fs.readFileSync(indexPath, "utf8");

const existingTfl = (indexContent.match(/id: "tfl-/g) || []).length;
console.log(`Existing TfL entries in index.js: ${existingTfl}`);

const entries = tflCams.map((c) => {
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

// Find the last entry's closing }; before ];
const arrayEnd = indexContent.indexOf("];", indexContent.indexOf("const CURATED_WEBCAMS"));
if (arrayEnd === -1) {
  console.error("Error: Could not find CURATED_WEBCAMS array end in index.js");
  process.exit(1);
}

const insertPoint = indexContent.lastIndexOf("},", arrayEnd);
if (insertPoint === -1) {
  console.error("Error: Could not find insertion point in CURATED_WEBCAMS array");
  process.exit(1);
}

const newEntries = ",\n" + entries.join(",\n");
indexContent = indexContent.slice(0, insertPoint + 1) + newEntries + indexContent.slice(insertPoint + 1);

fs.writeFileSync(indexPath, indexContent);
const newTfl = (indexContent.match(/id: "tfl-/g) || []).length;
console.log(`Added ${newTfl - existingTfl} TfL cameras to index.js`);
console.log(`Total TfL entries: ${newTfl}`);
