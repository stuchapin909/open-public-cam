# Scotland (GB) Traffic Camera Research

**Date:** 2026-04-01
**Status:** BLOCKED — images served as base64 in API HTML, no direct JPEG URL

## Summary

Traffic Scotland has 414 cameras with excellent metadata (name, coordinates, road, region) via a public JSON API. However, camera images are embedded as base64 JPEG inside HTML responses from the `/tsis/camerahtml` endpoint — there is no separate direct JPEG URL endpoint.

---

## API Endpoint

- **Camera list**: `https://www.trafficscotland.org/tsis/cameras` (GET, no auth)
- **Response**: JSON with 414 cameras
- **Fields**: `sid` (ID), `title` (name), `lat`, `lng`, `roadname`, `images` (image ref ID), `region`
- **Regions**: Strathclyde, Lothian, Central, Grampian, Tayside, Fife, Highland, Dumfries & Galloway, Borders

### Sample Response
```json
{
  "sid": "1",
  "title": "M8 Kingston Br",
  "lat": "55.852826000000",
  "lng": "-4.270806100000",
  "roadname": "M8",
  "images": "16",
  "region": "Strathclyde"
}
```

### Camera HTML Endpoint
`https://www.trafficscotland.org/tsis/camerahtml?sid={sid}&title={title}`

Returns HTML containing:
```html
<div class="camera-image" tid="16">
  <img src="data:image/jpeg;base64,..." />
</div>
```

The `images` field maps to the `tid` attribute. No direct image URL exists — the base64 data is embedded inline.

---

## Roads Covered
M8, M9, M73, M74, M77, M80, M876, M898, A1, A7, A8, A9, A90, A720, A823, M90, A87, A82, A83, A85, A96, A99, etc.

## Estimated Camera Count
414

## Why Blocked
The camera images are not served as separate HTTP resources. They're generated server-side and embedded as base64 in the HTML popup content. To get a direct JPEG URL, Traffic Scotland would need to add a static image endpoint like `/tsis/image/{tid}.jpg`.

---

## Recommendations
1. If the registry ever supports base64 image extraction, this is a ready-to-go source
2. Could request Traffic Scotland add a direct image endpoint via their contact page
