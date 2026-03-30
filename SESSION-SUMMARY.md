# Open Eagle Eye — Session Summary (March 28, 2026)

## Project
- **Repo:** github.com/stuchapin909/Open-Eagle-Eye
- **Local path:** ~/projects/open-public-cam
- **Package:** openeagleeye v7.0.0 (npm, MCP server)
- **License:** MIT

## Current Registry: 18,830 cameras across 9 countries

| Country | Count | Sources |
|---------|-------|---------|
| US | 15,430 | NYC DOT (100), WSDOT (1,654), Caltrans CWWP2 (3,430), CDOT CoTrip (1,023), VDOT 511 (1,695), FDOT FL511 (4,700), NCDOT (779), PennDOT 511PA (1,445), Arizona ADOT (604) |
| CA | 1,292 | Ontario MTO (923), Alberta 511 (369) |
| HK | 995 | Hong Kong Transport Department |
| UK | 424 | London TfL JamCams |
| NZ | 251 | NZTA nationwide highways |
| AU | 197 | Sydney metro (153) + Regional NSW (44) |
| JP | 98 | NEXCO East expressways |
| SG | 90 | Singapore LTA |
| IE | 53 | TII motorway cams (M50 Dublin) |

Every camera has: id, name, url, category, location, timezone, country, city, coordinates (lat/lng), verified, auth.

## What was done this session

### Previous session carry-over
- Fixed missing `country` field on all cameras (mapped from timezone)
- Added Caltrans (3,430), Japan NEXCO East (98), NZ NZTA (251), Ireland TII (53)
- Removed 235 fabricated EU cameras (DE, DK, FR, NO, SE)

### This session additions (+9,796 cameras)

Previous session (March 28):

1. **Colorado CDOT** (+1,023) — CARS Program API at `cotg.carsprogram.org/cameras_v1/api/cameras`. Direct JPEG from `cocam.carsprogram.org/Snapshots/{ID}.flv.png`. All 12 FDOT districts. GPS coords included. No auth.

2. **Virginia VDOT** (+1,695) — GeoJSON API at `511.vdot.virginia.gov/services/map/layers/map/cams`. Direct PNG from `snapshot.vdotcameras.com/thumbs/{NAME}.flv.png`. 17 jurisdictions. GPS coords included. No auth.

3. **Florida FDOT** (+4,700) — POST API at `fl511.com/List/GetData/Cameras` (DataTables pagination, 100/page). Direct JPEG from `fl511.com/map/Cctv/{id}`. All 7 districts. GPS coords in WKT format. No auth. ~12% offline rate (15KB placeholder PNG).

4. **North Carolina NCDOT** (+779) — REST API at `eapps.ncdot.gov/services/traffic-prod/v1/cameras/` (list) + `/v1/cameras/{id}` (detail). Three image hosts: eapps, cfss, cfms. GPS coords included. No auth.

5. **Hong Kong Transport Department** (+995) — CSV listing at `static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv` (UTF-16LE with BOM). Direct JPEG from `tdcctv.data.one.gov.hk/{KEY}.JPG`. All 18 districts. GPS coords included. No auth. Updates every 2 minutes.

This session (March 29):

6. **Pennsylvania PennDOT** (+1,445) — DataTables POST API at `511pa.com/List/GetData/Cameras` (pagination, 100/page, 1,445 total). Direct JPEG from `511pa.com/map/Cctv/{id}`. Sources: PennDOT (1,279), RWIS (77), PTC/Pennsylvania Turnpike Commission (89). GPS coords in WKT format. No auth. All 15 validation samples returned valid JPEG (5-50KB).

7. **Arizona ADOT** (+604) — DataTables POST API at `az511.com/List/GetData/Cameras` (pagination, 100/page, 604 total). Direct JPEG/PNG from `az511.com/map/Cctv/{id}`. Source: AZDOT. Covers I-10, I-17, I-40, I-8, Loop 101/202/303, SR-51 and state routes statewide. GPS coords in WKT format. No auth. 12/12 validation samples returned valid images (mix of JPEG 27KB-545KB and PNG 15KB). Top cities: Phoenix (395), Tucson (53), Flagstaff (17), Nogales (16), Prescott (14).

### Validation method
For each new source: download samples (6-12 per cluster), verify HTTP 200 + JPEG magic bytes (`\xff\xd8`) or PNG (`\x89PNG`) + reasonable file size (>500B-1KB). Send screenshots to user for visual confirmation.

### All commits this session
- `67370fd` — Add 1,023 Colorado CDOT cameras
- `dc52cce` — Add 1,695 Virginia VDOT cameras (10k milestone)
- `2d170ec` — Add 4,700 Florida FDOT cameras
- `286135d` — Add 779 North Carolina NCDOT cameras
- `d10f1b7` — Add 995 Hong Kong Transport Department cameras (9 countries)
- `7082b56` — Add 1,445 Pennsylvania PennDOT 511PA cameras
- Plus CONTRIBUTING.md and README.md updates interleaved

## Failed sources (do not retry without new approach)

| Source | Issue |
|--------|-------|
| Georgia GDOT (511ga) | HTTP 410. Internal RTSP servers, not publicly accessible. |
| Tennessee TDOT | API requires authentication (HTTP 401). |
| Ohio ODOT (OHGO) | Requires free registration at publicapi.ohgo.com. Could work with a key. |
| Germany, France, Sweden, Denmark, Norway | JS-heavy SPAs, no direct image URLs. |
| **South Korea EXCO** | API at data.ex.co.kr requires Korean identity verification + session auth. All government sites blocked/unreachable from our network. |
| **Taiwan TDX** | 4,071 cameras found via TDX API, but images are MJPEG streams (multipart/x-mixed-replace), not static JPEG. No static snapshot endpoint exists. Would need server-side MJPEG frame extraction. |
| **Japan NEXCO Central/West** | Camera data found at c-ihighway.jp (80 cams) and ihighway.jp (361 cams), but image URLs return 404 when accessed directly. Session/referer restricted. |
| **UAE Dubai RTA** | traffic.rta.ae behind WAF (Request Rejected). dubairoads.ae domain defunct. Abu Dhabi ITC camera pages return 404. |
| 511.org (Bay Area) | Requires API key. |

## Sources that could work with API keys
- **Ohio OHGO** — `publicapi.ohgo.com` — free registration
- **Sweden Trafikverket** — free API key registration
- **511.org** — free API key

## Next steps (priority order)

### US states (high probability of success)
1. ~~**Arizona ADOT**~~ — DONE. 604 cameras from az511.com.
2. **Oregon ODOT** — TripCheck has a well-known camera system. Check tripcheck.com for API endpoints.
3. **Nevada NDOT** — Check nvroads.com for camera feeds.
4. **Georgia** — Retry if GDOT launches a new public API.

### International (mixed probability)
6. **Brazil** — CET (Sao Paulo) and DER/ARTESP (state highways) may have camera feeds.
7. **Chile** — Vias Chile operates highway cameras on Santiago's expressways.
8. **South Africa** — SANRAL toll roads may have camera feeds.
9. **India** — Some metro cities (Bangalore, Hyderabad) have traffic camera networks.
10. **Taiwan** — Revisit if we add MJPEG stream support to the server. 4,071 cameras waiting.

### Infrastructure improvements
11. **NSW validation** — The 197 AU cameras may need URL pattern update. Check nightly validator results.
12. **Broader validation** — Run spot checks on larger batches (Caltrans 3,430, FL511 4,700) to estimate actual live counts.
13. **Clean up temp files** — `/tmp/ca_cameras.json`, `/tmp/eu_cameras.json`, `/tmp/fl_cameras_raw.json`, `/tmp/nc_cameras_raw.json`, `/tmp/hk_cameras.json`, `/tmp/*_samples/`, `/tmp/*_batch*` can be deleted.

## Key files

- `cameras.json` — The registry (~4.9MB, 18,830 entries, JSON array)
- `index.js` — MCP server (main package entry point)
- `validate-registry.js` — GitHub Action validator
- `merge_validate.mjs` — Local merge + validation script
- `fetch_samples.mjs` — Fetch sample images from cameras
- `.registry-state.json` — Validator state (last checked, suspect flags)
- `README.md` — Documentation
- `CONTRIBUTING.md` — Contribution guidelines

## Registry format

The registry is a JSON array. Each entry:
```json
{
  "id": "co-i-70-mp-145-80-eb",
  "name": "I-70 MP 145.80 EB : 1.0 mile W of Eby Creek Rd",
  "url": "https://cocam.carsprogram.org/Snapshots/070E14580CAM1GP2.flv.png",
  "category": "highway",
  "location": "Eagle, Colorado, USA",
  "timezone": "America/Denver",
  "country": "US",
  "city": "Eagle",
  "coordinates": { "lat": 39.653981, "lng": -106.8406 },
  "verified": false,
  "auth": false
}
```

ID naming convention: `{country_code}-{descriptive-slug}` (e.g., `co-i-70-...`, `va-nrocctvi66e00501`, `fl-1-0517n-...`, `nc-5-i-40-exit-270`, `td-H429F`, `az-635`).

## Workflow for adding a new source

1. **Research** — Find the listing API endpoint. Check if it returns JSON/XML/KML with camera IDs, names, image URLs, and ideally GPS coordinates.
2. **Validate** — Download 6-12 samples. Check HTTP 200 + JPEG/PNG magic bytes + reasonable file size.
3. **Parse** — Extract camera data, create registry entries with proper schema.
4. **Merge** — Append to cameras.json, deduplicate by ID.
5. **Screenshot** — Send representative samples from different areas to user.
6. **Commit** — Update README.md and CONTRIBUTING.md, commit and push.
7. **Note** — Florida showed ~12% offline rate; the nightly GitHub Action validator will catch dead cameras over time.
