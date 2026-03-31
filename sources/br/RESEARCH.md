# Brazil Traffic Camera API Research

## Summary

CET São Paulo is the only confirmed working source for Brazil. ~201 cameras validated in ID range 1-238 (201 currently active). No listing API — must scan ID range. Direct JPEG images, no auth.

---

## 2026-03-31 Update: +41 new cameras

Scanned missing IDs from the 160 already in registry. Found 41 additional active cameras. Total BR cameras in registry: 201.

### New camera IDs added
1, 2, 3, 7, 8, 9, 14, 15, 20, 22, 23, 29, 30, 31, 35, 38, 39, 41, 42, 46, 48, 53, 57, 58, 63, 68, 81, 82, 83, 84, 85, 87, 88, 89, 94, 98, 127, 128, 150, 224, 235

### Validation
- All 41 return HTTP 200, content-type image/jpeg, file sizes 5KB-42KB
- 5 samples verified as valid JPEG image data (480x360 or 480x270 resolution)
- No API key required

### Blocked sources investigated (2026-03-31)
- DER São Paulo (www.der.sp.gov.br) — reachable but no discoverable camera API
- CONASET, SECTRA — DNS resolution failures from WSL
- Argentina BA data portal — zero response

---

## Source: CET São Paulo

### API Endpoint
No listing API. Camera images accessible at:
```
https://cameras.cetsp.com.br/Cams/{ID}/1.jpg
```

### Discovery Method
Scan ID range 1-238, validate each with HTTP GET + content-type check.

### Image Format
Direct JPEG on HTTPS GET. No auth, no redirect.

### Coordinate Format
Default São Paulo center coordinates (-23.5505, -46.6333) — no per-camera geolocation available.

### ID Prefix Convention
`br-cet-` (followed by numeric camera ID)

### Timezone
`America/Sao_Paulo`

### Country
`BR`
