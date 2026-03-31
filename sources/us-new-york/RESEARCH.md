# New York 511 Traffic Cameras

## Summary

NY 511 statewide traffic cameras via the DataTables API. 2,292 cameras total from the API. After filtering out non-NY cameras (Ontario, Connecticut, New Jersey) and null coordinates, **1,844 cameras** added to the registry.

---

## API Endpoint

- **Listing**: `https://511ny.org/List/GetData/Cameras` (POST, DataTables server-side format)
- **Image**: `https://511ny.org/map/Cctv/{id}` (GET, direct JPEG or PNG)

## How to Fetch

1. POST to `https://511ny.org/List/GetData/Cameras` with JSON body:
   ```json
   {"draw": 1, "start": 0, "length": 100, "columns": [{"data": "sortOrder", "name": "sortOrder"}]}
   ```
2. Increment `start` by 100 for each page until no more results
3. Response includes `recordsTotal` (2,292) and `data` array

### Required Headers

```
Content-Type: application/json
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0
```

## Image URL Pattern

`https://511ny.org/map/Cctv/{id}` — returns either JPEG or PNG depending on camera source

## Authentication

None required.

## Data Sources

The NY 511 API aggregates cameras from three sources:
- **NYSDOT** (317 cameras) — New York State Department of Transportation
- **Skyline** (1,537 cameras) — Skyline Communication (parks, parkways, LIE)
- **TRAFFICLAND** (438 cameras) — includes cameras from neighboring states (NJ Turnpike, CT highways, Ontario QEW)

## Filtering Notes

The API includes cameras from neighboring jurisdictions that must be filtered out:
- **Ontario, Canada** (~21 cameras): QEW, Hwy 405, Hwy 406 cameras near Niagara border. Identified by `lat > 43.0, lng < -79.0` with location containing "QEW", "405", or "406"
- **Connecticut** (~397 cameras): I-95, I-91, CT-15 cameras. Identified by `lat >= 41.0, lng >= -73.75, lng <= -72.0`
- **New Jersey** (~26 cameras): NJ Turnpike, Garden State Parkway cameras. Identified by `lat < 40.5, lng <= -73.9`
- **Null coordinates** (4 cameras): Portable/temporary cameras with `(0, 0)` coordinates

## Coordinate Format

WKT (Well-Known Text) in `latLng.geography.wellKnownText`: `POINT (lng lat)` — must swap to `{lat, lng}`.

## ID Prefix Convention

`ny-{id}` (using the API's camera ID)

## City Extraction

- **County-based**: API provides county for ~1,591 cameras. Mapped to county seat city.
- **Region-based fallback**: For cameras without county, use region name to derive city.
- **No city field in API**: All cameras lack explicit city data; derived from county/region.
- **NYC boroughs**: Bronx, Kings (Brooklyn), Queens, New York (Manhattan), Richmond (Staten Island) mapped directly.

## Pagination

Yes — server-side DataTables pagination. `length=100` max per page. 23 pages for 2,292 cameras.

## Image Format

Mixed: approximately 80% PNG, 20% JPEG. Both formats confirmed valid with proper magic bytes.

## Timezone

`America/New_York` (all cameras)

## Country

`US`

## Category

`highway` (all cameras — state highways, parkways, and expressways)

## Validation Results

- **HTTP validation**: 200/200 samples returned valid images (JPEG or PNG, >500B)
- **Vision validation**: 9/10 samples confirmed as real traffic webcam feeds (1 failed due to PNG parsing in vision tool, but HTTP check confirmed valid PNG)
- **No duplicate URLs or IDs** in the final NY batch

## Integration Reference

| Field | Value |
|-------|-------|
| Total from API | 2,292 |
| Added to registry | 1,844 |
| Excluded (Ontario) | 21 |
| Excluded (Connecticut) | 397 |
| Excluded (New Jersey) | 26 |
| Excluded (null coords) | 4 |
| ID prefix | `ny-{id}` |
| Image URL | `https://511ny.org/map/Cctv/{id}` |
| Content-Type | image/jpeg or image/png |
| Auth required | No |
| GPS available | Yes (from WKT) |
| Refresh rate | Unknown |

*Research conducted: 2026-03-31*
