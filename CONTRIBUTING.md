# Contributing to Open Eagle Eye

Thanks for your interest. Here's how to help.

## Adding webcams

The most valuable contribution is new webcam sources. Here's the process:

1. **Find a direct-image URL** -- the camera must return a JPEG or PNG on a plain HTTP GET with no authentication. Check with:
   ```
   curl -I -s https://example.com/camera/image | grep content-type
   ```
   Must return `image/jpeg` or `image/png`.

2. **Verify it's live** -- fetch it twice, a few seconds apart. File size or content should change.

3. **Check it's a public space** -- streets, parks, landmarks, traffic, weather, nature. No private interiors, security cameras, or password-protected feeds.

4. **Add it** -- edit `cameras.json` and push, or open a PR. Each entry requires:
   - `id` -- unique identifier, lowercase with hyphens (e.g. `nyc-fdr-brooklyn-bridge`)
   - `name` -- human-readable name
   - `url` -- direct image URL
   - `city` -- city name (e.g. `London`, `New York`, `Sydney`)
   - `location` -- descriptive location string (e.g. `Manhattan, New York, USA`)
   - `timezone` -- IANA timezone (e.g. `America/New_York`)
   - `category` -- one of the categories below
   - `coordinates` -- `{ "lat": ..., "lng": ... }` if available
   - `country` -- ISO 3166-1 alpha-2 country code (e.g. `US`, `CA`, `GB`, `AU`, `NZ`, `JP`, `SG`, `IE`)

   The GitHub Action will:
   - Validate the schema
   - Verify the URL returns a valid image
   - Use vision AI to confirm it's a real webcam
   - Reject non-webcam images (logos, error pages, ads)
   - Auto-remove invalid entries on push, comment on PRs

## What makes a good source

- City traffic cameras (most DOTs have APIs)
- Weather station webcams
- Ski resort cams
- National park webcams
- Port and airport perimeter cams
- University campus cams

## What doesn't work

- YouTube streams or video URLs
- Webcam aggregator page URLs (EarthCam, WebcamTaxi, etc.)
- RTSP, HLS, or DASH streams
- Pages requiring JavaScript to load the image
- URLs behind CAPTCHAs or cookie consent
- Anything requiring authentication
- URLs that serve images only with specific browser headers (Sec-Fetch-Dest, etc.) -- these break for programmatic access

## Categories

Use one of: `city`, `park`, `highway`, `airport`, `port`, `weather`, `nature`, `landmark`, `other`

## Camera sources

Current sources in the registry:

| Region | Source | Count | Auth |
|---|---|---|---|
| California | Caltrans CWWP2 JSON API (all 12 districts) | 3,430 | None |
| Washington | WSDOT KML feed | 1,654 | None |
| Colorado | CDOT CoTrip CARS Program API | 1,023 | None |
| Ontario | MTO 511 API | 923 | None |
| London | TfL JamCam API | 424 | API key for discovery only, images public |
| New Zealand | NZTA cameras.json API | 251 | None |
| Sydney | NSW Live Traffic | 153 | None |
| Alberta | Alberta 511 API | 369 | None |
| Japan | NEXCO East expressway cameras | 98 | None |
| Singapore | LTA Traffic Images API | 90 | None |
| Ireland | TII motorway cameras (M50 Dublin) | 53 | None |
| Regional NSW | NSW Live Traffic | 44 | None |
| New York | NYC TMC API | 100 | None |

## Code contributions

Bug fixes, improvements, and new features welcome. Open an issue first if the change is substantial.

## License

Contributions are licensed under MIT. By submitting a PR you agree to license your changes under the same terms.
