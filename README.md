# open-public-cam (Keyless & Agent-Maintained)

An open-source Model Context Protocol (MCP) server for a global, community-validated directory of public webcams. **No API keys required.**

## 🌍 The Vision
**open-public-cam** is not just a list; it is a living, agent-maintained ecosystem. It empowers AI agents to see the world through public webcams while giving them the tools to discover, report, and maintain the global directory for everyone.

---

## 🚀 Features

- **Automated Verification**: When an agent reports a broken cam, a free GitHub Action worker independently verifies the report.
- **Global Sync**: Users stay in sync with the community's latest findings via a manual `sync_registry` tool.
- **Vision Capture**: Captures live JPEG snapshots using a headless browser (Playwright).
- **Keyless Discovery**: Find thousands of webcams worldwide using OpenStreetMap (Overpass API).

---

## 🛠 Installation

```bash
git clone https://github.com/stuchapin909/open-public-cam
cd open-public-cam
npm install
npx playwright install chromium
```

---

## 🤖 MCP Tools

### `get_webcam_snapshot`
- **Purpose**: Returns a base64 JPEG of a live webcam feed.
- **How it works**: Uses Playwright to navigate, wait for video/image elements, and take a screenshot.

### `sync_registry`
- **Purpose**: Pulls the latest `community-registry.json` and `validation-log.json` from the main GitHub repository.
- **Rule**: You must be synced before you can submit new data.

### `submit_report_to_github`
- **Purpose**: Triggers the **Automated Worker**. 
- **Action**: Opens a GitHub Issue with a specific JSON payload that a GitHub Action worker then picks up to verify.

### `discover_webcams_by_location`
- **Purpose**: Queries OpenStreetMap for objects tagged with `contact:webcam`.
- **Performance**: Results are cached for 30 minutes to protect public API limits.

---

## 🏗 The Maintenance Loop (Agent Workflow)

This project relies on **Agent-as-a-Maintainer** logic:

1. **Discovery**: Agent finds a webcam via `discover_webcams_by_location`.
2. **Usage**: Agent captures a snapshot via `get_webcam_snapshot`.
3. **Feedback**: 
   - If the capture fails, the agent calls `report_webcam_status` (Local) and `submit_report_to_github` (Global).
4. **Verification**: 
   - A GitHub Action "Worker" boots up, verifies the URL, and if broken, **automatically commits** the status to the main repo.
5. **Propagation**: 
   - Other users see an `[UPDATE AVAILABLE]` notice and run `sync_registry` to get the fix.

---

## 🤝 How to Contribute

We love community contributions!

### For Humans:
- **Add Curated Cams**: Fork the repo, add famous webcams to `index.js`, and submit a Pull Request.
- **Improve the Worker**: Help us make the `worker-verify.js` better at detecting tricky video players.

### For Agents:
- You are authorized to use `submit_webcam` to grow the registry.
- You are encouraged to use `submit_report_to_github` whenever you encounter a broken link.

---

## 📄 License
MIT
