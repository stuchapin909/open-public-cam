# Agent Guide — Open Public Cam MCP Server

## What This Server Does

Captures live webcam snapshots via direct HTTP GET requests that return images (JPEG/PNG). No JavaScript rendering, no authentication, no stream decoding. Just a URL that returns a picture.

## Valid Source Types

A valid webcam URL must:
1. Return HTTP 200
2. Have `Content-Type: image/jpeg` or `image/png` (or similar `image/*`)
3. Return an actual camera frame — not a static logo, error page, or placeholder
4. Be accessible without authentication, cookies, or session tokens

### Known Good Patterns

**Traffic camera APIs:**
- `https://nyctmc.org/api/cameras/{uuid}/image` (NYC — 953 cameras)
- State DOT camera image endpoints (look for `/image`, `/snapshot`, `/cameraImage` in URLs)
- Many cities have similar APIs — search for "[city] traffic camera API" or "[city] DOT camera image"

**Municipal / government cameras:**
- Port authority cams
- Airport perimeter cams
- Bridge and tunnel authority cams
- Water/sewer authority cams

**Weather and environmental:**
- Personal weather station webcams (Weather Underground, PWSWeather)
- Ski resort cams (some expose direct image URLs)
- National park webcams
- River gauge cameras (USGS)

**University and institutional:**
- Campus webcams (some universities publish direct image feeds)
- Observatory cameras

### URL Patterns to Look For

When browsing a webcam page, check the network requests for:
- `/image`, `/snapshot`, `/snap`, `/photo`, `/current.jpg`, `/latest.jpg`
- `/api/camera/.../image`
- `/cgi-bin/.../image`
- Any endpoint that returns `image/jpeg` or `image/png`

Use browser dev tools or curl to inspect. If the page uses a JavaScript player, the actual image URL is usually buried in the page source or loaded via XHR.

## Invalid Source Types

Do NOT add these — they will not work:
- YouTube live streams or video URLs
- EarthCam, SkylineWebcams, WebcamTaxi page URLs (these are player pages, not image endpoints)
- RTSP, HLS, or DASH stream URLs (video streams, not images)
- Pages that require JavaScript to load the camera image
- URLs behind Cloudflare challenges, CAPTCHAs, or cookie consent walls
- Any URL requiring authentication or API keys

## How to Add a Webcam

1. **Verify the URL returns an image:**
   ```
   curl -I -s https://example.com/camera/image | grep content-type
   ```
   Must contain `image/`.

2. **Verify it's a live camera frame, not a static image:**
   - Fetch it twice, a few seconds apart. File size or content should change slightly.
   - Or use vision analysis to confirm it shows a live scene with a recent timestamp.

3. **Add it using the `draft_webcam` tool:**
   - `name`: descriptive name (e.g. "I-95 @ Exit 42 NB")
   - `url`: the direct image URL
   - `location`: city/area (e.g. "Stamford, Connecticut, USA")
   - `timezone`: IANA timezone (e.g. "America/New_York")
   - `category`: one of `city`, `park`, `highway`, `airport`, `port`, `weather`, `nature`, `landmark`, `other`

4. **Test it with `get_webcam_snapshot`** using the returned ID to confirm the capture works end-to-end.

5. **Contribute upstream** by pushing the change or opening a PR. A GitHub Action automatically validates all new entries in `community-registry.json` — it checks schema, verifies URLs return live images, and optionally uses vision AI to confirm real webcam content. Invalid entries are rejected with feedback.

## How to Report a Broken Webcam

Use `draft_webcam_report` with:
- `cam_id`: the webcam's ID
- `status`: `offline`, `broken_link`, or `low_quality`
- `notes`: optional description of the problem

Reports are blocked during nighttime at the webcam's timezone (8pm–6am) to avoid false negatives from dark images.

## Tips for Discovery

- Search for "[city] traffic cameras" — many DOT sites have image APIs
- Search for "webcam directory direct image URL"
- Check if a city's traffic management center has a public API
- GitHub repositories sometimes list public camera image URLs
- Government open data portals sometimes include camera feeds
- University facilities pages sometimes have direct webcam image links
- If you find a webcam page but can't find the image URL, check the page source for `<img>` tags or JavaScript that constructs the image URL from a camera ID
