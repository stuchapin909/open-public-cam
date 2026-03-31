# Ohio OHGO Traffic Cameras

## Summary

Ohio Department of Transportation (ODOT) cameras via the OHGO public API. 1,166 camera sites from API, 1,145 valid after HTTP validation. Includes 37 Kentucky Transportation Cabinet (KYTC/TRIMARC) partner cameras near the Ohio/Kentucky border.

---

## API Endpoint

- **Listing**: `GET https://api.ohgo.com/cameras`
- **Auth**: None required
- **Response**: JSON array of camera site objects
- **Rate limit**: None observed

## How to Fetch

1. GET `https://api.ohgo.com/cameras` — returns full list in one call (~446KB)
2. Each site has a `Cameras` array with `SmallURL` and `LargeURL` fields
3. Both URLs point to the same image; use either

### Response Structure

```json
{
  "Id": "00000000000001",
  "Latitude": 41.50557,
  "Longitude": -82.84921,
  "Location": "SR-2 at S Lightner Rd, 5060",
  "Category": "",
  "Description": "SR-2 at S Lightner Rd, 5060",
  "Provider": null,
  "Cameras": [
    {
      "Direction": "View",
      "SmallURL": "https://itscameras.dot.state.oh.us:443/images/toledo/SR2-EB-WestSign.jpg",
      "LargeURL": "https://itscameras.dot.state.oh.us:443/images/toledo/SR2-EB-WestSign.jpg"
    }
  ]
}
```

## Image URL Pattern

- **ODOT**: `https://itscameras.dot.state.oh.us/images/{folder}/{filename}.jpg`
- **KYTC**: `https://www.trimarc.org/images/milestone/{filename}.jpg`
- **Content-Type**: `image/jpeg`
- **Auth**: None required
- **Update rate**: ~5 seconds

### Image Folders (ODOT districts)

`CLE`, `CMH`, `dayton`, `toledo`, `artimis`, `D01`–`D11`, `rest_area`, `cincinnati`, `CHI`

## Authentication

None required for either the listing API or image URLs.

## Coordinate Format

Direct `Latitude` and `Longitude` fields (decimal degrees).

## Timezone

Ohio is split:
- **East of -84.5° longitude**: `America/New_York` (Eastern Time)
- **West of -84.5° longitude**: `America/Chicago` (Central Time)

## KYTC Partner Cameras

39 cameras from Kentucky Transportation Cabinet (TRIMARC) are included in the OHGO API. These have `"Provider": "KYTC"` and use `trimarc.org` image URLs. 37 validated successfully.

## ID Prefix Convention

- ODOT cameras: `oh-{slug}`
- KYTC cameras: `oh-kyc-{slug}`

## Validation Date

2026-03-31

## Cameras Committed

- Batch 1: 500 cameras (commit 1)
- Batch 2: 500 cameras (commit 2)
- Batch 3: 145 cameras (commit 3)
- **Total: 1,145 cameras**

## Blocked/Failed Sources Investigated

| Source | Status | Reason |
|--------|--------|--------|
| `publicapi.ohgo.com/api/v1/cameras` | Blocked | Requires registered API key |
| `ohgo.com/List/GetData/Cameras` (POST) | Not found | Returns 302 to /not-found (no DataTables pattern) |
| Ohio Turnpike (ohioturnpike.org) | Not available | No public camera API found |
