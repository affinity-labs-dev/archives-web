import { getDailyStreak, getWeekStatus } from '../state.js';
import { getDailyStories } from '../api.js';
import { playCorrect } from './sounds.js';

var SHOWN_KEY = 'archives_streak_shown_date';

function getMotivation(streak) {
  if (streak >= 100) return "Legendary dedication! You are truly embodying the spirit of lifelong learning.";
  if (streak >= 30) return "One month of dedication! You are building an incredible habit.";
  if (streak >= 7) return "One week strong! The scholars of old learned a little every day too.";
  if (streak >= 3) return "Keep it going! Consistency is the key to knowledge.";
  return "Great start! The journey of a thousand miles begins with a single step.";
}

function wasShownToday() {
  var last = localStorage.getItem(SHOWN_KEY);
  return last === new Date().toISOString().split('T')[0];
}

function markShownToday() {
  localStorage.setItem(SHOWN_KEY, new Date().toISOString().split('T')[0]);
}

/**
 * Try to show the streak celebration. If already shown today, calls onDone immediately.
 * Otherwise shows the modal and calls onDone after dismiss.
 * @param {function} onDone — called after celebration is dismissed (or skipped)
 */
export function tryStreakCelebration(onDone) {
  if (wasShownToday()) {
    if (onDone) onDone();
    return;
  }

  markShownToday();

  getDailyStories().then(function(allStories) {
    var dates = (allStories || []).map(function(s) { return s.date; });
    showStreakModal(dates, onDone);
  }).catch(function() {
    showStreakModal(null, onDone);
  });
}

function showStreakModal(availableDates, onDismiss) {
  var streak = getDailyStreak(availableDates);
  if (streak < 1) streak = 1;
  var week = getWeekStatus(availableDates);
  var motivation = getMotivation(streak);

  // Build week calendar HTML
  var weekHtml = '';
  week.forEach(function(day, i) {
    var dotClass = 'streak__day-dot';
    var inner = '';
    if (day.status === 'complete') {
      dotClass += ' streak__day-dot--complete';
      inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (day.status === 'missed') {
      dotClass += ' streak__day-dot--missed';
      inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"/></svg>';
    } else if (day.status === 'today') {
      dotClass += ' streak__day-dot--today';
      inner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>';
    } else {
      dotClass += ' streak__day-dot--future';
    }
    weekHtml += '<div class="streak__day" style="animation-delay:' + (0.8 + i * 0.08) + 's">'
      + '<div class="streak__day-label">' + day.label + '</div>'
      + '<div class="' + dotClass + '">' + inner + '</div>'
      + '</div>';
  });

  var overlay = document.createElement('div');
  overlay.className = 'streak-overlay';
  overlay.innerHTML =
    '<div class="streak-modal">'
    + '<button class="streak__close" id="streak-close">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    + '</button>'
    + '<div class="streak__flame-wrap">'
    + '<canvas class="streak__flame-canvas" id="streak-flame-canvas" width="220" height="220"></canvas>'
    + '</div>'
    + '<div class="streak__count">' + streak + '</div>'
    + '<div class="streak__label">day streak!</div>'
    + '<div class="streak__week">' + weekHtml + '</div>'
    + '<div class="streak__motivation">' + motivation + '</div>'
    + '<button class="streak__btn" id="streak-continue">LET\'S LEARN</button>'
    + '</div>';

  document.body.appendChild(overlay);

  // Init Rive flame animation
  var riveInstance = null;
  try {
    var canvas = overlay.querySelector('#streak-flame-canvas');
    if (window.rive && canvas) {
      riveInstance = new window.rive.Rive({
        src: 'assets/rive/flamefinal.riv',
        canvas: canvas,
        autoplay: true,
        animations: ['burning_flame'],
        layout: new window.rive.Layout({
          fit: window.rive.Fit.Contain,
          alignment: window.rive.Alignment.Center,
        }),
      });
    }
  } catch (e) {
    console.warn('Rive flame init:', e);
  }

  requestAnimationFrame(function() {
    overlay.classList.add('streak-overlay--visible');
  });

  // Staggered checkmark sounds — match mobile: 1600ms start, 50ms between, volume 0.5
  var soundTimers = [];
  week.forEach(function(day, i) {
    if (day.status === 'complete' || day.status === 'today') {
      var tid = setTimeout(function() {
        var snd = new Audio('assets/audio/quiz/correct.wav');
        snd.volume = 0.5;
        snd.play().catch(function() {});
      }, 1600 + i * 50);
      soundTimers.push(tid);
    }
  });

  function close() {
    // Cancel pending sound timers
    soundTimers.forEach(function(tid) { clearTimeout(tid); });
    overlay.classList.remove('streak-overlay--visible');
    setTimeout(function() {
      if (riveInstance) { try { riveInstance.cleanup(); } catch(e) {} }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (onDismiss) onDismiss();
    }, 300);
  }

  overlay.querySelector('#streak-close').addEventListener('click', close);
  overlay.querySelector('#streak-continue').addEventListener('click', close);
}
