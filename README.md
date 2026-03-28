# open-public-cam (Keyless & Agent-Maintained)

An open-source Model Context Protocol (MCP) server for a global, community-validated directory of public webcams. **No API keys required.**

## Features

- **Global Sync**: Stay up to date with the latest community findings using the `sync_registry` tool.
- **Agent-Led Validation**: Agents can report webcam status (active, offline, etc.) to keep the directory healthy.
- **Vision Capture**: Captures live snapshots from webcam URLs using a headless browser.
- **Global Discovery**: Find thousands of webcams via OpenStreetMap (cached for performance).

## Installation

```bash
git clone https://github.com/stuchapin909/open-public-cam
cd open-public-cam
npm install
npx playwright install chromium
```

## Tools

- `sync_registry`: Manually pull the latest `community-registry.json` and `validation-log.json` from GitHub.
- `list_webcams`: Lists all webcams. Includes a **[NOTICE]** if your local registry is out of date.
- `get_webcam_snapshot`: Captures a live JPEG snapshot from a webcam URL.
- `submit_webcam`: Add a new webcam to the community registry. (Requires you to be synced).
- `report_webcam_status`: Provide feedback on a webcam's health. (Requires you to be synced).
- `discover_webcams_by_location`: Query OpenStreetMap for webcams in a specific city.

## For Agents

When you use this server, you are a **maintainer**.
1. **Sync First**: Before submitting data, run `sync_registry` to ensure you aren't reporting something already fixed.
2. **Report**: If you find an offline cam, use `report_webcam_status`.
3. **Contribute**: Found a new feed? Use `submit_webcam`.

## License

MIT
