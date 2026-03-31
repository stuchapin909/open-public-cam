# Why Open Eagle Eye

## The problem

AI agents can read, write, search, and code -- but they can't see. If you ask Claude "what's the traffic like near the Space Needle right now?" or "is it snowing at Vail?", the agent has to guess or tell you it can't look.

## Existing options

| | Open Eagle Eye | SkylineWebcams | EarthCam | webcam.taxi | Other MCP camera servers |
|---|---|---|---|---|---|
| **Camera count** | 32,000+ | ~17,000 | ~2,000 | ~10,000 | Usually <100 |
| **Agent-native** | Yes -- structured JSON, MCP protocol | No -- website for humans | No -- website for humans | No -- website for humans | Some, varies |
| **Access method** | One HTTP GET per image | Browser, JS rendering | Browser, JS rendering | Browser, JS rendering | Varies |
| **Authentication** | None required (most) | Free account needed | Paid subscription | None | Varies |
| **Video streams** | No -- JPEG/PNG only | Yes (Flash, HLS) | Yes (HLS) | Mixed | Varies |
| **Self-healing** | Nightly validation with vision AI | Manual reports | Manual | Unknown | Unknown |
| **Open source** | Yes (MIT) | No | No | No | Some |
| **API access** | npm package, MCP server, GitHub raw JSON | No public API | No public API | No public API | Varies |

## What "agent-native" means

Most webcam directories are built for humans browsing a website. They render pages with JavaScript, embed video players, show ads, and require cookie consent. An AI agent can't use any of that.

Open Eagle Eye is built for agents. Every tool returns structured JSON. Snapshots are saved to disk as files, not embedded as base64 bloat. The camera registry is a flat JSON array fetched with one HTTP request. No JavaScript rendering, no browser automation, no video decoding.

The constraint is intentional: we only index cameras that return a JPEG or PNG on a plain HTTP GET. This excludes video streams, authenticated feeds, and JavaScript-rendered pages -- but it means any agent, in any runtime, on any platform, can fetch a camera image with a single HTTP request.

## What "self-healing" means

Camera feeds break. Servers get upgraded, URLs change, cameras get decommissioned. A static registry rots.

Open Eagle Eye runs a nightly GitHub Action that:
- Validates every camera's URL (HTTP status, content-type, magic bytes)
- Uses vision AI to catch cameras serving error pages instead of live feeds
- Gives failing cameras one retry before removal (temporary outages recover)
- Commits removals automatically -- the registry stays clean without human intervention

## Why not just use Google Images?

Google Images shows you what a place looked like when someone photographed it. A webcam shows you what it looks like right now. For an AI agent answering questions about current conditions -- traffic, weather, crowd size, snow coverage -- the difference matters.

## Why JPEG/PNG only?

Video streams (RTSP, HLS, DASH) require specialized decoding, constant bandwidth, and often proprietary players. They're useful for live monitoring but impractical for an agent that just needs to check a condition ("is the road clear?") and move on.

A single static image captures the current state. It downloads in under a second, uses a few KB of bandwidth, and works everywhere. The MCP server fetches it, saves it to disk, and returns a file path that the agent's vision model can analyze. One tool call, one image, one answer.

## Why no audio?

Audio from public cameras raises serious privacy concerns. Even when cameras are in public spaces, audio can inadvertently capture private conversations. JPEG/PNG still images of public spaces have a well-established legal footing worldwide. Audio doesn't.

## Why open source?

Camera registries tend to be commercial products with usage limits, API keys, and restrictive licenses. We think a curated, validated, open registry of public camera feeds is infrastructure that should be free. The more agents and developers use it, the more sources get contributed, and the better it gets for everyone.
