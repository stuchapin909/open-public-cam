# Argentina Traffic Camera Research

## Date: 2026-04-01

## Summary

**No working public traffic camera image APIs were found for Argentina.** Despite extensive testing of government and private highway operator websites, no endpoints returning real-time JPEG/PNG camera images via simple HTTP GET were discovered.

## Sources Investigated

### 1. Buenos Aires City (CABA)
- **buenosaires.gob.ar** — Main site blocks requests with WAF ("Request Rejected"). Not accessible from our environment.
- **data.buenosaires.gob.ar** (CKAN Open Data API) — Accessible. Found dataset "Cámaras fijas de control vehicular" with 224 camera locations (CSV/XLSX/SHP), but these are static location data only — no live image URLs or snapshot endpoints.
- **epok.buenosaires.gob.ar** — Transport API returns 404 for all camera endpoint patterns tested: `/TransportePublico/RecorridoCamara`, `/TransportePublico/Camara`, `/Contenido/GetCamara`, `/Contenido/ImagenCamara`, etc.
- **datos.buenosaires.gob.ar** — DNS does not resolve from our environment.

### 2. AUSA (Autopistas Urbanas Buenos Aires — AU1, AU2, AU6, AU7)
- **www.ausa.com.ar** — Accessible (SSL cert issues) but returns same 14,946-byte HTML page for all URL paths (SPA without SSR). All paths tested (`/foto-camara/1`, `/camara/1.jpg`, `/snapshot/1.jpg`, `/api/cameras`, etc.) return the same generic HTML. No API endpoints or camera image URLs discovered.
- No `api.ausa.com.ar` subdomain exists.
- No CDN subdomain for camera images found.

### 3. AUBASA (Autopista Buenos Aires - La Plata, AU2)
- **www.aubasa.com.ar** — Accessible (183KB page). Site has no camera/webcam pages. All camera-related paths return 404. No live traffic camera feeds found.

### 4. Rutas del Litoral (Corredor del Litoral)
- **www.rutasdellitoral.com.ar** — Accessible (WordPress site). Has a "Cámaras" link in navigation, but the `/camaras/` page returns 404. The cameras section appears to be JavaScript-rendered and the actual feeds are loaded dynamically. WP REST API search for camera pages returns empty results. No direct image URLs found.

### 5. Dirección Nacional de Vialidad (DNV)
- **www.vialidad.gob.ar** — Returns HTTP 503 (Service Unavailable) for all paths tested. Site appears to be down.

### 6. Provincia de Buenos Aires
- **www.gob.gba.gob.ar** — Returns minimal 213-byte response (likely WAF/challenge page). Not accessible.
- **www.vialidad.gba.gob.ar** — Accessible but camera path returns 404.

### 7. Córdoba
- **www.cordoba.gov.ar** — Accessible (263KB). Links to `observatoriodelamovilidad.ar` for mobility data. No direct camera feeds found.
- **observatoriodelamovilidad.ar** — Accessible. Camera-related paths return 404. No live camera API endpoints found.

### 8. Rosario
- **www.rosario.gob.ar** — Accessible. Has "Sistema de videocontrol" page but it's informational only (no live feeds). Has "movilidad-y-transito" section but no camera image endpoints.

### 9. Mendoza
- **www.mendoza.gov.ar** — Accessible (158KB). No camera/transito-related pages or feeds found.

### 10. Other Sources
- **Autopistas del Oeste (AUDO)** — DNS does not resolve.
- **Autopistas del Sol** — DNS does not resolve.
- **Caminos de la Patagonia** — DNS does not resolve.
- **OCABA** — DNS does not resolve (merged into AUSA).
- **Corredores Viales** — DNS does not resolve.
- **Autovía 2** — DNS does not resolve.
- **Santa Fe** — Main site accessible but no camera feeds. Vialidad path returns 404.

## Key Findings

1. **CABA Open Data has camera locations but no live feeds**: The "Cámaras fijas de control vehicular" dataset contains 224 camera locations with coordinates, but no image/snapshot URLs. These are speed/traffic enforcement cameras, not publicly viewable.

2. **Most Argentine government sites are either down, blocked by WAF, or use SPAs**: The sites that are accessible (AUBASA, Rutas del Litoral, Córdoba, Rosario) don't expose camera image APIs. The sites most likely to have cameras (AUSA, DNV, CABA transport) are either blocked or return errors.

3. **No MJPEG or snapshot endpoints found**: Unlike many countries' traffic cameras, Argentine operators don't seem to expose direct HTTP GET endpoints for camera images.

4. **DNS issues**: Many Argentine highway operator domains don't resolve from our US-based environment, suggesting either regional DNS, domain expiration, or infrastructure issues.

## Recommendation

Argentina does not currently appear to have publicly accessible traffic camera image APIs suitable for this project. The camera infrastructure likely exists behind private/subscription APIs or is only accessible through proprietary web applications (likely JavaScript-heavy SPAs with authentication). This is consistent with Argentina's general approach to traffic data, which tends to be more restricted than countries like the US, EU, or even neighboring Brazil and Chile.

## Dataset Reference

- **CABA Camera Locations**: `https://cdn.buenosaires.gob.ar/datosabiertos/datasets/transporte-y-obras-publicas/camaras-fijas-control-vehicular/camaras-fijas-de-control-vehicular.csv` (224 cameras, location data only, no images)
- **AUSA Radar Data**: Available via CABA open data portal (flow data, not camera images)
