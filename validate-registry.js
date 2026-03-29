#!/usr/bin/env node
/**
 * validate-registry.js — Registry validation for GitHub Actions
 *
 * Modes:
 *   PR:   Validate new/changed entries, post comment with results
 *   Push: Remove invalid entries from community-registry.json
 *   Cron: Health-check all entries, remove dead ones
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, "community-registry.json");
const LOG_PATH = path.join(__dirname, "validation-log.json");
const RESULTS_PATH = path.join(__dirname, "validation-results.md");

const EVENT_NAME = process.env.EVENT_NAME || "push";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const PR_NUMBER = process.env.PR_NUMBER || "";
const REPO_OWNER = process.env.REPO_OWNER || "stuchapin909";
const REPO_NAME = process.env.REPO_NAME || "Eagle-Eye";

const VALID_CATEGORIES = ["city", "park", "highway", "airport", "port", "weather", "nature", "landmark", "other"];

const FETCH_HEADERS = {
  'User-Agent': 'eagle-eye-validator',
  'Accept': 'image/*,*/*;q=0.8',
  'Cache-Control': 'no-cache',
};

// --- Schema validation ---
function validateSchema(entry, index) {
  const errors = [];
  if (!entry.name || typeof entry.name !== "string") errors.push(`[${index}] Missing or invalid 'name'`);
  if (!entry.url || typeof entry.url !== "string") errors.push(`[${index}] Missing or invalid 'url'`);
  else {
    try { new URL(entry.url); } catch { errors.push(`[${index}] Invalid URL format: ${entry.url}`); }
  }
  if (!entry.location || typeof entry.location !== "string") errors.push(`[${index}] Missing or invalid 'location'`);
  if (!entry.timezone || typeof entry.timezone !== "string") errors.push(`[${index}] Missing or invalid 'timezone'`);
  if (entry.category && !VALID_CATEGORIES.includes(entry.category)) errors.push(`[${index}] Invalid category: ${entry.category}`);
  return errors;
}

// --- URL liveness check ---
async function checkUrl(url) {
  try {
    const resp = await axios.get(url, { timeout: 10000, headers: FETCH_HEADERS, responseType: 'arraybuffer' });
    const ct = resp.headers['content-type'] || "";
    const data = Buffer.from(resp.data);
    const size = data.length;
    const isImage = ct.includes('image/');
    return { ok: true, isImage, contentType: ct, size, status: resp.status, data };
  } catch (e) {
    return { ok: false, status: e.response?.status || 0, error: e.message.substring(0, 100) };
  }
}

// --- Vision AI check (optional, uses GitHub Models API) ---
async function visionCheck(imageBuffer) {
  if (!GITHUB_TOKEN) return { checked: false };
  try {
    const b64 = imageBuffer.toString('base64');
    const response = await axios.post(
      "https://models.inference.ai.azure.com/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Is this image a live webcam showing a public space (street, park, landmark, traffic, nature)? Or is it an error page, ad, placeholder, logo, or private interior? Answer PASS or FAIL and briefly explain." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 200
      },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }, timeout: 30000 }
    );
    const content = response.data.choices[0].message.content;
    const pass = content.includes("PASS");
    return { checked: true, pass, reason: content.substring(0, 200) };
  } catch (e) {
    return { checked: false, error: e.message.substring(0, 100) };
  }
}

// --- Load/save ---
function loadRegistry() { try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")); } catch { return []; } }
function loadLog() { try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch { return {}; } }
function saveRegistry(data) { fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2)); }
function saveLog(data) { fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2)); }

// --- Main ---
async function main() {
  const registry = loadRegistry();
  const log = loadLog();
  const results = [];
  let removedCount = 0;

  console.log(`Mode: ${EVENT_NAME} | Entries: ${registry.length}`);

  for (let i = 0; i < registry.length; i++) {
    const entry = registry[i];
    const id = entry.id || `entry-${i}`;
    let entryResult = { id, name: entry.name, url: entry.url, status: "pending", details: "" };

    // Schema check
    const schemaErrors = validateSchema(entry, i);
    if (schemaErrors.length > 0) {
      entryResult.status = "reject";
      entryResult.details = `Schema errors: ${schemaErrors.join("; ")}`;
      results.push(entryResult);
      console.log(`REJECT ${id}: ${entryResult.details}`);
      if (EVENT_NAME === "push" || EVENT_NAME === "schedule") {
        registry.splice(i, 1);
        i--;
        removedCount++;
      }
      continue;
    }

    // URL check
    const urlResult = await checkUrl(entry.url);
    if (!urlResult.ok) {
      entryResult.status = "reject";
      entryResult.details = `URL failed: HTTP ${urlResult.status} — ${urlResult.error}`;
      results.push(entryResult);
      console.log(`REJECT ${id}: ${entryResult.details}`);
      log[id] = { status: "offline", notes: entryResult.details, timestamp: new Date().toISOString() };
      if (EVENT_NAME === "push" || EVENT_NAME === "schedule") {
        registry.splice(i, 1);
        i--;
        removedCount++;
      }
      continue;
    }

    if (!urlResult.isImage) {
      entryResult.status = "reject";
      entryResult.details = `URL did not return an image (content-type: ${urlResult.contentType}, size: ${urlResult.size} bytes)`;
      results.push(entryResult);
      console.log(`REJECT ${id}: ${entryResult.details}`);
      log[id] = { status: "broken_link", notes: entryResult.details, timestamp: new Date().toISOString() };
      if (EVENT_NAME === "push" || EVENT_NAME === "schedule") {
        registry.splice(i, 1);
        i--;
        removedCount++;
      }
      continue;
    }

    // Image size sanity check (less than 1KB is likely an error/placeholder)
    if (urlResult.size < 1024) {
      entryResult.status = "warn";
      entryResult.details = `Image very small (${urlResult.size} bytes), possibly a placeholder`;
      console.log(`WARN ${id}: ${entryResult.details}`);
    }

    // Vision AI check (skip for small images)
    if (urlResult.size >= 1024 && GITHUB_TOKEN) {
      console.log(`VISION ${id}: checking...`);
      const vision = await visionCheck(urlResult.data);
      if (vision.checked && !vision.pass) {
        entryResult.status = "reject";
        entryResult.details = `Vision AI: ${vision.reason}`;
        results.push(entryResult);
        console.log(`REJECT ${id}: ${entryResult.details}`);
        log[id] = { status: "low_quality", notes: vision.reason, timestamp: new Date().toISOString() };
        if (EVENT_NAME === "push" || EVENT_NAME === "schedule") {
          registry.splice(i, 1);
          i--;
          removedCount++;
        }
        continue;
      }
      if (vision.checked) entryResult.details += ` | Vision: ${vision.reason}`;
    }

    entryResult.status = entryResult.status === "warn" ? "warn" : "pass";
    if (entryResult.status === "pass") entryResult.details = `OK (image/jpeg, ${urlResult.size} bytes)`;
    results.push(entryResult);
    log[id] = { status: "active", timestamp: new Date().toISOString() };
    console.log(`PASS ${id}: ${entryResult.details}`);
  }

  // Save
  if (EVENT_NAME === "push" || EVENT_NAME === "schedule") {
    saveRegistry(registry);
  }
  saveLog(log);

  // Generate report
  const passed = results.filter(r => r.status === "pass" || r.status === "warn").length;
  const failed = results.filter(r => r.status === "reject").length;
  const warned = results.filter(r => r.status === "warn").length;

  let report = `## Registry Validation Results\n\n`;
  report += `- **Checked:** ${results.length}\n`;
  report += `- **Passed:** ${passed}\n`;
  if (warned > 0) report += `- **Warnings:** ${warned}\n`;
  report += `- **Failed:** ${failed}\n`;
  report += `- **Removed:** ${removedCount}\n\n`;

  if (failed > 0) {
    report += `### Failed Entries\n\n`;
    results.filter(r => r.status === "reject").forEach(r => {
      report += `- **${r.name}** (${r.id}): ${r.details}\n`;
    });
    report += `\n`;
  }

  if (warned > 0) {
    report += `### Warnings\n\n`;
    results.filter(r => r.status === "warn").forEach(r => {
      report += `- **${r.name}** (${r.id}): ${r.details}\n`;
    });
    report += `\n`;
  }

  if (passed > 0) {
    report += `### Passed\n\n`;
    results.filter(r => r.status === "pass").forEach(r => {
      report += `- **${r.name}** (${r.id}): ${r.details}\n`;
    });
    report += `\n`;
  }

  fs.writeFileSync(RESULTS_PATH, report);
  console.log(`\nResults written to ${RESULTS_PATH}`);

  // Post PR comment
  if (EVENT_NAME === "pull_request" && PR_NUMBER && GITHUB_TOKEN) {
    console.log(`Posting comment to PR #${PR_NUMBER}...`);
    try {
      await axios.post(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`,
        { body: report },
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "registry-bot" } }
      );
      console.log("Comment posted.");

      // Fail the check if any entries rejected
      if (failed > 0) {
        console.log(`\n${failed} entries rejected. Failing the check.`);
        process.exit(1);
      }
    } catch (e) {
      console.log(`Failed to post comment: ${e.message}`);
    }
  }

  // Push mode: fail if we removed entries
  if (EVENT_NAME === "push" && removedCount > 0) {
    console.log(`\n${removedCount} invalid entries removed and committed.`);
  }

  console.log("Done.");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
