# Switzerland (CH) Traffic Camera Research

## Added: 2026-04-01

## Working Source: AFBN (AlpenForschungsBahn Netz) - Gotthard Axis

**Website:** https://www.afbn.ch/verkehr-und-baustellen/webcams
**Operator:** AFBN - operator of the Gotthard road tunnel and A2 national road
**Auth:** None required
**Cameras committed:** 11

### Image URL Pattern
```
https://webcam.afbn.ch/{ROUTE}_{KM}_{DIRECTION}_KAM_{NUMBER}_{VIEW}.jpg
```

### Camera Discovery
Scrape https://www.afbn.ch/verkehr-und-baustellen/webcams and parse HTML:
- Camera name: `<div class="webcam-list-item-title">{NAME}</div>`
- Image URL: `<div class="img-bg__16-9" style="background-image: url({URL});">`

No JSON/API endpoint exists for programmatic discovery.

### Cameras (all verified 200 image/jpeg, 35-91KB)
1. Gotthard Galleria dei Banchi (Andermatt, A2)
2. Gotthard Hospiz (Andermatt, A2)
3. Schöllenen (Andermatt, A2)
4. Gotthardtunnel Süd (Airolo, A2, Ticino)
5. Gotthardtunnel Nord (Göschenen, A2, Uri)
6. Wassen Dieden (Wassen, A2)
7. Seelisbergtunnel Süd (Seelisberg, A2)
8. Seelisbergtunnel Nord (Seelisberg, A2)
9. Tellsplatte (Bürglen, A2)
10. Wolfsprung (Sisikon, A2)
11. Bernerhöhe (Altdorf, A2)

### Image Validation (2026-04-01)
All 11 cameras tested with curl HEAD:
- HTTP 200, content-type: image/jpeg
- File sizes: 35-91KB (real camera images)
- Resolutions: 1280x960 and 1920x1080

## Investigated and Blocked Sources

### ASTRA / FEDRO (Federal Roads Office)
- https://www.fdv.admin.ch — unreachable from WSL (000)
- No camera layer in GeoAdmin public catalog
- VMS CSV endpoints return empty

### Bern Canton (tbamobcam.ch)
- Returns 401 Unauthorized on all endpoints
- Camera system exists but requires authentication

### TCS (Touring Club Schweiz)
- Webcam section removed (404)
- Previously had pass webcams (Furka, Gotthard, Susten, etc.)

### Geneva (Canton de Genève)
- https://ge.ch/cameras/ — JS-rendered Next.js app, no discoverable image URLs

### Vaud (Canton de Vaud)
- Camera page exists but no direct image URLs in HTML (JS-rendered)

### Zurich (Stadt Zürich)
- Open Data Portal returning 500 errors
- No camera image API found in CKAN catalog

### SwissWebcams (swisswebcams.ch)
- SPA with no accessible API for camera images
- All data loaded client-side via JavaScript

### Panoramablick
- Weather/scenic webcams only, not traffic cameras
- Archive image URLs, not live feeds

### autobahnen.ch
- Informational site with webcam links but no direct image URLs
- Webcam pages (page=015) show route diagrams, not camera feeds

### Other Sources Tested (all unreachable or no camera API)
- verkehrszentrale.ag.ch — unreachable
- strassenverkehrsamt.zh.ch — unreachable
- MeteoSwiss camera stations — 404
- alpenroads.ch — no response
- pass.ch — no camera image URLs
- webcams.ch — domain parked
