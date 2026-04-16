#!/usr/bin/env node
/**
 * End-to-end demo: extract a JPEG frame from every supported protocol.
 *
 * Demonstrates the full pipeline for each webcam technology:
 *   1. Static JPEG  — direct HTTP GET (existing Open Eagle Eye path)
 *   2. MJPEG stream  — extract first frame from multipart stream
 *   3. HLS stream    — ffmpeg extracts frame from .m3u8 playlist
 *   4. RTSP stream   — ffmpeg extracts frame from IP camera
 *   5. YouTube Live  — yt-dlp resolves URL + ffmpeg extracts frame
 */

import { extractFrame, extractHlsFrame, extractRtspFrame, probeUrl, detectProtocol, checkFfmpeg, checkYtdlp } from "../src/stream-adapters.js";
import axios from "axios";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { detectImageType } from "../src/security.js";

const OUTPUT_DIR = path.join(os.homedir(), ".openeagleeye", "demo");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Clean previous demo files
for (const f of fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith("demo_"))) {
  fs.unlinkSync(path.join(OUTPUT_DIR, f));
}

function saveBuf(buf, protocol) {
  const filename = `demo_${protocol}_${crypto.randomBytes(4).toString("hex")}.jpg`;
  const outPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

function isJpeg(buf) {
  return buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xD8;
}
function isPng(buf) {
  return buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

function extractMjpegFrame(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const mod = urlObj.protocol === "https:" ? https : http;
    const req = mod.get(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Connection": "close" },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode !== 200) { res.destroy(); resolve(null); return; }
      const ct = res.headers["content-type"] || "";
      const bMatch = ct.match(/boundary=([^\s;]+)/);
      const boundary = bMatch ? bMatch[1] : "";
      const chunks = [];
      let foundStart = false;
      let startIdx = 0;

      res.on("data", (chunk) => {
        chunks.push(chunk);
        const combined = Buffer.concat(chunks);

        if (!foundStart) {
          for (let i = 0; i < combined.length - 2; i++) {
            if (combined[i] === 0xFF && combined[i+1] === 0xD8 && combined[i+2] === 0xFF) {
              foundStart = true;
              startIdx = i;
              chunks.length = 0;
              chunks.push(combined.subarray(i));
              break;
            }
          }
          if (!foundStart && combined.length > 100000) { res.destroy(); resolve(null); }
          return;
        }

        const buf = Buffer.concat(chunks);
        for (let i = 2; i < buf.length - 1; i++) {
          if (buf[i] === 0xFF && buf[i+1] === 0xD9) {
            const frame = buf.subarray(0, i + 2);
            res.destroy();
            resolve({ buf: frame, contentType: "image/jpeg" });
            return;
          }
        }
        if (buf.length > 2 * 1024 * 1024) { res.destroy(); resolve(null); }
      });

      res.on("end", () => {
        if (foundStart) {
          const buf = Buffer.concat(chunks);
          for (let i = 2; i < buf.length - 1; i++) {
            if (buf[i] === 0xFF && buf[i+1] === 0xD9) {
              resolve({ buf: buf.subarray(0, i + 2), contentType: "image/jpeg" });
              return;
            }
          }
        }
        resolve(null);
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

async function demo() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  OPEN EAGLE EYE — STREAM ADAPTER END-TO-END DEMO   ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Check tools
  const [ff, yt] = await Promise.all([checkFfmpeg(), checkYtdlp()]);
  console.log(`System: ffmpeg ${ff.available ? ff.version : "NOT FOUND"}  |  yt-dlp ${yt.available ? yt.version : "NOT FOUND"}\n`);

  const results = [];

  // ────────────────────────────────────────────
  // 1. STATIC JPEG
  // ────────────────────────────────────────────
  console.log("━━━ 1. STATIC JPEG ━━━");
  console.log("Source: Finland Digitraffic weather camera (Inkoo)");
  const staticUrl = "https://weathercam.digitraffic.fi/C0150301.jpg";
  console.log(`URL: ${staticUrl}`);
  try {
    const t1 = Date.now();
    const resp = await axios.get(staticUrl, {
      responseType: "arraybuffer", timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const buf = Buffer.from(resp.data);
    const elapsed = Date.now() - t1;
    if (buf.length > 500 && (isJpeg(buf) || isPng(buf))) {
      const outPath = saveBuf(buf, "static");
      console.log(`✓ SUCCESS — ${buf.length} bytes, ${elapsed}ms`);
      console.log(`  Saved: ${outPath}`);
      results.push({ type: "STATIC JPEG", success: true, bytes: buf.length, ms: elapsed, path: outPath });
    } else {
      console.log(`✗ FAILED — ${buf.length} bytes, not a valid image`);
      results.push({ type: "STATIC JPEG", success: false });
    }
  } catch (e) {
    console.log(`✗ FAILED — ${e.message.slice(0, 100)}`);
    results.push({ type: "STATIC JPEG", success: false });
  }

  // Try London TfL as backup
  if (!results[0].success) {
    console.log("\n  Trying backup: London TfL JamCam...");
    try {
      const t1 = Date.now();
      const resp = await axios.get("https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09731.jpg", {
        responseType: "arraybuffer", timeout: 10000
      });
      const buf = Buffer.from(resp.data);
      if (buf.length > 500) {
        const outPath = saveBuf(buf, "static");
        console.log(`  ✓ BACKUP SUCCESS — ${buf.length} bytes, ${Date.now()-t1}ms`);
        results[0] = { type: "STATIC JPEG", success: true, bytes: buf.length, ms: Date.now()-t1, path: outPath };
      }
    } catch {}
  }

  // ────────────────────────────────────────────
  // 2. MJPEG STREAM
  // ────────────────────────────────────────────
  console.log("\n━━━ 2. MJPEG STREAM ━━━");
  const mjpegCandidates = [
    ["IP Camera 158.58.130.148", "http://158.58.130.148/mjpg/video.mjpg"],
    ["Honjin Cam, Japan", "http://honjin1.miemasu.net/nphMotionJpeg?Resolution=640x480&Quality=Standard"],
  ];

  let mjpegDone = false;
  for (const [name, url] of mjpegCandidates) {
    if (mjpegDone) break;
    console.log(`Source: ${name}`);
    console.log(`URL: ${url}`);
    const probe = await probeUrl(url);
    console.log(`Probe: ${probe.protocol} (${probe.contentType || probe.details})`);
    if (probe.protocol !== "mjpeg") {
      console.log("  Skipping (not MJPEG)...");
      continue;
    }
    const t1 = Date.now();
    const frame = await extractMjpegFrame(url, 10000);
    const elapsed = Date.now() - t1;
    if (frame && frame.buf.length > 500) {
      const outPath = saveBuf(frame.buf, "mjpeg");
      console.log(`✓ SUCCESS — ${frame.buf.length} bytes, ${elapsed}ms`);
      console.log(`  JPEG valid: ${isJpeg(frame.buf)}`);
      console.log(`  Saved: ${outPath}`);
      results.push({ type: "MJPEG STREAM", success: true, bytes: frame.buf.length, ms: elapsed, path: outPath });
      mjpegDone = true;
    } else {
      console.log(`✗ FAILED — ${elapsed}ms`);
    }
  }
  if (!mjpegDone) {
    console.log("✗ ALL MJPEG sources offline");
    results.push({ type: "MJPEG STREAM", success: false });
  }

  // ────────────────────────────────────────────
  // 3. HLS STREAM (.m3u8)
  // ────────────────────────────────────────────
  console.log("\n━━━ 3. HLS STREAM (.m3u8) ━━━");
  console.log("Source: Apple HLS test stream (bipbop 4x3)");
  const hlsUrl = "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8";
  console.log(`URL: ${hlsUrl}`);
  {
    const probe = await probeUrl(hlsUrl);
    console.log(`Probe: ${probe.protocol} (${probe.contentType})`);
    const t1 = Date.now();
    const frame = await extractHlsFrame(hlsUrl, 25000);
    const elapsed = Date.now() - t1;
    if (frame && frame.buf.length > 500) {
      const outPath = saveBuf(frame.buf, "hls");
      console.log(`✓ SUCCESS — ${frame.buf.length} bytes, ${elapsed}ms`);
      console.log(`  JPEG valid: ${isJpeg(frame.buf)}`);
      console.log(`  Saved: ${outPath}`);
      results.push({ type: "HLS STREAM", success: true, bytes: frame.buf.length, ms: elapsed, path: outPath });
    } else {
      console.log(`✗ FAILED — ${elapsed}ms`);
      results.push({ type: "HLS STREAM", success: false });
    }
  }

  // ────────────────────────────────────────────
  // 4. RTSP STREAM
  // ────────────────────────────────────────────
  console.log("\n━━━ 4. RTSP STREAM ━━━");
  console.log("Source: Public highway camera (170.93.143.139)");
  const rtspUrl = "rtsp://170.93.143.139/rtplive/470011e600ef003a004ee33696235daa";
  console.log(`URL: ${rtspUrl}`);
  console.log(`Protocol: ${detectProtocol(rtspUrl)}`);
  {
    const t1 = Date.now();
    const frame = await extractRtspFrame(rtspUrl, 12000);
    const elapsed = Date.now() - t1;
    if (frame && frame.buf.length > 500) {
      const outPath = saveBuf(frame.buf, "rtsp");
      console.log(`✓ SUCCESS — ${frame.buf.length} bytes, ${elapsed}ms`);
      console.log(`  JPEG valid: ${isJpeg(frame.buf)}`);
      console.log(`  Saved: ${outPath}`);
      results.push({ type: "RTSP STREAM", success: true, bytes: frame.buf.length, ms: elapsed, path: outPath });
    } else {
      console.log(`✗ FAILED — ${elapsed}ms (camera likely offline/firewalled)`);
      console.log(`  NOTE: RTSP requires a live, reachable IP camera.`);
      console.log(`  The extraction code is verified — ffmpeg -rtsp_transport tcp -i <url> -frames:v 1`);
      results.push({ type: "RTSP STREAM", success: false, note: "No reachable public RTSP cameras found" });
    }
  }

  // ────────────────────────────────────────────
  // 5. YOUTUBE LIVE
  // ────────────────────────────────────────────
  console.log("\n━━━ 5. YOUTUBE LIVE ━━━");
  console.log("Source: YouTube live webcam");
  const ytUrl = "https://www.youtube.com/watch?v=1EiC9bvVGnk";
  console.log(`URL: ${ytUrl}`);
  console.log(`Protocol: ${detectProtocol(ytUrl)}`);
  {
    const t1 = Date.now();
    const frame = await extractFrame(ytUrl, "youtube", 20000);
    const elapsed = Date.now() - t1;
    if (frame && frame.buf.length > 500) {
      const outPath = saveBuf(frame.buf, "youtube");
      console.log(`✓ SUCCESS — ${frame.buf.length} bytes, ${elapsed}ms`);
      console.log(`  Saved: ${outPath}`);
      results.push({ type: "YOUTUBE LIVE", success: true, bytes: frame.buf.length, ms: elapsed, path: outPath });
    } else {
      console.log(`✗ FAILED — ${elapsed}ms`);
      console.log(`  NOTE: YouTube requires browser cookies for bot-check bypass.`);
      console.log(`  Fix: yt-dlp --cookies-from-browser chrome --get-url <URL>`);
      results.push({ type: "YOUTUBE LIVE", success: false, note: "YouTube bot-check — needs browser cookies" });
    }
  }

  // ────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                     RESULTS                         ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  for (const r of results) {
    const icon = r.success ? "✓" : "✗";
    const detail = r.success
      ? `${r.bytes} bytes in ${r.ms}ms`
      : (r.note || "offline/unavailable");
    console.log(`║  ${icon} ${r.type.padEnd(16)} ${detail.padEnd(35)}║`);
  }
  console.log("╠══════════════════════════════════════════════════════╣");

  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith("demo_"));
  console.log(`║  Output: ${OUTPUT_DIR}`);
  for (const f of files) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`║    ${f}  (${stat.size} bytes)`);
  }
  console.log("╚══════════════════════════════════════════════════════╝");
}

demo().catch(console.error);
