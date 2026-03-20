// carousel.js — Image carousel and video carousel components
// Uses the same reel-player layout: media on left, reading text on right
import { sanitizeHtml } from '../utils.js';

function buildSlides(mod) {
  var urls = mod.media_url || [];
  var captions = (mod.bottom_content && mod.bottom_content.carousel_captions) || [];

  return urls.map(function(url, i) {
    var caption = captions[i] || '';
    var captionHtml = caption
      ? '<div class="carousel__caption">' + sanitizeHtml(caption) + '</div>'
      : '';

    if (mod.content_type === 'video_carousel') {
      return '<div class="carousel__slide" data-index="' + i + '">'
        + '<div class="carousel__slide-inner">'
        + '<video class="carousel__video" id="carousel-video-' + i + '" playsinline preload="metadata"></video>'
        + captionHtml
        + '</div></div>';
    }
    return '<div class="carousel__slide" data-index="' + i + '">'
      + '<div class="carousel__slide-inner">'
      + '<img class="carousel__img" src="' + url + '" alt="" loading="lazy">'
      + captionHtml
      + '</div></div>';
  }).join('');
}

function buildControls(total) {
  if (total <= 1) return { arrows: '', dots: '', counter: '' };

  var dots = '<div class="carousel__dots">' + Array.from({ length: total }, function(_, i) {
    return '<button class="carousel__dot' + (i === 0 ? ' carousel__dot--active' : '') + '" data-index="' + i + '"></button>';
  }).join('') + '</div>';

  var prev = '<button class="carousel__arrow carousel__arrow--prev" id="carousel-prev" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>';
  var next = '<button class="carousel__arrow carousel__arrow--next" id="carousel-next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></button>';

  var counter = '<div class="carousel__counter">1 / ' + total + '</div>';

  return { arrows: prev + next, dots: dots, counter: counter };
}

export function renderImageCarousel(mod) {
  return renderCarousel(mod);
}

export function renderVideoCarousel(mod) {
  return renderCarousel(mod);
}

function renderCarousel(mod) {
  var urls = mod.media_url || [];
  var reading = (mod.bottom_content && mod.bottom_content.reading_text) || '';
  var slides = buildSlides(mod);
  var ctrl = buildControls(urls.length);

  return '<div class="reel-player fade-in">'
    + '<div class="reel-player__video-wrap">'
    + '<div class="carousel__track-wrap">'
    + '<div class="carousel__track" id="carousel-track">' + slides + '</div>'
    + ctrl.arrows
    + ctrl.counter
    + '</div>'
    + ctrl.dots
    + '</div>'
    + (reading ? '<div class="reel-player__reading"><div class="reel-player__reading-inner">' + sanitizeHtml(reading) + '</div></div>' : '')
    + '</div>';
}

export function initCarousel(mod) {
  var track = document.getElementById('carousel-track');
  if (!track) return function() {};

  var urls = mod.media_url || [];
  var total = urls.length;
  var current = 0;
  var hlsInstances = [];

  var prevBtn = document.getElementById('carousel-prev');
  var nextBtn = document.getElementById('carousel-next');
  var wrap = track.closest('.reel-player__video-wrap');
  var dots = wrap ? wrap.querySelectorAll('.carousel__dot') : [];
  var counter = track.parentElement.querySelector('.carousel__counter');

  function goTo(idx) {
    if (idx < 0 || idx >= total) return;
    current = idx;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';

    dots.forEach(function(d, i) {
      d.classList.toggle('carousel__dot--active', i === current);
    });

    if (counter) counter.textContent = (current + 1) + ' / ' + total;
    if (prevBtn) prevBtn.style.display = current === 0 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = current === total - 1 ? 'none' : '';

    if (mod.content_type === 'video_carousel') {
      urls.forEach(function(_, i) {
        var vid = document.getElementById('carousel-video-' + i);
        if (!vid) return;
        if (i === current) {
          vid.play().catch(function() {});
        } else {
          vid.pause();
        }
      });
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });
  dots.forEach(function(dot) {
    dot.addEventListener('click', function() { goTo(parseInt(dot.dataset.index, 10)); });
  });

  // Touch/swipe
  var startX = 0;
  var isDragging = false;
  track.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });
  track.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(current + 1);
      else goTo(current - 1);
    }
  });

  // Init HLS for video carousels
  if (mod.content_type === 'video_carousel') {
    urls.forEach(function(url, i) {
      var vid = document.getElementById('carousel-video-' + i);
      if (!vid) return;

      if (url.includes('.m3u8') && window.Hls && Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(vid);
        hlsInstances.push(hls);
        if (i === 0) {
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            vid.play().catch(function() {});
          });
        }
      } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
        vid.src = url;
        if (i === 0) vid.play().catch(function() {});
      } else {
        vid.src = url;
        if (i === 0) vid.play().catch(function() {});
      }
    });
  }

  return function() {
    hlsInstances.forEach(function(hls) { hls.destroy(); });
  };
}
