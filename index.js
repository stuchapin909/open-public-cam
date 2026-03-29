#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMERAS_PATH = path.join(__dirname, "cameras.json");
const LOG_PATH = path.join(__dirname, ".registry-state.json");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const USER_CONFIG_DIR = path.join(os.homedir(), ".openeagleeye");
const USER_CONFIG_PATH = path.join(USER_CONFIG_DIR, "config.json");

// Renamed to Open Eagle Eye, npm: openeagleeye
const VERSION = "6.3.0";

// GitHub Constants
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "Open-Eagle-Eye";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
if (!fs.existsSync(USER_CONFIG_DIR)) fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });

const server = new McpServer({ name: "openeagleeye", version: VERSION });

// Load cameras from cameras.json
const cameras = JSON.parse(fs.readFileSync(CAMERAS_PATH, "utf8"));

// --- User Config ---
function getUserConfig() {
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(USER_CONFIG_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function getUserApiKeys() {
  return getUserConfig().api_keys || {};
}

// --- Helpers ---
const getValidationLog = () => { try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch (e) { return {}; } };
const saveLog = (data) => fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));

function findWebcam(idOrUrl) {
  return cameras.find(c => c.id === idOrUrl || c.url === idOrUrl);
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

/**
 * Build request config for a camera, injecting API keys if needed.
 * Returns { url, headers } or { error } if required keys are missing.
 */
function buildRequestConfig(cam) {
  const auth = cam.auth;
  if (!auth || !auth.key_required) {
    return { url: cam.url, headers: { ...HUMAN_HEADERS } };
  }

  const apiKeys = getUserApiKeys();
  const configKey = auth.config_key || auth.key_names?.[0];

  if (!configKey || !apiKeys[configKey]) {
    return {
      error: `This camera requires an API key from ${auth.provider}.\n` +
        `Sign up: ${auth.signup_url}\n` +
        `Then add to ${USER_CONFIG_PATH}:\n` +
        `{\n  "api_keys": {\n    "${configKey}": "your-key-here"\n  }\n}`
    };
  }

  const url = new URL(cam.url);
  const headers = { ...HUMAN_HEADERS };

  if (auth.key_type === "header") {
    for (const keyName of auth.key_names || [configKey]) {
      headers[keyName] = apiKeys[configKey];
    }
  } else {
    for (const keyName of auth.key_names || [configKey]) {
      url.searchParams.set(keyName, apiKeys[configKey]);
    }
  }

  return { url: url.toString(), headers };
}

// SNAPSHOT TOOL
server.tool(
  "get_webcam_snapshot",
  "Fetch a live snapshot from a registered public webcam. Saves the image as a JPEG/PNG file and returns the local path. The agent can then read or analyze the file. Use list_webcams or search_webcams first to find camera IDs. Note: the MCP server runs as a local subprocess, so file paths are accessible to the agent.",
  { cam_id: z.string().describe("Camera ID from list_webcams/search_webcams, or a direct image URL") },
  async ({ cam_id }) => {
    const cam = findWebcam(cam_id);
    if (!cam) return { content: [{ type: "text", text: JSON.stringify({ error: "Camera not found", cam_id }) }], isError: true };

    const config = buildRequestConfig(cam);
    if (config.error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "API key required", details: config.error, camera: cam.name }) }], isError: true };
    }

    const filename = `${cam.id.substring(0, 30)}_${Date.now()}.jpg`.replace(/[^a-z0-9.]/gi, '_');
    const fullPath = path.join(SNAPSHOTS_DIR, filename);

    try {
      const response = await axios.get(config.url, { responseType: 'arraybuffer', timeout: 10000, headers: config.headers, maxContentLength: 5 * 1024 * 1024, maxBodyLength: 5 * 1024 * 1024 });
      const ct = response.headers['content-type'] || "";
      if (!ct.includes('image/')) throw new Error(`Not an image (content-type: ${ct})`);
      const buf = Buffer.from(response.data);
      if (buf.length > 5 * 1024 * 1024) throw new Error(`Response too large (${(buf.length / 1024 / 1024).toFixed(1)}MB, max 5MB)`);
      fs.writeFileSync(fullPath, buf);
      if (!fs.existsSync(fullPath)) throw new Error("No output file created.");
      return { content: [{ type: "text", text: JSON.stringify({
        success: true,
        file_path: fullPath,
        size_bytes: buf.length,
        content_type: ct.includes('png') ? 'image/png' : 'image/jpeg',
        camera: { id: cam.id, name: cam.name, location: cam.location, category: cam.category }
      }) }] };
    } catch (e) { return { content: [{ type: "text", text: JSON.stringify({ error: "Snapshot failed", message: e.message, camera: cam.name, id: cam.id }) }], isError: true }; }
  }
);

// REGISTRY TOOLS
server.tool("list_webcams", "List all registered public webcams. Returns cameras as a JSON array with id, name, location, category, and auth status. Use this to discover available cameras before calling get_webcam_snapshot.", { location: z.string().optional().describe("Filter by location (e.g. 'London', 'Manhattan')"), category: z.string().optional().describe("Filter by category: city, park, highway, airport, port, weather, nature, landmark, other") }, async ({ location, category }) => {
  if (cameras.length === 0) return { content: [{ type: "text", text: JSON.stringify({ version: VERSION, total: 0, cameras: [], message: "Registry is empty." }) }] };

  const logs = getValidationLog();
  let filtered = cameras;
  if (location) filtered = filtered.filter(c => (c.location || "").toLowerCase().includes(location.toLowerCase()));
  if (category) filtered = filtered.filter(c => (c.category || "") === category);

  const result = filtered.map(c => ({
    id: c.id,
    name: c.name,
    location: c.location || "Unknown",
    category: c.category || "other",
    timezone: c.timezone || null,
    verified: c.verified || false,
    status: logs[c.id]?.status || "active",
    auth_required: c.auth?.key_required || false,
  }));

  const locations = {};
  for (const c of cameras) { const loc = c.location || "Unknown"; locations[loc] = (locations[loc] || 0) + 1; }

  return { content: [{ type: "text", text: JSON.stringify({ version: VERSION, total: cameras.length, shown: result.length, locations, cameras: result }, null, 2) }] };
});

server.tool("search_webcams", "Search webcams by name, location, or category. Returns matching cameras as a JSON array. Use when the user asks about cameras in a specific place or of a specific type.", { query: z.string().describe("Search term — matches against camera name, location, and category") }, async ({ query }) => {
  const q = query.toLowerCase();
  const results = cameras.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.location || "").toLowerCase().includes(q) ||
    (c.category || "").toLowerCase().includes(q)
  );
  if (results.length === 0) return { content: [{ type: "text", text: JSON.stringify({ query, total: 0, cameras: [] }) }] };
  const mapped = results.map(c => ({
    id: c.id,
    name: c.name,
    location: c.location || "Unknown",
    category: c.category || "other",
    timezone: c.timezone || null,
    verified: c.verified || false,
    auth_required: c.auth?.key_required || false,
  }));
  return { content: [{ type: "text", text: JSON.stringify({ query, total: mapped.length, cameras: mapped }, null, 2) }] };
});

// DRAFT TOOL
server.tool("draft_webcam", "Add a new webcam to the local camera registry. The webcam URL must return a JPEG or PNG image on a plain HTTP GET. The entry is stored locally in cameras.json — use get_webcam_snapshot to test it after drafting.", {
  name: z.string().describe("Human-readable camera name"),
  url: z.string().url().describe("Direct image URL — must return JPEG or PNG on HTTP GET"),
  location: z.string().describe("Location description (e.g. 'Manhattan, New York, USA')"),
  timezone: z.string().describe("IANA timezone (e.g. 'America/New_York', 'Europe/London')"),
  category: z.enum(["city", "park", "highway", "airport", "port", "weather", "nature", "landmark", "other"]).optional().describe("Camera category"),
  auth_provider: z.string().optional().describe("Provider name if API key is needed (e.g. 'Transport for London')"),
  auth_signup_url: z.string().optional().describe("URL to register for API key"),
  auth_key_required: z.boolean().optional().describe("Whether the image URL requires an API key at fetch time"),
  auth_key_type: z.enum(["query_params", "header"]).optional().describe("How to inject the key"),
  auth_key_names: z.array(z.string()).optional().describe("Query param or header names for the key"),
  auth_config_key: z.string().optional().describe("Key name to use in ~/.openeagleeye/config.json"),
  auth_note: z.string().optional().describe("Notes about authentication"),
}, async (params) => {
  const { auth_provider, auth_signup_url, auth_key_required, auth_key_type, auth_key_names, auth_config_key, auth_note, ...camFields } = params;

  const id = `comm-${Date.now()}`;

  const entry = {
    ...camFields,
    id,
    verified: false,
    submitted_at: new Date().toISOString(),
  };

  if (auth_provider) {
    entry.auth = {
      provider: auth_provider,
      signup_url: auth_signup_url || null,
      key_required: auth_key_required ?? true,
      ...(auth_key_type && { key_type: auth_key_type }),
      ...(auth_key_names && { key_names: auth_key_names }),
      ...(auth_config_key && { config_key: auth_config_key }),
      ...(auth_note && { note: auth_note }),
    };
  }

  cameras.push(entry);
  fs.writeFileSync(CAMERAS_PATH, JSON.stringify(cameras, null, 2));
  return { content: [{ type: "text", text: JSON.stringify({ success: true, id, name: camFields.name, url: camFields.url, auth_required: entry.auth?.key_required || false, message: "Camera drafted to cameras.json. Use get_webcam_snapshot to test." }) }] };
});

server.tool("draft_webcam_report", "Report a webcam issue (broken link, offline, low quality). Saves the report locally. Use when a snapshot fails or shows unexpected content.", {
  cam_id: z.string().describe("Camera ID to report"),
  status: z.enum(["active", "offline", "broken_link", "low_quality"]).describe("Current status of the camera"),
  notes: z.string().optional().describe("Additional details about the issue")
}, async ({ cam_id, status, notes }) => {
  const cam = findWebcam(cam_id);
  if (cam && isNighttimeAt(cam.timezone)) return { content: [{ type: "text", text: JSON.stringify({ error: "Report blocked: nighttime at webcam location", camera: cam.name, timezone: cam.timezone }) }], isError: true };
  const logs = getValidationLog();
  logs[cam_id] = { status, notes, timestamp: new Date().toISOString() };
  saveLog(logs);
  return { content: [{ type: "text", text: JSON.stringify({ success: true, cam_id, status, notes: notes || null, timestamp: logs[cam_id].timestamp }) }] };
});

// --- CONFIG TOOL ---
server.tool("get_config_info", "Check API key configuration status. Returns which cameras require keys and whether those keys are configured in ~/.openeagleeye/config.json. Use when a snapshot fails with an API key error.", {}, async () => {
  const config = getUserConfig();
  const apiKeys = getUserApiKeys();

  const authCams = cameras.filter(c => c.auth?.key_required);
  const status = authCams.map(c => {
    const configKey = c.auth.config_key || c.auth.key_names?.[0];
    const hasKey = configKey && apiKeys[configKey];
    return {
      camera: c.name,
      id: c.id,
      provider: c.auth.provider,
      config_key: configKey,
      key_set: !!hasKey,
      signup_url: c.auth.signup_url,
    };
  });

  return { content: [{ type: "text", text: JSON.stringify({
    config_path: USER_CONFIG_PATH,
    api_keys_configured: Object.keys(apiKeys).length,
    auth_required_cameras: status.length,
    cameras: status,
  }, null, 2) }] };
});

// --- SYNC ---
server.tool("sync_registry", "Pull the latest camera registry from GitHub. Overwrites local cameras.json and .registry-state.json with upstream data. Use to get new cameras added by others.", {}, async () => {
  try {
    const [cams, logs] = await Promise.all([
      axios.get(`${GITHUB_RAW_BASE}/cameras.json`),
      axios.get(`${GITHUB_RAW_BASE}/.registry-state.json`).catch(() => ({ data: {} }))
    ]);
    if (!Array.isArray(cams.data)) throw new Error("Invalid cameras data: expected array");
    if (typeof logs.data !== "object" || Array.isArray(logs.data)) throw new Error("Invalid state data: expected object");
    fs.writeFileSync(CAMERAS_PATH, JSON.stringify(cams.data, null, 2));
    saveLog(logs.data);
    return { content: [{ type: "text", text: JSON.stringify({ success: true, cameras: cams.data.length, source: GITHUB_RAW_BASE }) }] };
  } catch (e) { return { content: [{ type: "text", text: `Sync failed: ${e.message}` }], isError: true }; }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Open Eagle Eye v${VERSION}`);
}

main().catch(console.error);
