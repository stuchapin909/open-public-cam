# Minnesota (US) Traffic Cameras - Research Notes

## Source: MnDOT / 511 Minnesota (CARS Program)

### API Details
- **API URL:** `https://mntg.carsprogram.org/cameras_v1/api/cameras`
- **Auth:** None required
- **Method:** GET returns JSON array of camera objects
- **Frontend:** https://511mn.org/

### Camera Types
The API returns two view types:
1. **WMP** (video stream): Has `videoPreviewUrl` pointing to `https://public.carsprogram.org/cameras/MN/{CODE}` — returns JPEG on GET
2. **STILL_IMAGE**: Has `url` pointing to `https://public.carsprogram.org/cameras/MN/{CODE}` — returns JPEG on GET

Both types serve valid JPEG images via HTTP GET from CloudFront CDN.

### Image URL Pattern
```
https://public.carsprogram.org/cameras/MN/{CAMERA_CODE}
```
Camera codes include formats like `C5013`, `C30337-v1`, `D6-C030`, `C10-04`.

### Data Fields Used
- `id`: API camera ID
- `name`: Camera name (intersection/location)
- `location.latitude` / `location.longitude`: Coordinates
- `location.routeId`: Route designation (I-35, US 14, MN 55, etc.)
- `location.cityReference`: City reference string (parsed to extract city name)
- `views[]`: Array of view objects with URL and type

### Validation
- **Date:** 2026-04-01
- **API returned:** 1,517 cameras with 1,931 total views
- **URL validation:** 1,931 URLs checked with HEAD requests
- **Failed:** 31 URLs returned 403 (application/xml)
- **Valid and committed:** 1,900 cameras
- **Vision check:** 3 samples confirmed as real traffic camera feeds

### Camera Distribution (Top Cities)
| City | Count |
|------|-------|
| Minneapolis | 89 |
| Saint Paul | 54 |
| Duluth | 38 |
| Eagan | 35 |
| Maplewood | 31 |
| Bloomington | 28 |
| Rochester | 28 |
| Golden Valley | 27 |
| Plymouth | 27 |
| Maple Grove | 26 |

### Notes
- Camera owner listed as "Iris" for all cameras
- Some cameras are co-located with weather stations (RWIS)
- Some rural cameras have multiple views (v1, v2, v3, v4)
- 31 cameras return 403 — these appear to be offline or access-restricted
- Images update regularly (observed timestamps within 1-5 minutes)
