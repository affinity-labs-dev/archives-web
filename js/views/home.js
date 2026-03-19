import { getAllEras, getAdventures, getFeaturedAdventure, getTodayStory } from '../api.js';
import { renderHeader } from '../components/header.js';
import { getDailyStreak, getDailyProgress } from '../state.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';

export default function homeView(app) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  let aborted = false;

  Promise.all([getAllEras(), getFeaturedAdventure(), getTodayStory()]).then(function(results) {
    if (aborted) return;
    var eras = results[0];
    var featuredAdv = results[1];
    var dailyEntry = results[2];

    // For eras without bg_url but with content, fetch first adventure's bg
    // Trim all bg_urls upfront to fix stray whitespace/newlines from DB
    eras.forEach(function(e) { if (e.bg_url) e.bg_url = e.bg_url.trim(); });
    var erasWithContent = eras.filter(function(e) { return !e.bg_url && e.status !== 'coming_soon'; });
    var bgPromises = erasWithContent.map(function(era) {
      return getAdventures(era.era_id).then(function(advs) {
        if (advs.length > 0) {
          var bg = (advs[0].card_content && advs[0].card_content.background_image) || advs[0].icon_url;
          era.bg_url = bg;
        }
      }).catch(function() {});
    });

    return Promise.all(bgPromises).then(function() {
      if (aborted) return;
      var activeEras = eras.filter(function(e) { return e.status === 'active' || e.status === 'premium'; });
      var otherEras = eras.filter(function(e) { return e.status !== 'active' && e.status !== 'premium'; });

      // Featured adventure hero
      var heroHtml = '';
      if (featuredAdv) {
        var advTitle = escapeHtml(featuredAdv.adventure_title?.replace(/\r?\n/g, ' '));
        var advBg = sanitizeUrl((featuredAdv.card_content && featuredAdv.card_content.background_image) || featuredAdv.icon_url);
        var advDesc = escapeHtml(featuredAdv.adventure_description);
        var eraName = escapeHtml((featuredAdv.card_content && featuredAdv.card_content.era_name) || featuredAdv.era_id);
        var estTime = escapeHtml((featuredAdv.card_content && featuredAdv.card_content.estimated_time) || '');
        var featuredRid = featuredAdv.readable_id;

        heroHtml = '<div class="home__hero" data-rid="' + escapeHtml(featuredRid) + '">'
          + '<div class="home__hero-bg" style="background-image: url(' + advBg + ')"></div>'
          + '<div class="home__hero-badge">Featured Adventure</div>'
          + '<div class="home__hero-overlay">'
          + '<div class="home__hero-label">' + eraName + (estTime ? ' · ' + estTime : '') + '</div>'
          + '<h1 class="home__hero-title">' + advTitle + '</h1>'
          + (featuredAdv.timeline ? '<div class="home__hero-timeline">' + escapeHtml(featuredAdv.timeline) + '</div>' : '')
          + '<p class="home__hero-desc">' + advDesc + '</p>'
          + '<div class="home__hero-cta">Start Adventure <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>'
          + '</div></div>';
      }

      // Daily Story section — cinematic card with thumbnail
      var dailyHtml = '';
      var dc = null;
      var dailyThumb = '';
      var dailyTitle = 'Today\'s Story';
      var dailyDayNum = '';
      var dailyTotalDays = '';
      var dailyStreak = getDailyStreak([]);

      if (dailyEntry && dailyEntry.content) {
        dc = typeof dailyEntry.content === 'string' ? JSON.parse(dailyEntry.content) : dailyEntry.content;
        dailyTitle = dc.today_title || dailyTitle;
        dailyDayNum = dc.day_number || '';
        dailyTotalDays = dc.total_days || '';
        if (dc.card1 && dc.card1.thumbnail_url) dailyThumb = sanitizeUrl(dc.card1.thumbnail_url);
      }

      dailyHtml = '<div class="home__section">'
        + '<div class="home__section-header">'
        + '<div class="home__section-label">Daily</div>'
        + '<h2 class="home__section-title">Today\'s Story</h2>'
        + '</div>'
        + '<div class="home__daily" data-nav="daily">'
        + (dailyThumb ? '<div class="home__daily-bg" style="background-image:url(' + dailyThumb + ')"></div>' : '')
        + '<div class="home__daily-overlay">'
        + (dailyDayNum ? '<div class="home__daily-day">Day ' + escapeHtml(dailyDayNum) + (dailyTotalDays ? ' of ' + escapeHtml(dailyTotalDays) : '') + '</div>' : '')
        + '<div class="home__daily-title">' + escapeHtml(dailyTitle) + '</div>'
        + '<div class="home__daily-bottom">'
        + '<div class="home__daily-cta">Continue <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>'
        + (dailyStreak > 0 ? '<div class="home__daily-streak"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 23c-3.6 0-8-3-8-9 0-4 2.5-7.5 5-9.5.4-.3 1 0 1 .5 0 1.5 1 3 2.5 3.5.3.1.6-.1.6-.4 0-2.5 1.5-5.5 3.5-7.1.4-.3 1 0 1 .5C18 5 20 9 20 14c0 6-4.4 9-8 9z"/></svg> ' + dailyStreak + ' day streak</div>' : '')
        + '</div>'
        + '</div></div></div>';

      // Active eras grid
      var eraCards = activeEras.map(function(era, idx) {
        var num = String(idx + 1).padStart(2, '0');
        var bgUrl = sanitizeUrl(era.bg_url);
        var bgStyle = bgUrl ? 'background-image: url(' + bgUrl + ')' : '';
        var eraPremium = era.status === 'premium';
        var badge = eraPremium ? '<span class="era-card__badge era-card__badge--premium">Premium</span>' : '';
        var lockIcon = '';

        return '<div class="era-card" data-era="' + escapeHtml(era.era_id) + '">'
          + '<div class="era-card__bg" style="' + bgStyle + '"></div>'
          + '<div class="era-card__overlay">'
          + '<div class="era-card__number">' + num + '</div>'
          + badge
          + lockIcon
          + '<div class="era-card__info">'
          + (era.timeline ? '<div class="era-card__timeline">' + escapeHtml(era.timeline) + '</div>' : '')
          + '<div class="era-card__title">' + escapeHtml(era.title) + '</div>'
          + '<div class="era-card__desc">' + escapeHtml(era.description) + '</div>'
          + '</div>'
          + '</div></div>';
      }).join('');

      // Coming soon eras
      var comingSoonHtml = '';
      if (otherEras.length > 0) {
        var comingCards = otherEras.map(function(era) {
          var bgUrl = sanitizeUrl(era.bg_url);
          var bgStyle = bgUrl ? 'background-image: url(' + bgUrl + ')' : '';
          return '<div class="era-card era-card--disabled">'
            + '<div class="era-card__bg" style="' + bgStyle + '"></div>'
            + '<div class="era-card__overlay">'
            + '<span class="era-card__badge era-card__badge--soon">Coming Soon</span>'
            + '<div class="era-card__info">'
            + (era.timeline ? '<div class="era-card__timeline">' + escapeHtml(era.timeline) + '</div>' : '')
            + '<div class="era-card__title">' + escapeHtml(era.title) + '</div>'
            + '</div>'
            + '</div></div>';
        }).join('');

        comingSoonHtml = '<div class="home__section">'
          + '<div class="home__section-header">'
          + '<div class="home__section-label">On the Horizon</div>'
          + '<h2 class="home__section-title">Coming Soon</h2>'
          + '</div>'
          + '<div class="era-grid era-grid--compact stagger-in">' + comingCards + '</div>'
          + '</div>';
      }

      app.innerHTML = renderHeader('', null)
        + '<div class="home">'
        + heroHtml
        + dailyHtml
        + '<div class="home__section">'
        + '<div class="home__section-header">'
        + '<div class="home__section-label">Explore</div>'
        + '<h2 class="home__section-title">All Eras</h2>'
        + '</div>'
        + '<div class="era-grid stagger-in">' + eraCards + '</div>'
        + '</div>'
        + comingSoonHtml
        + '</div>';

      // Attach click handlers via event delegation
      var hero = app.querySelector('.home__hero[data-rid]');
      if (hero) hero.addEventListener('click', function() { window.location.hash = '/adventure/' + hero.dataset.rid; });

      var daily = app.querySelector('.home__daily[data-nav]');
      if (daily) daily.addEventListener('click', function() { window.location.hash = '/daily'; });

      app.querySelectorAll('.era-card[data-era]').forEach(function(card) {
        card.addEventListener('click', function() {
          var era = activeEras.find(function(e) { return e.era_id === card.dataset.era; });
          if (era && era.status === 'premium' && !isPremium()) {
            showPaywall(function() { window.location.hash = '/era/' + card.dataset.era; });
            return;
          }
          window.location.hash = '/era/' + card.dataset.era;
        });
      });

    });
  }).catch(function(err) {
    if (aborted) return;
    app.innerHTML = '<div class="error-msg">Failed to load eras.</div>';
  });

  return function() { aborted = true; };
}
