# open-public-cam

An open-source MCP server for discovering and capturing snapshots from publicly accessible webcams. No API keys, no browser automation -- just yt-dlp, ffmpeg, and direct image fetching.

## How it works

The server maintains a curated registry of webcam streams, all accessed via direct URLs:

- **YouTube live streams** -- extracted with yt-dlp, single frame captured with ffmpeg
- **Direct image URLs** -- fetched via HTTP with standard headers

No Playwright, no browser, no headless Chrome. Fast and lightweight.

## Installation

```bash
git clone https://github.com/stuchapin909/open-public-cam
cd open-public-cam
npm install
```

### External dependencies

You need yt-dlp and ffmpeg on your PATH:

```bash
# macOS
brew install yt-dlp ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
pip install yt-dlp

# Windows (via pip)
pip install yt-dlp ffmpeg-python
# or download ffmpeg from https://ffmpeg.org/
```

The server detects these tools at startup. If either is missing, YouTube stream capture will fail (direct image URLs still work).

## MCP Tools

### `get_webcam_snapshot`
Capture a live JPEG snapshot from any registered webcam. Returns a local file path.

### `list_webcams`
List all webcams in the registry with status indicators.

### `search_webcams`
Search the registry by name or location.

### `discover_webcams_by_location`
Find potential webcams near a city using OpenStreetMap's Overpass API.

### `draft_webcam`
Create a local unverified webcam entry for testing.

### `draft_webcam_report`
Save a local health report for a webcam (with nighttime protection).

### `submit_new_webcam_to_github`
Submit a verified webcam to the global registry via GitHub issue.

### `submit_report_to_github`
Report a broken or offline camera via GitHub issue.

### `sync_registry`
Pull the latest community registry and validation logs from GitHub.

## Registry

Webcams live in two places:

- **Curated list** (`CURATED_WEBCAMS` in index.js) -- hand-verified, ships with the server
- **Community registry** (`community-registry.json`) -- user/agent-submitted entries synced via GitHub

### Adding a curated webcam

Edit `CURATED_WEBCAMS` in index.js:

```js
{
  id: "my-cam",
  name: "My Webcam Name",
  url: "https://youtube.com/watch?v=...",
  access_strategy: { type: "direct_stream", extractor: "yt-dlp" },
  category: "city",
  location: "City, Country",
  timezone: "Europe/London",
  verified: true
}
```

Strategy types:
- `direct_stream` + `yt-dlp` -- YouTube or other streaming URLs
- `direct_image` -- URLs that return a JPEG/PNG directly

## Ethical guidelines

This project is for publicly published webcams in public spaces only:

- Streets, landmarks, beaches, nature, transit
- No private property, interiors, or security cameras
- No password-protected or hidden feeds
- All sources must be publicly accessible without authentication

## License

MIT
