// The streak screen.
//
// Replaces js/components/streak-celebration.js. Two differences from the old
// one beyond the visuals: the number counts up from zero rather than appearing
// whole, and the sound goes through the sfx setting rather than around it.
//
// Structurally it is a 250ms fade, then a 1500ms intro during which the two
// Rives play alone, then everything on the card enters over the next 2.5s.

import { escapeHtml } from '../utils.js';
import { T, EASE, createTimeline, hasGsap, STATIC_CLASS } from './timing.js';
import { getMotivationalQuote } from './tiers.js';
import { mountRive } from './rive.js';
import * as cues from './cues.js';

const G = typeof window !== 'undefined' ? window.gsap : null;

/** localStorage key. Same one the old modal used, deliberately. */
export const SHOWN_KEY = 'archives_streak_shown_date';

const ENTRANCE_FADE_MS = 250;
const MUSIC_OFFSET_MS = 25;
const INTRO_MS = 1500;

/**
 * The card timeline, with t=0 at the moment the intro gate opens.
 * Ported from StreakCelebration/constants.ts.
 */
const ANIM = {
  card: { at: 150, dur: 550 },
  number: { at: 700, dur: 600 },
  countUp: { at: 750, dur: 800 },
  label: { at: 1200, dur: 500 },
  week: { at: 1350, dur: 400 },
  weekLabels: { at: 1500, dur: 350 },
  pending: { at: 1550, dur: 350, stagger: 40 },
  done: { at: 1700, dur: 400, stagger: 180 },
  doneCheck: { at: 1820, dur: 300, stagger: 180 },
  message: { at: 2250, dur: 500 },
  button: { at: 2500, dur: 500 },
};

function todayKey() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Has the streak screen already been shown today? */
export function wasShownToday() {
  try {
    return localStorage.getItem(SHOWN_KEY) === todayKey();
  } catch (e) {
    // Private mode, or storage disabled. Showing it twice is a far smaller
    // problem than throwing on the way into a celebration.
    return false;
  }
}

export function markShownToday() {
  try {
    localStorage.setItem(SHOWN_KEY, todayKey());
  } catch (e) {
    /* as above */
  }
}

const CHECK = `<svg class="streak__check" width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
  <path d="M3 7.5L6 10.5L11 4.5" fill="none" stroke="#FFFFFF" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * One day of the week strip.
 *
 * Four states, not the app's five: "shielded" is a streak-freeze, which is a
 * mobile gamification feature the web has no data for.
 */
function renderDay(day) {
  const state =
    day.status === 'complete' ? 'done'
    : day.status === 'today' ? 'today'
    : day.status === 'missed' ? 'missed'
    : 'pending';
  const inner =
    state === 'done' || state === 'today' ? CHECK
    : state === 'missed' ? '<span class="streak__dash"></span>'
    : '';
  return `<span class="streak__day streak__day--${state}">${inner}</span>`;
}

export function buildStreak(slot, opts) {
  const streak = Math.max(0, Number(opts.streak) || 0);
  const week = Array.isArray(opts.week) ? opts.week : [];

  const root = document.createElement('div');
  // Without GSAP nothing fades in, and every animated element would stay at
  // the opacity: 0 CSS sets for its entrance - a blank purple screen with no
  // number and no way out. The class reveals the final state instead.
  root.className = 'streak' + (hasGsap() ? '' : ' ' + STATIC_CLASS);
  root.innerHTML = `
    <canvas class="streak__bg" aria-hidden="true"></canvas>
    <button class="streak__close" type="button" data-action="continue" aria-label="Close">
      <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="streak__card">
      <div class="streak__count">${streak}</div>
      <div class="streak__label">Day Streak!</div>
      <div class="streak__week">
        <div class="streak__week-labels">
          ${week.map((d) => `<span class="streak__week-label">${escapeHtml(d.day || '')}</span>`).join('')}
        </div>
        <div class="streak__week-days">${week.map(renderDay).join('')}</div>
      </div>
      <p class="streak__message">${escapeHtml(getMotivationalQuote(streak))}</p>
    </div>
    <canvas class="streak__flame" aria-hidden="true"></canvas>
    <button class="streak__cta" type="button" data-action="continue">CONTINUE</button>`;

  slot.appendChild(root);

  const timeline = createTimeline();
  const { tl } = timeline;

  // Both start paused and are played by hand once the entrance fade has
  // finished, so the first frame is never seen mid-fade.
  const bgRive = mountRive(root.querySelector('.streak__bg'), {
    src: 'streak.riv',
    artboard: 'background',
    // Cover, not contain. Contained, the sunburst renders at its own aspect
    // and leaves flat lavender around it - a visible rectangle of rays with
    // two hard edges on any window wider than a phone. The rays radiate from
    // the top centre, so cropping the sides costs nothing.
    fit: 'cover',
    autoplay: false,
  });
  // flamefinal.riv, not flame.riv - and this is a deliberate divergence from
  // the app, which names flame.riv as its STREAK_FLAME.
  //
  // flame.riv draws a small flame inside a pot that bursts, with embers. At the
  // 140px this card gives it, that reads as a broken graphic rather than a
  // flame; it was reported as "the fire animation doesn't load". flamefinal.riv
  // is a single clean flame, and it is what the web's own streak modal used
  // before this rewrite, so it is not a regression for anyone.
  //
  // `burning_flame` is named explicitly because the file also holds `sparkle`
  // and `particles`, and the runtime's unnamed default picks the first timeline
  // rather than the one that burns.
  const flameRive = mountRive(root.querySelector('.streak__flame'), {
    src: 'flamefinal.riv',
    animation: 'burning_flame',
    fit: 'contain',
    autoplay: false,
  });
  timeline.add(() => bgRive.destroy());
  timeline.add(() => flameRive.destroy());

  if (tl && G) {
    // Entrance fade, then the Rives, then the music, then the gate.
    tl.fromTo(
      root,
      { opacity: 0 },
      { opacity: 1, duration: T(ENTRANCE_FADE_MS), ease: 'power2.out' },
      0,
    );
    tl.call(
      () => {
        bgRive.play();
        flameRive.play();
      },
      null,
      T(ENTRANCE_FADE_MS),
    );
    tl.call(
      () => cues.play('streak', { volume: 0.5 }),
      null,
      T(ENTRANCE_FADE_MS + MUSIC_OFFSET_MS),
    );

    const gate = ENTRANCE_FADE_MS + INTRO_MS;
    const at = (k) => T(gate + ANIM[k].at);
    const dur = (k) => T(ANIM[k].dur);

    tl.fromTo(
      root.querySelector('.streak__card'),
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: dur('card'), ease: 'power2.out' },
      at('card'),
    );

    const count = root.querySelector('.streak__count');
    tl.fromTo(
      count,
      { opacity: 0, scale: 0.88 },
      { opacity: 1, scale: 1, duration: dur('number'), ease: EASE.riseCta },
      at('number'),
    );

    // The count-up, on the timeline so it can be seeked.
    //
    // The markup already holds the real number; this knocks it to zero at the
    // cue and counts back up. So any moment before the cue - and any world
    // without GSAP - shows the true streak rather than a 0 the user has to
    // wait to see corrected.
    const counter = { v: 0 };
    tl.set(count, { textContent: '0' }, at('countUp'));
    tl.to(
      counter,
      {
        v: streak,
        duration: dur('countUp'),
        ease: 'power2.out',
        onUpdate() {
          count.textContent = String(Math.round(counter.v));
        },
      },
      at('countUp'),
    );
    tl.set(count, { textContent: String(streak) }, T(gate + ANIM.countUp.at + ANIM.countUp.dur));

    tl.fromTo(
      root.querySelector('.streak__label'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: dur('label'), ease: EASE.riseSoft },
      at('label'),
    );
    tl.fromTo(
      root.querySelector('.streak__week'),
      { opacity: 0 },
      { opacity: 1, duration: dur('week'), ease: 'power2.out' },
      at('week'),
    );
    tl.fromTo(
      root.querySelectorAll('.streak__week-label'),
      { opacity: 0 },
      { opacity: 1, duration: dur('weekLabels'), ease: 'power2.out' },
      at('weekLabels'),
    );

    // Pending and missed days settle in first as a quiet row; the completed
    // ones then pop in on top of them, more slowly and one at a time, so the
    // eye reads the progress rather than the whole week at once.
    const days = Array.from(root.querySelectorAll('.streak__day'));
    const isDone = (el) =>
      el.classList.contains('streak__day--done') || el.classList.contains('streak__day--today');

    days.forEach((el, i) => {
      if (isDone(el)) return;
      tl.fromTo(
        el,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: dur('pending'), ease: 'power2.out' },
        T(gate + ANIM.pending.at + i * ANIM.pending.stagger),
      );
    });

    let doneIndex = 0;
    days.forEach((el) => {
      if (!isDone(el)) return;
      const k = doneIndex++;
      tl.fromTo(
        el,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: dur('done'), ease: EASE.riseCta },
        T(gate + ANIM.done.at + k * ANIM.done.stagger),
      );
      const check = el.querySelector('.streak__check');
      if (check) {
        tl.fromTo(
          check,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: dur('doneCheck'), ease: EASE.streakCheck },
          T(gate + ANIM.doneCheck.at + k * ANIM.doneCheck.stagger),
        );
      }
    });

    tl.fromTo(
      root.querySelector('.streak__message'),
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: dur('message'), ease: 'power2.out' },
      at('message'),
    );
    tl.fromTo(
      root.querySelector('.streak__cta'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, pointerEvents: 'auto', duration: dur('button'), ease: EASE.riseCta },
      at('button'),
    );
  }

  if (!tl || !G) {
    // No timeline to hang them off, but the art should still move.
    bgRive.play();
    flameRive.play();
    cues.play('streak', { volume: 0.5 });
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
    backdrop: '#E5D4FF',
    timeline,
    pauseRives() {
      bgRive.pause();
      flameRive.pause();
    },
    resumeRives() {
      bgRive.play();
      flameRive.play();
    },
    destroy() {
      timeline.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
