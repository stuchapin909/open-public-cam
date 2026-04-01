# France (FR) Traffic Camera Research

**Date:** 2026-04-01
**Status:** BLOCKED — all sources use HLS/video streaming (viewsurf.com), no direct JPEG/PNG

## Summary

French autoroute operators overwhelmingly use **viewsurf.com** as their camera streaming platform — a third-party video streaming service that serves HLS/MP4 streams behind JavaScript players, not static image snapshots.

---

## Sources Investigated

### 1. APRR (Autoroutes Paris-Rhin-Rhône) — Best Metadata Source
- **Camera list API**: `https://voyage.aprr.fr/api/aprr/pois/webcam` — 124 webcams, no auth
- **Detail API**: `https://voyage.aprr.fr/api/aprr/pois/popin/webcam/{id}`
- **Response includes**: title, coordinates (French comma-decimal), tags, road info
- **Stream URL**: redirects to `gieat.viewsurf.com/?id={id}&action=mediaRedirect` → returns `video/mp4`
- **NOT direct JPEG/PNG** — video streams only
- **Roads**: A1, A4, A5, A6, A10, A19, A26, A29, A31, A36, A38, A39, A40, A42, A43, A46, A71

### 2. Sytadin (Paris Île-de-France)
- **Site**: `https://www.sytadin.fr` — loads, but no camera section found
- **JS analysis**: zero webcam references in any loaded script
- **All tested API paths**: return 404

### 3. Bison Futé
- **Site**: `https://www.bison-fute.gouv.fr` — loads, no camera references in HTML
- **API at api.bison-fute.gouv.fr**: unreachable

### 4. DIR Nord, DIR Méditerranée, DIR Est
- **DIR Nord**: connection timeout
- **DIR Méditerranée**: connection timeout
- **DIR Est**: generic CMS, no camera API

### 5. Cofiroute (VINCI Autoroutes)
- Connection timeout

### 6. Sanef
- 403 Forbidden

### 7. data.gouv.fr
- Zero datasets for "caméras routières" or "webcam route"

---

## Key Insight

The French autoroute camera industry uses viewsurf.com as a near-universal backend. This is likely driven by privacy regulations (GDPR) and contractual arrangements. Municipal-level cameras (Paris, Lyon, Toulouse) might expose JPEG snapshots but were not accessible from our WSL environment.

---

## Recommendations

1. **APRR metadata** could populate the registry with `verified: false` if schema allowed non-JPEG URLs
2. **Municipal open data portals** (Paris opendata.paris.fr, Lyon data.grandlyon.com) should be checked from within France/EU
3. **Geo-restricted sources** (DIR Nord, Cofiroute, etc.) may work from French IP
