#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { spawnSync, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, "community-registry.json");
const LOG_PATH = path.join(__dirname, "validation-log.json");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Version 3.0.0 (Direct-only, no yt-dlp)
const VERSION = "3.0.0";

// GitHub Constants
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "open-public-cam";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

// Find ffmpeg — needed for direct_stream captures
function findCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 10000 });
    return cmd;
  } catch (e) {
    // Some builds return non-zero for --version despite working
    try {
      const which = execSync(`which ${cmd}`, { encoding: 'utf8', timeout: 5000 }).trim();
      if (which) return which;
    } catch (_) {}
    return null;
  }
}

const FFMPEG_PATH = findCommand("ffmpeg");
if (!FFMPEG_PATH) console.error("Warning: 'ffmpeg' not found. direct_stream captures will fail.");

const server = new McpServer({ name: "open-public-cam", version: VERSION });

// v3.0.0 Curated List — direct_image and direct_stream only
const CURATED_WEBCAMS = [];

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

async function validateUrl(url, strategyType) {
  try {
    if (strategyType === "direct_image") {
      const resp = await axios.get(url, { timeout: 5000, headers: HUMAN_HEADERS, responseType: 'stream' });
      const ct = resp.headers['content-type'] || "";
      resp.data.destroy();
      return ct.includes('image/');
    }
    // direct_stream — just check the URL is reachable
    if (strategyType === "direct_stream") {
      await axios.head(url, { timeout: 5000, headers: HUMAN_HEADERS });
      return true;
    }
    return false;
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

    const strategy = cam.access_strategy?.type || "direct_image";
    const filename = `${cam.id.substring(0, 30)}_${Date.now()}.jpg`.replace(/[^a-z0-9.]/gi, '_');
    const fullPath = path.join(SNAPSHOTS_DIR, filename);

    try {
      if (strategy === "direct_image") {
        const response = await axios.get(cam.url, { responseType: 'arraybuffer', timeout: 10000, headers: HUMAN_HEADERS });
        fs.writeFileSync(fullPath, Buffer.from(response.data));
      } else if (strategy === "direct_stream") {
        if (!FFMPEG_PATH) throw new Error("ffmpeg not found on this system.");
        const capture = spawnSync(FFMPEG_PATH, [
          "-user_agent", HUMAN_HEADERS['User-Agent'],
          "-i", cam.url,
          "-frames:v", "1",
          "-update", "1",
          "-q:v", "2",
          fullPath, "-y"
        ], { timeout: 15000 });
        if (capture.status !== 0 && !fs.existsSync(fullPath)) throw new Error(`ffmpeg failed: ${(capture.stderr || "").substring(0, 200)}`);
      }
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
    const strategy = c.access_strategy?.type || "unknown";
    return `${icon} ${c.name} (${c.location}) — ID: ${c.id} [${strategy}]`;
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
  name: z.string(), url: z.string().url(), location: z.string(), timezone: z.string(), strategy: z.enum(["direct_image", "direct_stream"]), category: z.string().optional()
}, async (cam) => {
  const community = getCommunityData();
  const id = `comm-${Date.now()}`;
  community.push({ ...cam, id, access_strategy: { type: cam.strategy }, verified: false, submitted_at: new Date().toISOString() });
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
  name: z.string(), url: z.string().url(), location: z.string(), timezone: z.string(), type: z.enum(["direct_image", "direct_stream"]), category: z.string().optional()
}, async (sub) => {
  if (!(await validateUrl(sub.url, sub.type))) return { content: [{ type: "text", text: "Error: URL validation failed." }], isError: true };
  try {
    const body = `Strategy: ${sub.type}\nLocation: ${sub.location}\nTimezone: ${sub.timezone}\nURL: ${sub.url}`;
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
    const [reg, logs] = await Promise.all([axios.get(`${GITHUB_RAW_BASE}/community-registry.json`), axios.get(`${GITHUB_RAW_BASE}/validation-log.json`)]);
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
