# Queensland DOT Traffic Cameras

## Summary

Queensland Department of Transport and Main Roads provides two GeoJSON feeds covering traffic and flood cameras across the state. **247 cameras total** (138 traffic + 109 flood). All have GPS coordinates, direct JPEG URLs, no authentication required.

---

## API Endpoints

- **Traffic cameras**: `https://data.qldtraffic.qld.gov.au/webcameras.geojson` (GET, GeoJSON FeatureCollection)
- **Flood cameras**: `https://data.qldtraffic.qld.gov.au/floodcameras.geojson` (GET, GeoJSON FeatureCollection)

## How to Fetch

Simple GET request to each endpoint. Returns GeoJSON with `features[]` array.

```bash
curl -s "https://data.qldtraffic.qld.gov.au/webcameras.geojson"
curl -s "https://data.qldtraffic.qld.gov.au/floodcameras.geojson"
```

## Data Structure

Each feature has:
- `geometry.coordinates`: `[lng, lat]` in EPSG:7844 (swap to `{lat, lng}`)
- `properties.id`: numeric ID (unique per feed, NOT across feeds)
- `properties.description`: human-readable location (e.g., "Archerfield - Ipswich Motorway & Granard Rd - North")
- `properties.image_url`: direct JPEG URL at `cameras.qldtraffic.qld.gov.au`
- `properties.locality`: suburb/town name
- `properties.district`: region (Metropolitan, Gold Coast, Sunshine Coast, etc.)
- `properties.direction`: camera direction (North, South, East, etc.)

## Image URL Pattern

- Traffic: `https://cameras.qldtraffic.qld.gov.au/{District}/{descriptive-name}.jpg`
- Flood: `https://cameras.qldtraffic.qld.gov.au/resized/{uuid}.jpg`

## Authentication

None required.

## Coordinate Notes

- EPSG:7844 (essentially WGS84 for Australia)
- GeoJSON order: `[lng, lat]` — must swap to `{lat, lng}`
- All 247 cameras have valid coordinates (zero nulls)

## Content-Type Notes

- Traffic cameras return `image/jpeg`
- Flood cameras return `binary/octet-stream` but actual content is JPEG — magic byte detection handles this

## City Consolidation

180 unique localities consolidated to 20 cities:
- Regional Queensland (101) — remote towns, flood cameras, outback
- Brisbane metro (46) — Archerfield, Nudgee, Indooroopilly, etc.
- Gold Coast (28) — Southport, Nerang, Robina, etc.
- Sunshine Coast (16) — Maroochydore, Buderim, Cooroy, etc.
- Toowoomba (12)
- Caboolture (10)
- Cairns (7)
- Bundaberg (4)
- Logan (3), Rockhampton (3), Townsville (3)
- Plus 11 smaller cities with 1-2 cameras each

## ID Scheme

- Traffic: `qld-{api_id}-{slugified_locality}`
- Flood: `qld-flood-{api_id}-{slugified_locality}`
- No ID collisions between feeds or with existing registry

## Integration Date

March 31, 2026 — 247 cameras added to registry
