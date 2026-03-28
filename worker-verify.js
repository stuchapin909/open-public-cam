import { chromium } from "playwright-chromium";
import fs from "fs";

async function verifyCam(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    const exists = await page.$('video, img, canvas');
    await browser.close();
    return !!exists;
  } catch (e) {
    if (browser) await browser.close();
    return false;
  }
}

const args = process.argv.slice(2);

// MODE 1: Nightly Batch Check
if (args[0] === "--batch") {
  (async () => {
    console.log("Starting Nightly Batch Validation...");
    const registry = JSON.parse(fs.readFileSync("community-registry.json", "utf8"));
    const log = JSON.parse(fs.readFileSync("validation-log.json", "utf8"));
    
    // Check up to 20 cameras per run (to keep actions short)
    const toCheck = registry.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    for (const cam of toCheck) {
      console.log(`Checking ${cam.name}...`);
      const active = await verifyCam(cam.url);
      if (!active) {
        console.log(`-> Reported OFFLINE: ${cam.name}`);
        log[cam.id] = { status: "offline", timestamp: new Date().toISOString(), reported_by: "nightly_worker" };
      } else {
        // If it was offline but is now active, clear the status
        if (log[cam.id] && log[cam.id].status === "offline") {
          delete log[cam.id];
        }
      }
    }
    fs.writeFileSync("validation-log.json", JSON.stringify(log, null, 2));
    process.exit(0);
  })();
} 
// MODE 2: Single Issue Verification (Report or Submission)
else {
  const issueData = JSON.parse(args[0]);
  const isSubmission = !!issueData.name; // Submissions have 'name'

  verifyCam(issueData.url || issueData.cam_id).then(isActive => {
    if (isSubmission) {
      if (isActive) {
        console.log("VERIFIED_ACTIVE_SUBMISSION");
        const registry = JSON.parse(fs.readFileSync("community-registry.json", "utf8"));
        registry.push({
          id: `comm-${Date.now()}`,
          ...issueData,
          verified: true
        });
        fs.writeFileSync("community-registry.json", JSON.stringify(registry, null, 2));
        process.exit(0);
      } else {
        console.log("SUBMISSION_FAILED_OFFLINE");
        process.exit(1);
      }
    } else {
      // Logic for reports
      if (!isActive) {
        console.log("VERIFIED_BROKEN_REPORT");
        const log = JSON.parse(fs.readFileSync("validation-log.json", "utf8"));
        log[issueData.cam_id] = { status: issueData.status, notes: issueData.notes, timestamp: new Date().toISOString(), reported_by: "worker_verified" };
        fs.writeFileSync("validation-log.json", JSON.stringify(log, null, 2));
        process.exit(0);
      } else {
        console.log("REPORT_FAILED_ACTIVE");
        process.exit(1);
      }
    }
  });
}
