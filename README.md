# Open Eagle Eye

![License: MIT](https://img.shields.io/badge/license-MIT-blue)

MCP server that gives AI agents instant access to public webcam feeds worldwide. One HTTP GET, sub-second captures, no browser automation, no stream decoding.

## Why

Most webcam APIs require authentication, serve video streams, or hide images behind JavaScript rendering. Open Eagle Eye only indexes cameras that return a JPEG or PNG on a plain HTTP GET — the simplest possible integration. Agents don't need to render pages or decode video. They just fetch an image.

The registry is self-healing. A GitHub Action runs nightly, checks every camera, retries failures before removing them, and uses vision AI to catch cameras that return error pages instead of live feeds. Dead cameras get flagged automatically. The registry stays current without manual maintenance.

## Quick start

```json
{
  "mcpServers": {
    "openeagleeye": {
      "command": "npx",
      "args": ["-y", "openeagleeye"]
    }
  }
}
```

Or install globally:

```bash
npm install -g openeagleeye
openeagleeye
```

## How it works

A valid webcam URL is any endpoint that returns a JPEG or PNG on a plain HTTP GET. Most city traffic cameras, weather stations, and park cams expose exactly this. The server fetches the image, saves it to disk, and returns a JSON response with the file path.

## MCP Tools

| Tool | Description |
|---|---|
| `get_webcam_snapshot` | Fetch a live snapshot — saves to disk, returns JSON with file path |
| `list_webcams` | List all cameras with filters (location, category) |
| `search_webcams` | Search by name, location, or category |
| `draft_webcam` | Add a new camera to the local community registry |
| `draft_webcam_report` | Report a broken or offline camera |
| `get_config_info` | Check API key configuration status |
| `sync_registry` | Pull latest cameras from GitHub |

### Output format

Every tool returns structured JSON. Snapshots save to disk and return the file path — the MCP server runs as a local subprocess, so the agent has filesystem access to read the file.

**Snapshot response:**
```json
{
  "success": true,
  "file_path": "/path/to/snapshots/nyc_cam_1234.jpg",
  "size_bytes": 14579,
  "content_type": "image/jpeg",
  "camera": { "id": "nyc-bb-21-...", "name": "BB-21 North Rdwy", "location": "Manhattan, New York, USA" }
}
```

## Registry

**524 cameras** across two cities:
- 424 London TfL JamCams (all boroughs)
- 100 NYC TMC traffic cams (all 5 boroughs)

All verified, all work with zero API keys at fetch time. Cameras live in `cameras.json` — one file, one source of truth.

### Self-healing

A GitHub Action runs nightly at 3 AM UTC:
- Checks cameras not validated in the last 7 days, plus any flagged as suspect
- First failure marks as suspect, second consecutive failure removes and opens a GitHub issue
- Vision AI (GPT-4o-mini via GitHub Models) catches cameras returning error pages or placeholders
- Suspect cameras that recover are cleared automatically

## Use cases

- **Live traffic monitoring** — agents can check current conditions at specific intersections
- **Weather observation** — outdoor cameras show real-time weather and visibility
- **Location verification** — confirm what's happening at a place right now
- **Timezone-aware research** — check daytime/nighttime conditions across cities
- **Building automation** — feed live camera data into agent workflows

## API Keys (optional)

Most cameras work out of the box. Some require a free API key. If a snapshot fails with a key error, the response tells you where to sign up and how to configure it.

Create `~/.openeagleeye/config.json`:

```json
{
  "api_keys": {
    "PROVIDER_API_KEY": "your-key-here"
  }
}
```

Use `get_config_info` to check which cameras need keys and whether yours are set.

## Adding cameras

1. Find a direct-image URL (must return `image/jpeg` or `image/png` on plain GET)
2. Use `draft_webcam` with the URL, location, and timezone
3. Test with `get_webcam_snapshot`
4. Open a PR to contribute — the validator will check it automatically

Good sources: city DOTs, weather stations, ski resorts, national parks, ports, airports.

## Contributing

Pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
