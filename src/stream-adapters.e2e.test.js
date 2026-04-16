import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractFrame, probeUrl, detectProtocol } from "./stream-adapters.js";

describe("end-to-end stream extraction", () => {
  it("extracts a frame from Apple HLS test stream", async () => {
    const url = "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8";

    assert.equal(detectProtocol(url), "hls");

    const probe = await probeUrl(url);
    assert.equal(probe.protocol, "hls");

    const frame = await extractFrame(url, "hls", 25000);
    assert.ok(frame, "Frame extraction returned null");
    assert.ok(frame.buf.length > 500, `Frame too small: ${frame.buf.length} bytes`);
    assert.equal(frame.contentType, "image/jpeg");
    assert.equal(frame.protocol, "hls");

    // Verify it's actually a JPEG (FF D8 FF magic bytes)
    assert.equal(frame.buf[0], 0xFF);
    assert.equal(frame.buf[1], 0xD8);
    assert.equal(frame.buf[2], 0xFF);
  });

  it("probes a static image URL correctly", async () => {
    // Use a known public image (NYC DOT camera)
    const probe = await probeUrl("https://webcams.nyctmc.org/api/cameras/dab7e84e-a631-4917-ba87-f6bb32900e07/image");
    // May return static or error depending on availability, but should not crash
    assert.ok(["static", "error", "unknown"].includes(probe.protocol));
  });

  it("probes an HTML page correctly", async () => {
    const probe = await probeUrl("https://www.google.com");
    assert.equal(probe.protocol, "page");
    assert.ok(probe.contentType.includes("text/html"));
  });

  it("detects RTSP from URL without network call", async () => {
    const probe = await probeUrl("rtsp://admin:password@192.168.1.100:554/stream");
    assert.equal(probe.protocol, "rtsp");
    assert.equal(probe.details, "RTSP stream (detected from URL scheme)");
  });

  it("detects YouTube from URL without network call", async () => {
    const probe = await probeUrl("https://www.youtube.com/watch?v=abc123");
    assert.equal(probe.protocol, "youtube");
  });
});
