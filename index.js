#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

import { chromium } from "playwright-chromium";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, "community-registry.json");
const LOG_PATH = path.join(__dirname, "validation-log.json");
const CONFIG_PATH = path.join(__dirname, "config.json");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Ensure snapshots directory exists
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// Common Ad/Tracker domains to block at network level
const AD_DOMAINS = [
  'googlesyndication.com', 'adservice.google.com', 'google-analytics.com',
  'doubleclick.net', 'adsystem.com', 'adnxs.com', 'quantserve.com',
  'facebook.net', 'fontawesome.com', 'scorecardresearch.com'
];

// GitHub Repository Info
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "open-public-cam";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

const server = new McpServer({
  name: "open-public-cam",
  version: "1.4.0",
});

// Cache for Discovery (to be a good API citizen)
const discoverCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const WEBCAMS = [
  {
    id: "times-square",
    name: "Times Square, New York City",
    url: "https://www.earthcam.com/usa/newyork/timessquare/?cam=tsstreet",
    access_strategy: {
      type: "browser_capture",
      selector: "video",
      wait_for_ms: 5000
    },
    category: "city",
    location: "New York, USA",
    verified: true
  },
  {
    id: "abbey-road",
    name: "Abbey Road Crossing, London",
    url: "https://www.abbeyroad.com/crossing",
    access_strategy: {
      type: "browser_capture",
      selector: "video",
      wait_for_ms: 3000
    },
    category: "landmark",
    location: "London, UK",
    verified: true
  },
  {
    id: "venice-grand-canal",
    name: "Venice Grand Canal",
    url: "https://www.skylinewebcams.com/en/webcam/italia/veneto/venezia/canal-grande-rialto.html",
    access_strategy: {
      type: "browser_capture",
      selector: "video",
      wait_for_ms: 4000
    },
    category: "city",
    location: "Venice, Italy",
    verified: true
  }
];

// Helper to load/save data
const getCommunityData = () => {
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")); } catch (e) { return []; }
};

const getValidationLog = () => {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch (e) { return {}; }
};

const getConfig = () => {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch (e) { 
    return { last_synced: "never" }; 
  }
};

const saveConfig = (config) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

// Check for updates passive function
const checkForUpdates = async () => {
  try {
    const config = getConfig();
    const response = await axios.head(`${GITHUB_RAW_BASE}/community-registry.json`, { timeout: 2000 });
    const remoteLastModified = response.headers['last-modified'];
    
    if (config.last_synced === "never" || (remoteLastModified && new Date(remoteLastModified) > new Date(config.last_synced))) {
      return { updateAvailable: true, remoteLastModified };
    }
  } catch (e) { /* silent fail for passive check */ }
  return { updateAvailable: false };
};

server.tool(
  "submit_report_to_github",
  "Submit a health report for an exterior public webcam directly to the global GitHub repository for worker verification. (Requires GitHub CLI 'gh')",
  {
    cam_id: z.string().describe("The ID or URL of the webcam"),
    status: z.enum(["active", "offline", "low_quality", "obstructed", "broken_link"]).describe("Reported status"),
    notes: z.string().optional().describe("Additional details for the worker")
  },
  async ({ cam_id, status, notes }) => {
    try {
      const issueBody = {
        cam_id,
        status,
        notes: notes || "No additional notes",
        reported_at: new Date().toISOString()
      };

      const { spawnSync } = await import("child_process");
      const title = `[webcam-report] ${status}: ${cam_id}`;
      const body = `\`\`\`json\n${JSON.stringify(issueBody, null, 2)}\n\`\`\``;
      
      const result = spawnSync("gh", [
        "issue", "create", 
        "--title", title, 
        "--body", body, 
        "--label", "webcam-report"
      ], { encoding: 'utf8' });

      if (result.error || result.status !== 0) {
        throw new Error(result.stderr || "Failed to execute 'gh' command");
      }
      const output = result.stdout;

      return {
        content: [{ type: "text", text: `Report submitted to GitHub! Worker verification will begin shortly.\nIssue URL: ${output.trim()}` }]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to submit to GitHub: ${e.message}. Ensure 'gh' CLI is installed and you are logged in.` }],
        isError: true
      };
    }
  }
);

server.tool(
  "submit_new_webcam_to_github",
  "Submit a newly discovered exterior public webcam (streets, landmarks, nature) to the global GitHub repository for verification. (Requires GitHub CLI 'gh')",
  {
    name: z.string().describe("Descriptive name (e.g., 'Venice Beach Boardwalk')"),
    url: z.string().url().describe("The public URL of the feed or page"),
    location: z.string().describe("City, Country"),
    category: z.string().optional().describe("e.g. 'city', 'nature', 'traffic'")
  },
  async ({ name, url, location, category }) => {
    const update = await checkForUpdates();
    if (update.updateAvailable) {
      return {
        content: [{ type: "text", text: "Error: Your registry is out of date. Please run 'sync_registry' before submitting new cameras." }],
        isError: true
      };
    }

    try {
      const submissionBody = {
        name,
        url,
        location,
        category: category || "uncategorized",
        submitted_at: new Date().toISOString()
      };

      const { spawnSync } = await import("child_process");
      const title = `[webcam-submission] ${name} (${location})`;
      const body = `\`\`\`json\n${JSON.stringify(submissionBody, null, 2)}\n\`\`\``;
      
      const result = spawnSync("gh", [
        "issue", "create", 
        "--title", title, 
        "--body", body, 
        "--label", "webcam-submission"
      ], { encoding: 'utf8' });

      if (result.error || result.status !== 0) {
        throw new Error(result.stderr || "Failed to execute 'gh' command");
      }
      const output = result.stdout;

      return {
        content: [{ type: "text", text: `Submission sent to GitHub! The worker will verify the link and add it to the global registry if it passes.\nIssue URL: ${output.trim()}` }]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to submit to GitHub: ${e.message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "sync_registry",
  "Manually update the local webcam registry and validation logs from the global GitHub repository",
  {},
  async () => {
    try {
      const registryRes = await axios.get(`${GITHUB_RAW_BASE}/community-registry.json`);
      const logRes = await axios.get(`${GITHUB_RAW_BASE}/validation-log.json`);
      
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registryRes.data, null, 2));
      fs.writeFileSync(LOG_PATH, JSON.stringify(logRes.data, null, 2));
      
      saveConfig({ last_synced: new Date().toISOString() });
      
      return { content: [{ type: "text", text: "Successfully synced with global registry. You are now up to date." }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Sync failed: ${e.message}` }], isError: true };
    }
  }
);

server.tool(
  "draft_webcam_report",
  "Draft a report locally (unverified). Use submit_report_to_github for worker-verified reports. (Requires up-to-date registry)",
  {
    cam_id: z.string().describe("The ID or URL of the webcam"),
    status: z.enum(["active", "offline", "low_quality", "obstructed", "broken_link"]).describe("Current status"),
    notes: z.string().optional().describe("Additional details")
  },
  async ({ cam_id, status, notes }) => {
    const update = await checkForUpdates();
    if (update.updateAvailable) {
      return {
        content: [{ type: "text", text: "Error: Your registry is out of date. Please run 'sync_registry' before submitting feedback to avoid duplicate or obsolete reports." }],
        isError: true
      };
    }

    const logs = getValidationLog();
    logs[cam_id] = { status, notes, timestamp: new Date().toISOString(), reported_by: "agent" };
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
    return { content: [{ type: "text", text: `Feedback received for ${cam_id}.` }] };
  }
);

server.tool(
  "draft_webcam",
  "Draft a webcam locally (unverified). Use submit_new_webcam_to_github for verified submission. (Requires up-to-date registry)",
  {
    name: z.string().describe("Name of the webcam"),
    url: z.string().url().describe("Public URL"),
    location: z.string().describe("City, Country"),
    category: z.string().optional()
  },
  async ({ name, url, location, category }) => {
    const update = await checkForUpdates();
    if (update.updateAvailable) {
      return {
        content: [{ type: "text", text: "Error: Your registry is out of date. Please run 'sync_registry' first." }],
        isError: true
      };
    }

    const community = getCommunityData();
    community.push({
      id: `comm-${Date.now()}`,
      name, url, location,
      category: category || "uncategorized",
      verified: false,
      submitted_at: new Date().toISOString()
    });
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(community, null, 2));
    return { content: [{ type: "text", text: `Webcam '${name}' added to local community registry.` }] };
  }
);

server.tool(
  "get_webcam_snapshot",
  "Captures a live snapshot image from an exterior public webcam URL and saves it as a local JPEG file",
  {
    url: z.string().describe("The URL of the public webcam page"),
    name: z.string().optional().describe("Descriptive name of the webcam (used for filename)"),
    location: z.string().optional().describe("Location of the webcam (used for filename)"),
    selector: z.string().optional().default("video").describe("CSS selector"),
    wait_ms: z.number().optional().default(5000)
  },
  async ({ url, name, location, selector, wait_ms }) => {
    const logs = getValidationLog();
    if (logs[url] && logs[url].status === "offline") {
      console.error(`Warning: This cam was recently reported as offline (${logs[url].timestamp})`);
    }

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      });
      const page = await context.newPage();

      // 1. Network-Level Ad Blocking
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (AD_DOMAINS.some(domain => url.includes(domain))) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      // Smart Strategy: YouTube Detection
      const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);

      // 2. Handle Cookie Consents / Overlays
      try {
        const consentSelectors = ['button:has-text("Accept all")', 'button:has-text("AGREE")', '#accept-choices', '.yt-spec-button-shape-next--filled'];
        for (const sel of consentSelectors) {
          if (await page.locator(sel).isVisible({ timeout: 1000 })) {
            await page.locator(sel).click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {}

      // 3. Platform-Specific Tweaks & CSS Cloaking
      await page.addStyleTag({
        content: `
          /* General Ad Cloaking */
          #ad_container, .ad-overlay, .video-ads, .ytp-ad-module, .ytp-ad-overlay-container, [id*="ad-"], [class*="ad-"] { 
            display: none !important; 
          }
          /* YouTube Specific */
          .ytp-chrome-bottom, .ytp-chrome-top, .ytp-gradient-bottom, .ytp-gradient-top { 
            display: none !important; 
          }
        `
      });

      if (isYouTube) {
        // Wait for potential pre-roll ad to finish or skip it
        try {
          const skipBtn = page.locator('.ytp-ad-skip-button');
          if (await skipBtn.isVisible({ timeout: 5000 })) {
            await skipBtn.click();
          }
        } catch (e) {}

        await page.evaluate(() => {
          const video = document.querySelector('video.video-stream.html5-main-video');
          if (video) { video.play(); video.muted = true; }
        });
        selector = 'video.video-stream.html5-main-video';
      }

      try { await page.waitForSelector(selector, { timeout: 15000 }); } catch (e) {
        try { await page.waitForSelector('video, img, canvas', { timeout: 5000 }); } catch (e2) {}
      }

      await page.waitForTimeout(wait_ms);

      let buffer;
      try {
        const element = await page.$(selector) || await page.$('video') || await page.$('img');
        buffer = element ? await element.screenshot({ type: 'jpeg', quality: 80 }) : await page.screenshot({ type: 'jpeg', quality: 80 });
      } catch (e) {
        buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
      }

      // Generate local filename and save
      const now = new Date();
      const datePart = now.toISOString().split('T')[0];
      const timePart = now.getHours().toString().padStart(2, '0') + "-" + now.getMinutes().toString().padStart(2, '0') + "-" + now.getSeconds().toString().padStart(2, '0');
      const timestamp = `${datePart}_${timePart}`;
      
      let filePrefix = "snapshot";
      if (name || location) {
        const part1 = (name || "").replace(/[^a-z0-9]/gi, "_");
        const part2 = (location || "").replace(/[^a-z0-9]/gi, "_");
        filePrefix = [part1, part2].filter(Boolean).join("_").substring(0, 100).replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      } else {
        filePrefix = url.replace(/[^a-z0-9]/gi, "_").substring(0, 50).replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      }

      const filename = `${filePrefix}_${timestamp}.jpg`;
      const fullPath = path.join(SNAPSHOTS_DIR, filename);
      
      fs.writeFileSync(fullPath, buffer);

      return {
        content: [
          { type: "text", text: `Successfully captured snapshot and saved to disk.\n\nLocal Path: ${fullPath}\n\nYou can now use your standard vision tools to analyze this file.` }
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    } finally {
      if (browser) await browser.close();
    }
  }
);

server.tool(
  "list_webcams",
  "Lists famous and community-submitted webcams",
  {},
  async () => {
    const community = getCommunityData();
    const logs = getValidationLog();
    const update = await checkForUpdates();
    
    const allCams = [...WEBCAMS, ...community].map(cam => ({
      ...cam,
      current_status: logs[cam.id] || logs[cam.url] || { status: "unknown" }
    }));

    let message = "";
    if (update.updateAvailable) {
      message = "[NOTICE]: A community update is available on GitHub. Run 'sync_registry' to get the latest validated cameras and status reports.\n\n";
    }

    return {
      content: [{ type: "text", text: message + JSON.stringify(allCams, null, 2) }],
    };
  }
);

server.tool(
  "search_webcams",
  "Search for webcams in the global curated and community list",
  { query: z.string() },
  async ({ query }) => {
    const community = getCommunityData();
    const all = [...WEBCAMS, ...community];
    const results = all.filter(cam => 
      cam.name.toLowerCase().includes(query.toLowerCase()) || 
      cam.location.toLowerCase().includes(query.toLowerCase())
    );
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  "discover_webcams_by_location",
  "Discover exterior public webcams using OpenStreetMap tags (man_made=webcam) (Cached)",
  {
    city: z.string().optional(),
    bbox: z.array(z.number()).length(4).optional()
  },
  async ({ city, bbox }) => {
    const cacheKey = city || JSON.stringify(bbox);
    if (discoverCache.has(cacheKey)) {
      const entry = discoverCache.get(cacheKey);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return { content: [{ type: "text", text: `(Cached) Found ${entry.data.length} webcams:\n${JSON.stringify(entry.data, null, 2)}` }] };
      }
    }

    let finalBbox = bbox;
    if (city && !finalBbox) {
      try {
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`, {
          headers: { 'User-Agent': 'open-public-cam' }
        });
        if (geoRes.data.length > 0) {
          const b = geoRes.data[0].boundingbox.map(Number);
          finalBbox = [b[0], b[2], b[1], b[3]];
        }
      } catch (e) {}
    }

    if (!finalBbox) return { content: [{ type: "text", text: "Error: Bbox not found." }], isError: true };

    try {
      const res = await axios.post("https://overpass-api.de/api/interpreter", `[out:json][timeout:25];(nwr["man_made"="surveillance"]["surveillance"="webcam"](${finalBbox.join(",")});nwr["contact:webcam"](${finalBbox.join(",")});nwr["man_made"="webcam"](${finalBbox.join(",")}););out body;`);
      const cameras = res.data.elements.map(el => ({
        id: el.id,
        name: el.tags.name || el.tags.description || "Unnamed",
        url: el.tags["contact:webcam"] || el.tags.url || el.tags.website || "No URL",
        location: `${el.lat}, ${el.lon}`
      })).filter(cam => cam.url !== "No URL");

      discoverCache.set(cacheKey, { timestamp: Date.now(), data: cameras });
      return { content: [{ type: "text", text: `Found ${cameras.length} webcams:\n${JSON.stringify(cameras, null, 2)}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Webcam MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
