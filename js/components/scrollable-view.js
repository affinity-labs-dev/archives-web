import { sanitizeUrl, sanitizeHtml } from '../utils.js';

export function initScrollableVideos(container) {
  var videos = (container || document).querySelectorAll('.scrollable-view__video[data-hls]');
  var instances = [];
  videos.forEach(function(video) {
    var src = video.dataset.hls;
    if (!src) return;
    if (window.Hls && window.Hls.isSupported()) {
      var hls = new window.Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      instances.push(hls);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  });
  return function() {
    instances.forEach(function(h) { h.destroy(); });
  };
}

export function renderScrollableView(module) {
  const blocks = module.content_blocks || [];

  const html = blocks
    .sort((a, b) => a.order - b.order)
    .map(block => {
      if (block.type === 'text') {
        // text blocks contain intentional HTML from the CMS
        return `<div class="scrollable-view__block scrollable-view__block--text">${sanitizeHtml(block.content)}</div>`;
      }
      if (block.type === 'image') {
        const imgUrl = sanitizeUrl(block.url);
        return `<div class="scrollable-view__block scrollable-view__block--image">
          <img src="${imgUrl}" alt="" loading="lazy">
        </div>`;
      }
      if (block.type === 'video' && block.url) {
        const vidUrl = sanitizeUrl(block.url);
        const isHls = vidUrl.includes('.m3u8');
        return `<div class="scrollable-view__block scrollable-view__block--video">
          <video class="scrollable-view__video" playsinline ${block.autoplay ? 'autoplay' : ''} ${block.loop ? 'loop' : ''} muted
            ${isHls ? 'data-hls="' + vidUrl + '"' : 'src="' + vidUrl + '"'}></video>
        </div>`;
      }
      return '';
    })
    .join('');

  return `<div class="scrollable-view fade-in">${html}</div>`;
}
