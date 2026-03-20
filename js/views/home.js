import { getAllEras, getAdventures, getAdventure, getTodayStory } from '../api.js';
import { renderHeader } from '../components/header.js';
import { getDailyStreak, getDailyProgress, getAllProgress, getCompletedCount } from '../state.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';

export default function homeView(app) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  let aborted = false;

  Promise.all([getAllEras(), getTodayStory()]).then(function(results) {
    if (aborted) return;
    var eras = results[0];
    var dailyEntry = results[1];

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

      // Smart featured adventure — find where user left off
      var heroHtml = '';
      var heroTarget = null; // { rid, moduleIdx } or null

      // Accessible eras (skip premium for non-premium users)
      var premium = isPremium();
      var accessibleEras = activeEras.filter(function(e) {
        return e.status === 'active' || (e.status === 'premium' && premium);
      });

      // Fetch adventures for all accessible eras to find continue point
      var eraAdvPromises = accessibleEras.map(function(era) {
        return getAdventures(era.era_id).then(function(advs) {
          return { era: era, adventures: advs };
        });
      });

      return Promise.all(eraAdvPromises).then(function(eraAdvResults) {
        if (aborted) return;

        var progress = getAllProgress();
        var featuredAdv = null;
        var heroBadge = 'Featured Adventure';
        var heroCta = 'Start Adventure';

        // Build set of accessible era IDs for double-checking
        var accessibleEraIds = {};
        accessibleEras.forEach(function(e) { accessibleEraIds[e.era_id] = true; });

        // Flatten all accessible adventures
        var allAccessibleAdvs = [];
        eraAdvResults.forEach(function(r) {
          r.adventures.forEach(function(adv) {
            // Double-check era_id is accessible
            if (accessibleEraIds[adv.era_id]) {
              allAccessibleAdvs.push(adv);
            }
          });
        });

        // 1) Find in-progress adventure (has some modules done but not all)
        for (var i = 0; i < allAccessibleAdvs.length; i++) {
          var adv = allAccessibleAdvs[i];
          var completed = getCompletedCount(adv.readable_id);
          var totalMods = (adv.card_content && adv.card_content.total_modules) || 5;
          if (completed > 0 && completed < totalMods) {
            featuredAdv = adv;
            heroBadge = 'Continue Learning';
            heroCta = 'Continue Adventure';
            break;
          }
        }

        // 2) If no in-progress, find first adventure with zero progress
        if (!featuredAdv) {
          for (var i = 0; i < allAccessibleAdvs.length; i++) {
            var adv = allAccessibleAdvs[i];
            var completed = getCompletedCount(adv.readable_id);
            if (completed === 0) {
              featuredAdv = adv;
              heroBadge = 'Up Next';
              heroCta = 'Start Adventure';
              break;
            }
          }
        }

        // 3) Fallback: first accessible adventure
        if (!featuredAdv && allAccessibleAdvs.length > 0) {
          featuredAdv = allAccessibleAdvs[0];
        }

        if (featuredAdv) {
          // Determine deep link — find first incomplete module
          var featuredRid = featuredAdv.readable_id;
          heroTarget = { rid: featuredRid, moduleIdx: null };

          // Fetch full adventure to get module list for deep linking
          getAdventure(featuredRid).then(function(fullAdv) {
            if (!fullAdv || aborted) return;
            var modules = (fullAdv.content_list || []).sort(function(a, b) { return a.order_by - b.order_by; });
            var advProgress = progress[featuredRid] || {};
            for (var m = 0; m < modules.length; m++) {
              if (!(modules[m].id in advProgress)) {
                heroTarget.moduleIdx = m;
                break;
              }
            }
          }).catch(function() {});

          var advTitle = escapeHtml(featuredAdv.adventure_title?.replace(/\r?\n/g, ' '));
          var advBg = sanitizeUrl((featuredAdv.card_content && featuredAdv.card_content.background_image) || featuredAdv.icon_url);
          var advDesc = escapeHtml(featuredAdv.adventure_description);
          var eraName = escapeHtml((featuredAdv.card_content && featuredAdv.card_content.era_name) || featuredAdv.era_id);
          var estTime = escapeHtml((featuredAdv.card_content && featuredAdv.card_content.estimated_time) || '');

          // Preload hero image (reuse existing link if present)
          var heroLink = document.getElementById('preload-hero');
          if (!heroLink) {
            heroLink = document.createElement('link');
            heroLink.id = 'preload-hero';
            heroLink.rel = 'preload';
            heroLink.as = 'image';
            document.head.appendChild(heroLink);
          }
          heroLink.href = advBg;

          heroHtml = '<div class="home__hero" id="home-hero">'
            + '<img class="home__hero-bg" src="' + advBg + '" alt="" fetchpriority="high">'
            + '<div class="home__hero-badge">' + heroBadge + '</div>'
            + '<div class="home__hero-overlay">'
            + '<div class="home__hero-label">' + eraName + (estTime ? ' · ' + estTime : '') + '</div>'
            + '<h1 class="home__hero-title">' + advTitle + '</h1>'
            + (featuredAdv.timeline ? '<div class="home__hero-timeline">' + escapeHtml(featuredAdv.timeline) + '</div>' : '')
            + '<p class="home__hero-desc">' + advDesc + '</p>'
            + '<div class="home__hero-cta">' + heroCta + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>'
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
        try { dc = typeof dailyEntry.content === 'string' ? JSON.parse(dailyEntry.content) : dailyEntry.content; } catch (e) { dc = null; }
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
        + (dailyThumb ? '<img class="home__daily-bg" src="' + dailyThumb + '" alt="" loading="lazy">' : '')
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

        var eraPremium = era.status === 'premium';
        var badge = eraPremium ? '<span class="era-card__badge era-card__badge--premium">Premium</span>' : '';
        var lockIcon = '';

        return '<div class="era-card" data-era="' + escapeHtml(era.era_id) + '">'
          + (bgUrl ? '<img class="era-card__bg" src="' + bgUrl + '" alt="" loading="lazy">' : '<div class="era-card__bg"></div>')
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
  
          return '<div class="era-card era-card--disabled">'
            + (bgUrl ? '<img class="era-card__bg" src="' + bgUrl + '" alt="" loading="lazy">' : '<div class="era-card__bg"></div>')
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
      var hero = document.getElementById('home-hero');
      if (hero) hero.addEventListener('click', function() {
        if (heroTarget && heroTarget.moduleIdx !== null) {
          window.location.hash = '/lesson/' + heroTarget.rid + '/' + heroTarget.moduleIdx;
        } else if (heroTarget) {
          window.location.hash = '/adventure/' + heroTarget.rid;
        }
      });

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
