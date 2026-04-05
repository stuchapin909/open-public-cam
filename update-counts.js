#!/usr/bin/env node
/**
 * update-counts.js — Sync camera counts in README.md
 *
 * Reads cameras.json, counts total and per-country, updates docs.
 * Called by the parallel validator after removing dead cameras.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMERAS_PATH = path.join(__dirname, "cameras.json");
const README_PATH = path.join(__dirname, "README.md");
const STATS_PATH = path.join(__dirname, "stats.json");

const cameras = JSON.parse(fs.readFileSync(CAMERAS_PATH, "utf8"));

// Count by country and category
const countryCounts = {};
const categoryCounts = {};
for (const c of cameras) {
  const cc = c.country || "??";
  countryCounts[cc] = (countryCounts[cc] || 0) + 1;
  const cat = c.category || "other";
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
}

const total = cameras.length;
const countryNum = Object.keys(countryCounts).length;

// Sort by count descending
const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);

// Source details per country (hardcoded from known additions — update when new sources added)
const COUNTRY_SOURCES = {
  US: "NYC DOT, WSDOT, Caltrans CWWP2, CDOT CoTrip, VDOT 511, FDOT FL511, NCDOT, PennDOT 511PA, Arizona ADOT, Oregon ODOT, Nevada NDOT, Utah UDOT, Wisconsin WisDOT, New England 511, Louisiana LADOTD",
  FI: "Digitraffic weather cameras (Fintraffic)",
  CA: "Ontario MTO, Alberta 511",
  HK: "Hong Kong Transport Department",
  UK: "London TfL JamCams",
  NZ: "NZTA nationwide highways",
  AU: "Sydney metro, Regional NSW",
  BR: "CET Sao Paulo urban traffic",
  JP: "NEXCO East expressways",
  SG: "Singapore LTA",
  IE: "TII motorway cams (M50 Dublin)",
};

// Number word
function numWord(n) {
  const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen"];
  return words[n] || String(n);
}

// --- Write stats.json ---
const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
const stats = {
  total,
  countries: countryNum,
  categories: Object.keys(categoryCounts).length,
  by_country: Object.fromEntries(sorted),
  by_category: Object.fromEntries(sortedCategories),
  generated_at: new Date().toISOString(),
};
fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + "\n");
console.log(`Wrote stats.json (${total} cameras, ${countryNum} countries, ${Object.keys(categoryCounts).length} categories)`);

console.log(`Registry: ${total} cameras across ${countryNum} countries`);

// --- Update README.md ---
let readme = fs.readFileSync(README_PATH, "utf8");

// Update top-line count: **22,999 cameras** across eleven countries:
readme = readme.replace(
  /\*\*[\d,]+ cameras\*\* across \w+ countries:/,
  `**${total.toLocaleString()} cameras** across ${numWord(countryNum)} countries:`
);

// Update per-country lines: "- US: 17,181 (sources)"
const countryLinePattern = /^- ([A-Z]{2}): \d[\d,]+/gm;
const newCountryLines = sorted.map(([cc, count]) => {
  const sources = COUNTRY_SOURCES[cc] || "";
  const paren = sources ? ` (${sources})` : "";
  return `- ${cc}: ${count.toLocaleString()}${paren}`;
}).join("\n");

// Find the country list block (starts with "- US:" or first "- XX:")
const countryListMatch = readme.match(/(^[ \t]*-[ \t]+[A-Z]{2}: \d[\d,]+[\s\S]*?)(\n^[ \t]*(?:- [A-Z]|\n##|\n\n))/m);
if (countryListMatch) {
  readme = readme.replace(countryListMatch[1].trimEnd(), newCountryLines);
} else {
  console.log("WARNING: Could not find country list in README.md");
}

fs.writeFileSync(README_PATH, readme);
console.log("Updated README.md");

console.log(`\nDone. ${total.toLocaleString()} cameras across ${countryNum} countries.`);
