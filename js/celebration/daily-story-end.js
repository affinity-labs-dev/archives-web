// "Today's story is complete" — the screen between the quiz results and the
// streak, on the daily story only.
//
// Two full-screen Rives stacked. The background is static art; all the motion
// is the Ibu flying and landing on top of it. Both name "State Machine 1"
// explicitly because the mobile call sites do, and because the background's
// stillness would otherwise look like the state-machine autoplay bug.

import { escapeHtml } from '../utils.js';
import { T, EASE, createTimeline, hasGsap, STATIC_CLASS } from './timing.js';
import { mountRive } from './rive.js';
import * as cues from './cues.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

const HEADLINE_AT = 2050;
const CTA_AT = 2450;

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * "TODAY'S STORY" for today, "6 AUG'S STORY" for a day being replayed.
 *
 * Parsed as local parts rather than `new Date(iso)`, which treats a bare
 * YYYY-MM-DD as UTC and can name the previous day for anyone west of Greenwich.
 */
export function headlineFor(dailyDate) {
  if (!dailyDate) return "TODAY'S STORY";
  const parts = String(dailyDate).split('-');
  if (parts.length !== 3) return "TODAY'S STORY";

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  if (dailyDate === localToday) return "TODAY'S STORY";

  const month = MONTHS[Number(parts[1]) - 1];
  const day = Number(parts[2]);
  if (!month || !day) return "TODAY'S STORY";
  return `${day} ${month}'S STORY`;
}

export function buildDailyStoryEnd(slot, opts) {
  const root = document.createElement('div');
  // See quiz-results.js: without GSAP the headline and CTA never appear.
  root.className = 'dsend' + (hasGsap() ? '' : ' ' + STATIC_CLASS);
  root.innerHTML = `
    <canvas class="dsend__bg" aria-hidden="true"></canvas>
    <canvas class="dsend__hero" aria-hidden="true"></canvas>
    <button class="dsend__close" type="button" data-action="continue" aria-label="Close">
      <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <h1 class="dsend__headline">${escapeHtml(headlineFor(opts.dailyDate))}<br>IS COMPLETE!</h1>
    <button class="dsend__cta" type="button" data-action="continue">CONTINUE</button>`;

  slot.appendChild(root);

  const timeline = createTimeline();
  const { tl } = timeline;

  const bg = mountRive(root.querySelector('.dsend__bg'), {
    src: 'daily_story_celebration.riv',
    stateMachine: 'State Machine 1',
    fit: 'cover',
  });
  const hero = mountRive(root.querySelector('.dsend__hero'), {
    src: 'ibu_flying_landing_without_bg.riv',
    stateMachine: 'State Machine 1',
    fit: 'cover',
  });
  timeline.add(() => bg.destroy());
  timeline.add(() => hero.destroy());

  if (tl && G) {
    tl.call(() => cues.play('dailyStoryEnd', { volume: 0.7 }), null, 0);

    // Drops in from above rather than rising, unlike the results screen - it
    // lands as the Ibu does.
    tl.fromTo(
      root.querySelector('.dsend__headline'),
      { opacity: 0, y: -18 },
      { opacity: 1, y: 0, duration: T(550), ease: EASE.riseSoft },
      T(HEADLINE_AT),
    );
    tl.fromTo(
      root.querySelector('.dsend__cta'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, pointerEvents: 'auto', duration: T(500), ease: EASE.riseCta },
      T(CTA_AT),
    );
  } else {
    cues.play('dailyStoryEnd', { volume: 0.7 });
  }

  const onClick = (e) => {
    const btn = e.target.closest('[data-action="continue"]');
    if (btn && opts.onContinue) opts.onContinue();
  };
  root.addEventListener('click', onClick);
  timeline.add(() => root.removeEventListener('click', onClick));

  return {
    el: root,
    // The stage paints this behind and around the screen, so no app
    // chrome shows through beside a phone column or under short content.
    backdrop: '#A2C5FF',
    timeline,
    pauseRives() {
      bg.pause();
      hero.pause();
    },
    resumeRives() {
      bg.play();
      hero.play();
    },
    destroy() {
      timeline.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
