# Czech Republic (CZ) Traffic Camera Research

**Date:** 2026-04-01
**Status:** BLOCKED — all investigated sources either unreachable from WSL or use JS-rendered frontends with no discoverable API

## Summary

Czech Republic traffic cameras (managed primarily by ŘSD — Ředitelství silnic a dálnic, the Road and Motorway Directorate) are not currently accessible via a public API returning direct JPEG/PNG images. Multiple sources were tested.

## Sources Investigated

### 1. ŘSD (Road and Motorway Directorate)
- **Old domain** (silnicenamornici.cz): no longer resolves
- **Current site** (rsd.cz, rsd.cz/en/webcams): returns 404 for webcam pages
- **Old CDN pattern** (d1ahtucjixef4r.cloudfront.net): returns 403 Forbidden
- **Various subdomain patterns** (kamery.rsd.cz, webkamera.rsd.cz): no DNS resolution
- Multiple URL patterns tested: odt_001.jpg, odt_XXX.jpg — all failed

### 2. dopravni.info
- Camera listing page at dopravni.info/kamery/ loads and has camera references
- Could not extract working direct image URLs from the page

### 3. Prague city cameras
- aplikace.praha.cz/dopravni-kamery/: 404
- Various PID (Prague Integrated Transport) camera patterns: no DNS resolution

### 4. Ostrava, Brno, other cities
- Various camera URL patterns tested — all unreachable from WSL

### 5. Third-party aggregators
- No public aggregators found serving direct image URLs

## What Might Work

- **Browser-based scraping**: The ŘSD website likely loads camera data client-side via JavaScript. Using a headless browser to intercept network requests would reveal the actual API endpoint.
- **Geo-restricted access**: Some Czech traffic sites may only be accessible from Czech/EU IPs.
- **dopravni.info deep analysis**: This site appears to aggregate Czech traffic cameras but the image URLs are loaded dynamically.

## Cameras Committed

0 (blocked)
