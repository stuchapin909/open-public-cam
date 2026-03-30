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
| `list_webcams` | List cameras with filters (city, location, category) |
| `search_webcams` | Search by name, location, city, or category |
| `draft_webcam` | Add a new camera to the local registry |
| `draft_webcam_report` | Report a broken or offline camera |
| `get_config_info` | Check API key configuration status |
| `sync_registry` | Pull latest cameras from GitHub |

### Filtering

Every camera has a `city` field. Use `list_webcams` with `city: "Sydney"` to get a short, focused list instead of dumping all cameras into context. Available cities: London, New York, Sydney, Singapore, Toronto, Calgary, Spokane, and others.

### Output format

Every tool returns structured JSON. Snapshots save to disk and return the file path — the MCP server runs as a local subprocess, so the agent has filesystem access to read the file.

**Snapshot response:**
```json
{
  "success": true,
  "file_path": "/path/to/snapshots/a1b2c3d4e5f6a7b8.jpg",
  "size_bytes": 14579,
  "content_type": "image/jpeg",
  "camera": {
    "id": "nyc-bb-21-north-rdwy-at-above-south-st",
    "name": "BB-21 North Rdwy @ Above South St",
    "city": "New York",
    "location": "Manhattan, New York, USA",
    "coordinates": { "lat": 40.708, "lng": -73.999 }
  }
}
```

## Registry

**18,830 cameras** across nine countries:
- US: 15,430 (NYC, Washington State, California Caltrans, Colorado CDOT, Virginia VDOT, Florida FDOT, North Carolina NCDOT, Pennsylvania PennDOT, Arizona ADOT)
- CA: 1,292 (Ontario, Alberta)
- HK: 995 (Hong Kong Transport Department, all 18 districts)
- UK: 424 (London TfL JamCams, all boroughs)
- NZ: 251 (NZTA nationwide highways)
- AU: 197 (Sydney metro + Regional NSW)
- JP: 98 (NEXCO East expressways)
- SG: 90 (Singapore LTA traffic cams)
- IE: 53 (TII motorway cams)

Every camera has `country`, `city`, `location`, `timezone`, and `coordinates` (lat/lng). Cameras live in `cameras.json` — one file, one source of truth.

### Self-healing

A GitHub Action runs nightly at 3 AM UTC:
- Checks cameras not validated in the last 7 days, plus any flagged as suspect
- First failure marks as suspect, second consecutive failure removes and opens a GitHub issue
- Vision AI (GPT-4o-mini via GitHub Models) catches cameras returning error pages or placeholders
- Suspect cameras that recover are cleared automatically

### Security

- **SSRF protection** — blocks private IPs, cloud metadata endpoints, non-HTTP protocols, and DNS rebinding
- **Content-type whitelist** — only `image/jpeg` and `image/png` accepted
- **No redirect following** — max 1 redirect allowed (for CDNs that redirect to images), prevents redirect-based SSRF bypasses
- **Magic byte detection** — validates JPEG/PNG by file header when CDN returns wrong content-type
- **Push/PR cap** — max 500 cameras per push to prevent DoS via oversized PRs
- **Issue spam protection** — max 5 issues per run, dedup check before opening
- **Random filenames** — snapshots use random hex filenames, no camera ID in the path

## Use cases

- **Live traffic monitoring** — agents can check current conditions at specific intersections
- **Weather observation** — outdoor cameras show real-time weather and visibility
- **Location verification** — confirm what's happening at a place right now
- **Timezone-aware research** — check daytime/nighttime conditions across cities
- **Geospatial queries** — coordinates enable distance-based filtering
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
2. Use `draft_webcam` with the URL, city, location, timezone, and optional coordinates
3. Test with `get_webcam_snapshot`
4. Open a PR to contribute — the validator will check it automatically

Good sources: city DOTs, weather stations, ski resorts, national parks, ports, airports.

## Contributing

Pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
