# open-public-cam

An open-source MCP server for discovering and capturing snapshots from publicly accessible webcams. No API keys, no browser automation.

## How it works

Two capture strategies, both fast:

- **direct_image** -- the URL returns a JPEG/PNG directly. One HTTP GET, sub-second.
- **direct_stream** -- the URL is a stream (HLS, RTSP). ffmpeg grabs a single frame, a few seconds.

No yt-dlp, no browser, no headless Chrome.

## Installation

```bash
git clone https://github.com/stuchapin909/open-public-cam
cd open-public-cam
npm install
```

### External dependencies

Only ffmpeg is needed (for direct_stream captures):

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows — download from https://ffmpeg.org/
```

The server detects ffmpeg at startup. If missing, direct_stream captures will fail but direct_image still works.

## MCP Tools

### `get_webcam_snapshot`
Capture a live JPEG snapshot. Returns a local file path.

### `list_webcams`
List all webcams in the registry with status.

### `search_webcams`
Search registry by name or location.

### `discover_webcams_by_location`
Find webcams near a city using OpenStreetMap's Overpass API.

### `draft_webcam`
Create a local unverified webcam entry.

### `draft_webcam_report`
Save a local health report (blocks at nighttime).

### `submit_new_webcam_to_github`
Submit a webcam via GitHub issue (validates URL first).

### `submit_report_to_github`
Report a broken webcam via GitHub issue.

### `sync_registry`
Pull latest community data from GitHub.

## Registry

Webcams live in two places:

- **Curated list** (`CURATED_WEBCAMS` in index.js) -- verified, ships with the server
- **Community registry** (`community-registry.json`) -- user-submitted, synced via GitHub

### Adding a webcam

```js
{
  id: "my-cam",
  name: "My Webcam",
  url: "https://example.com/webcam.jpg",  // direct JPEG URL
  access_strategy: { type: "direct_image" },
  category: "city",
  location: "City, Country",
  timezone: "Europe/London",
  verified: true
}
```

Strategy types:
- `direct_image` -- URL returns a JPEG/PNG image directly
- `direct_stream` -- URL is a stream (HLS .m3u8, RTSP, etc.)

## Ethical guidelines

- Public spaces only: streets, landmarks, beaches, nature, transit
- No private property, interiors, or security cameras
- No password-protected or hidden feeds
- All sources must be publicly accessible without authentication

## License

MIT
