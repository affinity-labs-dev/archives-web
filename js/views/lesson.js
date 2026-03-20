import { getAdventure } from '../api.js';
import { renderHeader } from '../components/header.js';
import { renderReelPlayer, initReelPlayer } from '../components/reel-player.js';
import { renderScrollableView, initScrollableVideos } from '../components/scrollable-view.js';
import { renderImageCarousel, renderVideoCarousel, initCarousel } from '../components/carousel.js';
import { startBgMusic, stopBgMusic, renderBgMusicToggle, initBgMusicToggle } from '../components/bg-music.js';
import { escapeHtml } from '../utils.js';

export default function lessonView(app, { readableId, moduleIndex }) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  const idx = parseInt(moduleIndex, 10);
  let cleanupFn = null;
  let aborted = false;

  getAdventure(readableId).then(adv => {
    if (aborted) return;
    if (!adv) {
      app.innerHTML = '<div class="error-msg">Adventure not found.</div>';
      return;
    }

    const modules = (adv.content_list || []).sort((a, b) => a.order_by - b.order_by);
    const mod = modules[idx];
    if (!mod) {
      app.innerHTML = '<div class="error-msg">Module not found.</div>';
      return;
    }

    const backHash = `/adventure/${readableId}`;
    let contentHtml = '';

    if (mod.content_type === 'reel') {
      contentHtml = renderReelPlayer(mod);
    } else if (mod.content_type === 'scrollable_media_view') {
      contentHtml = renderScrollableView(mod);
    } else if (mod.content_type === 'image_carousel') {
      contentHtml = renderImageCarousel(mod);
    } else if (mod.content_type === 'video_carousel') {
      contentHtml = renderVideoCarousel(mod);
    } else {
      contentHtml = `<div class="error-msg">Unknown content type: ${escapeHtml(mod.content_type)}</div>`;
    }

    const hasQuiz = mod.questions && mod.questions.length > 0;
    const hasBgMusic = !!mod.background_music_url;

    var advTitle = escapeHtml(adv.adventure_title?.replace(/\r?\n/g, ' '));
    var modTitle = escapeHtml(mod.thumbnail_title || 'Module ' + (idx + 1));
    var eraId = adv.era_id || 'prophets';
    var eraName = escapeHtml((adv.card_content && adv.card_content.era_name) || eraId);

    app.innerHTML = `
      ${renderHeader(modTitle, backHash, [
        { label: 'Home', hash: '/' },
        { label: eraName, hash: '/era/' + encodeURIComponent(eraId) },
        { label: advTitle, hash: '/adventure/' + readableId },
        { label: modTitle }
      ])}
      <div class="lesson-wrap">
        ${contentHtml}
      </div>
    `;

    // Determine forward navigation
    var forwardHash = hasQuiz ? `/quiz/${readableId}/${idx}` : backHash;

    // Add quiz button (desktop/tablet — inside reading panel)
    if (hasQuiz) {
      const reading = app.querySelector('.reel-player__reading');
      if (reading) {
        const btn = document.createElement('button');
        btn.className = 'cta-btn';
        btn.style.width = '100%';
        btn.style.margin = '12px 0 0';
        btn.textContent = 'Take Quiz';
        btn.addEventListener('click', () => { window.location.hash = forwardHash; });
        reading.appendChild(btn);
      } else {
        const wrap = document.createElement('div');
        wrap.className = 'lesson-quiz-btn-wrap';
        const btn = document.createElement('button');
        btn.className = 'cta-btn';
        btn.textContent = 'Take Quiz';
        btn.addEventListener('click', () => { window.location.hash = forwardHash; });
        wrap.appendChild(btn);
        app.querySelector('.lesson-wrap').appendChild(wrap);
      }
    }

    // Mobile forward arrow — overlaid on video/carousel (not scrollable)
    if (mod.content_type !== 'scrollable_media_view') {
      var videoWrap = app.querySelector('.reel-player__video-wrap');
      if (videoWrap) {
        var fwd = document.createElement('button');
        fwd.className = 'reel-player__forward';
        fwd.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
        fwd.addEventListener('click', function(e) {
          e.stopPropagation();
          window.location.hash = forwardHash;
        });
        videoWrap.appendChild(fwd);
      }
    }

    // Start background music — inject toggle into the media container
    if (hasBgMusic) {
      var mediaWrap = app.querySelector('.reel-player__video-wrap') || app.querySelector('.carousel__track-wrap');
      if (mediaWrap) {
        mediaWrap.insertAdjacentHTML('beforeend', renderBgMusicToggle());
      }
      startBgMusic(mod.background_music_url);
      initBgMusicToggle();
    }

    // Init after DOM render
    if (mod.content_type === 'reel' && mod.media_url?.[0]) {
      cleanupFn = initReelPlayer(mod.media_url[0]);
    } else if (mod.content_type === 'video_carousel' || mod.content_type === 'image_carousel') {
      cleanupFn = initCarousel(mod);
    } else if (mod.content_type === 'scrollable_media_view') {
      cleanupFn = initScrollableVideos(app);
    }
  }).catch(err => {
    if (aborted) return;
    app.innerHTML = '<div class="error-msg">Failed to load lesson.</div>';
  });

  // Return cleanup function
  return () => {
    aborted = true;
    stopBgMusic();
    if (cleanupFn) cleanupFn();
  };
}
