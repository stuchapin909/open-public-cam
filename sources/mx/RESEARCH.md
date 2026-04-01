# Mexico Public Camera Research

## Summary

Exhaustive research into Mexican traffic/public camera APIs. Tested 60+ domains across federal, state, and municipal government sources plus third-party aggregators.

## Key Finding: SkylineWebcams Mexico

**One viable source found: SkylineWebcams Mexico**
- **Listing page**: `https://www.skylinewebcams.com/en/webcam/mexico.html`
- **Image URL pattern**: `https://www.skylinewebcams.com/webcam/mexico/{state}/{city}/{camera-slug}.jpg`
- **Content-Type**: `image/jpeg` on all cameras (verified with curl -I)
- **HTTP Status**: 200 on all cameras
- **Auth**: None required
- **CORS**: `access-control-allow-origin: *`
- **Total cameras**: 35 individual cameras across 13 states
- **Category**: Mostly tourist/scenic cameras (NOT dedicated traffic cameras)

### Camera List (35 verified working JPEG URLs)

| # | State | City | Camera | Slug |
|---|-------|------|--------|------|
| 1 | Baja California Sur | Cabo San Lucas | Cabo San Lucas Beach | cabo-san-lucas |
| 2 | Baja California Sur | Cabo San Lucas | Sea of Cortez | sea-of-cortez |
| 3 | Baja California Sur | Loreto | Loreto | loreto |
| 4 | Chihuahua | Zaragoza | Border | border |
| 5 | Ciudad de México | Mexico City | Alcaldía | alcaldia |
| 6 | Ciudad de México | Mexico City | Mexico City | mexico-city |
| 7 | Ciudad de México | Mexico City | Monumento a la Revolución | monumento-a-la-revolucion |
| 8 | Ciudad de México | Mexico City | Panorama | panorama |
| 9 | Ciudad de México | Mexico City | Plaza Garibaldi | plaza-garibaldi |
| 10 | Ciudad de México | Mexico City | Zócalo | zocalo |
| 11 | Ciudad de México | Teotihuacan | Teotihuacan | teotihuacan |
| 12 | Guerrero | Acapulco | Acapulco | acapulco |
| 13 | Guerrero | Zihuatanejo | Ixtapa | ixtapa |
| 14 | Guerrero | Zihuatanejo | Playa la Madera | playa-la-madera |
| 15 | Hidalgo | Pachuca | Plaza | plaza |
| 16 | Jalisco | Puerto Vallarta | Playa | playa |
| 17 | Jalisco | Puerto Vallarta | Puerto Vallarta | puerto-vallarta |
| 18 | Nuevo León | Vallecillo | Vallecillo | vallecillo |
| 19 | Oaxaca | Huatulco | Huatulco | huatulco |
| 20 | Oaxaca | San Pedro Mixtepec | Puerto Escondido | puerto-escondido |
| 21 | Puebla | Puebla | Puebla | puebla |
| 22 | Puebla | Puebla | Volcano Popocatépetl | volcano-popocatepetl |
| 23 | Puebla | San Pedro Benito Juárez | Popocatépetl | popocatepetl |
| 24 | Querétaro | San Joaquín | San Joaquín | san-joaquin |
| 25 | Quintana Roo | Bacalar | Bacalar | bacalar |
| 26 | Quintana Roo | Isla Mujeres | Isla Mujeres | isla-mujeres |
| 27 | Quintana Roo | Puerto Morelos | Puerto Morelos | puerto-morelos |
| 28 | Quintana Roo | Solidaridad | Cancún | cancun-quintana-roo |
| 29 | Quintana Roo | Solidaridad | Cancún Swimming Pools | cancun-swimming-pools |
| 30 | Quintana Roo | Solidaridad | Cancún The Royal Sands | cancun-the-royal-sands |
| 31 | Quintana Roo | Solidaridad | El Parque de Xcaret | el-parque-de-xcaret |
| 32 | Quintana Roo | Solidaridad | Panorama de Playa del Carmen | panorama-de-playa-del-carmen |
| 33 | Quintana Roo | Solidaridad | Panorama of Cancún | panorama-of-cancun |
| 34 | Quintana Roo | Tulum | Playa | playa |
| 35 | Sonora | San Carlos | San Carlos | san-carlos |

## Government Sources Tested (ALL FAILED)

### CDMX (Ciudad de México)
| Domain | Status | Details |
|--------|--------|---------|
| movilidad.cdmx.gob.mx | DNS failure | Could not resolve host |
| semovi.cdmx.gob.mx | Connection timeout | Resolves but times out on 443 |
| cctv.cdmx.gob.mx | DNS failure | Could not resolve host |
| videovigilancia.cdmx.gob.mx | DNS failure | Could not resolve host |
| datos.cdmx.gob.mx | Connection timeout | Resolves (189.240.234.183) but times out |
| api.datos.cdmx.gob.mx | DNS failure | Could not resolve host |
| c5.cdmx.gob.mx | Connection timeout | Resolves but times out |
| api.cdmx.gob.mx | No response | Empty reply from server |

### Federal (SCT → SICT)
| Domain | Status | Details |
|--------|--------|---------|
| sitt.sct.gob.mx | DNS failure | Could not resolve host |
| siap.sct.gob.mx | DNS failure | Could not resolve host |
| puentes.sict.gob.mx | DNS failure | Could not resolve host |
| www.sict.gob.mx | 200 | Working but no camera API found |

### CAPUFE (Toll Roads)
| Domain | Status | Details |
|--------|--------|---------|
| www.capufe.gob.mx | Connection timeout | Resolves (200.188.5.24) but times out |
| capufe.gob.mx | DNS failure | Could not resolve host |

### State/Municipal
| Domain | Status | Details |
|--------|--------|---------|
| sipt.guadalajara.gob.mx | DNS failure | Could not resolve host |
| sict.jalisco.gob.mx | DNS failure | Could not resolve host |
| sict.nl.gob.mx | DNS failure | Could not resolve host |
| transito.guanajuato.gob.mx | DNS failure | Could not resolve host |
| movilidad.puebla.gob.mx | DNS failure | Could not resolve host |
| sit.chihuahua.gob.mx | DNS failure | Could not resolve host |
| movilidad.monterrey.gob.mx | DNS failure | Could not resolve host |
| vialidad.edomex.gob.mx | DNS failure | Could not resolve host |

### Third-Party Commercial (MX-specific)
| Domain | Status | Details |
|--------|--------|---------|
| www.alltraffic.mx | DNS failure | Could not resolve host |

## Infrastructure Issue

Most `.gob.mx` subdomains either:
1. Don't resolve in DNS from this environment (many subdomains simply don't exist or have been decommissioned)
2. Resolve but connection times out (suggesting firewalls/rate-limiting or servers only accessible from Mexican IP ranges)
3. The DNS resolver (10.255.255.254, WSL default) can resolve some domains via Google DNS (8.8.8.8) but connectivity still fails

This suggests Mexican government camera infrastructure is **not publicly accessible** from outside Mexico, or the domains have been restructured/decommissioned.

## Other Sources Investigated
- **TrafficLand**: DNS failure
- **Waze Live Map**: Returns 500 error
- **INRIX**: Commercial API (requires API key, no public MX traffic cameras)
- **TomTom Traffic**: Commercial API (requires API key)
- **HERE WeGo**: No public camera API for MX
- **EarthCam**: Working site but no MX traffic cameras
- **Webcamtaxi**: Returns 403 (Cloudflare WAF)
- **Ferromex**: Redirects, no public camera API

## Recommendation

**Only SkylineWebcams is a viable source.** However, these are tourist/scenic cameras, NOT dedicated traffic cameras. Mexico does not appear to have publicly accessible, non-geofenced traffic camera APIs similar to Caltrans or other US state DOTs.

The SkylineWebcams source could be added as a tourist/scenic camera source (category: `tourism`) but should NOT be categorized as traffic cameras. All 35 cameras have been verified to return `image/jpeg` on HTTP GET with CORS headers.

## ID Prefix Convention

`mx-skyline-` (followed by camera slug)

## Timezone

`America/Mexico_City`

## Category

`tourism` (NOT `traffic` or `highway`)
