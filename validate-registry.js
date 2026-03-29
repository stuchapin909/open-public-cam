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
 *
 * Security:
 *   - SSRF protection: rejects private IPs, link-local, loopback, cloud metadata
 *   - Content-type whitelist: only image/jpeg and image/png accepted
 *   - Issue spam protection: dedup check, max 5 issues per run
 */

import axios from "axios";
import dns from "dns/promises";
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
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"];

// Retry config: fail once → suspect, fail twice → remove
const MAX_CONSECUTIVE_FAILURES = 2;
// Cron: check cameras not validated in this many days
const STALE_THRESHOLD_DAYS = 7;
// Max issues per run (spam protection)
const MAX_ISSUES_PER_RUN = 5;
// Max cameras to validate per push/PR (DoS protection)
const MAX_PUSH_VALIDATIONS = 500;

const FETCH_HEADERS = {
  'User-Agent': 'open-public-cam-validator',
  'Accept': 'image/jpeg,image/png,image/*;q=0.8,*/*;q=0.1',
  'Cache-Control': 'no-cache',
};

// --- SSRF protection ---
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  'metadata.goog',
  '169.254.169.254',
  'metadata.amazonaws.com',
  '100.100.100.200',     // GCP metadata
  'fd00:ec2::254',       // AWS IPv6 metadata
];

function isPrivateIP(ip) {
  if (!ip) return true;
  // Strip brackets from IPv6 addresses
  const clean = ip.replace(/^\[|\]$/g, '');
  const v4 = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && b === 18) return true;
    if (a === 192 && b === 0 && v4[3] >= 0 && v4[3] <= 2) return true;
  }
  if (clean === '::1' || clean === '::') return true;
  if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80')) return true;
  if (clean.startsWith('::ffff:127.') || clean.startsWith('::ffff:10.') || clean.startsWith('::ffff:192.168.')) return true;
  return false;
}

async function isSafeUrl(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return { safe: false, reason: "Invalid URL" };
  }

  // Only allow http and https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { safe: false, reason: `Blocked protocol: ${url.protocol}` };
  }

  // Block known metadata hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.some(h => hostname === h || hostname.endsWith('.' + h))) {
    return { safe: false, reason: "Blocked: cloud metadata endpoint" };
  }

  // Block localhost variants
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
    return { safe: false, reason: "Blocked: localhost" };
  }

  // DNS resolution to check for private IPs
  try {
    // For IP addresses, check directly
    const rawHost = hostname.replace(/^\[|\]$/g, '');
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawHost) || rawHost.includes(':')) {
      if (isPrivateIP(rawHost)) {
        return { safe: false, reason: `Blocked: private/reserved IP ${hostname}` };
      }
      return { safe: true };
    }

    // For hostnames, resolve and check all IPs
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.length === 0) {
      return { safe: false, reason: `Cannot resolve hostname: ${hostname}` };
    }

    for (const ip of allAddresses) {
      if (isPrivateIP(ip)) {
        return { safe: false, reason: `Blocked: ${hostname} resolves to private IP ${ip}` };
      }
    }

    return { safe: true };
  } catch (e) {
    return { safe: false, reason: `DNS resolution error: ${e.message.substring(0, 80)}` };
  }
}

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
  if (!entry.city || typeof entry.city !== "string") errors.push(`Missing 'city'`);
  if (!entry.timezone || typeof entry.timezone !== "string") errors.push(`Missing 'timezone'`);
  if (entry.category && !VALID_CATEGORIES.includes(entry.category)) errors.push(`Invalid category: ${entry.category}`);
  if (entry.coordinates) {
    const { lat, lng } = entry.coordinates;
    if (typeof lat !== "number" || typeof lng !== "number" || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push(`Invalid coordinates: lat must be -90..90, lng must be -180..180`);
    }
  }
  return errors;
}

// --- URL liveness check ---
async function checkUrl(urlStr) {
  // SSRF check first
  const safety = await isSafeUrl(urlStr);
  if (!safety.safe) {
    return { ok: false, status: 0, error: `Security: ${safety.reason}` };
  }

  try {
    const resp = await axios.get(urlStr, {
      timeout: 10000,
      headers: FETCH_HEADERS,
      responseType: 'arraybuffer',
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
      maxRedirects: 0,
    });
    const ct = resp.headers['content-type'] || "";
    const data = Buffer.from(resp.data);
    // Strict content-type check: only jpeg and png
    const isAllowedImage = ALLOWED_CONTENT_TYPES.some(t => ct.includes(t));
    return { ok: true, isImage: isAllowedImage, contentType: ct, size: data.length, status: resp.status, data };
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
async function hasOpenIssue(cameraId) {
  if (!GITHUB_TOKEN) return false;
  try {
    const resp = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      {
        params: {
          labels: 'dead-camera',
          state: 'open',
          per_page: 100,
        },
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "registry-bot" }
      }
    );
    const issues = resp.data || [];
    return issues.some(i => i.title.includes(cameraId));
  } catch {
    return false; // If API fails, proceed cautiously
  }
}

async function createIssue(title, body, labels = []) {
  if (!GITHUB_TOKEN) { console.log(`Would open issue: ${title}`); return true; }
  try {
    await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      { title, body, labels },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "registry-bot" } }
    );
    console.log(`Issue opened: ${title}`);
    return true;
  } catch (e) {
    console.log(`Failed to open issue: ${e.message.substring(0, 100)}`);
    return false;
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
  const targets = new Map();

  for (const [id, entry] of Object.entries(log)) {
    if (entry.status === "suspect") {
      const cam = allCameras.find(c => c.id === id);
      if (cam) targets.set(id, cam);
    }
    if (entry.status === "offline" || entry.status === "broken_link") {
      const cam = allCameras.find(c => c.id === id);
      if (cam) targets.set(id, cam);
    }
  }

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

  const urlResult = await checkUrl(cam.url);
  if (!urlResult.ok) {
    result.status = "fail";
    result.details = `HTTP ${urlResult.status} — ${urlResult.error}`;
    return result;
  }

  if (!urlResult.isImage) {
    result.status = "fail";
    result.details = `Rejected content-type: ${urlResult.contentType} (only image/jpeg and image/png allowed)`;
    return result;
  }

  if (urlResult.size < 1024) {
    result.status = "fail";
    result.details = `Image too small (${urlResult.size} bytes), likely placeholder`;
    return result;
  }

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
    const targets = getCronTargets(allCameras, log);
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
    // Push/PR mode: cap to prevent DoS via massive PRs
    if (allCameras.length > MAX_PUSH_VALIDATIONS) {
      console.log(`REJECT: ${allCameras.length} cameras exceeds push limit of ${MAX_PUSH_VALIDATIONS}`);
      console.log(`PRs should add cameras incrementally. Split into smaller PRs if needed.`);
      if (EVENT_NAME === "pull_request") {
        await postPRComment(
          `## Registry Validation\n\n**REJECTED:** ${allCameras.length} cameras exceeds the maximum of ${MAX_PUSH_VALIDATIONS} per push/PR.\n\nPlease split your submission into smaller PRs or remove invalid entries.`
        );
        process.exit(1);
      }
      // Push mode: only validate the first MAX_PUSH_VALIDATIONS
      console.log(`Push mode: validating first ${MAX_PUSH_VALIDATIONS} cameras only.`);
    }
    const capped = allCameras.length > MAX_PUSH_VALIDATIONS;
    const camerasToValidate = capped
      ? allCameras.slice(0, MAX_PUSH_VALIDATIONS)
      : allCameras;

    for (let i = 0; i < camerasToValidate.length; i++) {
      const entry = camerasToValidate[i];
      const id = entry.id || `entry-${i}`;
      console.log(`CHECK ${id}...`);

      const schemaErrors = validateSchema(entry, i);
      if (schemaErrors.length > 0) {
        results.push({ id, name: entry.name, url: entry.url, status: "reject", details: `Schema: ${schemaErrors.join("; ")}` });
        log[id] = { status: "offline", notes: `Schema: ${schemaErrors.join("; ")}`, last_checked: new Date().toISOString(), consecutive_failures: MAX_CONSECUTIVE_FAILURES };
        if (EVENT_NAME === "push" && !capped) {
          allCameras.splice(i, 1); i--; removedCount++;
        }
        continue;
      }

      const result = await validateCamera(entry, log);

      if (result.status === "fail") {
        result.status = "reject";
        results.push(result);
        log[id] = { status: "offline", notes: result.details, last_checked: new Date().toISOString(), consecutive_failures: MAX_CONSECUTIVE_FAILURES, last_failure_reason: result.details };
        if (EVENT_NAME === "push" && !capped) {
          allCameras.splice(i, 1); i--; removedCount++;
        }
      } else {
        results.push(result);
        log[id] = { status: "active", last_checked: new Date().toISOString(), consecutive_failures: 0 };
      }
    }

    if (EVENT_NAME === "push" && !capped) saveCameras(allCameras);
  }

  saveLog(log);

  // Open issues for dead cameras (with spam protection)
  let issuesOpened = 0;
  for (const { cam, reason } of issuesToOpen) {
    if (issuesOpened >= MAX_ISSUES_PER_RUN) {
      console.log(`Issue cap reached (${MAX_ISSUES_PER_RUN}). Skipping remaining ${issuesToOpen.length - issuesOpened} cameras.`);
      break;
    }

    // Check for existing open issue to avoid duplicates
    const alreadyOpen = await hasOpenIssue(cam.id);
    if (alreadyOpen) {
      console.log(`Skipping issue for ${cam.id} — already open`);
      continue;
    }

    const opened = await createIssue(
      `[dead-camera] ${cam.name} (${cam.id})`,
      `**Camera:** ${cam.name}\n**ID:** \`${cam.id}\`\n**Location:** ${cam.location}\n**URL:** ${cam.url}\n**Reason:** ${reason}\n**Checked:** ${new Date().toISOString()}\n\nThis camera failed ${MAX_CONSECUTIVE_FAILURES} consecutive validation checks and was removed from the registry. If it's still operational, it should be re-added.`,
      ["dead-camera", "automated"]
    );
    if (opened) issuesOpened++;
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
  if (issuesOpened > 0) report += `- **Issues opened:** ${issuesOpened}\n`;
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
