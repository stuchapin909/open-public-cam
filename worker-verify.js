import { chromium } from "playwright-chromium";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.searchParams.sort();
    return u.toString().toLowerCase().replace(/\/$/, "");
  } catch (e) {
    return url.toLowerCase().replace(/\/$/, "");
  }
}

async function verifyCam(url, isSubmission = false) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
    const page = await context.newPage();
    
    // Smart Strategy: YouTube Detection
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    // 1. Keyword Shield (Check title/meta before heavy loading)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    const spamKeywords = ['crypto', 'casino', 'pharmacy', 'viagra', 'ads', 'marketing', 'earn money', 'security', 'cctv', 'private', 'login', 'admin', 'password', 'protected'];
    if (spamKeywords.some(k => title.toLowerCase().includes(k))) {
      console.log("REJECTED: Spam or Privacy keywords detected in title");
      await browser.close();
      return { active: false, reason: "spam_or_privacy_keywords" };
    }

    // 2. Handle Cookie Consents / Overlays
    try {
      const consentSelectors = ['button:has-text("Accept all")', 'button:has-text("AGREE")', '#accept-choices', '.yt-spec-button-shape-next--filled'];
      for (const sel of consentSelectors) {
        if (await page.locator(sel).isVisible({ timeout: 2000 })) {
          await page.locator(sel).click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {}

    // 3. Platform-Specific Tweaks
    let selector = 'video, img, canvas';
    if (isYouTube) {
      await page.evaluate(() => {
        const video = document.querySelector('video.video-stream.html5-main-video');
        if (video) { video.play(); video.muted = true; }
      });
      selector = 'video.video-stream.html5-main-video';
    }

    // 4. Motion Detection (Take two snapshots 5s apart)
    await page.waitForTimeout(5000); // Wait for stream
    const shot1 = await page.screenshot({ type: 'jpeg', quality: 10 }); // Low res for speed
    
    await page.waitForTimeout(5000); // Wait for motion
    const shot2 = await page.screenshot({ type: 'jpeg', quality: 10 });
    
    // Improved buffer comparison (count differing bytes as a proxy for entropy)
    let diffs = 0;
    const minLen = Math.min(shot1.length, shot2.length);
    for (let i = 0; i < minLen; i++) {
      if (shot1[i] !== shot2[i]) diffs++;
    }
    const diffRatio = diffs / minLen;
    const sizeRatio = Math.abs(shot1.length - shot2.length) / Math.max(shot1.length, shot2.length);

    if (diffRatio < 0.005 && sizeRatio < 0.01) { // 0.5% byte diff AND <1% size change
      console.log(`REJECTED: Static image detected (Diff Ratio: ${(diffRatio * 100).toFixed(4)}%)`);
      await browser.close();
      return { active: false, reason: "static_image" };
    }

    const exists = await page.$(selector) || await page.$('video, img, canvas');
    await browser.close();
    return { active: !!exists };
  } catch (e) {
    if (browser) await browser.close();
    return { active: false, reason: "timeout_or_error" };
  }
}

const args = process.argv.slice(2);

// MODE 1: Nightly Batch Check
if (args[0] === "--batch") {
  (async () => {
    console.log("Starting Nightly Batch Validation...");
    const registry = JSON.parse(fs.readFileSync(path.join(__dirname, "community-registry.json"), "utf8"));
    const log = JSON.parse(fs.readFileSync(path.join(__dirname, "validation-log.json"), "utf8"));
    
    const toCheck = registry.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    for (const cam of toCheck) {
      console.log(`Checking ${cam.name}...`);
      const result = await verifyCam(cam.url);
      if (!result.active) {
        console.log(`-> Reported OFFLINE: ${cam.name} (${result.reason})`);
        log[cam.id] = { status: "offline", reason: result.reason, timestamp: new Date().toISOString(), reported_by: "nightly_worker" };
      } else if (log[cam.id] && log[cam.id].status === "offline") {
        delete log[cam.id];
      }
    }
    fs.writeFileSync(path.join(__dirname, "validation-log.json"), JSON.stringify(log, null, 2));
    process.exit(0);
  })();
} 
// MODE 2: Single Issue Verification
else {
  const issueData = JSON.parse(args[0]);
  const isSubmission = !!issueData.name;
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, "community-registry.json"), "utf8"));

  // 3. Duplicate & Geo Check (Submission Only)
  if (isSubmission) {
    const normalizedNew = normalizeUrl(issueData.url);
    const isDupUrl = registry.some(c => normalizeUrl(c.url) === normalizedNew);
    const isDupLoc = registry.some(c => c.location === issueData.location && c.name === issueData.name);
    
    if (isDupUrl || isDupLoc) {
      console.log("REJECTED: Duplicate entry detected");
      process.exit(1);
    }
  }

  verifyCam(issueData.url || issueData.cam_id, isSubmission).then(result => {
    if (isSubmission) {
      if (result.active) {
        console.log("VERIFIED_ACTIVE_SUBMISSION");
        registry.push({
          id: `comm-${Date.now()}`,
          ...issueData,
          verified: true
        });
        fs.writeFileSync(path.join(__dirname, "community-registry.json"), JSON.stringify(registry, null, 2));
        process.exit(0);
      } else {
        console.log(`SUBMISSION_FAILED: ${result.reason}`);
        process.exit(1);
      }
    } else {
      if (!result.active) {
        console.log("VERIFIED_BROKEN_REPORT");
        const log = JSON.parse(fs.readFileSync(path.join(__dirname, "validation-log.json"), "utf8"));
        log[issueData.cam_id] = { status: issueData.status, reason: result.reason, timestamp: new Date().toISOString(), reported_by: "worker_verified" };
        fs.writeFileSync(path.join(__dirname, "validation-log.json"), JSON.stringify(log, null, 2));
        process.exit(0);
      } else {
        console.log("REPORT_FAILED_ACTIVE");
        process.exit(1);
      }
    }
  });
}
