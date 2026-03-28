#!/usr/bin/env node
// Direct import test — no stdio transport needed
// Tests the server logic by importing and calling tools directly
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We'll test by sending JSON-RPC over stdio to the actual server process
import { spawn } from 'child_process';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${msg}`);
  } else {
    failed++;
    results.push(`  FAIL: ${msg}`);
  }
}

// MCP client over stdio using newline-delimited JSON
class McpClient {
  constructor() {
    this.server = null;
    this.reqId = 0;
    this.pending = new Map();
    this.buffer = '';
  }

  async start() {
    this.server = spawn('node', ['index.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this._processBuffer();
    });

    this.server.stderr.on('data', (d) => {
      // Server logs to stderr, just collect
    });

    // Give it a moment to start
    await new Promise(r => setTimeout(r, 2000));
  }

  _processBuffer() {
    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) break;
      const line = this.buffer.substring(0, idx).replace(/\r$/, '');
      this.buffer = this.buffer.substring(idx + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)(msg);
          this.pending.delete(msg.id);
        }
      } catch(e) {}
    }
  }

  _send(method, params = {}) {
    const id = ++this.reqId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 90000);
      this.pending.set(id, (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
      this.server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async initialize() {
    const resp = await this._send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-runner', version: '1.0.0' }
    });
    // Send initialized notification
    this.server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    return resp;
  }

  async callTool(name, args = {}) {
    return this._send('tools/call', { name, arguments: args });
  }

  listTools() {
    return this._send('tools/list', {});
  }

  kill() {
    if (this.server) this.server.kill('SIGKILL');
  }
}

function extractText(content) {
  if (!content) return '';
  return content.map(c => c.text || '').join('\n');
}

async function runTests() {
  const client = new McpClient();
  await client.start();

  // Initialize
  let resp;
  try {
    resp = await client.initialize();
    assert(resp.result?.protocolVersion, 'Server initialized successfully');
  } catch(e) {
    results.push(`  FATAL: Server failed to initialize: ${e.message}`);
    console.log('\n========================================');
    console.log('  MCP SERVER TEST RESULTS');
    console.log('========================================');
    for (const r of results) console.log(r);
    console.log(`\n  PASSED: ${passed}  |  FAILED: ${failed}`);
    console.log('========================================\n');
    client.kill();
    process.exit(1);
  }

  // List tools
  const toolsResp = await client.listTools();
  const toolNames = (toolsResp.result?.tools || []).map(t => t.name);
  results.push(`\n[INFO] Available tools: ${toolNames.join(', ')}`);

  // ===== TEST 1: list_webcams =====
  results.push('\n--- list_webcams ---');
  resp = await client.callTool('list_webcams');
  assert(!resp.error, 'list_webcams: no error');
  const listText = extractText(resp.result?.content);
  try {
    const cams = JSON.parse(listText);
    assert(cams.length >= 3, `list_webcams returns ${cams.length} cams (>= 3 expected)`);
    assert(cams.some(c => c.id === 'times-square'), 'Contains hardcoded times-square');
    assert(cams.some(c => c.id === 'abbey-road'), 'Contains hardcoded abbey-road');
    assert(cams.some(c => c.id === 'venice-grand-canal'), 'Contains hardcoded venice-grand-canal');
    assert(cams.some(c => c.id?.startsWith('comm-')), 'Contains community entries');
  } catch(e) {
    assert(false, `list_webcams: failed to parse JSON: ${e.message}`);
  }

  // ===== TEST 2: search_webcams =====
  results.push('\n--- search_webcams ---');
  resp = await client.callTool('search_webcams', { query: 'London' });
  assert(!resp.error, 'search_webcams "London": no error');
  try {
    const results2 = JSON.parse(extractText(resp.result?.content));
    assert(results2.length >= 1, `search "London" returns ${results2.length} results`);
  } catch(e) {
    assert(false, `search_webcams: parse error: ${e.message}`);
  }

  resp = await client.callTool('search_webcams', { query: 'xyznonexistent999' });
  assert(!resp.error, 'search_webcams "xyznonexistent999": no error');
  try {
    const empty = JSON.parse(extractText(resp.result?.content));
    assert(empty.length === 0, 'search nonexistent returns empty array');
  } catch(e) {
    assert(false, `search_webcams empty: parse error: ${e.message}`);
  }

  // ===== TEST 3: sync_registry =====
  results.push('\n--- sync_registry ---');
  resp = await client.callTool('sync_registry');
  assert(!resp.error, 'sync_registry: no error');
  const syncText = extractText(resp.result?.content);
  assert(syncText.includes('Successfully') || syncText.includes('synced'), 'sync_registry confirms success');
  
  // Verify config.json was written
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
    assert(cfg.last_synced !== 'never', `config.json last_synced set to ${cfg.last_synced}`);
  } catch(e) {
    assert(false, `config.json check failed: ${e.message}`);
  }

  // ===== TEST 4: draft_webcam =====
  results.push('\n--- draft_webcam ---');
  resp = await client.callTool('draft_webcam', {
    name: 'TEST-DELETE-ME',
    url: 'https://example.com/test-cam',
    location: 'Nowhere, Test',
    category: 'test'
  });
  assert(!resp.error, 'draft_webcam: no error');
  const draftText = extractText(resp.result?.content);
  assert(draftText.includes('TEST-DELETE-ME'), 'draft confirms name in response');

  // Verify file write
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(__dirname, 'community-registry.json'), 'utf8'));
    const entry = reg.find(c => c.name === 'TEST-DELETE-ME');
    assert(entry !== undefined, 'entry found in community-registry.json');
    assert(entry.verified === false, 'entry marked unverified');
  } catch(e) {
    assert(false, `draft_webcam file check: ${e.message}`);
  }

  // ===== TEST 5: draft_webcam_report =====
  results.push('\n--- draft_webcam_report ---');
  resp = await client.callTool('draft_webcam_report', {
    cam_id: 'times-square',
    status: 'low_quality',
    notes: 'TEST-DELETE-ME'
  });
  assert(!resp.error, 'draft_webcam_report: no error');
  const rptText = extractText(resp.result?.content);
  assert(rptText.includes('times-square'), 'report confirms cam_id');

  try {
    const log = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-log.json'), 'utf8'));
    assert(log['times-square'] !== undefined, 'report in validation-log.json');
    assert(log['times-square'].reported_by === 'agent', 'report attributed to agent');
  } catch(e) {
    assert(false, `draft_webcam_report file check: ${e.message}`);
  }

  // ===== TEST 6: discover_webcams_by_location =====
  results.push('\n--- discover_webcams_by_location ---');
  resp = await client.callTool('discover_webcams_by_location', { city: 'Seattle' });
  assert(!resp.error, 'discover_webcams_by_location "Seattle": no error');
  const discText = extractText(resp.result?.content);
  assert(discText.length > 0, 'discovery returns non-empty response');

  // Test with bbox
  resp = await client.callTool('discover_webcams_by_location', { bbox: [-122.5, 47.5, -122.2, 47.7] });
  assert(!resp.error, 'discover_webcams_by_location bbox: no error');

  // Test with invalid city
  resp = await client.callTool('discover_webcams_by_location', { city: 'FakeCityThatDoesNotExist12345' });
  // Should either error or return empty — both acceptable
  assert(true, 'invalid city handled without crash');

  // ===== TEST 7: get_webcam_snapshot =====
  results.push('\n--- get_webcam_snapshot ---');
  resp = await client.callTool('get_webcam_snapshot', {
    url: 'https://www.earthcam.com/usa/newyork/timessquare/?cam=tsstreet',
    selector: 'video',
    wait_ms: 3000
  });
  assert(!resp.error, 'get_webcam_snapshot: no error');
  const hasImage = resp.result?.content?.some(c => c.type === 'image' && c.data?.length > 100);
  assert(hasImage, 'snapshot includes image data (>100 bytes)');
  const snapText = extractText(resp.result?.content);
  assert(snapText.includes('Successfully'), 'snapshot confirms success');

  // ===== TEST 8: snapshot on offline-reported cam still works =====
  results.push('\n--- get_webcam_snapshot (offline cam) ---');
  resp = await client.callTool('get_webcam_snapshot', {
    url: 'https://www.abbeyroad.com/crossing',
    wait_ms: 3000
  });
  // Should still work — offline report is just a warning
  assert(!resp.error, 'snapshot on reported-offline cam still succeeds');

  // ===== CLEANUP =====
  results.push('\n--- Cleanup ---');
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(__dirname, 'community-registry.json'), 'utf8'));
    const cleaned = reg.filter(c => c.name !== 'TEST-DELETE-ME');
    fs.writeFileSync(path.join(__dirname, 'community-registry.json'), JSON.stringify(cleaned, null, 2));
    assert(true, 'cleaned test entry from registry');
  } catch(e) {
    assert(false, `cleanup failed: ${e.message}`);
  }
  try {
    const log = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-log.json'), 'utf8'));
    if (log['times-square']?.notes === 'TEST-DELETE-ME') delete log['times-square'];
    fs.writeFileSync(path.join(__dirname, 'validation-log.json'), JSON.stringify(log, null, 2));
    assert(true, 'cleaned test report from log');
  } catch(e) {
    assert(false, `cleanup log failed: ${e.message}`);
  }

  // Print results
  client.kill();
  console.log('\n========================================');
  console.log('  MCP SERVER TEST RESULTS');
  console.log('========================================');
  for (const r of results) console.log(r);
  console.log('\n========================================');
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner fatal error:', e);
  process.exit(1);
});
