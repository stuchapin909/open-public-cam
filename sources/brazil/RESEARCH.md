# Brazil Traffic Camera API Research

## Summary

Investigated CET São Paulo, ARTESP, DER-SP, and other Brazilian traffic camera systems.
Found **one major working source** with ~196 accessible cameras.

---

## 1. CET São Paulo (Companhia de Engenharia de Tráfego)

### Status: ✅ WORKING - Direct JPEG URLs Available

#### Camera Listing API
- **Endpoint**: `https://cameras.cetsp.com.br/View/Cam.aspx`
- **Format**: Server-rendered ASP.NET page with embedded JavaScript array (`gCams[]`)
- **Authentication**: None required (public access)
- **Camera Count on Page**: Currently shows 11 cameras (a subset). The full system has ~196 accessible camera IDs (range 1-238).
- **Response**: HTML page containing JavaScript like:
  ```javascript
  var gCams = [];
  gCams.push({pasta:225,titulo:'Ascendino Reis',subTitulo:'R Pedro de Toledo',detalhe:'',ativa:true,apImg:1,qtdeImagens:50});
  gCams.push({pasta:184,titulo:'Brasil',subTitulo:'Av Brig Luis Antônio',detalhe:'Pr Armando S Oliveira',ativa:true,apImg:1,qtdeImagens:50});
  // ... etc
  var gUrlCams = "../Cams/";
  ```

#### Image URL Pattern
- **Pattern**: `https://cameras.cetsp.com.br/Cams/{camera_id}/{image_number}.jpg?{timestamp}`
- **Alternative (lowercase)**: `https://cameras.cetsp.com.br/cams/{camera_id}/{image_number}.jpg`
- **Content-Type**: `image/jpeg`
- **Authentication**: None required
- **Image Rotation**: Each camera has ~50 sequential images (qtdeImagens: 50 or 25). The viewer cycles through them with a 2.5s timer. The `?{timestamp}` query parameter busts cache.
- **Refresh Rate**: Images cycle through 25-50 sequential JPEGs; new images are captured every ~12-15 minutes (TEMPO_RELOAD_MIN).

#### Camera Data Structure
Each camera in `gCams[]` has:
| Field | Type | Description |
|-------|------|-------------|
| `pasta` | int | Camera folder/ID number (used in URL) |
| `titulo` | string | Main title (street/avenue name) |
| `subTitulo` | string | Subtitle (cross street or landmark) |
| `detalhe` | string | Additional detail (optional) |
| `ativa` | bool | Whether camera is currently active |
| `apImg` | int | Current image index (rotates 1-50) |
| `qtdeImagens` | int | Total images per capture cycle (25 or 50) |

#### Known Camera IDs (Verified Working 2026-03-30)

**From live page (11 cameras):**
225, 184, 195, 210, 220, 180, 222, 224, 200, 23, 22

**From archived 2019 page (21 cameras):**
140, 117, 75, 73, 68, 118, 128, 48, 41, 120, 46, 49, 31, 65, 66, 135, 15, 16, 137, 138

**Full scan results (196 cameras found in range 1-238):**
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 20, 22, 23, 27, 29, 30, 31, 35, 38, 39, 41, 42, 46, 48, 49, 51, 52, 53, 54, 57, 58, 59, 60, 62, 64, 65, 66, 67, 68, 69, 72, 73, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 89, 90, 92, 93, 94, 95, 96, 97, 99, 100, 101, 102, 104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 129, 130, 131, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 218, 219, 220, 221, 222, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 236, 237, 238

**No cameras found beyond ID 238** (scanned up to 1200).

#### GPS Coordinates
**Not available** via the current API. The ASPX page does not include coordinate data.
Historical references suggest a GeoServer existed at `cetsp1.cetsp.com.br/geoserver/cetsp/ows` with a `cameras_cet` layer, but it returns 404 as of 2026-03-30.

#### Notes
- The landing page at `https://cameras.cetsp.com.br/` is just a p5.js animation. The actual viewer is at `/View/Cam.aspx`.
- Camera IDs are sequential integers used as folder names on the image server.
- Each camera captures a burst of 25-50 images per cycle (not a live stream, but rapidly cycling JPEGs).
- Images have a CET watermark overlay added client-side.
- No CORS headers - browser-based fetching will be blocked. Server-side scraping required.
- The camera list on the viewer page changes over time (different subsets are featured).

---

## 2. ARTESP (Agência de Transporte do Estado de São Paulo)

### Status: ❌ NO DIRECT CAMERA API FOUND

ARTESP manages highway cameras through private concessionaires (Ecovias, Autoban, ViaOeste, CCR, etc.) rather than operating cameras directly.

- **Website**: `https://www.artesp.sp.gov.br/`
- **Camera Page**: `https://www.artesp.sp.gov.br/Transito-e-Transporte/Cameras-de-Trafego` (exists but redirects to portal CMS)
- **SGGD System**: `https://sggd.artesp.sp.gov.br/` (connection refused/timed out)
- The cameras are operated by individual concessionaires, each with their own systems.

#### Concessionaire Camera Sites (need further investigation)
- **Ecovias** (SP-070/SP-038): `www.ecovias.com.br` - HTTP 403
- **Autoban** (SP-159/SP-210): `www.autoban.com.br` - redirects
- **ViaOeste** (SP-79): `www.viaoeste.com.br` - redirects
- **CCR**: `www.ccr.com.br` - redirects

Each concessionaire likely has their own camera viewer with different URL patterns.

---

## 3. DER-SP (Departamento de Estradas de Rodagem)

### Status: ❌ NO DIRECT CAMERA API FOUND

- **Website**: `https://www.der.sp.gov.br/` - accessible but no camera API found
- DER-SP does not appear to operate public traffic cameras directly

---

## 4. Other Brazilian City Traffic Cameras

### CET-Rio (Rio de Janeiro)
- Not investigated in detail - would need separate research

### BHTRANS (Belo Horizonte)
- Website returned connection refused

### Other cities
- Most Brazilian cities either don't expose public camera APIs or use concessionaire-operated systems
- No standardized open data portal for traffic cameras was found

---

## 5. Open Data Portals

### dados.gov.br
- No camera datasets found

### São Paulo Open Data (dados.prefeitura.sp.gov.br)
- Access blocked by PRODAM firewall ("Requisição Bloqueada")

---

## Key URLs Summary

| URL | Purpose | Status |
|-----|---------|--------|
| `https://cameras.cetsp.com.br/` | Landing page (animation only) | ✅ 200 |
| `https://cameras.cetsp.com.br/View/Cam.aspx` | Camera viewer with JS data | ✅ 200 |
| `https://cameras.cetsp.com.br/Cams/{id}/1.jpg` | Direct camera image | ✅ 200 |
| `https://cameras.cetsp.com.br/Scripts/Cam.js` | Camera viewer JavaScript | ✅ 200 |
| `https://www.cetsp.com.br/consultas/cameras-cet.aspx` | Camera info page | ✅ 200 |
| `https://cetsp1.cetsp.com.br/geoserver/...` | Old GeoServer (historical) | ❌ 404 |
| `https://mobile.cetsp.com.br/` | Mobile site | ❌ 403 |
| `https://www.artesp.sp.gov.br/` | ARTESP portal | ✅ 200 (CMS only) |
| `https://www.der.sp.gov.br/` | DER-SP portal | ✅ 200 |

---

## Recommended Implementation for CET São Paulo

1. **Scrape the listing page**: Fetch `https://cameras.cetsp.com.br/View/Cam.aspx` and parse the `gCams.push()` calls from the HTML to get current camera metadata (title, subtitle, active status).
2. **Scan for additional IDs**: The page only shows ~11 cameras at a time, but ~196 camera IDs exist (1-238 with gaps). Scan `https://cameras.cetsp.com.br/Cams/{id}/1.jpg` for IDs 1-238.
3. **Image URL pattern**: `https://cameras.cetsp.com.br/Cams/{id}/1.jpg?{timestamp}`
4. **GPS coordinates**: Would need to be obtained from street names (geocoding) or found from other sources. The old GeoServer endpoint that may have had coordinates is no longer available.
5. **Refresh strategy**: Fetch with `?{current_timestamp}` to bypass cache. Images update every 12-15 minutes.

---

*Research conducted: 2026-03-30*
*Total verified working cameras: ~196 (CET São Paulo)*
