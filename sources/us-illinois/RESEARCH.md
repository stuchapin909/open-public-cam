# Illinois Traffic Cameras (Metro East / St. Louis Area)

## Summary

34 traffic cameras from stltraffic.org covering the Metro East Illinois region (St. Louis metropolitan area, Illinois side). Operated by SIUE (Southern Illinois University Edwardsville) with IDOT connection. Direct JPEG image URLs, no authentication required.

---

## API Endpoint

- **Camera list**: `https://stltraffic.org/geoFiles/geo.json` (GET, GeoJSON FeatureCollection)
- **Total dataset**: 71 cameras (Missouri + Illinois combined)
- **Illinois cameras**: 34 (filtered by coordinates west of -90.1 and IL road references)

## Image URL Pattern

`https://stltraffic.org/images/cameras/camera_{ID}/snapshot.jpg`

## Data Structure

Each GeoJSON feature has:
- `geometry.coordinates`: `[lng, lat]`
- `properties.id`: numeric camera ID (802-874)
- `properties.description`: human-readable location (e.g., "I-270 @ MP 2.4 (IL-3)")
- `properties.image`: direct JPEG URL

## Camera Hardware

All cameras are AXIS Q6055-E PTZ cameras. EXIF data confirms live timestamps and varying resolutions (800x450, 1280x720).

## Authentication

None required. CORS headers present (`access-control-allow-origin: *`).

## Coordinate Notes

- WGS84 coordinates from GeoJSON
- GeoJSON order: `[lng, lat]` — swapped to `{lat, lng}` for registry
- All 34 Illinois cameras have valid coordinates

## Coverage Area

Metro East Illinois, across the Mississippi River from St. Louis:
- East St. Louis (19) — I-55/64/70 corridor, MLK Bridge, Stan Musial Bridge
- Pontoon Beach (5) — I-270 corridor
- East Carondelet (2) — I-255/JB Bridge
- Alton (2) — Clark Bridge
- Venice (2) — McKinley Bridge
- Edwardsville (2) — I-270 at IL-157/IL-159
- Waterloo (1) — I-255
- Fairview Heights (1) — I-64 at IL-111

## ID Scheme

`il-stl-{api_id}` (e.g., `il-stl-810`)

## Dead Sources Investigated

| Source | URL | Result |
|--------|-----|--------|
| IDOT gettingaroundillinois.com | gettingaroundillinois.com | Camera pages return 404, system dismantled |
| Chicago CDOT | Socrata dataset 3h5f-qeyv | Dataset missing, trafficcam.cityofchicago.org doesn't resolve |
| Illinois Tollway | illinoistollway.com/cameras | React SPA, API endpoints return HTML (SPA routing) |

## Integration Date

April 1, 2026 — 34 cameras added to registry
