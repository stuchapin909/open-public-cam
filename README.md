# Eagle Eye

[![Registry Validator](https://github.com/stuchapin909/Eagle-Eye/actions/workflows/validate-registry.yml/badge.svg)](https://github.com/stuchapin909/Eagle-Eye/actions/workflows/validate-registry.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

Instant webcam snapshots from public cameras worldwide. One HTTP GET, sub-second captures, no browser automation. Most cameras work with zero config; some optionally require free API keys.

## Quick start

```bash
npx eagleeye
```

Or install globally:

```bash
npm install -g eagleeye
eagleeye
```

Eagle Eye runs as an MCP server. Add it to your MCP client config:

```json
{
  "mcpServers": {
    "eagle-eye": {
      "command": "npx",
      "args": ["-y", "eagleeye"]
    }
  }
}
```

## How it works

A valid webcam URL is any endpoint that returns a JPEG or PNG image on a plain HTTP GET. That's it. No JavaScript rendering, no stream decoding, no ffmpeg. Most city traffic cameras, weather stations, and park cams expose exactly this.

## MCP Tools

| Tool | Description |
|---|---|
| `get_webcam_snapshot` | Capture a live snapshot from any registered webcam |
| `list_webcams` | List all webcams with status, location counts, and auth indicators |
| `search_webcams` | Search by name or location |
| `draft_webcam` | Add a webcam entry to the local registry (supports auth metadata) |
| `draft_webcam_report` | Report a broken or offline webcam |
| `get_config_info` | Show API key configuration status |
| `sync_registry` | Pull latest community data from GitHub |

## API Keys (optional)

Most cameras work out of the box with zero configuration. Some cameras require a free API key from their provider. If so, the tool will tell you where to sign up and how to configure it.

Create `~/.eagleeye/config.json`:

```json
{
  "api_keys": {
    "TFL_API_KEY": "your-tfl-app-key-here"
  }
}
```

Use `get_config_info` to check which cameras need keys and whether yours are configured.

## Registry

Webcams live in two places:

- **Curated list** (built in) -- verified cameras that ship with the server
- **Community registry** (`community-registry.json`) -- user-submitted, auto-validated by GitHub Actions

Every community submission runs through automated checks: schema validation, URL liveness, content-type verification, and vision AI to confirm it's actually a webcam and not a logo or error page.

### Adding a webcam

1. Find a direct-image URL (see [AGENT-GUIDE.md](AGENT-GUIDE.md) for tips)
2. Use `draft_webcam` to add it locally
3. Verify with `get_webcam_snapshot`
4. Push or open a PR -- the GitHub Action validates automatically

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

## Contributing

Pull requests welcome. See [AGENT-GUIDE.md](AGENT-GUIDE.md) for how to discover and verify new webcam sources.

Changes to `community-registry.json` are validated automatically -- bad URLs, wrong content types, and non-webcam images get rejected.

## License

MIT
