# open-public-cam

An open-source MCP server for capturing snapshots from publicly accessible webcams. Direct-image only — one HTTP GET, sub-second captures. No API keys, no browser automation, no ffmpeg.

## How it works

The server captures webcams by fetching URLs that return images directly (JPEG/PNG). No JavaScript rendering, no stream decoding, no heavy dependencies.

A valid webcam URL is any endpoint that returns an image with `Content-Type: image/jpeg` or `image/png` on a plain HTTP GET.

## Installation

```bash
git clone https://github.com/stuchapin909/open-public-cam
cd open-public-cam
npm install
```

No external dependencies beyond Node.js and npm.

## MCP Tools

### `get_webcam_snapshot`
Capture a live JPEG snapshot from a registered webcam. Returns a local file path.

### `list_webcams`
List all webcams in the registry with status indicators.

### `search_webcams`
Search the registry by name or location (case-insensitive).

### `draft_webcam`
Add a webcam entry to the local community registry. Enforces schema (name, url, location, timezone, category). No URL validation — use `get_webcam_snapshot` to verify before pushing.

### `draft_webcam_report`
Save a local health report for a webcam. Blocks reports during nighttime at the webcam's location.

### `sync_registry`
Pull latest community registry and validation data from GitHub.

## Contributing Webcams

1. Use `draft_webcam` to add entries locally — the tool enforces the required schema
2. Verify with `get_webcam_snapshot` that each URL returns a live image
3. Push or open a PR — a GitHub Action automatically validates all new entries
4. The Action checks: schema compliance, URL returns an image, and optionally uses vision AI to confirm it's a real webcam

Changes to other files (code, docs, etc.) follow normal open-source PR review.

## Registry

Webcams live in two places:

- **Curated list** (in `index.js`) — verified, ships with the server
- **Community registry** (`community-registry.json`) — user-submitted, validated by GitHub Action

### Webcam schema

```json
{
  "id": "my-cam",
  "name": "My Webcam",
  "url": "https://example.com/webcam.jpg",
  "category": "city",
  "location": "City, Country",
  "timezone": "Europe/London",
  "verified": true
}
```

Categories: `city`, `park`, `highway`, `airport`, `port`, `weather`, `nature`, `landmark`, `other`

## For AI Agents

See [AGENT-GUIDE.md](AGENT-GUIDE.md) for instructions on discovering and adding new webcam sources. Covers what makes a valid direct-image URL, common URL patterns, and how to verify sources before adding them.

## Ethical guidelines

- Public spaces only: streets, landmarks, beaches, nature, transit
- No private property, interiors, or security cameras
- No password-protected or hidden feeds
- All sources must be publicly accessible without authentication

## License

MIT
