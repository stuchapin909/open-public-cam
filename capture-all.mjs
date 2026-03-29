import { chromium } from "playwright-chromium";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALIDATION_DIR = path.join(__dirname, "validation-snapshots");

if (!fs.existsSync(VALIDATION_DIR)) fs.mkdirSync(VALIDATION_DIR, { recursive: true });

const AD_DOMAINS = [
  'googlesyndication.com', 'adservice.google.com', 'google-analytics.com',
  'doubleclick.net', 'adsystem.com', 'adnxs.com', 'quantserve.com',
  'facebook.net', 'fontawesome.com', 'scorecardresearch.com'
];

const WEBCAMS = [
  { id: "times-square", url: "https://www.earthcam.com/usa/newyork/timessquare/?cam=tsstreet", selector: "video" },
  { id: "times-square-4k", url: "https://www.earthcam.com/usa/newyork/timessquare/?cam=tsrobo1", selector: "video" },
  { id: "abbey-road", url: "https://www.abbeyroad.com/crossing", selector: "video" },
  { id: "venice-grand-canal", url: "https://www.skylinewebcams.com/en/webcam/italia/veneto/venezia/canal-grande-rialto.html", selector: "video" },
  { id: "cn-tower-toronto", url: "https://www.earthcam.com/world/canada/toronto/cntower/?cam=cntower1", selector: "video" },
  { id: "amsterdam-hotel-nes", url: "https://www.earthcam.com/world/netherlands/amsterdam/", selector: "video" },
  { id: "chicago-skydeck", url: "https://www.earthcam.com/usa/illinois/chicago/skydeck/?cam=chicagoskydeck", selector: "video" },
  { id: "edmonton-canada", url: "https://www.earthcam.com/world/canada/alberta/edmonton/", selector: "video" },
  { id: "mount-fuji-japan", url: "https://www.skylinewebcams.com/en/webcam/japan/yamanashi-prefecture/fujikawaguchiko/mount-fuji.html", selector: "img" },
  { id: "lake-kawaguchiko-fuji", url: "https://www.skylinewebcams.com/en/webcam/japan/chubu/fujikawaguchiko/fujikawaguchiko.html", selector: "video" },
  { id: "shibuya-scramble-crossing", url: "https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-shibuya-scramble-crossing.html", selector: "img" },
  { id: "tokyo-skyline", url: "https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-skyline.html", selector: "img" },
  { id: "tokyo-tower", url: "https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-tower.html", selector: "video" },
  { id: "hanamikoji-kyoto", url: "https://www.skylinewebcams.com/en/webcam/japan/kansai/kyoto/hanamikoji-street.html", selector: "video" },
  { id: "osaka-japan", url: "https://www.skylinewebcams.com/en/webcam/japan/kansai/osaka/osaka.html", selector: "img" },
  { id: "sapporo-japan", url: "https://www.skylinewebcams.com/en/webcam/japan/prefecture-of-hokkaido/sapporo/sapporo-city.html", selector: "img" },
  { id: "hozomon-gate-asakusa", url: "https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/hozomon-gate-asakusa.html", selector: "img" },
  { id: "kahului-maui", url: "https://www.skylinewebcams.com/en/webcam/united-states/hawaii/maui/kahului.html", selector: "video" },
  { id: "playa-los-cristianos-tenerife", url: "https://www.skylinewebcams.com/en/webcam/espana/canarias/santa-cruz-de-tenerife/playa-los-cristianos.html", selector: "video" },
  { id: "sydney-opera-house", url: "https://www.skylinewebcams.com/en/webcam/australia/new-south-wales/sydney/opera-house.html", selector: "img" },
  { id: "sydney-harbour-bridge", url: "https://www.skylinewebcams.com/en/webcam/australia/new-south-wales/sydney/harbour-bridge.html", selector: "img" },
  { id: "melbourne-panorama", url: "https://www.skylinewebcams.com/en/webcam/australia/victoria/melbourne/panorama-of-melbourne.html", selector: "img" },
  { id: "perth-australia", url: "https://www.skylinewebcams.com/en/webcam/australia/western-australia/perth/perth.html", selector: "img" },
  { id: "christ-the-redeemer-rio", url: "https://www.skylinewebcams.com/en/webcam/brasil/rio-de-janeiro/rio-de-janeiro/christ-the-redeemer.html", selector: "img" },
  { id: "copacabana-beach-rio", url: "https://www.skylinewebcams.com/en/webcam/brasil/rio-de-janeiro/rio-de-janeiro/copacabana.html", selector: "img" },
  { id: "rio-de-janeiro-panorama", url: "https://www.skylinewebcams.com/en/webcam/brasil/rio-de-janeiro/rio-de-janeiro/panorama.html", selector: "img" },
  { id: "cape-town", url: "https://www.skylinewebcams.com/en/webcam/south-africa/western-cape/cape-town/cape-town.html", selector: "img" },
  { id: "cape-town-clifton-beach", url: "https://www.skylinewebcams.com/en/webcam/south-africa/western-cape/cape-town/cape-town-clifton-beach.html", selector: "img" },
  { id: "sukhumvit-road-bangkok", url: "https://www.skylinewebcams.com/en/webcam/thailand/central-thailand/bangkok/sukhumvit.html", selector: "img" },
  { id: "streets-of-pattaya", url: "https://www.skylinewebcams.com/en/webcam/thailand/eastern-thailand/pattaya/walking-street.html", selector: "img" },
  { id: "neuschwanstein-castle", url: "https://www.skylinewebcams.com/en/webcam/deutschland/bayern/schwangau/schloss-neuschwanstein.html", selector: "video" },
  { id: "cologne-germany", url: "https://www.skylinewebcams.com/en/webcam/deutschland/north-rhine-westphalia/cologne/cologne.html", selector: "video" },
];

async function captureSnapshot(cam) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (AD_DOMAINS.some(domain => url.includes(domain))) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(cam.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    try {
      const consentSelectors = ['button:has-text("Accept all")', 'button:has-text("AGREE")', '#accept-choices', '.yt-spec-button-shape-next--filled'];
      for (const sel of consentSelectors) {
        if (await page.locator(sel).isVisible({ timeout: 1000 })) {
          await page.locator(sel).click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {}

    await page.addStyleTag({
      content: `
        #ad_container, .ad-overlay, .video-ads, .ytp-ad-module, .ytp-ad-overlay-container, [id*="ad-"], [class*="ad-"] { display: none !important; }
        .ytp-chrome-bottom, .ytp-chrome-top, .ytp-gradient-bottom, .ytp-gradient-top { display: none !important; }
      `
    });

    try { await page.waitForSelector(cam.selector, { timeout: 10000 }); } catch (e) {
      try { await page.waitForSelector('video, img, canvas', { timeout: 5000 }); } catch (e2) {}
    }

    await page.waitForTimeout(5000);

    let buffer;
    try {
      const element = await page.$(cam.selector) || await page.$('video') || await page.$('img');
      buffer = element ? await element.screenshot({ type: 'jpeg', quality: 85 }) : await page.screenshot({ type: 'jpeg', quality: 85 });
    } catch (e) {
      buffer = await page.screenshot({ type: 'jpeg', quality: 85 });
    }

    const filePath = path.join(VALIDATION_DIR, `${cam.id}.jpg`);
    fs.writeFileSync(filePath, buffer);
    
    await browser.close();
    return { id: cam.id, path: filePath, status: "ok" };
  } catch (e) {
    if (browser) await browser.close();
    return { id: cam.id, status: "error", error: e.message };
  }
}

async function main() {
  console.log(`Capturing snapshots for ${WEBCAMS.length} webcams...`);
  const results = [];
  for (const cam of WEBCAMS) {
    process.stdout.write(`  ${cam.id}... `);
    const result = await captureSnapshot(cam);
    results.push(result);
    console.log(result.status === "ok" ? "done" : `ERROR: ${result.error}`);
  }
  
  const ok = results.filter(r => r.status === "ok").length;
  console.log(`\nCaptured ${ok}/${WEBCAMS.length} snapshots to ${VALIDATION_DIR}`);
  fs.writeFileSync(path.join(VALIDATION_DIR, "capture-results.json"), JSON.stringify(results, null, 2));
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
