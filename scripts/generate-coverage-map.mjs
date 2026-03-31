import fs from "fs";

const cameras = JSON.parse(fs.readFileSync("/root/projects/open-public-cam/cameras.json", "utf8"));

// Country data: centroid + label offset to avoid overlaps
const countryData = {
  US: { lat: 39.8, lng: -98.5, labelDx: 45, labelDy: 5 },
  CA: { lat: 56.0, lng: -106.0, labelDx: 0, labelDy: 24 },
  FI: { lat: 64.0, lng: 26.0, labelDx: 0, labelDy: 22 },
  GB: { lat: 54.0, lng: -2.0, labelDx: 0, labelDy: -20 },
  IE: { lat: 53.3, lng: -10.0, labelDx: -30, labelDy: -14 },
  HK: { lat: 22.3, lng: 114.2, labelDx: 0, labelDy: -20 },
  SG: { lat: 1.3, lng: 103.8, labelDx: 0, labelDy: 20 },
  JP: { lat: 36.0, lng: 138.0, labelDx: 0, labelDy: 22 },
  AU: { lat: -25.0, lng: 134.0, labelDx: 0, labelDy: 0 },
  NZ: { lat: -41.0, lng: 174.0, labelDx: 0, labelDy: 22 },
  BR: { lat: -15.0, lng: -47.0, labelDx: 0, labelDy: 0 },
};

const counts = {};
cameras.forEach(c => {
  const country = c.country || "unknown";
  counts[country] = (counts[country] || 0) + 1;
});

const WIDTH = 1000;
const HEIGHT = 500;
const PADDING = 40;

function project(lat, lng) {
  const x = ((lng + 180) / 360) * (WIDTH - 2 * PADDING) + PADDING;
  const y = ((90 - lat) / 180) * (HEIGHT - 2 * PADDING) + PADDING;
  return { x, y };
}

// Log scale for radius: keeps US visible but not overwhelming
function radius(count) {
  return Math.max(3, Math.log10(count + 1) * 7);
}

const colors = {
  US: "#3B82F6",
  CA: "#EF4444",
  FI: "#8B5CF6",
  GB: "#10B981",
  IE: "#14B8A6",
  HK: "#F59E0B",
  SG: "#A855F7",
  JP: "#EC4899",
  AU: "#F97316",
  NZ: "#06B6D4",
  BR: "#22C55E",
};

let svg = '';
svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">\n`;
svg += `  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0F172A" rx="12"/>\n`;

// Defs
svg += `  <defs>\n`;
svg += `    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">\n`;
svg += `      <feGaussianBlur stdDeviation="4" result="blur"/>\n`;
svg += `      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n`;
svg += `    </filter>\n`;
svg += `  </defs>\n`;

// Subtle grid
for (let lat = -60; lat <= 80; lat += 20) {
  const { y } = project(lat, -180);
  svg += `  <line x1="${PADDING}" y1="${y}" x2="${WIDTH - PADDING}" y2="${y}" stroke="#1E293B" stroke-width="0.5"/>\n`;
}
for (let lng = -180; lng <= 180; lng += 30) {
  const { x } = project(0, lng);
  svg += `  <line x1="${x}" y1="${PADDING}" x2="${x}" y2="${HEIGHT - PADDING}" stroke="#1E293B" stroke-width="0.5"/>\n`;
}

// Draw countries sorted by count (largest first, so small ones render on top)
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

sorted.forEach(([country, count]) => {
  const d = countryData[country];
  if (!d) return;
  const { x, y } = project(d.lat, d.lng);
  const r = radius(count);
  const color = colors[country] || "#64748B";

  // Outer glow
  svg += `  <circle cx="${x}" cy="${y}" r="${r + 3}" fill="${color}" opacity="0.15"/>\n`;
  // Main dot
  svg += `  <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.8" filter="url(#glow)"/>\n`;
  
  // Label
  const lx = x + (d.labelDx || 0);
  const ly = y - r - 5 + (d.labelDy || 0);
  const label = `${country} ${count.toLocaleString()}`;
  const anchor = (d.labelDx > 20) ? "start" : ((d.labelDx < -20) ? "end" : "middle");
  svg += `  <text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500">${label}</text>\n`;
});

// Title
svg += `  <text x="${WIDTH / 2}" y="24" text-anchor="middle" fill="#F1F5F9" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="0.5">Open Eagle Eye -- Global Camera Coverage</text>\n`;

// Subtitle
const total = cameras.length;
const countries = Object.keys(counts).length;
svg += `  <text x="${WIDTH / 2}" y="${HEIGHT - 10}" text-anchor="middle" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="11">${total.toLocaleString()} cameras across ${countries} countries</text>\n`;

svg += `</svg>`;

fs.writeFileSync("/root/projects/open-public-cam/docs/coverage-map.svg", svg);
console.log("Wrote docs/coverage-map.svg");

// Print sizes for verification
sorted.forEach(([country, count]) => {
  const d = countryData[country];
  if (!d) return;
  const r = radius(count);
  console.log(`${country}: ${count} cameras, radius ${r.toFixed(1)}`);
});
