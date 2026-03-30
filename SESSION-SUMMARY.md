# Open Eagle Eye — Session Summary (March 28-30, 2026)

## Project
- **Repo:** github.com/stuchapin909/Open-Eagle-Eye
- **Local path:** ~/projects/open-public-cam
- **Package:** openeagleeye v7.0.0 (npm, MCP server)
- **License:** MIT

## Current Registry: 25,843 cameras across 11 countries

| Country | Count | Sources |
|---------|-------|---------|
| US | 20,063 | NYC DOT, WSDOT, Caltrans CWWP2, CDOT CoTrip, VDOT 511, FDOT FL511, NCDOT, PennDOT 511PA, Arizona ADOT, Oregon ODOT, Nevada NDOT, Utah UDOT, Wisconsin WisDOT, New England 511 |
| FI | 2,223 | Digitraffic weather cameras (Fintraffic) |
| CA | 1,292 | Ontario MTO, Alberta 511 |
| HK | 995 | Hong Kong Transport Department |
| UK | 424 | London TfL JamCams |
| NZ | 251 | NZTA nationwide highways |
| BR | 195 | CET Sao Paulo urban traffic |
| AU | 159 | Sydney metro, Regional NSW |
| JP | 98 | NEXCO East expressways |
| SG | 90 | Singapore LTA |
| IE | 53 | TII motorway cams (M50 Dublin) |

Every camera has: id, name, url, category, location, timezone, country, city, coordinates (lat/lng), verified, auth.

## What was done this session

### Previous session carry-over
- Fixed missing `country` field on all cameras (mapped from timezone)
- Added Caltrans (3,430), Japan NEXCO East (98), NZ NZTA (251), Ireland TII (53)
- Removed 235 fabricated EU cameras (DE, DK, FR, NO, SE)

### This session additions (+11,120 cameras)

Previous session (March 28):

1. **Colorado CDOT** (+1,023) — CARS Program API at `cotg.carsprogram.org/cameras_v1/api/cameras`. Direct JPEG from `cocam.carsprogram.org/Snapshots/{ID}.flv.png`. All 12 FDOT districts. GPS coords included. No auth.

2. **Virginia VDOT** (+1,695) — GeoJSON API at `511.vdot.virginia.gov/services/map/layers/map/cams`. Direct PNG from `snapshot.vdotcameras.com/thumbs/{NAME}.flv.png`. 17 jurisdictions. GPS coords included. No auth.

3. **Florida FDOT** (+4,700) — POST API at `fl511.com/List/GetData/Cameras` (DataTables pagination, 100/page). Direct JPEG from `fl511.com/map/Cctv/{id}`. All 7 districts. GPS coords in WKT format. No auth. ~12% offline rate (15KB placeholder PNG).

4. **North Carolina NCDOT** (+779) — REST API at `eapps.ncdot.gov/services/traffic-prod/v1/cameras/` (list) + `/v1/cameras/{id}` (detail). Three image hosts: eapps, cfss, cfms. GPS coords included. No auth.

5. **Hong Kong Transport Department** (+995) — CSV listing at `static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.csv` (UTF-16LE with BOM). Direct JPEG from `tdcctv.data.one.gov.hk/{KEY}.JPG`. All 18 districts. GPS coords included. No auth. Updates every 2 minutes.

This session (March 29):

6. **Pennsylvania PennDOT** (+1,445) — DataTables POST API at `511pa.com/List/GetData/Cameras` (pagination, 100/page, 1,445 total). Direct JPEG from `511pa.com/map/Cctv/{id}`. Sources: PennDOT (1,279), RWIS (77), PTC/Pennsylvania Turnpike Commission (89). GPS coords in WKT format. No auth. All 15 validation samples returned valid JPEG (5-50KB).

7. **Arizona ADOT** (+604) — DataTables POST API at `az511.com/List/GetData/Cameras` (pagination, 100/page, 604 total). Direct JPEG/PNG from `az511.com/map/Cctv/{id}`. Source: AZDOT. Covers I-10, I-17, I-40, I-8, Loop 101/202/303, SR-51 and state routes statewide. GPS coords in WKT format. No auth. 12/12 validation samples returned valid images (mix of JPEG 27KB-545KB and PNG 15KB). Top cities: Phoenix (395), Tucson (53), Flagstaff (17), Nogales (16), Prescott (14).

8. **Oregon ODOT** (+1,120) — Camera inventory JSON at `tripcheck.com/Scripts/map/data/cctvinventory.js` (ESRI JSON with features array). Direct JPEG from `tripcheck.com/roadcams/cams/{filename}`. 765 highway + 355 city cameras. Covers I-5, I-84, I-205, I-405, I-82, US20, US26, US30, US395, US95, US97, US101, US199, US197, US730, OR18, OR22, OR126, OR140, OR217, OR219, OR221, and many state routes plus city/county cameras. GPS coordinates included (WGS84). No auth. 12/12 validation samples returned valid JPEG (10-32KB). Top cities: Portland (259), Vancouver WA (137), Oregon City (78), Eugene (53), Salem (33), Bend (31), Medford (22).

9. **Nevada NDOT** (+643) — DataTables POST API at `nvroads.com/List/GetData/Cameras` (pagination, 100/page, 643 total). Direct JPEG/PNG from `nvroads.com/map/Cctv/{id}`. Covers three regions: Las Vegas metro (367), Reno-Sparks (184), Elko (90). Highways include I-15, I-80, I-580, I-11, I-215, I-515, US-395, US-50, US-95, US-6, SR-227 and many local arterials. GPS coords in WKT format. No auth. 12/12 validation samples returned valid images (mix of JPEG 4-33KB and PNG 27KB).

March 30:

10. **Brazil CET São Paulo** (+195) — CET (Companhia de Engenharia de Tráfego) urban traffic cameras. Camera viewer at `cameras.cetsp.com.br/View/Cam.aspx` with embedded JavaScript array. Direct JPEG from `cameras.cetsp.com.br/Cams/{id}/1.jpg`. 195 valid cameras found in ID range 1-238 (with gaps). 11 cameras have known street names from the live page; 184 use numeric IDs. No GPS coordinates available from any current endpoint (old GeoServer at cetsp1.cetsp.com.br returns 404). All cameras use approximate São Paulo center coordinates. No auth. 12/12 validation samples returned valid JPEG (6.5-31KB).

11. **Finland Digitraffic** (+2,223) — Fintraffic Digitraffic weather camera API at `tie.digitraffic.fi/api/weathercam/v1/stations` (GeoJSON with features array). 804 camera stations with 2,223 active presets (camera angles). Direct JPEG from `weathercam.digitraffic.fi/{presetId}.jpg` (mix of 1280x720 and 720x576). Covers entire Finnish road network including highways (valtatiet), regional roads (kantatiet), and main roads (seututiet). GPS coordinates included (WGS84). No auth. Requires Accept-Encoding: gzip header. Images update every ~10 minutes. 6/6 validation samples returned valid JPEG (9.8-307KB). Top cities: Oulu (99), Tampere (44), Kuopio (39), Lappeenranta (37), Enontekiö (37), Inari (32), Savonlinna (31).

12. **Utah UDOT** (+2,026) — DataTables POST API at `udottraffic.utah.gov/List/GetData/Cameras` (pagination, 100/page, 2,026 total). Direct PNG/JPEG from `udottraffic.utah.gov/map/Cctv/{id}`. Source: ADX. Covers I-15, I-80, I-70, I-84, I-215, US-89, US-40, US-6, US-191, US-189, US-285 and many state routes plus city cameras. GPS coords in WKT format. No auth. 49/50 validation samples returned valid images (1 GIF placeholder for offline camera). 6/7 vision checks confirmed real webcam feeds. Top cities: Salt Lake City (186), St. George (92), Provo (90), Orem (73), Lehi (72).
13. **Wisconsin WisDOT** (+448) — DataTables POST API at `511wi.gov/List/GetData/Cameras` (pagination, 100/page, 448 valid out of 482 API records). Direct PNG from `511wi.gov/map/Cctv/{id}`. Source: ATMS. Covers I-41, I-43, I-90, I-94, US-41, US-51, US-151, US-14, US-18, WIS-29 and state routes plus Milwaukee metro. GPS coords in WKT format (34 cameras had null coords excluded). No auth. 50/50 validation samples returned valid PNG. 2/2 vision checks confirmed real webcam feeds. Top counties: Milwaukee (136), Dane (53), Waukesha (42), Brown (31).

14. **New England 511** (+408) — DataTables POST API at `newengland511.org/List/GetData/Cameras` (pagination, 100/page, 408 total). Direct JPEG from `newengland511.org/map/Cctv/{id}`. Covers three New England states: New Hampshire (185), Maine (134), Vermont (89). Highways include I-89, I-91, I-93, I-95, I-295, I-395, I-293, US-2, US-3, US-4, US-5, US-7, US-302, NH-101, NH-16, VT-9, VT-100, F.E. Everett Turnpike, Spaulding Turnpike, and many state routes. GPS coords in WKT format. No auth. 55/55 validation samples returned valid JPEG (4-470KB). 6/6 vision checks confirmed real webcam feeds (NHDOT, MaineDOT, VTrans).

### Infrastructure work (March 30)

12. **Registry-wide validation** — Validated all 30 image sources. 8 samples each from the 8 largest domains, 6 samples each from the 22 smaller domains. Results: all sources at 100% except `cam.pangbornairport.com` (1 camera offline). Total: 29/30 sources fully healthy. Key finding: NSW cameras require `Referer: https://www.livetraffic.com/traffic-cameras` header — the S3 bucket at `webcams.transport.nsw.gov.au` has hotlink protection. Without Referer, returns a 307-byte HTML error page ("camera image temporarily unavailable"). With Referer, all images serve correctly (46-134KB JPEG). NSW listing data still available via `www.livetraffic.com/datajson/all-feeds-web.json` (197 cameras, GeoJSON with GPS coords). Validator should be updated to send Referer for `webcams.transport.nsw.gov.au` URLs.

### Validation method
For each new source: download samples (6-12 per cluster), verify HTTP 200 + JPEG magic bytes (`\xff\xd8`) or PNG (`\x89PNG`) + reasonable file size (>500B-1KB). Send screenshots to user for visual confirmation.

### All commits this session
- `67370fd` — Add 1,023 Colorado CDOT cameras
- `dc52cce` — Add 1,695 Virginia VDOT cameras (10k milestone)
- `2d170ec` — Add 4,700 Florida FDOT cameras
- `286135d` — Add 779 North Carolina NCDOT cameras
- `d10f1b7` — Add 995 Hong Kong Transport Department cameras (9 countries)
- `7082b56` — Add 1,445 Pennsylvania PennDOT 511PA cameras
- `ce9f670` — Add 1,120 Oregon ODOT TripCheck cameras
- `53a68fc` — Add 643 Nevada NDOT cameras
- `4a9c287` — Add 195 Brazil CET São Paulo cameras (10 countries)
- `53079be` — Add 2,223 Finland Digitraffic weather cameras (11 countries)
- Add 2,026 Utah UDOT cameras
- Add 448 Wisconsin WisDOT cameras
- Add 408 New England 511 cameras (NH, ME, VT)
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
| **Chile** | Vias Chile cameras locked behind proprietary mobile apps (Costanera Norte, Vespucio Norte, etc.). No public web APIs or image endpoints found. UOCT has traffic junction data (3,501 points with GPS) but no camera feeds. |
| **South Africa** | i-traffic.co.za (SANRAL) has documented camera API (`/api/GetCameras`) but requires free registration for API key. Live images return placeholder without auth. |
| **India** | All government traffic police websites (btis.in, hyderabadpolice.gov.in, delhitrafficpolice.nic.in, etc.) either dead (HTTP 410), timing out from outside India, or DNS-failing. No public camera APIs exist. |

## Sources that could work with API keys
- **Ohio OHGO** — `publicapi.ohgo.com` — free registration
- **Sweden Trafikverket** — free API key registration
- **511.org** — free API key
- **South Africa i-traffic.co.za** — free registration for camera API

## Next steps (priority order)

### US states (high probability of success)
1. ~~**Arizona ADOT**~~ — DONE. 604 cameras from az511.com.
2. ~~**Oregon ODOT**~~ — DONE. 1,120 cameras from tripcheck.com.
3. ~~**Nevada NDOT**~~ — DONE. 643 cameras from nvroads.com.
4. **Georgia** — Retry if GDOT launches a new public API.
5. ~~**Wisconsin**~~ — DONE. 448 cameras from 511wi.gov (34 excluded for null coords).
6. ~~**New England 511**~~ — DONE. 408 cameras from newengland511.org (NH: 185, ME: 134, VT: 89).
7. **Louisiana** — 336 cameras from 511la.org (DataTables API, source: LADOTD).

### International (mixed probability)
6. ~~**Brazil**~~ — DONE. 195 cameras from CET São Paulo.
7. ~~**Chile**~~ — FAILED. Cameras locked behind proprietary mobile apps. No public APIs.
8. ~~**South Africa**~~ — FAILED. Requires free API key registration at i-traffic.co.za. Could work with a key.
9. ~~**India**~~ — FAILED. All government sites dead or inaccessible from outside India.
10. **Taiwan** — Revisit if we add MJPEG stream support to the server. 4,071 cameras waiting.

### Infrastructure improvements
11. ~~**NSW validation**~~ — DONE. Cameras still work but require `Referer: https://www.livetraffic.com/traffic-cameras` header (S3 bucket hotlink protection). Without Referer, returns 307-byte HTML error page. Validator should be updated to send Referer for NSW cameras.
12. ~~**Broader validation**~~ — DONE. Spot-checked 8 samples from each of 8 largest sources + 6 samples from each of 22 smaller sources. All sources at 100% except `cam.pangbornairport.com` (1 camera, offline). Total: 29/30 sources healthy.
13. ~~**Clean up temp files**~~ — DONE. Removed all `/tmp/*_cameras*.json`, `/tmp/*_samples/`, `/tmp/*_batch*` files.

## Key files

- `cameras.json — The registry (~9.7MB, 22,961 entries, JSON array), 22,961 entries, JSON array), 22,961 entries, JSON array)
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

ID naming convention: `{country_code}-{descriptive-slug}` (e.g., `co-i-70-...`, `va-nrocctvi66e00501`, `fl-1-0517n-...`, `nc-5-i-40-exit-270`, `td-H429F`, `az-635`, `or-i-5-at-roseburg-mp120-pid676`, `nv-mccarran-caughlin-cashill-2`, `br-cet-225`, `ne-nh-i-93-n-21-2-1234`).

## Workflow for adding a new source

1. **Research** — Find the listing API endpoint. Check if it returns JSON/XML/KML with camera IDs, names, image URLs, and ideally GPS coordinates.
2. **Validate** — Download 6-12 samples. Check HTTP 200 + JPEG/PNG magic bytes + reasonable file size.
3. **Parse** — Extract camera data, create registry entries with proper schema.
4. **Merge** — Append to cameras.json, deduplicate by ID.
5. **Screenshot** — Send representative samples from different areas to user.
6. **Commit** — Update README.md and CONTRIBUTING.md, commit and push.
7. **Note** — Florida showed ~12% offline rate; the nightly GitHub Action validator will catch dead cameras over time.
