#!/usr/bin/env node
/**
 * Open Eagle Eye — Bootstrap
 *
 * Fetches the latest camera registry from GitHub on startup.
 * Falls back to cached version if GitHub is unreachable.
 * Camera data is cached in ~/.openeagleeye/
 *
 * cameras.json is fetched via the GitHub Contents API (vnd.github.raw+json)
 * which handles Git LFS transparently — raw.githubusercontent.com returns
 * only the LFS pointer for tracked files.
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

const CACHE_DIR = path.join(os.homedir(), ".openeagleeye");
const GITHUB_RAW = "https://raw.githubusercontent.com/stuchapin909/Open-Eagle-Eye/master";
const GITHUB_API = "https://api.github.com/repos/stuchapin909/Open-Eagle-Eye/contents";

fs.mkdirSync(CACHE_DIR, { recursive: true });

// Standard fetch for small files (not in LFS)
async function fetchFile(remotePath) {
  const resp = await axios.get(`${GITHUB_RAW}/${remotePath}`, {
    timeout: 15000,
    responseType: "text",
    headers: {
      "User-Agent": "openeagleeye-bootstrap",
      "Accept": "application/json, text/plain, */*",
    },
    maxRedirects: 3,
  });
  return resp.data;
}

// LFS-aware fetch for cameras.json via GitHub Contents API.
// The vnd.github.raw+json Accept header causes GitHub to redirect through
// LFS storage, so the actual 13 MB JSON is returned rather than the pointer.
async function fetchCamerasJson() {
  const resp = await axios.get(`${GITHUB_API}/cameras.json`, {
    timeout: 30000,
    responseType: "text",
    headers: {
      "User-Agent": "openeagleeye-bootstrap",
      "Accept": "application/vnd.github.raw+json",
    },
    maxRedirects: 5,
  });
  return resp.data;
}

async function syncFile(remotePath, localPath) {
  try {
    const content = await fetchFile(remotePath);
    fs.writeFileSync(localPath, content);
    return "updated";
  } catch (e) {
    return "fallback";
  }
}

async function syncCamerasJson(localPath) {
  try {
    const content = await fetchCamerasJson();
    fs.writeFileSync(localPath, content);
    return "updated";
  } catch (e) {
    return "fallback";
  }
}

async function bootstrap() {
  console.error("[bootstrap] Syncing camera data from GitHub...");

  const camerasCache = path.join(CACHE_DIR, "cameras.json");
  const stateCache = path.join(CACHE_DIR, ".registry-state.json");

  const camerasResult = await syncCamerasJson(camerasCache);
  if (camerasResult === "updated") {
    console.error("  [+] cameras.json — updated");
  } else {
    // --- First-run guard ---
    // If GitHub is unreachable and there's no local cache at all, we have
    // nothing to serve. Exit loudly instead of starting with zero cameras.
    if (!fs.existsSync(camerasCache)) {
      console.error("  [!] cameras.json — GitHub unreachable and no local cache found.");
      console.error("  [!] Cannot start: no camera data available.");
      console.error("  [!] Check your internet connection and try again.");
      process.exit(1);
    }
    console.error("  [=] cameras.json — using cached (GitHub unreachable)");
  }

  // Validate cache integrity — catch truncated / corrupt files before the
  // server tries to JSON.parse them and crashes with an unhelpful error.
  try {
    const data = JSON.parse(fs.readFileSync(camerasCache, "utf8"));
    if (!Array.isArray(data) || data.length === 0) {
      console.error("  [!] cameras.json is empty or not an array.");
      console.error(`  [!] Delete ${camerasCache} and restart to re-fetch.`);
      process.exit(1);
    }
    console.error(`  [i] ${data.length.toLocaleString()} cameras available`);
  } catch {
    console.error("  [!] cameras.json is not valid JSON (file may be corrupt).");
    console.error(`  [!] Delete ${camerasCache} and restart to re-fetch.`);
    process.exit(1);
  }

  const stateResult = await syncFile(".registry-state.json", stateCache);
  if (stateResult === "updated") {
    console.error("  [+] .registry-state.json — updated");
  } else {
    console.error("  [-] .registry-state.json — skipped");
  }

  console.error("[bootstrap] Starting server...");
}

await bootstrap();
await import("./server.js");

