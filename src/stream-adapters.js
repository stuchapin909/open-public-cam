/**
 * stream-adapters.js — Protocol-aware frame extraction for diverse webcam technologies.
 *
 * Each adapter extracts a single JPEG frame from a specific streaming protocol.
 * The unified `extractFrame()` function auto-detects the protocol and dispatches
 * to the right adapter. Output is always: { buf: Buffer, contentType: "image/jpeg" }
 *
 * Supported protocols:
 *   - HLS  (.m3u8 playlists)  → ffmpeg
 *   - RTSP (IP cameras)       → ffmpeg
 *   - RTMP (legacy streams)   → ffmpeg
 *   - YouTube Live            → yt-dlp + ffmpeg
 *   - MJPEG (already in server.js, re-exported here for completeness)
 *   - Static JPEG/PNG refresh (periodic URL — already handled by core)
 */

import { execFile } from "child_process";
import { promisify } from "util";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.join(os.homedir(), ".openeagleeye");
const SNAPSHOTS_DIR = path.join(CACHE_DIR, "snapshots");

fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const YTDLP_PATH = process.env.YT_DLP_PATH || "yt-dlp";

const FRAME_TIMEOUT_MS = 15000;

/**
 * Detect the streaming protocol from a URL string.
 * Returns one of: "hls", "rtsp", "rtmp", "youtube", "mjpeg_hint", "static"
 */
export function detectProtocol(url) {
  if (!url || typeof url !== "string") return "static";

  const lower = url.toLowerCase();

  if (lower.includes(".m3u8") || lower.includes("/hls/") || lower.includes("manifest(format=m3u8")) {
    return "hls";
  }
  if (lower.startsWith("rtsp://")) {
    return "rtsp";
  }
  if (lower.startsWith("rtmp://") || lower.startsWith("rtmps://")) {
    return "rtmp";
  }
  if (
    lower.includes("youtube.com/watch") ||
    lower.includes("youtu.be/") ||
    lower.includes("youtube.com/live") ||
    lower.includes("youtube.com/embed")
  ) {
    return "youtube";
  }
  if (lower.includes("/mjpg/") || lower.includes("/mjpeg") || lower.includes("mjpg/video")) {
    return "mjpeg_hint";
  }

  return "static";
}

function tmpFramePath() {
  return path.join(SNAPSHOTS_DIR, `${crypto.randomBytes(8).toString("hex")}.jpg`);
}

/**
 * Extract a single frame from an HLS stream (.m3u8).
 * Uses ffmpeg to download one segment and pull the last frame from it.
 */
export async function extractHlsFrame(url, timeoutMs = FRAME_TIMEOUT_MS) {
  const outPath = tmpFramePath();

  try {
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
      "-i", url,
      "-frames:v", "1",
      "-q:v", "2",
      "-update", "1",
      outPath,
    ], { timeout: timeoutMs });

    const buf = fs.readFileSync(outPath);
    fs.unlinkSync(outPath);

    if (buf.length < 500) return null;
    return { buf, contentType: "image/jpeg" };
  } catch (e) {
    try { fs.unlinkSync(outPath); } catch {}
    return null;
  }
}

/**
 * Extract a single frame from an RTSP stream.
 * Uses ffmpeg with TCP transport (more reliable than UDP for public cameras).
 */
export async function extractRtspFrame(url, timeoutMs = FRAME_TIMEOUT_MS) {
  const outPath = tmpFramePath();

  try {
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-rtsp_transport", "tcp",
      "-i", url,
      "-frames:v", "1",
      "-q:v", "2",
      "-update", "1",
      outPath,
    ], { timeout: timeoutMs });

    const buf = fs.readFileSync(outPath);
    fs.unlinkSync(outPath);

    if (buf.length < 500) return null;
    return { buf, contentType: "image/jpeg" };
  } catch (e) {
    try { fs.unlinkSync(outPath); } catch {}
    return null;
  }
}

/**
 * Extract a single frame from an RTMP stream.
 */
export async function extractRtmpFrame(url, timeoutMs = FRAME_TIMEOUT_MS) {
  const outPath = tmpFramePath();

  try {
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i", url,
      "-frames:v", "1",
      "-q:v", "2",
      "-update", "1",
      outPath,
    ], { timeout: timeoutMs });

    const buf = fs.readFileSync(outPath);
    fs.unlinkSync(outPath);

    if (buf.length < 500) return null;
    return { buf, contentType: "image/jpeg" };
  } catch (e) {
    try { fs.unlinkSync(outPath); } catch {}
    return null;
  }
}

/**
 * Extract a single frame from a YouTube Live stream.
 * Step 1: yt-dlp resolves the actual stream URL
 * Step 2: ffmpeg extracts one frame from it
 *
 * Falls back to yt-dlp thumbnail extraction if stream grab fails.
 */
export async function extractYoutubeFrame(url, timeoutMs = FRAME_TIMEOUT_MS) {
  const outPath = tmpFramePath();

  try {
    const baseArgs = ["--no-warnings", "-f", "best[ext=mp4]/best", "--get-url", url];

    let stdout;
    try {
      const result = await execFileAsync(YTDLP_PATH, baseArgs, { timeout: timeoutMs });
      stdout = result.stdout;
    } catch (e) {
      // YouTube bot-check: retry with browser cookies
      if (e.stderr?.includes("Sign in to confirm") || e.stderr?.includes("bot")) {
        const cookieResult = await execFileAsync(YTDLP_PATH, [
          "--no-warnings", "--cookies-from-browser", "chrome",
          "-f", "best[ext=mp4]/best", "--get-url", url,
        ], { timeout: timeoutMs }).catch(() => null);
        if (cookieResult) {
          stdout = cookieResult.stdout;
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    const streamUrl = stdout.trim().split("\n")[0];
    if (!streamUrl) {
      return await extractYoutubeThumbnail(url, outPath, timeoutMs);
    }

    // Extract one frame from the resolved stream URL
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i", streamUrl,
      "-frames:v", "1",
      "-q:v", "2",
      "-update", "1",
      outPath,
    ], { timeout: timeoutMs });

    const buf = fs.readFileSync(outPath);
    fs.unlinkSync(outPath);

    if (buf.length < 500) return null;
    return { buf, contentType: "image/jpeg" };
  } catch (e) {
    try { fs.unlinkSync(outPath); } catch {}
    return await extractYoutubeThumbnail(url, outPath, timeoutMs);
  }
}

/**
 * Fallback: grab the YouTube thumbnail instead of the live frame.
 * Not as current as a live frame, but works when yt-dlp can't get the stream.
 */
async function extractYoutubeThumbnail(url, outPath, timeoutMs) {
  const basePath = outPath.replace(".jpg", "");
  try {
    await execFileAsync(YTDLP_PATH, [
      "--no-warnings",
      "--write-thumbnail",
      "--skip-download",
      "--convert-thumbnails", "jpg",
      "-o", basePath,
      url,
    ], { timeout: timeoutMs });

    // yt-dlp may write thumbnails with various extensions/suffixes.
    // Check known patterns, then glob for anything matching the base name.
    const candidates = [
      `${basePath}.jpg`,
      outPath,
      `${basePath}.webp`,
      `${basePath}.png`,
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        fs.unlinkSync(p);
        if (buf.length < 500) continue;
        return { buf, contentType: "image/jpeg" };
      }
    }

    // Glob-based fallback: clean up any files yt-dlp may have written
    const dir = path.dirname(basePath);
    const prefix = path.basename(basePath);
    try {
      const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix));
      for (const f of files) {
        const fullPath = path.join(dir, f);
        const buf = fs.readFileSync(fullPath);
        fs.unlinkSync(fullPath);
        if (buf.length >= 500) return { buf, contentType: "image/jpeg" };
      }
    } catch {}

    return null;
  } catch {
    // Clean up any partial thumbnail files
    try {
      const dir = path.dirname(basePath);
      const prefix = path.basename(basePath);
      const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix));
      for (const f of files) fs.unlinkSync(path.join(dir, f));
    } catch {}
    return null;
  }
}

/**
 * Check if ffmpeg is available on the system.
 */
export async function checkFfmpeg() {
  try {
    const { stdout } = await execFileAsync(FFMPEG_PATH, ["-version"], { timeout: 5000 });
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    return { available: true, version: versionMatch?.[1] || "unknown", path: FFMPEG_PATH };
  } catch {
    return { available: false, version: null, path: FFMPEG_PATH };
  }
}

/**
 * Check if yt-dlp is available on the system.
 */
export async function checkYtdlp() {
  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, ["--version"], { timeout: 5000 });
    return { available: true, version: stdout.trim(), path: YTDLP_PATH };
  } catch {
    return { available: false, version: null, path: YTDLP_PATH };
  }
}

/**
 * Unified frame extraction: auto-detect protocol and dispatch to the right adapter.
 *
 * @param {string} url - The camera/stream URL
 * @param {string} [protocolHint] - Override auto-detection ("hls", "rtsp", "rtmp", "youtube")
 * @param {number} [timeoutMs] - Timeout in milliseconds (default 15000)
 * @returns {{ buf: Buffer, contentType: string, protocol: string } | null}
 */
export async function extractFrame(url, protocolHint, timeoutMs = FRAME_TIMEOUT_MS) {
  const protocol = protocolHint || detectProtocol(url);

  let result = null;

  switch (protocol) {
    case "hls":
      result = await extractHlsFrame(url, timeoutMs);
      break;
    case "rtsp":
      result = await extractRtspFrame(url, timeoutMs);
      break;
    case "rtmp":
      result = await extractRtmpFrame(url, timeoutMs);
      break;
    case "youtube":
      result = await extractYoutubeFrame(url, timeoutMs);
      break;
    case "mjpeg_hint":
      // Caller should use the existing MJPEG extraction in server.js.
      // This is just a signal that the URL looks like MJPEG.
      return null;
    case "static":
    default:
      // Caller should use the existing axios-based download in server.js.
      return null;
  }

  if (result) {
    result.protocol = protocol;
  }

  return result;
}

/**
 * Probe a URL to determine its stream type by making a HEAD/short GET request.
 * More reliable than URL pattern matching alone.
 *
 * Returns: { protocol: string, contentType: string, details: string }
 */
export async function probeUrl(url) {
  const urlProto = detectProtocol(url);

  // Non-HTTP protocols can't be probed via HTTP
  if (urlProto === "rtsp" || urlProto === "rtmp") {
    return { protocol: urlProto, contentType: null, details: `${urlProto.toUpperCase()} stream (detected from URL scheme)` };
  }
  if (urlProto === "youtube") {
    return { protocol: "youtube", contentType: null, details: "YouTube video/stream (detected from URL)" };
  }

  // For HTTP(S) URLs, do a short GET to inspect content-type
  try {
    const mod = url.startsWith("https") ? https : http;

    return new Promise((resolve) => {
      const req = mod.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OpenEagleEye/1.0)",
          "Accept": "*/*",
        },
        timeout: 5000,
      }, (res) => {
        const ct = res.headers["content-type"] || "";
        const ctLower = ct.toLowerCase();
        res.destroy();

        if (ctLower.includes("multipart/x-mixed-replace") || ctLower.includes("multipart/mixed")) {
          resolve({ protocol: "mjpeg", contentType: ct, details: "MJPEG multipart stream" });
        } else if (ctLower.includes("application/vnd.apple.mpegurl") || ctLower.includes("application/x-mpegurl") || ctLower.includes("audio/mpegurl")) {
          resolve({ protocol: "hls", contentType: ct, details: "HLS playlist (.m3u8)" });
        } else if (ctLower.includes("image/jpeg") || ctLower.includes("image/png")) {
          resolve({ protocol: "static", contentType: ct, details: "Static image (direct JPEG/PNG)" });
        } else if (ctLower.includes("text/html")) {
          resolve({ protocol: "page", contentType: ct, details: "HTML page (may need scraping or embed extraction)" });
        } else if (ctLower.includes("application/dash+xml")) {
          resolve({ protocol: "dash", contentType: ct, details: "DASH manifest (MPD)" });
        } else {
          resolve({ protocol: "unknown", contentType: ct, details: `Unknown content-type: ${ct}` });
        }
      });

      req.on("error", () => {
        resolve({ protocol: "error", contentType: null, details: "Connection failed" });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({ protocol: "error", contentType: null, details: "Connection timed out" });
      });
    });
  } catch (e) {
    return { protocol: "error", contentType: null, details: e.message };
  }
}
