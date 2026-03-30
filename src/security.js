/**
 * security.js — URL safety checks, IP validation, image detection, HTTP headers
 */

import dns from "dns/promises";

const BLOCKED_HOSTNAMES = [
  'metadata.google.internal', 'metadata.goog',
  '169.254.169.254', 'metadata.amazonaws.com',
  '100.100.100.200', 'fd00:ec2::254',
];

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

export function isPrivateIP(ip) {
  if (!ip) return true;
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

export async function isSafeUrl(urlStr) {
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

export function getHeadersForUrl(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname;
    return { ...HUMAN_HEADERS, ...(DOMAIN_HEADERS[hostname] || {}) };
  } catch {
    return HUMAN_HEADERS;
  }
}

export function detectImageType(buffer) {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "image/png";
  return null;
}
