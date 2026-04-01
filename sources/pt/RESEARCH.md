# Portugal Traffic Camera Research

## Summary

Investigated Portuguese traffic camera sources. The primary source (IP SIGIP ArcGIS API with ~8000 cameras) was decommissioned. No working public traffic camera image URLs found.

## Sources Investigated

| Source | URL | Result |
|--------|-----|--------|
| IP SIGIP ArcGIS | sigip.infraestruturasdeportugal.pt/pub/rest/services/ | API decommissioned — services directory exists (v10.61) but no services published. Was ~8000 cameras on national roads (A1-A23, IC, N roads). Documented in McDottie/SIGIP-Camera-downloader GitHub repo. Returned .mp4 video clips, not static images. |
| IP Corporate | infraestruturasdeportugal.pt/trafego | Static page, no camera feeds |
| Brisa/Auto-estradas | brisa.pt/pt-pt/trafego/camaras | Page exists (200) but only corporate images, no camera feeds |
| EMEL (Lisbon) | emel.pt | Mobility info, no camera feeds |
| Lisboa Aberta | dados.cm-lisboa.pt | Traffic restriction datasets but NO camera image datasets |
| Porto City/Porto Open Data | cm-porto.pt, dados-abertos.porto.pt | No camera feeds or datasets |
| Ascendi, Lusoponte | ascendi.pt, lusoponte.pt | No response |

## Recommendation

Monitor the SIGIP ArcGIS services directory — services may be republished under a new folder name. The old API returned video clips (.mp4), not static JPEG images, so even if restored it would need further investigation for image compatibility.

## Date

April 1, 2026
