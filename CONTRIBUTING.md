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

4. **Add it** -- edit `cameras.json` and push, or open a PR. The GitHub Action will:
   - Validate the schema (name, url, location, timezone, category)
   - Verify the URL returns an image
   - Use vision AI to confirm it's a real webcam
   - Reject non-webcam images (logos, error pages, ads)

5. **Pick a good ID** -- lowercase, hyphens, descriptive. e.g. `nyc-fdr-brooklyn-bridge`.

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

## Categories

Use one of: `city`, `park`, `highway`, `airport`, `port`, `weather`, `nature`, `landmark`, `other`

## Code contributions

Bug fixes, improvements, and new features welcome. Open an issue first if the change is substantial.

## License

Contributions are licensed under MIT. By submitting a PR you agree to license your changes under the same terms.
