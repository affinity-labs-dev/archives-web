import { sanitizeHtml } from '../utils.js';

export function renderReelPlayer(module) {
  const hlsUrl = module.media_url?.[0] || '';
  const readingText = module.bottom_content?.reading_text || '';

  return `
    <div class="reel-player fade-in">
      <div class="reel-player__video-wrap">
        <video id="reel-video" playsinline controls></video>
      </div>
      ${readingText ? `<div class="reel-player__reading"><div class="reel-player__reading-inner">${sanitizeHtml(readingText)}</div></div>` : ''}
    </div>
  `;
}

export function initReelPlayer(hlsUrl) {
  const video = document.getElementById('reel-video');
  if (!video || !hlsUrl) return null;

  if (hlsUrl.endsWith('.m3u8') && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    return () => hls.destroy();
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl;
    video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    return () => { video.pause(); video.removeAttribute('src'); video.load(); };
  } else if (hlsUrl.endsWith('.mp4')) {
    video.src = hlsUrl;
    return () => { video.pause(); video.removeAttribute('src'); video.load(); };
  }
  return null;
}
