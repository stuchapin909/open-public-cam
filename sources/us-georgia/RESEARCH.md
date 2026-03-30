# Georgia 511 (GDOT Navigator)

## Summary

Georgia Department of Transportation traffic cameras via the 511ga.org DataTables API. 3,861 cameras across 136+ cities/counties. Covers Atlanta metro (DeKalb, Fulton, Cobb, Gwinnett, Clayton, Henry) plus all major state routes.

---

## API Endpoint

- **Listing**: `https://511ga.org/List/GetData/Cameras` (POST)

## How to Fetch

1. POST to `https://511ga.org/List/GetData/Cameras` with DataTables JSON body
2. Body: `{"draw":1,"start":OFFSET,"length":100,"columns":[{"data":"sortOrder","name":"sortOrder"}]}`
3. Response: `{"recordsTotal":3861,"data":[...]}`
4. Paginate with start=0, 100, 200, ... until data array is empty

## Image URL Pattern

`https://511ga.org/map/Cctv/{imageId}` — direct PNG

The `imageId` comes from `data[].images[0].id`.

## Authentication

None required.

## Coordinate Format

WKT (Well-Known Text) in `latLng.geography.wellKnownText`: `POINT (lng lat)` — must swap for registry.

## ID Prefix Convention

`ga-{cameraSiteId}-{roadway-slug}{direction}`

## City Extraction

City/county name extracted from parentheses at end of location string.
Example: `BARR-0003: SR 211 at Horton St (Barrow)` → city = `Barrow`

## Pagination

Mandatory — max 100 per request.

## Special Headers

Standard browser User-Agent. No special headers required.

## Known Pitfalls

- All images return PNG format (not JPEG)
- City field contains county names in most cases (e.g., "Fulton" not "Atlanta")
- 4 cameras have null coordinates and were excluded
- Source system is "SKYLINE" (Iteris Navigator platform)
