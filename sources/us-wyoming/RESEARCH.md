# Wyoming (US) Traffic Cameras

## Source: WYDOT 511 Service (wyoroad.info)

### API Details
- **Base URL**: https://wyoroad.info
- **Camera listing**: https://wyoroad.info/Highway/webcameras/webcameras.html
- **Route listings**:
  - I-25: https://wyoroad.info/Highway/webcameras/all?route=I25Cameras
  - I-80: https://wyoroad.info/Highway/webcameras/all?route=I80Cameras
  - I-90: https://wyoroad.info/Highway/webcameras/all?route=I90Cameras
  - Non-Interstate: https://wyoroad.info/Highway/webcameras/all?route=NonInterstateCameras
- **Camera view pages**: https://wyoroad.info/highway/webcameras/view?site={siteId}
- **Image URL pattern**: https://wyoroad.info/web-cam/cache?ref={base64EncodedRef}

### Authentication
None required. All camera images are publicly accessible via HTTP GET.

### Image Format
- Format: JPEG (image/jpeg)
- Resolution: 1280x720 (most cameras), 640x480 (some older cameras)
- Camera hardware: AXIS Q6075-E, Q6074-E, Q6054-E network cameras
- Update frequency: Every few minutes (not auto-refreshing)

### Camera Coverage
- **Interstate 25**: 25 camera sites (Cheyenne to CO border)
- **Interstate 80**: 59 camera sites (Evanston to NE border)
- **Interstate 90**: 19 camera sites (Sheridan to SD border)
- **Non-Interstate Routes**: 122 camera sites (US highways, WY state highways)
- **Total camera sites**: 225
- **Total camera views**: 743 (multiple directional views per site)
- **Committed views**: 538 (excluding road surface views)

### Data Extraction Method
1. Scraped camera listing pages for each route to get camera site IDs
2. Fetched each camera view page to extract image URLs and alt text
3. Each site has 2-4 directional views (North, South, East, West, etc.)
4. Road surface views were excluded from the registry
5. Cities mapped from camera location names
6. Coordinates approximated from highway mile markers

### Coordinates
Coordinates are approximate, interpolated from highway mile markers:
- I-80: East-west across southern Wyoming (~41.1N, -111W to -104W)
- I-25: North-south through eastern Wyoming (41N to 45N, ~-104W to -106W)
- I-90: East-west through northern Wyoming (~45N to 44.4N, -107W to -104W)
- Non-interstate routes: City-based lookup where possible

### Validation Date
2026-04-01

### Cameras Committed
- Batch 1: 500 cameras (2026-04-01)
- Batch 2: 38 cameras (2026-04-01)
- Total: 538 cameras

### Notes
- Camera image URLs use base64-encoded references that may change over time
- Each camera site may have additional views (road surface, weather) not included
- Some camera sites on WY state highways have older 640x480 cameras
- The WYDOT site is a traditional server-rendered HTML site (not SPA), making scraping straightforward
