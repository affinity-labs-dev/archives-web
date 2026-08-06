import { describe, it, expect } from 'vitest';
import { isHlsUrl, resolveContentType } from '../videoSource';

// The reason this util exists: the same three-clause `includes` check was
// written out by hand in thirteen places across six components, and the
// hand-written copies were a strict subset of the correct one. These tests pin
// the superset, so the next person to touch video source handling changes one
// function and finds out immediately if they broke it.

describe('isHlsUrl', () => {
  it('recognises the forms the CDN actually serves', () => {
    expect(isHlsUrl('https://cdn.example.com/video/master.m3u8')).toBe(true);
    expect(isHlsUrl('https://cdn.example.com/hls/video/index.html')).toBe(true);
    expect(isHlsUrl('https://cdn.example.com/v?format=m3u8')).toBe(true);
    expect(isHlsUrl('https://cdn.example.com/v?format=hls')).toBe(true);
  });

  it('is case-insensitive', () => {
    // The bug the inline copies carried. A URL spelled this way was classified
    // as progressive MP4 and handed to the player with the wrong contentType,
    // which on Android simply fails - ExoPlayer does not sniff.
    expect(isHlsUrl('https://cdn.example.com/VIDEO/MASTER.M3U8')).toBe(true);
    expect(isHlsUrl('https://cdn.example.com/HLS/x.ts')).toBe(true);
    expect(isHlsUrl('https://cdn.example.com/v?FORMAT=HLS')).toBe(true);
  });

  it('treats progressive files as progressive', () => {
    expect(isHlsUrl('https://cdn.example.com/video.mp4')).toBe(false);
    expect(isHlsUrl('https://cdn.example.com/video.webm')).toBe(false);
    expect(isHlsUrl('https://cdn.example.com/video.mp4?token=abc')).toBe(false);
  });

  it('handles the empty cases the call sites pass', () => {
    // Several call sites read `videoSource?.uri` off a possibly-empty object,
    // which is why every inline copy used optional chaining.
    expect(isHlsUrl(undefined)).toBe(false);
    expect(isHlsUrl(null)).toBe(false);
    expect(isHlsUrl('')).toBe(false);
  });
});

describe('resolveContentType', () => {
  it('returns what expo-video expects', () => {
    expect(resolveContentType('https://cdn.example.com/a.m3u8')).toBe('hls');
    expect(resolveContentType('https://cdn.example.com/a.mp4')).toBe('progressive');
    // Unknown or missing degrades to progressive, matching the previous
    // behaviour of every call site.
    expect(resolveContentType(undefined)).toBe('progressive');
  });
});
