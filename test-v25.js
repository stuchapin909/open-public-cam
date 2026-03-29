import axios from "axios";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAP_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR);

const HUMAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Referer': 'https://www.google.com/'
};

async function testImage() {
  const url = "https://www.cotrip.org/camSnapshot/i70_at_silverthorne.jpg";
  console.log(`TEST 1: Direct Image (Colorado DOT) -> ${url}`);
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000, headers: HUMAN_HEADERS });
    const p = path.join(SNAP_DIR, "test_image.jpg");
    fs.writeFileSync(p, Buffer.from(res.data));
    console.log(`  PASS: Image saved to ${p} (${res.data.byteLength} bytes)`);
    return true;
  } catch (e) {
    console.error(`  FAIL: Image fetch failed: ${e.message}`);
    return false;
  }
}

function findCommand(cmd) {
  // Simplified for this test script
  return cmd; 
}

async function testStream() {
  const url = "https://www.youtube.com/watch?v=EO_1LWqsCNE";
  const ytDlp = "C:\\Users\\stuch\\AppData\\Roaming\\Python\\Python313\\Scripts\\yt-dlp.exe";
  console.log(`TEST 2: Direct Stream (Venice Beach YouTube) -> ${url}`);
  try {
    const extract = spawnSync(ytDlp, ["-g", url], { encoding: 'utf8' });
    if (extract.status !== 0) throw new Error("yt-dlp failed");
    const streamUrl = extract.stdout.trim().split('\n')[0];
    
    const p = path.join(SNAP_DIR, "test_stream.jpg");
    const capture = spawnSync("ffmpeg", [
      "-user_agent", HUMAN_HEADERS['User-Agent'],
      "-i", streamUrl, "-frames:v", "1", "-update", "1", "-q:v", "2", p, "-y"
    ]);
    if (capture.status === 0 && fs.existsSync(p)) {
      console.log(`  PASS: Stream frame saved to ${p}`);
      return true;
    } else {
      throw new Error("ffmpeg failed");
    }
  } catch (e) {
    console.error(`  FAIL: Stream capture failed: ${e.message}`);
    return false;
  }
}

async function run() {
  const imgOk = await testImage();
  const strmOk = await testStream();
  if (imgOk && strmOk) console.log("\nVERIFICATION COMPLETE: BOTH TIERS ARE ALIVE.");
  else console.log("\nVERIFICATION FAILED: ARCHITECTURE STILL HAS ISSUES.");
}

run();
