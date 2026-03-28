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

// GitHub Repository Info
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "open-public-cam";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

const server = new McpServer({
  name: "open-public-cam",
  version: "1.3.0",
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
  "report_webcam_status",
  "Allow agents to provide feedback or report issues. (Requires up-to-date registry)",
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
  "submit_webcam",
  "Contribute a new webcam to the community. (Requires up-to-date registry)",
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
  "Captures a live snapshot image from a webcam URL using a headless browser",
  {
    url: z.string().describe("The URL of the webcam page"),
    selector: z.string().optional().default("video").describe("CSS selector"),
    wait_ms: z.number().optional().default(5000)
  },
  async ({ url, selector, wait_ms }) => {
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
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);

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

      return {
        content: [
          { type: "text", text: `Successfully captured snapshot from ${url}.` },
          { type: "image", data: buffer.toString('base64'), mimeType: "image/jpeg" }
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
  "Discover webcams using OpenStreetMap (Cached)",
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
