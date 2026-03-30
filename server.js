#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import dns from "dns/promises";
import { execSync } from "child_process";

const CACHE_DIR = path.join(os.homedir(), ".openeagleeye");
const CAMERAS_PATH = path.join(CACHE_DIR, "cameras.json");
const LOCAL_CAMERAS_PATH = path.join(CACHE_DIR, "local-cameras.json");
const LOG_PATH = path.join(CACHE_DIR, ".registry-state.json");
const SNAPSHOTS_DIR = path.join(CACHE_DIR, "snapshots");
const USER_CONFIG_PATH = path.join(CACHE_DIR, "config.json");

// Renamed to Open Eagle Eye, npm: openeagleeye
const VERSION = "8.0.0";

// GitHub repo for issue submissions
const GITHUB_REPO = "stuchapin909/Open-Eagle-Eye";

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const server = new McpServer({ name: "openeagleeye", version: VERSION });

// --- Load cameras (upstream) + local ---
let cameras = [];
try {
  cameras = JSON.parse(fs.readFileSync(CAMERAS_PATH, "utf8"));
  if (!Array.isArray(cameras)) cameras = [];
} catch (e) {
  console.error(`[server] Warning: Could not load ${CAMERAS_PATH}: ${e.message}`);
}

let localCameras = [];
try {
  localCameras = JSON.parse(fs.readFileSync(LOCAL_CAMERAS_PATH, "utf8"));
  if (!Array.isArray(localCameras)) localCameras = [];
} catch (e) {
  // No local cameras file yet — that's fine
}

// Merged view: upstream + local
const allCameras = [...cameras, ...localCameras.map(c => ({ ...c, source: "local" }))];

function saveLocalCameras() {
  fs.writeFileSync(LOCAL_CAMERAS_PATH, JSON.stringify(localCameras, null, 2));
}

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
  return allCameras.find(c => c.id === idOrUrl || c.url === idOrUrl);
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"];
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal', 'metadata.goog',
  '169.254.169.254', 'metadata.amazonaws.com',
  '100.100.100.200', 'fd00:ec2::254',
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
    if (a === 192 && b === 0 && Number(v4[4]) <= 2) return true;
  }
  if (clean === '::1' || clean === '::') return true;
  if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80')) return true;
  if (clean.startsWith('::ffff:127.') || clean.startsWith('::ffff:10.') || clean.startsWith('::ffff:192.168.')) return true;
  return false;
}

async function isSafeUrl(urlStr) {
  let url;
  try { url = new URL(urlStr); } catch { return { safe: false, reason: "Invalid URL" }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { safe: false, reason: `Blocked protocol: ${url.protocol}` };
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') return { safe: false, reason: "Blocked: localhost" };
  if (BLOCKED_HOSTNAMES.some(h => hostname === h || hostname.endsWith('.' + h))) return { safe: false, reason: "Blocked: cloud metadata endpoint" };
  try {
    const rawHost = hostname.replace(/^\[|\]$/g, '');
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawHost) || rawHost.includes(':')) {
      if (isPrivateIP(rawHost)) return { safe: false, reason: `Blocked: private/reserved IP ${hostname}` };
      return { safe: true };
    }
    const addrs4 = await dns.resolve4(hostname).catch(() => []);
    const addrs6 = await dns.resolve6(hostname).catch(() => []);
    if (addrs4.length === 0 && addrs6.length === 0) return { safe: false, reason: `Cannot resolve: ${hostname}` };
    for (const ip of [...addrs4, ...addrs6]) {
      if (isPrivateIP(ip)) return { safe: false, reason: `Blocked: ${hostname} resolves to private IP ${ip}` };
    }
    return { safe: true };
  } catch (e) { return { safe: false, reason: `DNS error: ${e.message.substring(0, 80)}` }; }
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
  'Accept': 'image/jpeg,image/png,image/*;q=0.5,*/*;q=0.1',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site'
};

// Per-domain extra headers for hosts that require Referer or other special headers
const DOMAIN_HEADERS = {
  'webcams.transport.nsw.gov.au': { 'Referer': 'https://www.livetraffic.com/traffic-cameras' },
};

function getHeadersForUrl(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname;
    return { ...HUMAN_HEADERS, ...(DOMAIN_HEADERS[hostname] || {}) };
  } catch {
    return HUMAN_HEADERS;
  }
}

// --- Magic byte detection for CDNs that return wrong content-type ---
function detectImageType(buffer) {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "image/png";
  return null;
}

async function validateImageUrl(url) {
  try {
    const resp = await axios.get(url, { timeout: 5000, headers: getHeadersForUrl(url), responseType: 'stream' });
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
    return { url: cam.url, headers: getHeadersForUrl(cam.url) };
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
  const headers = getHeadersForUrl(cam.url);

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

// --- SNAPSHOT ---
server.tool(
  "get_snapshot",
  "Fetch a live image from a camera. Downloads the image to disk and returns the file path. Works on both upstream registry cameras and locally-added cameras. Use list_cameras or search_cameras first to find IDs.",
  { cam_id: z.string().describe("Camera ID (from list_cameras/search_cameras), or a direct image URL") },
  async ({ cam_id }) => {
    const cam = findWebcam(cam_id);
    if (!cam) return { content: [{ type: "text", text: JSON.stringify({ error: "Camera not found", cam_id }) }], isError: true };

    const config = buildRequestConfig(cam);
    if (config.error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "API key required", details: config.error, camera: cam.name }) }], isError: true };
    }

    // SSRF check
    const safety = await isSafeUrl(config.url);
    if (!safety.safe) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Blocked", reason: safety.reason, camera: cam.name }) }], isError: true };
    }

    // Random filename to prevent path prediction
    const filename = `${crypto.randomBytes(8).toString('hex')}.jpg`;
    const fullPath = path.join(SNAPSHOTS_DIR, filename);

    try {
      const response = await axios.get(config.url, { responseType: 'arraybuffer', timeout: 10000, headers: config.headers, maxContentLength: 5 * 1024 * 1024, maxBodyLength: 5 * 1024 * 1024, maxRedirects: 1 });
      let ct = response.headers['content-type'] || "";
      // Strict content-type: only jpeg and png
      let isAllowed = ALLOWED_CONTENT_TYPES.some(t => ct.includes(t));
      // Fallback: check magic bytes for CDNs with wrong content-type
      const buf = Buffer.from(response.data);
      if (!isAllowed) {
        const detected = detectImageType(buf);
        if (detected) {
          isAllowed = true;
          ct = detected;
        }
      }
      if (!isAllowed) throw new Error(`Rejected content-type: ${ct} (only image/jpeg and image/png allowed)`);
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

// --- REGISTRY ---
server.tool("list_cameras",  "Browse the camera registry. Returns cameras with id, name, city, location, category, coordinates, and source (upstream or local). Use the city filter to narrow results — the full registry is large.",{ city: z.string().optional().describe("Filter by city name (e.g. 'London', 'New York', 'Sydney')"),
  location: z.string().optional().describe("Filter by location string (e.g. 'Manhattan', 'Borough')"),
  category: z.string().optional().describe("Filter by category: city, park, highway, airport, port, weather, nature, landmark, other") }, async ({ city, location, category }) => {
  if (allCameras.length === 0) return { content: [{ type: "text", text: JSON.stringify({ version: VERSION, total: 0, cameras: [], message: "Registry is empty." }) }] };

  const logs = getValidationLog();
  let filtered = allCameras;
  if (city) filtered = filtered.filter(c => (c.city || "").toLowerCase() === city.toLowerCase());
  if (location) filtered = filtered.filter(c => (c.location || "").toLowerCase().includes(location.toLowerCase()));
  if (category) filtered = filtered.filter(c => (c.category || "") === category);

  const result = filtered.map(c => ({
    id: c.id,
    name: c.name,
    city: c.city || null,
    location: c.location || "Unknown",
    category: c.category || "other",
    timezone: c.timezone || null,
    coordinates: c.coordinates || null,
    verified: c.verified || false,
    status: logs[c.id]?.status || "active",
    source: c.source || "upstream",
    auth_required: c.auth?.key_required || false,
  }));

  const cities = {};
  for (const c of allCameras) { const city = c.city || "Unknown"; cities[city] = (cities[city] || 0) + 1; }

  return { content: [{ type: "text", text: JSON.stringify({ version: VERSION, total: allCameras.length, shown: result.length, cities, cameras: result }, null, 2) }] };
});

server.tool("search_cameras", "Search cameras by text. Matches against name, location, and category. Use when looking for cameras in a specific place or of a specific type.", { query: z.string().describe("Search term — matches camera name, location, and category") }, async ({ query }) => {
  const q = query.toLowerCase();
  const results = allCameras.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.location || "").toLowerCase().includes(q) ||
    (c.category || "").toLowerCase().includes(q)
  );
  if (results.length === 0) return { content: [{ type: "text", text: JSON.stringify({ query, total: 0, cameras: [] }) }] };
  const mapped = results.map(c => ({
    id: c.id,
    name: c.name,
    city: c.city || null,
    location: c.location || "Unknown",
    category: c.category || "other",
    timezone: c.timezone || null,
    coordinates: c.coordinates || null,
    verified: c.verified || false,
    source: c.source || "upstream",
    auth_required: c.auth?.key_required || false,
  }));
  return { content: [{ type: "text", text: JSON.stringify({ query, total: mapped.length, cameras: mapped }, null, 2) }] };
});

// --- LOCAL CAMERAS ---
server.tool("add_local_camera", "Add a camera to your local collection. Local cameras persist in ~/.openeagleeye/local-cameras.json and survive restarts and registry updates. They appear in list_cameras and search_cameras with source 'local'. Share upstream anytime with submit_local.", {
  name: z.string().describe("Human-readable camera name"),
  url: z.string().url().describe("Direct image URL — must return JPEG or PNG on HTTP GET"),
  city: z.string().describe("City name (e.g. 'London', 'New York', 'Sydney')"),
  location: z.string().describe("Location description (e.g. 'Manhattan, New York, USA')"),
  timezone: z.string().describe("IANA timezone (e.g. 'America/New_York', 'Europe/London')"),
  category: z.enum(["city", "park", "highway", "airport", "port", "weather", "nature", "landmark", "other"]).optional().describe("Camera category"),
  lat: z.number().min(-90).max(90).optional().describe("Latitude of the camera"),
  lng: z.number().min(-180).max(180).optional().describe("Longitude of the camera"),
  auth_provider: z.string().optional().describe("Provider name if API key is needed (e.g. 'Transport for London')"),
  auth_signup_url: z.string().optional().describe("URL to register for API key"),
  auth_key_required: z.boolean().optional().describe("Whether the image URL requires an API key at fetch time"),
  auth_key_type: z.enum(["query_params", "header"]).optional().describe("How to inject the key"),
  auth_key_names: z.array(z.string()).optional().describe("Query param or header names for the key"),
  auth_config_key: z.string().optional().describe("Key name to use in ~/.openeagleeye/config.json"),
  auth_note: z.string().optional().describe("Notes about authentication"),
}, async (params) => {
  const { auth_provider, auth_signup_url, auth_key_required, auth_key_type, auth_key_names, auth_config_key, auth_note, lat, lng, ...camFields } = params;

  const id = `local-${Date.now()}`;

  const entry = {
    ...camFields,
    id,
    verified: false,
    added_at: new Date().toISOString(),
  };

  if (lat !== undefined && lng !== undefined) {
    entry.coordinates = { lat, lng };
  }

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

  localCameras.push(entry);
  allCameras.push({ ...entry, source: "local" });
  saveLocalCameras();
  return { content: [{ type: "text", text: JSON.stringify({ success: true, id, name: camFields.name, url: camFields.url, source: "local", auth_required: entry.auth?.key_required || false, message: "Camera added locally. Test with get_snapshot, share upstream with submit_local." }) }] };
});

// LIST LOCAL
server.tool("list_local", "Show your locally-added cameras. These are cameras you added via add_local_camera that are not in the upstream registry.", {}, async () => {
  if (localCameras.length === 0) return { content: [{ type: "text", text: JSON.stringify({ total: 0, cameras: [], message: "No local cameras. Use add_local_camera to add cameras." }) }] };
  const result = localCameras.map(c => ({
    id: c.id,
    name: c.name,
    url: c.url,
    city: c.city || null,
    location: c.location || "Unknown",
    category: c.category || "other",
    timezone: c.timezone || null,
    coordinates: c.coordinates || null,
    auth_required: c.auth?.key_required || false,
    added_at: c.added_at || null,
  }));
  return { content: [{ type: "text", text: JSON.stringify({ total: localCameras.length, cameras: result }, null, 2) }] };
});

// REMOVE LOCAL
server.tool("remove_local", "Delete a locally-added camera. Use if the camera URL no longer works, or after sharing it upstream.", {
  cam_id: z.string().describe("Local camera ID (starts with 'local-')")
}, async ({ cam_id }) => {
  const idx = localCameras.findIndex(c => c.id === cam_id);
  if (idx === -1) return { content: [{ type: "text", text: JSON.stringify({ error: "Local camera not found", cam_id }) }], isError: true };

  const removed = localCameras.splice(idx, 1)[0];
  const mergedIdx = allCameras.findIndex(c => c.id === cam_id);
  if (mergedIdx !== -1) allCameras.splice(mergedIdx, 1);
  saveLocalCameras();
  return { content: [{ type: "text", text: JSON.stringify({ success: true, removed: { id: removed.id, name: removed.name } }) }] };
});

// SUBMIT LOCAL
server.tool("submit_local", "Share your locally-added cameras with the upstream Open Eagle Eye registry by filing a GitHub issue. Requires the 'gh' CLI installed and authenticated (gh auth login). Your local cameras are not removed — use remove_local after they are accepted.", {}, async () => {
  if (localCameras.length === 0) return { content: [{ type: "text", text: JSON.stringify({ error: "No local cameras to submit. Use add_local_camera to add cameras first." }) }], isError: true };

  try {
    execSync("gh auth status", { stdio: "pipe", timeout: 5000 });
  } catch {
    return { content: [{ type: "text", text: JSON.stringify({
      error: "gh CLI not found or not authenticated",
      fix: "Install: https://cli.github.com/ — then run: gh auth login",
      message: "Local cameras are saved. Install gh and authenticate, then retry."
    }) }], isError: true };
  }

  // Strip local-internal fields for submission
  const cleanCameras = localCameras.map(c => {
    const { added_at, ...clean } = c;
    return clean;
  });

  const body = [
    "## New Camera Submission",
    "",
    `${cleanCameras.length} camera(s) submitted via Open Eagle Eye MCP server.`,
    "",
    "```json",
    JSON.stringify(cleanCameras, null, 2),
    "```",
    "",
    "---",
    "*Submitted automatically from openeagleeye v" + VERSION + "*"
  ].join("\n");

  const title = `New camera submission: ${cleanCameras.length} camera(s) from ${cleanCameras[0]?.city || "unknown"}`;

  try {
    const result = execSync(
      `gh issue create --repo ${GITHUB_REPO} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --label "new-camera"`,
      { encoding: "utf8", timeout: 30000 }
    ).trim();

    return { content: [{ type: "text", text: JSON.stringify({
      success: true,
      submitted: cleanCameras.length,
      issue_url: result,
      message: `Submitted ${cleanCameras.length} camera(s). Your local cameras are unchanged — use remove_local after they are accepted upstream.`
    }) }] };
  } catch (e) {
    return { content: [{ type: "text", text: JSON.stringify({ error: "Failed to create GitHub issue", details: e.message.substring(0, 200) }) }], isError: true };
  }
});

// REPORT CAMERA
server.tool("report_camera", "Report a broken or low-quality camera. Files a GitHub issue and saves the report locally. If the camera is local with a broken link, it is automatically removed. Requires 'gh' CLI for GitHub issue creation.", {
  cam_id: z.string().describe("Camera ID to report"),
  status: z.enum(["offline", "broken_link", "low_quality"]).describe("Type of issue"),
  notes: z.string().optional().describe("Additional details about the issue")
}, async ({ cam_id, status, notes }) => {
  const cam = findWebcam(cam_id);
  if (!cam) return { content: [{ type: "text", text: JSON.stringify({ error: "Camera not found", cam_id }) }], isError: true };
  if (cam.source === "local" && isNighttimeAt(cam.timezone)) return { content: [{ type: "text", text: JSON.stringify({ error: "Report blocked: nighttime at camera location", camera: cam.name, timezone: cam.timezone }) }], isError: true };

  // Save locally regardless
  const logs = getValidationLog();
  logs[cam_id] = { status, notes, timestamp: new Date().toISOString() };
  saveLog(logs);

  // If it's a local camera marked broken_link, auto-remove
  if (cam.source === "local" && status === "broken_link") {
    const idx = localCameras.findIndex(c => c.id === cam_id);
    if (idx !== -1) {
      localCameras.splice(idx, 1);
      const mergedIdx = allCameras.findIndex(c => c.id === cam_id);
      if (mergedIdx !== -1) allCameras.splice(mergedIdx, 1);
      saveLocalCameras();
    }
  }

  try {
    execSync("gh auth status", { stdio: "pipe", timeout: 5000 });
  } catch {
    return { content: [{ type: "text", text: JSON.stringify({
      success: true,
      saved_locally: true,
      github_error: "gh CLI not found or not authenticated",
      fix: "Install: https://cli.github.com/ — then run: gh auth login",
      message: "Report saved locally. Install gh to also file a GitHub issue."
    }) }] };
  }

  const body = [
    "## Webcam Issue Report",
    "",
    `**Camera:** ${cam.name} (\`${cam.id}\`)`,
    `**Status:** ${status}`,
    `**Location:** ${cam.location || "Unknown"}`,
    `**URL:** ${cam.url}`,
    notes ? `**Notes:** ${notes}` : "",
    "",
    "---",
    "*Reported via openeagleeye v" + VERSION + "*"
  ].filter(Boolean).join("\n");

  const title = `Camera issue [${status}]: ${cam.name}`;

  try {
    const result = execSync(
      `gh issue create --repo ${GITHUB_REPO} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --label "camera-issue"`,
      { encoding: "utf8", timeout: 30000 }
    ).trim();

    return { content: [{ type: "text", text: JSON.stringify({
      success: true,
      saved_locally: true,
      issue_url: result,
      camera: { id: cam.id, name: cam.name },
      status,
      message: "Report saved locally and filed as a GitHub issue."
    }) }] };
  } catch (e) {
    return { content: [{ type: "text", text: JSON.stringify({
      success: true,
      saved_locally: true,
      github_error: "Failed to create GitHub issue",
      details: e.message.substring(0, 200),
      message: "Report saved locally but could not file a GitHub issue."
    }) }] };
  }
});

// --- CONFIG ---
server.tool("check_config", "Show API key configuration. Lists cameras that require authentication and whether the required keys are set in ~/.openeagleeye/config.json. Use when a snapshot fails with an API key error.", {}, async () => {
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Open Eagle Eye v${VERSION}`);
}

main().catch(console.error);
