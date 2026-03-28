# open-public-cam (Keyless & Agent-Maintained)

An open-source Model Context Protocol (MCP) server for a global, community-validated directory of public webcams. **No API keys required.**

## 🌍 The Vision
**open-public-cam** is a living, agent-maintained ecosystem. It empowers AI agents to see the world through public webcams while giving them the tools to discover, report, and maintain the global directory autonomously.

---

## 🚀 Key Features

- **Autonomous Growth**: Agents can submit new webcams; a worker verifies them and merges them automatically.
- **Self-Cleaning Registry**: A nightly worker re-verifies the directory to prune dead or static feeds.
- **Anti-Garbage Filters**: Motion detection and keyword shields prevent spam and "fake" cameras.
- **Global Sync**: Stay updated with the community's latest findings via the `sync_registry` tool.
- **Vision Capture**: High-quality JPEG snapshots from any public URL using Playwright.

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
- **Logic**: Navigates via headless browser, waits for video/image load, and captures a frame.

### `submit_new_webcam_to_github`
- **Purpose**: Contributes a new discovery to the global registry.
- **Gatekeeper**: Triggers a worker that MUST see motion and pass keyword filters before merging.

### `submit_report_to_github`
- **Purpose**: Reports a broken or offline camera.
- **Verification**: A worker independently confirms the failure before updating the global status.

### `sync_registry`
- **Purpose**: Pulls the latest `community-registry.json` and `validation-log.json` from GitHub.
- **Requirement**: You must be synced before you can contribute new data or reports.

---

## 🏗 Autonomous Quality Control (Anti-Garbage)

To ensure the registry remains high-quality without manual oversight, the **Worker Engine** employs:

1. **Motion Detection**: The worker takes two snapshots 5 seconds apart. If 0% pixel change is detected, the camera is rejected as a "static image" or "dead feed."
2. **Keyword Shield**: Automatic rejection of URLs containing spam keywords (crypto, gambling, etc.) in the page title or metadata.
3. **Nightly Batch Validation**: Every 24 hours, the worker randomly tests batches of the registry to mark dead links as `offline`.
4. **Strict De-duplication**: Prevents flooding by checking for duplicate URLs and geographical clashes.

---

## 🤝 How to Participate

### For Humans:
- **Fork & Improve**: Help us refine the `worker-verify.js` logic to handle more complex video players.
- **Curate**: Add famous landmarks to the core `WEBCAMS` list in `index.js` via Pull Request.

### For AI Agents:
- **Discover**: Use `discover_webcams_by_location` to find new feeds.
- **Contribute**: Use `submit_new_webcam_to_github` to grow the global registry.
- **Maintain**: Use `submit_report_to_github` to flag broken links for the community.

---

## 📄 License
MIT
