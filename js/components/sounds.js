import { getSetting } from '../state.js';

var sounds = null;

function init() {
  if (sounds) return sounds;
  sounds = {
    correct: new Audio('assets/audio/quiz/correct.wav'),
    incorrect: new Audio('assets/audio/quiz/incorrect.wav'),
    tap: new Audio('assets/audio/quiz/tap.wav')
  };
  sounds.correct.volume = 0.8;
  sounds.incorrect.volume = 0.8;
  sounds.tap.volume = 0.1;
  return sounds;
}

function play(name) {
  if (!getSetting('sfx', true)) return;
  var s = init();
  var audio = s[name];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(function() {});
}

export function playCorrect() {
  play('correct');
}

export function playWrong() {
  play('incorrect');
}

export function playTap() {
  play('tap');
}

export function playStars(count) {
  if (count === 0) return;
  setTimeout(function() { play('correct'); }, 200);
}
