import { getTodayStory, getDailyStories, getDailyStory } from '../api.js';
import { renderHeader } from '../components/header.js';
import { getDailyProgress, getDailyProgressPercent, getDailyStreak, getWeekStatus } from '../state.js';
import { playStars } from '../components/sounds.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';
import { isPremium } from '../services/revenuecat.js';
import { showPaywall } from '../components/paywall.js';

function isAllComplete(steps, dayProgress) {
  if (!dayProgress || steps.length === 0) return false;
  for (var i = 0; i < steps.length; i++) {
    if (!dayProgress[steps[i]]) return false;
  }
  return true;
}

function buildContent(c, storyTitle, storyDate, dayNum, totalDays, steps, dayProgress, isToday, streak, week, todayStr, availableDates) {
  var progress = getDailyProgressPercent(storyDate, steps.length);
  var allDone = isAllComplete(steps, dayProgress);

  var html = '';

  // Full-bleed hero thumbnail (like adventure detail page)
  if (c && c.card1) {
    var watchDone = dayProgress && dayProgress.watch;
    var thumb = sanitizeUrl(c.card1.thumbnail_url);
    var watchTitle = escapeHtml(c.card1.thumbnail_title || storyTitle);
    html += '<div class="dh__hero' + (watchDone ? ' dh__hero--done' : '') + '" data-step="0">';
    if (thumb) html += '<img class="dh__hero-img" src="' + thumb + '" alt="">';

    // Week tracker overlaid at top of hero
    html += '<div class="dh__week-wrap">';
    html += '<div class="dh__week">';
    week.forEach(function(day) {
      var dotClass = 'dh__day-dot';
      var dotContent = '';
      var dayClass = 'dh__day';
      var clickable = false;
      var isViewing = day.date === storyDate;

      var isPastDay = day.status === 'complete' || day.status === 'missed';
      var needsLock = isPastDay && !isPremium() && !isViewing;

      if (day.status === 'complete') {
        dotClass += ' dh__day-dot--complete';
        dotContent = '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (!isViewing) clickable = true;
      } else if (day.status === 'missed') {
        dotClass += ' dh__day-dot--missed';
        dotContent = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        clickable = true;
      } else if (day.status === 'today') {
        dotClass += ' dh__day-dot--today';
        if (!isViewing) clickable = true;
      } else {
        dotClass += ' dh__day-dot--future';
      }

      if (isViewing) dotClass += ' dh__day-dot--viewing';
      if (clickable) dayClass += ' dh__day--clickable';

      html += '<div class="' + dayClass + '"' + (clickable ? ' data-date="' + escapeHtml(day.date) + '"' : '') + '>'
        + '<div class="dh__day-label">' + escapeHtml(day.label) + '</div>'
        + '<div class="' + dotClass + '">' + dotContent + '</div>'
        + (needsLock ? '<svg class="dh__day-lock" viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' : '')
        + '</div>';
    });
    html += '</div></div>';

    html += '<div class="dh__hero-overlay">';
    if (dayNum) {
      html += '<div class="dh__hero-day">Day ' + escapeHtml(dayNum) + (totalDays ? ' of ' + escapeHtml(totalDays) : '') + '</div>';
    }
    html += '<div class="dh__hero-title">' + watchTitle + '</div>';
    html += '<div class="dh__hero-bottom">';
    html += '<span class="dh__hero-dur">3 MIN</span>';
    html += '<span class="dh__hero-play"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21"/></svg> Watch</span>';
    if (streak > 0) {
      html += '<span class="dh__hero-streak">'
        + '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.6 0-8-3-8-9 0-4 2.5-7.5 5-9.5.4-.3 1 0 1 .5 0 1.5 1 3 2.5 3.5.3.1.6-.1.6-.4 0-2.5 1.5-5.5 3.5-7.1.4-.3 1 0 1 .5C18 5 20 9 20 14c0 6-4.4 9-8 9z"/></svg>'
        + streak + ' days</span>';
    }
    html += '</div>';
    html += '</div>';
    if (watchDone) html += '<div class="dh__card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
    html += '</div>';
  }

  // Body content (constrained width)
  html += '<div class="dh__body">';

  // Start button (hidden when all complete)
  if (c && !allDone) {
    html += '<button class="dh__start-btn" id="dh-start">' + (isToday ? 'START MY DAY' : 'START THIS STORY') + '</button>';
  }

  // Progress bar
  html += '<div class="dh__progress-row">';
  if (allDone) {
    html += '<span class="dh__progress-label dh__progress-label--done">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>'
      + ' Completed</span>';
    html += '<span class="dh__progress-pct">100%</span>';
  } else {
    html += '<span class="dh__progress-label">' + (isToday ? 'Progress today' : 'Progress') + '</span>';
    html += '<span class="dh__progress-pct">' + progress + '%</span>';
  }
  html += '</div>';
  html += '<div class="dh__progress-track' + (allDone ? ' dh__progress-track--done' : '') + '"><div class="dh__progress-fill" style="width:' + progress + '%"></div></div>';

  // Explore + Questions cards
  if (c) {
    html += '<div class="dh__cards">';

    if (c.card2) {
      var exploreDone = dayProgress && dayProgress.explore;
      html += '<div class="dh__card dh__card--explore' + (exploreDone ? ' dh__card--done' : '') + '" data-step="' + steps.indexOf('explore') + '">';
      html += '<div class="dh__card-row">';
      html += '<div class="dh__card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>';
      html += '<span class="dh__card-label">Explore</span>';
      html += '<span class="dh__card-dur">1 MIN</span>';
      if (exploreDone) {
        html += '<svg class="dh__card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>';
      } else {
        html += '<svg class="dh__card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>';
      }
      html += '</div></div>';
    }

    if (c.card3 && c.card3.questions && c.card3.questions.length > 0) {
      var questionsDone = dayProgress && dayProgress.questions;
      html += '<div class="dh__card dh__card--questions' + (questionsDone ? ' dh__card--done' : '') + '" data-step="' + steps.indexOf('questions') + '">';
      html += '<div class="dh__card-row">';
      html += '<div class="dh__card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>';
      html += '<span class="dh__card-label">Questions</span>';
      html += '<span class="dh__card-dur">2 MIN</span>';
      if (questionsDone) {
        html += '<svg class="dh__card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>';
      } else {
        html += '<svg class="dh__card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>';
      }
      html += '</div></div>';
    }

    html += '</div>';
  } else {
    html += '<div class="dh__empty">No story available today. Check back tomorrow!</div>';
  }

  html += '</div>'; // close dh__body

  return html;
}

export default function dailyHomeView(app, params) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  let aborted = false;

  var viewDate = params && params.date ? params.date : null;
  var todayStr = new Date().toISOString().split('T')[0];
  var isToday = !viewDate || viewDate === todayStr;
  var storyFetch = viewDate ? getDailyStory(viewDate) : getTodayStory();

  Promise.all([storyFetch, getDailyStories()]).then(function(results) {
    if (aborted) return;
    var entry = results[0];
    var allStories = results[1] || [];
    var availableDates = allStories.map(function(s) { return s.date; });

    var c = null;
    var storyTitle = isToday ? 'Today\'s Story' : 'Daily Story';
    var dayNum = '';
    var totalDays = '';
    var storyDate = viewDate || todayStr;
    var steps = [];

    if (entry && entry.content) {
      try { c = typeof entry.content === 'string' ? JSON.parse(entry.content) : entry.content; } catch (e) { c = null; }
      storyTitle = c.today_title || storyTitle;
      dayNum = c.day_number || '';
      totalDays = c.total_days || '';
      storyDate = entry.date || storyDate;
      if (c.card1) steps.push('watch');
      if (c.card2) steps.push('explore');
      if (c.card3 && c.card3.questions && c.card3.questions.length > 0) steps.push('questions');
    }
    var streak = getDailyStreak(availableDates);
    var week = getWeekStatus(availableDates);
    var dayProgress = getDailyProgress(storyDate);

    // Header
    var breadcrumbs = [{ label: 'Home', hash: '/' }];
    if (!isToday) {
      breadcrumbs.push({ label: 'Daily Story', hash: '/daily' });
      breadcrumbs.push({ label: storyDate });
    } else {
      breadcrumbs.push({ label: 'Daily Story' });
    }

    var headerHtml = renderHeader('', isToday ? '/' : '/daily', breadcrumbs);
    var contentHtml = buildContent(c, storyTitle, storyDate, dayNum, totalDays, steps, dayProgress, isToday, streak, week, todayStr, availableDates);

    app.innerHTML = headerHtml + '<div class="dh">' + contentHtml + '</div>';

    // === Bind all interactive elements ===
    function bindHandlers() {
      var playBase = isToday ? '/daily/play' : '/daily/play/' + storyDate;

      // Hero + card clicks
      app.querySelectorAll('[data-step]').forEach(function(card) {
        card.addEventListener('click', function() {
          if (!isToday && !isPremium()) {
            showPaywall(function() { window.location.hash = playBase + '?step=' + card.dataset.step; });
            return;
          }
          window.location.hash = playBase + '?step=' + card.dataset.step;
        });
      });

      // Stop week tracker clicks from triggering the hero click
      var weekWrap = app.querySelector('.dh__week-wrap');
      if (weekWrap) {
        weekWrap.addEventListener('click', function(e) { e.stopPropagation(); });
      }

      // Start button
      var startBtn = document.getElementById('dh-start');
      if (startBtn) {
        startBtn.addEventListener('click', function() {
          if (!isToday && !isPremium()) {
            showPaywall(function() { startBtn.click(); });
            return;
          }
          var firstIncomplete = 0;
          if (dayProgress) {
            for (var i = 0; i < steps.length; i++) {
              if (!dayProgress[steps[i]]) { firstIncomplete = i; break; }
              firstIncomplete = i + 1;
            }
          }
          if (firstIncomplete >= steps.length) firstIncomplete = 0;
          window.location.hash = playBase + '?step=' + firstIncomplete;
        });
      }

      // Day clicks — switch days in-place with crossfade
      app.querySelectorAll('.dh__day--clickable').forEach(function(dayEl) {
        dayEl.addEventListener('click', function() {
          if (aborted) return;
          var newDate = dayEl.dataset.date;
          var newIsToday = newDate === todayStr;

          // Gate past dates behind premium
          if (!newIsToday && !isPremium()) {
            showPaywall(function() { dayEl.click(); });
            return;
          }

          var fetchDate = newIsToday ? getTodayStory() : getDailyStory(newDate);

          // Fade out current content
          var dh = app.querySelector('.dh');
          dh.classList.add('dh--fading');

          fetchDate.then(function(newEntry) {
            if (aborted) return;
            var nc = null;
            var newTitle = newIsToday ? 'Today\'s Story' : 'Daily Story';
            var newDayNum = '';
            var newTotalDays = '';
            var newStoryDate = newDate;
            var newSteps = [];

            if (newEntry && newEntry.content) {
              nc = typeof newEntry.content === 'string' ? JSON.parse(newEntry.content) : newEntry.content;
              newTitle = nc.today_title || newTitle;
              newDayNum = nc.day_number || '';
              newTotalDays = nc.total_days || '';
              newStoryDate = newEntry.date || newStoryDate;
              if (nc.card1) newSteps.push('watch');
              if (nc.card2) newSteps.push('explore');
              if (nc.card3 && nc.card3.questions && nc.card3.questions.length > 0) newSteps.push('questions');
            }

            var newWeek = getWeekStatus(availableDates);
            var newDayProgress = getDailyProgress(newStoryDate);

            // Update header breadcrumbs
            var newBc = [{ label: 'Home', hash: '/' }];
            if (!newIsToday) {
              newBc.push({ label: 'Daily Story', hash: '/daily' });
              newBc.push({ label: newStoryDate });
            } else {
              newBc.push({ label: 'Daily Story' });
            }
            var headerEl = app.querySelector('.header');
            if (headerEl) {
              var tmp = document.createElement('div');
              tmp.innerHTML = renderHeader('', newIsToday ? '/' : '/daily', newBc);
              headerEl.replaceWith(tmp.firstElementChild);
            }

            // Update URL without triggering router
            var newHash = newIsToday ? '/daily' : '/daily/' + newDate;
            history.replaceState(null, '', '#' + newHash);

            // Swap content after fade-out completes
            setTimeout(function() {
              if (aborted) return;
              var newContent = buildContent(nc, newTitle, newStoryDate, newDayNum, newTotalDays, newSteps, newDayProgress, newIsToday, streak, newWeek, todayStr, availableDates);
              dh.innerHTML = newContent;
              dh.classList.remove('dh--fading');

              // Update closure vars for next interaction
              c = nc;
              storyTitle = newTitle;
              storyDate = newStoryDate;
              dayNum = newDayNum;
              totalDays = newTotalDays;
              steps = newSteps;
              dayProgress = newDayProgress;
              isToday = newIsToday;
              week = newWeek;

              // Re-bind handlers for new content
              bindHandlers();
            }, 200);
          });
        });
      });
    }

    bindHandlers();

    // Celebration sound removed — was playing on every visit when complete

  }).catch(function(err) {
    if (aborted) return;
    app.innerHTML = renderHeader('Daily Story', '/') + '<div class="error-msg">Failed to load.</div>';
  });

  return function() { aborted = true; };
}
