#!/usr/bin/env node
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.TFL_API_KEY;
if (!API_KEY) {
  console.error("Error: Set TFL_API_KEY environment variable");
  console.error("Get a free key at: https://api-portal.tfl.gov.uk/signup");
  process.exit(1);
}

const HUMAN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

const TFL_AUTH = {
  provider: "Transport for London",
  signup_url: "https://api-portal.tfl.gov.uk/signup",
  key_required: false,
  note: "API key only needed for camera discovery, not for image access. Images are served from public S3.",
};

async function fetchCameras(lat, lon, radius = 2000) {
  const url = `https://api.tfl.gov.uk/Place?lat=${lat}&lon=${lon}&radius=${radius}&app_key=${API_KEY}`;
  const resp = await axios.get(url, { timeout: 15000, headers: HUMAN_HEADERS });
  const places = resp.data?.places || [];
  const cams = [];

  for (const p of places) {
    if (p.placeType !== "JamCam") continue;

    let imageUrl = null;
    let available = false;

    for (const prop of p.additionalProperties || []) {
      if (prop.key === "imageUrl") imageUrl = prop.value;
      if (prop.key === "available") available = prop.value === "true";
    }

    if (imageUrl && available) {
      const camId = p.id.replace("JamCams_", "");
      cams.push({
        id: `tfl-${camId}`,
        name: p.commonName || camId,
        url: imageUrl,
        location: "London, UK",
        timezone: "Europe/London",
        category: "city",
        verified: false,
        auth: TFL_AUTH,
      });
    }
  }

  return cams;
}

async function validateImageUrl(url) {
  try {
    const resp = await axios.head(url, { timeout: 5000, headers: HUMAN_HEADERS });
    return (resp.headers["content-type"] || "").includes("image/");
  } catch {
    return false;
  }
}

async function main() {
  console.log("Discovering TfL JamCams...");

  const allCams = new Map();

  const lats = [51.28, 51.32, 51.36, 51.40, 51.44, 51.48, 51.52, 51.56, 51.60, 51.64, 51.68];
  const lons = [-0.52, -0.44, -0.36, -0.28, -0.20, -0.12, -0.04, 0.04, 0.12, 0.20, 0.28, 0.33];
  const total = lats.length * lons.length;
  let progress = 0;

  for (const lat of lats) {
    for (const lon of lons) {
      progress++;
      try {
        const cams = await fetchCameras(lat, lon);
        for (const c of cams) {
          if (!allCams.has(c.id)) allCams.set(c.id, c);
        }
        process.stdout.write(`\r  Progress: ${progress}/${total} | Found: ${allCams.size}`);
      } catch (e) {
        process.stdout.write(`\r  Progress: ${progress}/${total} | Found: ${allCams.size} (retry: ${(e.message || "").substring(0, 30)})`);
        try {
          await new Promise((r) => setTimeout(r, 1000));
          const cams = await fetchCameras(lat, lon);
          for (const c of cams) {
            if (!allCams.has(c.id)) allCams.set(c.id, c);
          }
        } catch {}
      }
    }
  }

  console.log(`\n\nTotal cameras found: ${allCams.size}`);

  // Validate a sample of image URLs
  const sample = [...allCams.values()].filter(() => Math.random() < 0.1);
  console.log(`Validating ${sample.length} sample image URLs...`);

  let validCount = 0;
  for (const cam of sample) {
    const valid = await validateImageUrl(cam.url);
    if (valid) {
      validCount++;
      cam.verified = true;
    } else {
      console.log(`  FAIL: ${cam.name} - ${cam.url}`);
    }
  }

  console.log(`Sample validation: ${validCount}/${sample.length} working`);

  const result = [...allCams.values()].sort((a, b) => a.name.localeCompare(b.name));
  const outPath = path.join(__dirname, "..", "tfl-cameras.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`\nWritten to ${outPath}`);
  console.log(`To merge into index.js, run: node scripts/merge-tfl-cameras.js`);
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
