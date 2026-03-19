import { getAdventure, getEra } from '../api.js';
import { isComplete, getStars } from '../state.js';
import { renderHeader } from '../components/header.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';

var TYPE_ICONS = {
  reel: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>',
  scrollable_media_view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
  image_carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="15" height="12" rx="2"/><rect x="7" y="3" width="15" height="12" rx="2"/></svg>',
  video_carousel: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>',
};

function miniStars(count) {
  var html = '<div class="mtile__stars">';
  for (var i = 0; i < 3; i++) {
    var filled = i < count;
    html += '<svg class="mtile__star ' + (filled ? 'mtile__star--filled' : '') + '" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.5">'
      + '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
      + '</svg>';
  }
  html += '</div>';
  return html;
}

function isPortraitModule(index, total) {
  return index === 0 || index === total - 1;
}

export default function adventureDetailView(app, params) {
  var readableId = params.readableId;
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  let aborted = false;

  getAdventure(readableId).then(function(adv) {
    if (aborted) return;
    if (!adv) {
      app.innerHTML = '<div class="error-msg">Adventure not found.</div>';
      return;
    }

    var eraId = adv.era_id || 'prophets';
    var title = escapeHtml(adv.adventure_title?.replace(/\r?\n/g, ' '));
    var bgImage = sanitizeUrl((adv.card_content && adv.card_content.background_image) || adv.icon_url);
    var iconUrl = sanitizeUrl(adv.icon_url);
    var story = (adv.card_content && adv.card_content.adventure_story) || '';
    var estTime = escapeHtml((adv.card_content && adv.card_content.estimated_time) || '');
    var sorted = (adv.content_list || []).sort(function(a, b) { return a.order_by - b.order_by; });

    var tiles = sorted.map(function(mod, i) {
      var done = isComplete(readableId, mod.id);
      var stars = getStars(readableId, mod.id);
      var typeIcon = TYPE_ICONS[mod.content_type] || TYPE_ICONS.reel;
      var typeLabels = { reel: 'Reel', scrollable_media_view: 'Story', image_carousel: 'Gallery', video_carousel: 'Videos' };
      var typeLabel = typeLabels[mod.content_type] || 'Lesson';
      var num = String(i + 1).padStart(2, '0');
      var cls = isPortraitModule(i, sorted.length) ? 'mtile--portrait' : 'mtile--landscape';
      var thumbUrl = sanitizeUrl(mod.thumbnail_url);

      return '<div class="mtile ' + cls + (done ? ' mtile--done' : '') + '" data-lesson-idx="' + i + '">'
        + '<img class="mtile__img" src="' + thumbUrl + '" alt="" loading="lazy">'
        + '<div class="mtile__overlay">'
        + '<div class="mtile__number">' + num + '</div>'
        + '<div class="mtile__type-icon">' + typeIcon + '</div>'
        + (done ? '<div class="mtile__center-stars">' + miniStars(stars) + '</div>' : '')
        + '<div class="mtile__info">'
        + '<div class="mtile__title">' + escapeHtml(mod.thumbnail_title || 'Module ' + (i + 1)) + '</div>'
        + '<div class="mtile__meta-row">'
        + '<span class="mtile__subtitle">' + escapeHtml(typeLabel) + '</span>'
        + '</div>'
        + '</div></div></div>';
    }).join('');

    var eraName = escapeHtml((adv.card_content && adv.card_content.era_name) || eraId);

    app.innerHTML = renderHeader(eraName, '/era/' + encodeURIComponent(eraId), [
          { label: 'Home', hash: '/' },
          { label: eraName, hash: '/era/' + encodeURIComponent(eraId) },
          { label: title }
        ])
      + '<div class="detail-wrap fade-in">'
      + '<div class="detail-hero">'
      + '<img class="detail-hero__img" src="' + bgImage + '" alt="" onerror="if(this.src!==\'' + iconUrl + '\')this.src=\'' + iconUrl + '\'">'
      + '<div class="detail-hero__overlay">'
      + '<h1 class="detail-hero__title">' + title + '</h1>'
      + '<div class="detail-hero__meta"><span>' + escapeHtml(adv.timeline) + '</span>'
      + (estTime ? '<span>' + estTime + '</span>' : '')
      + '</div></div></div>'
      + (story
        ? '<div class="detail-about">'
          + '<button class="detail-about__toggle" id="about-toggle">About this adventure'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
          + '</button>'
          + '<div class="detail-about__text" id="about-text">' + story + '</div></div>'
        : '')
      + '<div class="module-section">'
      + '<div class="module-section__title">Modules</div>'
      + '<div class="mtile-grid stagger-in">' + tiles + '</div>'
      + '</div></div>';

    // Attach click handlers via event delegation
    app.querySelectorAll('.mtile[data-lesson-idx]').forEach(tile => {
      tile.addEventListener('click', () => {
        window.location.hash = '/lesson/' + readableId + '/' + tile.dataset.lessonIdx;
      });
    });

    var toggle = document.getElementById('about-toggle');
    var text = document.getElementById('about-text');
    if (toggle && text) {
      toggle.addEventListener('click', function() {
        toggle.classList.toggle('open');
        text.classList.toggle('open');
      });
    }
  }).catch(function(err) {
    if (aborted) return;
    app.innerHTML = '<div class="error-msg">Failed to load adventure.</div>';
  });

  return () => { aborted = true; };
}
