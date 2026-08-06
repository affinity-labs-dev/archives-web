/**
 * One place that decides whether a video URL is HLS.
 *
 * This logic was written out by hand in six components and thirteen places -
 * `url?.includes('.m3u8') || url?.includes('/hls/') || url?.includes('format=m3u8')`
 * - alongside a seventh, better copy in AdaptivePreloadService. The hand-written
 * ones are a strict subset: they are case-sensitive and they miss `format=hls`,
 * so a URL spelled `.M3U8` or `?format=hls` was played as progressive MP4 and
 * simply failed. Consolidating on the superset fixes that everywhere at once.
 *
 * It matters more on web than on native. expo-video renders a real <video>
 * element, and Safari plays HLS natively while Chrome does not - so whatever
 * decides "this is HLS" is what will decide whether to attach a JS player. That
 * branch needs to exist in one function, not thirteen, or it gets added twelve
 * times and missed once.
 */

/** True when the URL is an HLS stream rather than a progressive file. */
export function isHlsUrl(url?: string | null): boolean {
  if (!url) return false;
  // Lowercased before matching: URLs are not reliably lower-case, and the
  // copies that skipped this silently misclassified `.M3U8`.
  const lower = url.toLowerCase();
  return (
    lower.includes('.m3u8') ||
    lower.includes('/hls/') ||
    lower.includes('format=m3u8') ||
    lower.includes('format=hls')
  );
}

/**
 * The `contentType` expo-video wants.
 *
 * Android's ExoPlayer needs the hint explicitly - it does not sniff - which is
 * why every call site was computing this in the first place.
 */
export function resolveContentType(url?: string | null): 'hls' | 'progressive' {
  return isHlsUrl(url) ? 'hls' : 'progressive';
}
