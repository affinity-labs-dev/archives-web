// Scheduled audio for the celebration screens.
//
// Three problems this solves, in order of how badly they bite:
//
// 1. Autoplay policy. These cues fire on a timer, not on a tap. Chrome and
//    Firefox carry the page's activation forward from the quiz answers, so a
//    play() started seconds later resolves. iOS Safari treats activation as
//    per-element and effectively single-use, so an Audio constructed after the
//    gesture can be refused. Hence: construct every cue up front, and unlock
//    them all on the first real tap.
//
// 2. The sfx setting. The old streak modal called `new Audio(...)` directly and
//    so ignored the user's sound toggle entirely - it played over a muted
//    session. Everything here goes through the same getSetting('sfx') gate the
//    rest of the app uses.
//
// 3. Weight. The sources are uncompressed WAV, and the worst path is 15.9MB of
//    them. Committed alongside is a 96kbps AAC of each, 16x smaller. Preferred
//    when the browser admits to playing it.

import { getSetting } from '../state.js';

const CUES = {
  lowIntro: 'assets/audio/quiz_reward/sad1',
  mediumIntro: 'assets/audio/quiz_reward/final-v2-first-audio',
  highIntro: 'assets/audio/quiz_reward/high-intro',
  lowCountUp: 'assets/audio/quiz_reward/low-count-up',
  mediumCountUp: 'assets/audio/quiz_reward/medium-count-up',
  highCountUp: 'assets/audio/quiz_reward/high-count-up',
  dailyStoryEnd: 'assets/audio/end-daily-story',
  streak: 'assets/audio/quiz/streak-celebration',
};

/** name -> HTMLAudioElement, built lazily by prepare(). */
const elements = {};
let unlocked = false;

function canPlayAac() {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('audio');
  // canPlayType returns '', 'maybe' or 'probably'. Anything non-empty is a
  // yes; browsers are deliberately non-committal about codecs they support.
  return !!probe.canPlayType && probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '';
}

/**
 * Build the audio elements.
 *
 * Call this when the quiz starts, not when the celebration does. Two reasons:
 * the files then have the length of the quiz to download, and the elements
 * exist before the first answer tap, which is what unlock() needs.
 */
export function prepare() {
  if (typeof Audio === 'undefined') return;
  const ext = canPlayAac() ? '.m4a' : '.wav';
  Object.keys(CUES).forEach((name) => {
    if (elements[name]) return;
    const el = new Audio(CUES[name] + ext);
    el.preload = 'auto';
    // Every cue in the spec plays at 0.7 except the streak music at 0.5;
    // callers override via play(name, {volume}).
    el.volume = 0.7;
    elements[name] = el;
  });
}

/**
 * Consume a real user gesture to make every cue playable.
 *
 * The standard iOS unlock: play and immediately pause each element while the
 * activation token is live. After this the element is permanently allowed,
 * so a cue fired eight seconds later on a timer still sounds.
 *
 * Wire it to the first quiz answer - by the time a celebration starts, several
 * taps have happened.
 */
export function unlock() {
  // Nothing to unlock yet: prepare() has not run, and marking it done here
  // would permanently skip the real unlock once the elements exist.
  if (unlocked || !Object.keys(elements).length) return;
  unlocked = true;
  Object.keys(elements).forEach((name) => {
    const el = elements[name];
    // Silent priming. Playing eight cues at their real volume - even for the
    // handful of milliseconds before pause() lands - is an audible pile-up on
    // the first answer tap, and it happened even with sound switched off.
    const restore = el.volume;
    el.muted = true;
    el.volume = 0;
    const finish = () => {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      el.volume = restore;
    };
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(finish).catch(() => {
        finish();
        // Refused. Nothing to do - the cue simply will not sound on this
        // device, and the timeline does not care.
      });
    } else {
      try {
        finish();
      } catch (e) {
        /* nothing to recover */
      }
    }
  });
}

/**
 * Play a cue now. Silent no-op if sfx are off, if prepare() was never called,
 * or if the browser refuses.
 *
 * Never await this and never gate a visual on it. The timeline is time-driven;
 * audio rides along beside it. A celebration with no sound is a degraded
 * celebration, but a celebration waiting on a promise that will never resolve
 * is a broken screen.
 */
export function play(name, opts) {
  if (!getSetting('sfx', true)) return;
  const el = elements[name];
  if (!el) return;
  if (opts && typeof opts.volume === 'number') el.volume = opts.volume;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {
    /* as above */
  }
}

/**
 * Stop everything and rewind.
 *
 * Called when a celebration is destroyed - including when the user navigates
 * away mid-timeline. Without it, the 39-second streak track keeps playing over
 * whatever page they went to.
 */
export function stopAll() {
  Object.keys(elements).forEach((name) => {
    const el = elements[name];
    try {
      el.pause();
      el.currentTime = 0;
    } catch (e) {
      /* nothing to recover */
    }
  });
}

/** Test seam: forget everything built so far. */
export function _reset() {
  stopAll();
  Object.keys(elements).forEach((k) => delete elements[k]);
  unlocked = false;
}
