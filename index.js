#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, "community-registry.json");
const LOG_PATH = path.join(__dirname, "validation-log.json");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Version 4.0.0 (Direct-image only, no yt-dlp, no ffmpeg)
const VERSION = "4.0.0";

// GitHub Constants
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "open-public-cam";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const server = new McpServer({ name: "open-public-cam", version: VERSION });

// v4.0.0 Curated List — verified direct-image webcams
const CURATED_WEBCAMS = [
  {
    id: "nyc-fdr-brooklyn-bridge",
    name: "FDR Drive @ Brooklyn Bridge",
    url: "https://nyctmc.org/api/cameras/ecba28cb-ac70-4d25-abcb-6506111ea120/image",
    category: "city", location: "Manhattan, New York, USA", timezone: "America/New_York", verified: true
  },
  {
    id: "nyc-broadway-45th",
    name: "Broadway @ 45th St (Times Square area)",
    url: "https://nyctmc.org/api/cameras/053e8995-f8cb-4d02-a659-70ac7c7da5db/image",
    category: "city", location: "Manhattan, New York, USA", timezone: "America/New_York", verified: true
  },
  {
    id: "nyc-central-park-west-65th",
    name: "Central Park West @ 65th St",
    url: "https://nyctmc.org/api/cameras/4f8c2e84-c15a-4474-91fb-7e14554d4c4e/image",
    category: "park", location: "Manhattan, New York, USA", timezone: "America/New_York", verified: true
  },
  {
    id: "nyc-ave-americas-cps",
    name: "Ave of Americas @ Central Park South",
    url: "https://nyctmc.org/api/cameras/332f161d-47cb-4c8a-b6b6-5ad48a55c978/image",
    category: "city", location: "Manhattan, New York, USA", timezone: "America/New_York", verified: true
  },
  {
    id: "nyc-park-ave-79th",
    name: "Park Ave @ 79th St",
    url: "https://nyctmc.org/api/cameras/41397b64-d035-4b41-a03e-170fe4103d89/image",
    category: "city", location: "Manhattan, New York, USA", timezone: "America/New_York", verified: true
  },
];

// Helpers
const getCommunityData = () => { try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")); } catch (e) { return []; } };
const getValidationLog = () => { try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch (e) { return {}; } };
const saveRegistry = (data) => fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
const saveLog = (data) => fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));

function findWebcam(idOrUrl) {
  return CURATED_WEBCAMS.find(c => c.id === idOrUrl || c.url === idOrUrl) || getCommunityData().find(c => c.id === idOrUrl || c.url === idOrUrl);
}

function isNighttimeAt(timezone) {
  if (!timezone) return false;
  try {
    const hour = new Date().toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false });
    return parseInt(hour, 10) >= 20 || parseInt(hour, 10) < 6;
  } catch (e) { return false; }
}

const HUMAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site'
};

async function validateImageUrl(url) {
  try {
    const resp = await axios.get(url, { timeout: 5000, headers: HUMAN_HEADERS, responseType: 'stream' });
    const ct = resp.headers['content-type'] || "";
    resp.data.destroy();
    return ct.includes('image/');
  } catch (e) { return false; }
}

// SNAPSHOT TOOL
server.tool(
  "get_webcam_snapshot",
  "Capture a live snapshot from a registered webcam.",
  { cam_id: z.string().describe("Webcam ID or URL") },
  async ({ cam_id }) => {
    const cam = findWebcam(cam_id);
    if (!cam) return { content: [{ type: "text", text: `Error: Cam '${cam_id}' not found.` }], isError: true };

    const filename = `${cam.id.substring(0, 30)}_${Date.now()}.jpg`.replace(/[^a-z0-9.]/gi, '_');
    const fullPath = path.join(SNAPSHOTS_DIR, filename);

    try {
      const response = await axios.get(cam.url, { responseType: 'arraybuffer', timeout: 10000, headers: HUMAN_HEADERS });
      const ct = response.headers['content-type'] || "";
      if (!ct.includes('image/')) throw new Error(`Not an image (content-type: ${ct})`);
      fs.writeFileSync(fullPath, Buffer.from(response.data));
      if (!fs.existsSync(fullPath)) throw new Error("No output file created.");
      return { content: [{ type: "text", text: `Snapshot captured: ${fullPath}` }] };
    } catch (e) { return { content: [{ type: "text", text: `Snapshot failed: ${e.message}` }], isError: true }; }
  }
);

// REGISTRY TOOLS
server.tool("list_webcams", "List all registered webcams.", {}, async () => {
  const all = [...CURATED_WEBCAMS, ...getCommunityData()];
  const logs = getValidationLog();
  if (all.length === 0) return { content: [{ type: "text", text: `v${VERSION} — Registry is empty. Use draft_webcam to add entries.` }] };
  const list = all.map(c => {
    const icon = (logs[c.id]?.status || "active") === "active" ? "+" : "-";
    return `${icon} ${c.name} (${c.location}) — ID: ${c.id} [${c.category || "uncategorized"}]`;
  }).join("\n");
  return { content: [{ type: "text", text: `v${VERSION} Registry:\n\n${list}` }] };
});

server.tool("search_webcams", "Search registry by name or location.", { query: z.string() }, async ({ query }) => {
  const all = [...CURATED_WEBCAMS, ...getCommunityData()];
  const results = all.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.location.toLowerCase().includes(query.toLowerCase()));
  if (results.length === 0) return { content: [{ type: "text", text: `No results for "${query}".` }] };
  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
});

// DISCOVERY
server.tool("discover_webcams_by_location", "Find webcams via OpenStreetMap.", { city: z.string().optional(), bbox: z.array(z.number()).length(4).optional() }, async ({ city, bbox }) => {
  let finalBbox = bbox;
  if (city && !finalBbox) {
    try {
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`, { headers: { 'User-Agent': 'open-public-cam' } });
      if (geoRes.data.length > 0) {
        const b = geoRes.data[0].boundingbox.map(Number);
        finalBbox = [b[0], b[2], b[1], b[3]];
      }
    } catch (e) {}
  }
  if (!finalBbox) return { content: [{ type: "text", text: "Error: No area specified or found." }], isError: true };
  try {
    const res = await axios.post("https://overpass-api.de/api/interpreter", `[out:json][timeout:25];(nwr["man_made"="webcam"](${finalBbox.join(",")});nwr["contact:webcam"](${finalBbox.join(",")}););out body;`);
    const cams = res.data.elements.map(el => ({
      id: `osm-${el.id}`, name: el.tags.name || "Unnamed", url: el.tags["contact:webcam"] || el.tags.url || el.tags.website || "No URL", location: `${el.lat}, ${el.lon}`
    })).filter(c => c.url !== "No URL");
    return { content: [{ type: "text", text: `Found ${cams.length} webcams:\n\n${JSON.stringify(cams, null, 2)}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true }; }
});

// DRAFT TOOLS
server.tool("draft_webcam", "Add a local unverified webcam entry.", {
  name: z.string(), url: z.string().url(), location: z.string(), timezone: z.string(), category: z.string().optional()
}, async (cam) => {
  const community = getCommunityData();
  const id = `comm-${Date.now()}`;
  community.push({ ...cam, id, verified: false, submitted_at: new Date().toISOString() });
  saveRegistry(community);
  return { content: [{ type: "text", text: `Drafted: ${cam.name} (ID: ${id})` }] };
});

server.tool("draft_webcam_report", "Save a local health report for a webcam.", {
  cam_id: z.string(),
  status: z.enum(["active", "offline", "broken_link", "low_quality"]),
  notes: z.string().optional()
}, async ({ cam_id, status, notes }) => {
  const cam = findWebcam(cam_id);
  if (cam && isNighttimeAt(cam.timezone)) return { content: [{ type: "text", text: "Report blocked: nighttime at webcam location." }], isError: true };
  const logs = getValidationLog();
  logs[cam_id] = { status, notes, timestamp: new Date().toISOString() };
  saveLog(logs);
  return { content: [{ type: "text", text: `Report saved for ${cam_id}.` }] };
});

// GITHUB SUBMISSION TOOLS
server.tool("submit_new_webcam_to_github", "Submit a verified webcam via GitHub issue.", {
  name: z.string(), url: z.string().url(), location: z.string(), timezone: z.string(), category: z.string().optional()
}, async (sub) => {
  if (!(await validateImageUrl(sub.url))) return { content: [{ type: "text", text: "Error: URL validation failed (did not return an image)." }], isError: true };
  try {
    const body = `Location: ${sub.location}\nTimezone: ${sub.timezone}\nURL: ${sub.url}`;
    const result = spawnSync("gh", ["issue", "create", "--title", `[webcam] ${sub.name}`, "--body", body, "--label", "webcam-submission"], { encoding: 'utf8', timeout: 15000 });
    if (result.status !== 0) throw new Error(result.stderr || "gh command failed");
    return { content: [{ type: "text", text: `Submitted: ${result.stdout.trim()}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true }; }
});

server.tool("submit_report_to_github", "Report a webcam issue via GitHub issue.", {
  cam_id: z.string(), status: z.enum(["offline", "broken_link", "low_quality"]), notes: z.string().optional()
}, async ({ cam_id, status, notes }) => {
  const cam = findWebcam(cam_id);
  if (cam && isNighttimeAt(cam.timezone)) return { content: [{ type: "text", text: "Report blocked: nighttime at webcam location." }], isError: true };
  try {
    const body = `Status: ${status}\nNotes: ${notes || "None"}\nTime: ${new Date().toISOString()}`;
    const result = spawnSync("gh", ["issue", "create", "--title", `[report] ${status}: ${cam_id}`, "--body", body, "--label", "webcam-report"], { encoding: 'utf8', timeout: 15000 });
    return { content: [{ type: "text", text: `Reported: ${result.stdout.trim()}` }] };
  } catch (e) { return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true }; }
});

// SYNC
server.tool("sync_registry", "Sync community data from GitHub.", {}, async () => {
  try {
    const [reg, logs] = await Promise.all([
      axios.get(`${GITHUB_RAW_BASE}/community-registry.json`),
      axios.get(`${GITHUB_RAW_BASE}/validation-log.json`).catch(() => ({ data: {} }))
    ]);
    saveRegistry(reg.data); saveLog(logs.data);
    return { content: [{ type: "text", text: "Registry synced." }] };
  } catch (e) { return { content: [{ type: "text", text: `Sync failed: ${e.message}` }], isError: true }; }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Open Public Cam v${VERSION}`);
}

main().catch(console.error);
