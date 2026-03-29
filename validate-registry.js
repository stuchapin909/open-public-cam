#!/usr/bin/env node
/**
 * validate-registry.js — Registry validation for GitHub Actions
 *
 * Modes:
 *   push:    Validate all cameras. Auto-remove invalid ones.
 *   pr:      Validate changes, post comment with results, fail if rejected.
 *   cron:    Incremental health-check (suspects + stale + offline). Retry before kill.
 *
 * All cameras live in cameras.json. Failures open GitHub issues.
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMERAS_PATH = path.join(__dirname, "cameras.json");
const LOG_PATH = path.join(__dirname, ".registry-state.json");

const EVENT_NAME = process.env.EVENT_NAME || "push";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const PR_NUMBER = process.env.PR_NUMBER || "";
const REPO_OWNER = process.env.REPO_OWNER || "stuchapin909";
const REPO_NAME = process.env.REPO_NAME || "Open-Eagle-Eye";

const VALID_CATEGORIES = ["city", "park", "highway", "airport", "port", "weather", "nature", "landmark", "other"];

// Retry config: fail once → suspect, fail twice → remove
const MAX_CONSECUTIVE_FAILURES = 2;
// Cron: check cameras not validated in this many days
const STALE_THRESHOLD_DAYS = 7;

const FETCH_HEADERS = {
  'User-Agent': 'open-public-cam-validator',
  'Accept': 'image/*,*/*;q=0.8',
  'Cache-Control': 'no-cache',
};

// --- Load cameras ---
function loadCameras() {
  return JSON.parse(fs.readFileSync(CAMERAS_PATH, "utf8"));
}

function saveCameras(data) {
  fs.writeFileSync(CAMERAS_PATH, JSON.stringify(data, null, 2));
}

// --- Schema validation ---
function validateSchema(entry, index) {
  const errors = [];
  if (!entry.name || typeof entry.name !== "string") errors.push(`Missing 'name'`);
  if (!entry.url || typeof entry.url !== "string") errors.push(`Missing 'url'`);
  else { try { new URL(entry.url); } catch { errors.push(`Invalid URL: ${entry.url}`); } }
  if (!entry.location || typeof entry.location !== "string") errors.push(`Missing 'location'`);
  if (!entry.timezone || typeof entry.timezone !== "string") errors.push(`Missing 'timezone'`);
  if (entry.category && !VALID_CATEGORIES.includes(entry.category)) errors.push(`Invalid category: ${entry.category}`);
  return errors;
}

// --- URL liveness check ---
async function checkUrl(url) {
  try {
    const resp = await axios.get(url, {
      timeout: 10000,
      headers: FETCH_HEADERS,
      responseType: 'arraybuffer',
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
    });
    const ct = resp.headers['content-type'] || "";
    const data = Buffer.from(resp.data);
    return { ok: true, isImage: ct.includes('image/'), contentType: ct, size: data.length, status: resp.status, data };
  } catch (e) {
    return { ok: false, status: e.response?.status || 0, error: e.message.substring(0, 100) };
  }
}

// --- Vision AI check (GitHub Models API — gpt-4o-mini) ---
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
            { type: "text", text: "You are a webcam validator. Look at this image and determine: Is this a live webcam feed showing a real outdoor public space (street, traffic, park, landmark, weather station, harbor, airport exterior)? Or is it something else — an error page, HTTP error message, placeholder graphic, company logo, login screen, CAPTCHA, advertisement, or private interior? Answer PASS or FAIL with one sentence explaining why." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 200
      },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }, timeout: 30000 }
    );
    const content = response.data.choices[0].message.content;
    const pass = content.toUpperCase().includes("PASS");
    return { checked: true, pass, reason: content.substring(0, 200) };
  } catch (e) {
    return { checked: false, error: e.message.substring(0, 100) };
  }
}

// --- Load/save log ---
function loadLog() { try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch { return {}; } }
function saveLog(data) { fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2)); }

// --- GitHub API helpers ---
async function createIssue(title, body, labels = []) {
  if (!GITHUB_TOKEN) { console.log(`Would open issue: ${title}`); return; }
  try {
    await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      { title, body, labels },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "registry-bot" } }
    );
    console.log(`Issue opened: ${title}`);
  } catch (e) {
    console.log(`Failed to open issue: ${e.message.substring(0, 100)}`);
  }
}

async function postPRComment(body) {
  if (!GITHUB_TOKEN || !PR_NUMBER) return;
  try {
    await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`,
      { body },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "registry-bot" } }
    );
    console.log(`Comment posted to PR #${PR_NUMBER}`);
  } catch (e) {
    console.log(`Failed to post comment: ${e.message.substring(0, 100)}`);
  }
}

// --- Determine which cameras to check in cron mode ---
function getCronTargets(allCameras, log) {
  const now = Date.now();
  const staleThreshold = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const targets = new Map(); // id → camera

  // All suspects (one failure already)
  for (const [id, entry] of Object.entries(log)) {
    if (entry.status === "suspect") {
      const cam = allCameras.find(c => c.id === id);
      if (cam) targets.set(id, cam);
    }
    // Previously offline
    if (entry.status === "offline" || entry.status === "broken_link") {
      const cam = allCameras.find(c => c.id === id);
      if (cam) targets.set(id, cam);
    }
  }

  // Stale cameras (not checked in STALE_THRESHOLD_DAYS)
  for (const cam of allCameras) {
    const entry = log[cam.id];
    if (!entry || !entry.last_checked) {
      targets.set(cam.id, cam);
    } else {
      const lastChecked = new Date(entry.last_checked).getTime();
      if (now - lastChecked > staleThreshold) {
        targets.set(cam.id, cam);
      }
    }
  }

  return Array.from(targets.values());
}

// --- Validate a single camera ---
async function validateCamera(cam, log) {
  const result = { id: cam.id, name: cam.name, url: cam.url, status: "pending", details: "" };

  // URL check
  const urlResult = await checkUrl(cam.url);
  if (!urlResult.ok) {
    result.status = "fail";
    result.details = `HTTP ${urlResult.status} — ${urlResult.error}`;
    return result;
  }

  if (!urlResult.isImage) {
    result.status = "fail";
    result.details = `Not an image (content-type: ${urlResult.contentType}, ${urlResult.size} bytes)`;
    return result;
  }

  // Tiny image = likely error placeholder
  if (urlResult.size < 1024) {
    result.status = "fail";
    result.details = `Image too small (${urlResult.size} bytes), likely placeholder`;
    return result;
  }

  // Vision AI check
  if (GITHUB_TOKEN) {
    console.log(`  VISION ${cam.id}...`);
    const vision = await visionCheck(urlResult.data);
    if (vision.checked && !vision.pass) {
      result.status = "fail";
      result.details = `Vision AI: ${vision.reason}`;
      return result;
    }
    if (vision.checked) {
      result.details = `Vision: ${vision.reason}`;
    }
  }

  result.status = "pass";
  if (!result.details) result.details = `OK (${urlResult.contentType}, ${urlResult.size} bytes)`;
  return result;
}

// --- Main ---
async function main() {
  const allCameras = loadCameras();
  const log = loadLog();
  const results = [];
  let removedCount = 0;
  const issuesToOpen = [];

  console.log(`Mode: ${EVENT_NAME}`);
  console.log(`Cameras: ${allCameras.length}`);

  if (EVENT_NAME === "schedule" || EVENT_NAME === "workflow_dispatch") {
    // --- CRON MODE: incremental health check ---
    const targets = getCronTargets(allCameras, log);
    // Limit to prevent excessive runs — prioritize suspects first, then stale
    const suspectIds = new Set();
    for (const [id, entry] of Object.entries(log)) {
      if (entry.status === "suspect") suspectIds.add(id);
    }
    const suspectList = targets.filter(c => suspectIds.has(c.id));
    const staleList = targets.filter(c => !suspectIds.has(c.id));
    const limitedTargets = [...suspectList, ...staleList].slice(0, 50);
    console.log(`Targets to check: ${limitedTargets.length} (capped at 50)`);

    for (const cam of limitedTargets) {
      console.log(`CHECK ${cam.id}...`);
      const result = await validateCamera(cam, log);
      const logEntry = log[cam.id] || {};
      logEntry.last_checked = new Date().toISOString();

      if (result.status === "pass") {
        if (logEntry.status === "suspect") {
          console.log(`  RECOVERED ${cam.id} — was suspect, now passing`);
        }
        logEntry.status = "active";
        logEntry.consecutive_failures = 0;
        logEntry.last_failure_reason = undefined;
      } else {
        logEntry.consecutive_failures = (logEntry.consecutive_failures || 0) + 1;
        logEntry.last_failure_reason = result.details;

        if (logEntry.consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`  DEAD ${cam.id} — ${logEntry.consecutive_failures} consecutive failures`);
          // Remove from cameras.json
          const idx = allCameras.findIndex(c => c.id === cam.id);
          if (idx !== -1) {
            allCameras.splice(idx, 1);
            removedCount++;
          }
          logEntry.status = "offline";
          issuesToOpen.push({ cam, reason: result.details });
        } else {
          logEntry.status = "suspect";
          console.log(`  SUSPECT ${cam.id} — failure ${logEntry.consecutive_failures}/${MAX_CONSECUTIVE_FAILURES}`);
        }
      }

      log[cam.id] = logEntry;
      results.push(result);
    }

    saveCameras(allCameras);

  } else {
    // --- PUSH / PR MODE: validate all cameras ---
    for (let i = 0; i < allCameras.length; i++) {
      const entry = allCameras[i];
      const id = entry.id || `entry-${i}`;
      console.log(`CHECK ${id}...`);

      // Schema check
      const schemaErrors = validateSchema(entry, i);
      if (schemaErrors.length > 0) {
        results.push({ id, name: entry.name, url: entry.url, status: "reject", details: `Schema: ${schemaErrors.join("; ")}` });
        log[id] = { status: "offline", notes: `Schema: ${schemaErrors.join("; ")}`, last_checked: new Date().toISOString(), consecutive_failures: MAX_CONSECUTIVE_FAILURES };
        if (EVENT_NAME === "push") {
          allCameras.splice(i, 1); i--; removedCount++;
        }
        continue;
      }

      const result = await validateCamera(entry, log);

      if (result.status === "fail") {
        result.status = "reject";
        results.push(result);
        log[id] = { status: "offline", notes: result.details, last_checked: new Date().toISOString(), consecutive_failures: MAX_CONSECUTIVE_FAILURES, last_failure_reason: result.details };
        if (EVENT_NAME === "push") {
          allCameras.splice(i, 1); i--; removedCount++;
        }
      } else {
        results.push(result);
        log[id] = { status: "active", last_checked: new Date().toISOString(), consecutive_failures: 0 };
      }
    }

    if (EVENT_NAME === "push") saveCameras(allCameras);
  }

  saveLog(log);

  // Open issues for dead cameras
  for (const { cam, reason } of issuesToOpen) {
    await createIssue(
      `[dead-camera] ${cam.name} (${cam.id})`,
      `**Camera:** ${cam.name}\n**ID:** \`${cam.id}\`\n**Location:** ${cam.location}\n**URL:** ${cam.url}\n**Reason:** ${reason}\n**Checked:** ${new Date().toISOString()}\n\nThis camera failed ${MAX_CONSECUTIVE_FAILURES} consecutive validation checks and was removed from the registry. If it's still operational, it should be re-added.`,
      ["dead-camera", "automated"]
    );
  }

  // Generate report
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "reject" || r.status === "fail").length;

  let report = `## Registry Validation\n\n`;
  report += `- **Mode:** ${EVENT_NAME}\n`;
  report += `- **Checked:** ${results.length}\n`;
  report += `- **Passed:** ${passed}\n`;
  report += `- **Failed:** ${failed}\n`;
  if (removedCount > 0) report += `- **Removed:** ${removedCount}\n`;
  if (issuesToOpen.length > 0) report += `- **Issues opened:** ${issuesToOpen.length}\n`;
  report += `\n`;

  if (failed > 0) {
    report += `### Failed\n\n`;
    results.filter(r => r.status === "reject" || r.status === "fail").forEach(r => {
      report += `- **${r.name}** (\`${r.id}\`): ${r.details}\n`;
    });
    report += `\n`;
  }

  if (passed > 0) {
    report += `### Passed\n\n`;
    results.filter(r => r.status === "pass").forEach(r => {
      report += `- **${r.name}** (\`${r.id}\`): ${r.details}\n`;
    });
  }

  console.log(`\n${report}`);

  // Post PR comment
  if (EVENT_NAME === "pull_request") {
    await postPRComment(report);
    if (failed > 0) {
      console.log(`\n${failed} entries rejected. Failing PR check.`);
      process.exit(1);
    }
  }

  console.log("Done.");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
