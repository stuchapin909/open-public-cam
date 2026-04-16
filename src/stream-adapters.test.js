import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectProtocol, checkFfmpeg, checkYtdlp, probeUrl } from "./stream-adapters.js";

describe("detectProtocol", () => {
  it("detects HLS from .m3u8 extension", () => {
    assert.equal(detectProtocol("https://example.com/live/stream.m3u8"), "hls");
  });

  it("detects HLS from /hls/ path", () => {
    assert.equal(detectProtocol("https://cdn.example.com/hls/cam1/playlist"), "hls");
  });

  it("detects HLS from Azure manifest format", () => {
    assert.equal(detectProtocol("https://media.example.com/asset/manifest(format=m3u8-aapl)"), "hls");
  });

  it("detects RTSP", () => {
    assert.equal(detectProtocol("rtsp://192.168.1.100:554/stream1"), "rtsp");
  });

  it("detects RTMP", () => {
    assert.equal(detectProtocol("rtmp://live.example.com/app/stream"), "rtmp");
  });

  it("detects RTMPS", () => {
    assert.equal(detectProtocol("rtmps://live.example.com/app/stream"), "rtmp");
  });

  it("detects YouTube watch URL", () => {
    assert.equal(detectProtocol("https://www.youtube.com/watch?v=abc123"), "youtube");
  });

  it("detects YouTube live URL", () => {
    assert.equal(detectProtocol("https://www.youtube.com/live/abc123"), "youtube");
  });

  it("detects YouTube short URL", () => {
    assert.equal(detectProtocol("https://youtu.be/abc123"), "youtube");
  });

  it("detects YouTube embed URL", () => {
    assert.equal(detectProtocol("https://www.youtube.com/embed/abc123"), "youtube");
  });

  it("detects MJPEG hint from /mjpg/ path", () => {
    assert.equal(detectProtocol("http://cam.example.com/mjpg/video.mjpg"), "mjpeg_hint");
  });

  it("detects MJPEG hint from /mjpeg path", () => {
    assert.equal(detectProtocol("http://cam.example.com/cgi-bin/mjpeg"), "mjpeg_hint");
  });

  it("returns static for regular JPEG URL", () => {
    assert.equal(detectProtocol("https://dot.example.com/cameras/cam1.jpg"), "static");
  });

  it("returns static for null/empty input", () => {
    assert.equal(detectProtocol(null), "static");
    assert.equal(detectProtocol(""), "static");
    assert.equal(detectProtocol(undefined), "static");
  });
});

describe("checkFfmpeg", () => {
  it("reports ffmpeg availability", async () => {
    const result = await checkFfmpeg();
    assert.equal(typeof result.available, "boolean");
    assert.equal(typeof result.path, "string");
    if (result.available) {
      assert.ok(result.version);
    }
  });
});

describe("checkYtdlp", () => {
  it("reports yt-dlp availability", async () => {
    const result = await checkYtdlp();
    assert.equal(typeof result.available, "boolean");
    assert.equal(typeof result.path, "string");
  });
});
