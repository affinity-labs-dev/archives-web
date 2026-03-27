// bg-music.js — Background music player for lesson modules
// Short tracks (<5 min): loop at low volume with speaker toggle
// Long tracks (>5 min): full audio player bar at bottom of media

import { getSetting } from '../state.js';

var currentAudio = null;
var currentHls = null;
var isLongTrack = false;
var progressInterval = null;
var pendingUrl = null;

function doStartBgMusic(url) {
  var audio = new Audio();
  audio.loop = true;
  audio.volume = 0.3;
  currentAudio = audio;

  if (url.includes('.m3u8') && window.Hls && Hls.isSupported()) {
    // Unlock the audio element in gesture context before HLS attaches
    audio.play().catch(function() {});
    var hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(audio);
    currentHls = hls;
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
      if (audio.paused) audio.play().catch(function() {});
      checkDuration(audio);
    });
  } else {
    audio.src = url;
    audio.addEventListener('loadedmetadata', function() {
      checkDuration(audio);
    });
    audio.play().catch(function() {});
  }

  updateToggleUI(true);
}

function onFirstInteraction() {
  document.removeEventListener('click', onFirstInteraction, true);
  document.removeEventListener('touchstart', onFirstInteraction, true);
  if (pendingUrl && !currentAudio) {
    doStartBgMusic(pendingUrl);
  }
  pendingUrl = null;
}

export function startBgMusic(url) {
  stopBgMusic();
  if (!url || !getSetting('bgMusic', true)) return;

  // Browsers block unmuted audio without a user gesture.
  // Always defer to the first click/tap, then start playing.
  pendingUrl = url;
  document.addEventListener('click', onFirstInteraction, true);
  document.addEventListener('touchstart', onFirstInteraction, true);
}

function checkDuration(audio) {
  var dur = audio.duration;
  if (dur && dur > 300) {
    isLongTrack = true;
    audio.loop = false;
    audio.volume = 1.0;
    showLongTrackUI();
  }
}

function showLongTrackUI() {
  // Hide the small speaker toggle
  var toggleBtn = document.getElementById('bg-music-toggle');
  if (toggleBtn) toggleBtn.style.display = 'none';

  // Inject player bar into the media container
  var mediaWrap = document.querySelector('.reel-player__video-wrap') || document.querySelector('.carousel__track-wrap');
  if (!mediaWrap) return;

  var bar = document.createElement('div');
  bar.className = 'audio-player';
  bar.innerHTML = '<button class="audio-player__btn" id="audio-player-btn">'
    + '<svg class="audio-player__icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>'
    + '<svg class="audio-player__icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>'
    + '</button>'
    + '<span class="audio-player__current" id="audio-player-current">0:00</span>'
    + '<div class="audio-player__track" id="audio-player-track">'
    + '<div class="audio-player__fill" id="audio-player-fill"></div>'
    + '</div>'
    + '<span class="audio-player__duration" id="audio-player-duration">0:00</span>';
  mediaWrap.appendChild(bar);

  // Play/pause
  var btn = document.getElementById('audio-player-btn');
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!currentAudio) return;
    if (currentAudio.paused) {
      currentAudio.play().catch(function() {});
      bar.classList.remove('audio-player--paused');
    } else {
      currentAudio.pause();
      bar.classList.add('audio-player--paused');
    }
  });

  // Seek on track click
  var track = document.getElementById('audio-player-track');
  track.addEventListener('click', function(e) {
    if (!currentAudio || !currentAudio.duration) return;
    var rect = track.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = pct * currentAudio.duration;
  });

  // Update progress
  progressInterval = setInterval(updateProgress, 250);

  currentAudio.addEventListener('ended', function() {
    bar.classList.add('audio-player--paused');
    clearInterval(progressInterval);
    updateProgress();
  });
}

function updateProgress() {
  var fill = document.getElementById('audio-player-fill');
  var curEl = document.getElementById('audio-player-current');
  var durEl = document.getElementById('audio-player-duration');
  if (!currentAudio || !fill) return;

  var pct = currentAudio.duration ? (currentAudio.currentTime / currentAudio.duration) * 100 : 0;
  fill.style.width = pct + '%';
  if (curEl) curEl.textContent = formatTime(currentAudio.currentTime);
  if (durEl) durEl.textContent = formatTime(currentAudio.duration || 0);
}

function formatTime(s) {
  var m = Math.floor(s / 60);
  var sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

export function stopBgMusic() {
  pendingUrl = null;
  document.removeEventListener('click', onFirstInteraction, true);
  document.removeEventListener('touchstart', onFirstInteraction, true);
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  if (currentHls) { currentHls.destroy(); currentHls = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio.src = ''; currentAudio = null; }
  isLongTrack = false;
}

function updateToggleUI(playing) {
  var btn = document.getElementById('bg-music-toggle');
  if (!btn) return;
  btn.classList.toggle('bg-music--playing', playing);
}

export function renderBgMusicToggle() {
  return '<button class="bg-music-toggle" id="bg-music-toggle" title="Toggle audio">'
    + '<svg class="bg-music__icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>'
    + '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
    + '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
    + '</svg>'
    + '<svg class="bg-music__icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>'
    + '<line x1="23" y1="9" x2="17" y2="15"/>'
    + '<line x1="17" y1="9" x2="23" y2="15"/>'
    + '</svg>'
    + '</button>';
}

export function initBgMusicToggle() {
  var btn = document.getElementById('bg-music-toggle');
  if (!btn) return;

  btn.classList.add('bg-music--playing');

  btn.addEventListener('click', function(e) {
    if (!currentAudio) return;
    e.stopPropagation();
    if (currentAudio.paused) {
      currentAudio.play().catch(function() {});
      updateToggleUI(true);
    } else {
      currentAudio.pause();
      updateToggleUI(false);
    }
  });
}
