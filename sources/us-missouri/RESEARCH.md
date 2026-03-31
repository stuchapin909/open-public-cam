# Missouri (US) — MoDOT Traffic Cameras

## Source: Missouri Department of Transportation (MoDOT) Traveler Information Map

- **URL**: https://traveler.modot.org/map/
- **API**: https://traveler.modot.org/map/js/snapshot.json
- **Type**: JPEG snapshot cameras (static images)
- **Auth required**: No

## Camera Data

- **API returned**: 13 snapshot cameras
- **Failed validation** (0-byte response): 2 cameras (IDs 3, 12)
  - Cam 3: I-44 @ Rolla Highway Patrol
  - Cam 12: US-63@RT-CC_WestPlains
- **Vision validated**: 3 of 11 samples confirmed real traffic webcam feeds
- **Committed**: 11 cameras

## URL Pattern

```
https://traveler.modot.org/traffic_camera_snapshots/{route}@{road}_{city}/{route}@{road}_{city}.jpg
```

## Notes

- MoDOT also has 880 streaming cameras (HLS/m3u8) at `https://traveler.modot.org/timconfig/feed/desktop/StreamingCams2.json` — these are video streams, not suitable for static image registry.
- Gateway Guide (St. Louis) and Kansas City Scout are separate systems with HLS-only cameras.
- Snapshot cameras update periodically (Last-Modified header available).
- Image overlays include location text, timestamp, and "snapshot cam" label.

## Other Missouri Sources (blocked/inaccessible)

- **Ozarks Traffic** (https://www.ozarkstraffic.com/): WAF blocked (Incapsula)
- **Gateway Guide** (https://www.gatewayguide.com/): Returns 404 on camera endpoints
- **Kansas City Scout** (https://www.kcscout.net/): HLS-only cameras, no JPEG snapshots

## Validation Date

2026-03-31
