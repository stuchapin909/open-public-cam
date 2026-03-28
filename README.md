# open-public-cam (Keyless & Agent-Maintained)

An open-source Model Context Protocol (MCP) server for a global, community-validated directory of **exterior webcams in public spaces**. **No API keys required.**

## 🌍 The Vision
**open-public-cam** is a living, agent-maintained ecosystem. It empowers AI agents to see the world through public webcams—specifically those looking at streets, landmarks, and nature—while giving them the tools to discover, report, and maintain the global directory autonomously.

---

## 🚀 Key Features

- **Autonomous Growth**: Agents can submit new webcams; a worker verifies them and merges them automatically.
- **Self-Cleaning Registry**: A nightly worker re-verifies the directory to prune dead or static feeds.
- **Anti-Garbage Filters**: Motion detection, keyword shields, and **public-space checks** prevent spam and private feeds.
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
- **Scope**: Targeted at public, exterior feeds (cities, landmarks, weather).

### `submit_new_webcam_to_github`
- **Purpose**: Contributes a new discovery to the global registry.
- **Gatekeeper**: Triggers a worker that MUST see motion, pass keyword filters, and confirm the feed is a public-space exterior view before merging.

### `submit_report_to_github`
- **Purpose**: Reports a broken or offline camera.
- **Verification**: A worker independently confirms the failure before updating the global status.

### `sync_registry`
- **Purpose**: Pulls the latest `community-registry.json` and `validation-log.json` from GitHub.
- **Requirement**: You must be synced before you can contribute new data or reports.

---

## 🏗 Autonomous Quality Control (Anti-Garbage)

To ensure the registry remains high-quality without manual oversight, the **Worker Engine** employs:

1. **Motion Detection**: The worker takes two snapshots 5 seconds apart. If 0.5% pixel change and 1% file size change is not detected, the camera is rejected as a "static image" or "dead feed."
2. **Keyword Shield**: Automatic rejection of URLs containing spam keywords or privacy-sensitive terms (e.g., 'security', 'cctv', 'private') in the page title or metadata.
3. **Public Space Enforcement**: Rejects feeds that appear to be indoor, private, or security-focused rather than scenic or informational.
4. **Nightly Batch Validation**: Every 24 hours, the worker randomly tests batches of the registry to mark dead links as `offline`.
5. **Strict De-duplication**: Prevents flooding by checking for duplicate URLs and geographical clashes.

---

## 🛡️ Validation: Confirming "Public & Exterior"

To maintain a directory focused exclusively on public scenic views, the system uses a multi-layered validation approach:

### 1. Keyword Shield (Negative Filtering)
The `worker-verify.js` engine inspects the page title and metadata *before* accepting any submission. It automatically rejects cameras that contain privacy-sensitive or interior-focused terms:
*   **Privacy terms**: `private`, `security`, `cctv`, `protected`.
*   **Administrative terms**: `login`, `admin`, `password`, `dashboard`.
*   **Commercial terms**: `casino`, `viagra`, `earn money`.

If a page is titled *"Office Security Camera"* or *"Admin Login - Hallway,"* it is rejected instantly.

### 2. OpenStreetMap Tags (Source Trust)
The `discover_webcams_by_location` tool specifically searches the **Overpass API** for nodes tagged with `man_made=webcam`. 
*   In the OSM community, `man_made=webcam` is the standard tag for cameras intended for public viewing (weather, traffic, tourism).
*   By scoping discovery to these tags, we inherit the manual verification already performed by the global OSM mapping community.

### 3. Tool Instruction & Agent Scoping
The MCP tool descriptions in `index.js` act as "programming" for the AI agents that use this server. By explicitly defining the scope as:
> *"Submit a newly discovered exterior public webcam (streets, landmarks, nature)..."*

We leverage the LLM's internal reasoning to filter discoveries *before* they are even submitted to the worker, creating a high-quality "human-in-the-loop" effect without the human.

---

## ⚖️ Ethical Guidelines & Abuse Policy

**open-public-cam** is built on the principle of radical transparency for public spaces. To ensure the project remains a benefit to the community and respects individual privacy, all contributors (human and agent) must adhere to the following:

### 🚫 Zero-Tolerance for Private Content
- **Public Spaces Only**: Submissions must be of exterior, public areas (e.g., public beaches, city squares, national parks). 
- **No Private Property**: Feeds that primarily view private homes, backyards, or interior private spaces are strictly prohibited.
- **No Unauthorized Access**: This tool is for *publicly published* webcams only. Attempting to use this tool to access private, password-protected, or hidden feeds is considered abuse.

### 🛡️ Abuse Prevention & Enforcement
- **Automated Rejection**: Our worker engine automatically rejects feeds that trigger privacy keywords or appear to be security-focused.
- **Community Reporting**: Users are encouraged to use the `submit_report_to_github` tool to flag any feed that violates these guidelines.
- **Registry Pruning**: Verified reports of privacy violations result in immediate and permanent removal from the global registry.
- **Rate Limiting**: To prevent flooding and automated abuse, submissions are subject to rate-limiting and audit-logging.

**Misuse of this project to infringe on privacy or harass individuals is a violation of the license and the spirit of the project.**

---

## 🤝 How to Participate

### For Humans:
- **Fork & Improve**: Help us refine the `worker-verify.js` logic to handle more complex video players and improve public-space detection.
- **Curate**: Add famous landmarks or scenic public views to the core `WEBCAMS` list in `index.js` via Pull Request.

### For AI Agents:
- **Discover**: Use `discover_webcams_by_location` to find new public-space feeds.
- **Contribute**: Use `submit_new_webcam_to_github` to grow the global registry of public views.
- **Maintain**: Use `submit_report_to_github` to flag broken links for the community.

---

## 📄 License
MIT
