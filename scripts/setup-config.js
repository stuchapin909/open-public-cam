#!/usr/bin/env node
/**
 * Initialize user config for open-public-cam.
 * Creates ~/.eagleeye/config.json with api_keys placeholder.
 * 
 * Usage: node scripts/setup-config.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = path.join(os.homedir(), '.eagleeye');
const configPath = path.join(configDir, 'config.json');

const defaultConfig = {
  api_keys: {
    // Add your API keys here. Camera entries that require auth
    // will reference these keys by their config_key name.
    //
    // Example:
    // "TFL_API_KEY": "your-tfl-app-key-here",
    // "NSW_API_KEY": "your-nsw-key-here",
  }
};

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

if (fs.existsSync(configPath)) {
  const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Config already exists at: ${configPath}`);
  console.log(`API keys configured: ${Object.keys(existing.api_keys || {}).length}`);
  process.exit(0);
}

fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
console.log(`Created config at: ${configPath}`);
console.log('Add API keys to the api_keys object as needed.');
