// `react-native-sound` on web, backed by HTMLAudioElement.
//
// Unlike the other stubs in this folder this one is a real implementation, not
// a placeholder: background music is part of what the lesson is supposed to
// feel like, and the browser can do it. The native package stays in place for
// iOS/Android - the comment at TodayVideoLesson.tsx:128 explains it exists to
// dodge an Android ExoPlayer audio-focus bug, which is not our problem here.
//
// Matches the subset of the API useBackgroundMusic actually uses: the
// `new Sound(uri, basePath, cb)` constructor plus play/pause/stop/release,
// setVolume, setNumberOfLoops, getDuration and isLoaded.

const noop = () => {};

class Sound {
  static MAIN_BUNDLE = '';
  static DOCUMENT = '';
  static LIBRARY = '';
  static CACHES = '';
  static setCategory = noop;
  static setActive = noop;
  static setMode = noop;

  constructor(source, basePath, onLoad) {
    this._loaded = false;
    this._audio = typeof Audio !== 'undefined' ? new Audio() : null;

    if (!this._audio) {
      // SSR / prerender: report a load error rather than throwing, so callers
      // take their existing failure branch.
      if (onLoad) setTimeout(() => onLoad(new Error('no Audio in this environment')), 0);
      return;
    }

    this._audio.preload = 'auto';
    this._audio.crossOrigin = 'anonymous';
    this._audio.src = typeof source === 'string' ? source : source?.uri || '';

    const ok = () => {
      if (this._loaded) return;
      this._loaded = true;
      if (onLoad) onLoad(null);
    };
    const fail = () => {
      if (this._loaded) return;
      if (onLoad) onLoad(this._audio?.error || new Error('audio load failed'));
    };
    // canplaythrough can be slow behind a cold CDN; loadedmetadata is enough to
    // know the source is valid, and play() will buffer the rest.
    this._audio.addEventListener('loadedmetadata', ok, { once: true });
    this._audio.addEventListener('canplaythrough', ok, { once: true });
    this._audio.addEventListener('error', fail, { once: true });
    this._audio.load();
  }

  isLoaded() {
    return this._loaded;
  }

  play(onEnd) {
    if (!this._audio) return;
    if (onEnd) this._audio.addEventListener('ended', () => onEnd(true), { once: true });
    // Autoplay is blocked until the user gestures. Swallow it: the caller
    // treats music as best-effort and there is nothing useful to do here.
    const p = this._audio.play();
    if (p && typeof p.catch === 'function') p.catch(noop);
  }

  pause(cb) { this._audio?.pause(); if (cb) cb(); }

  stop(cb) {
    if (this._audio) { this._audio.pause(); this._audio.currentTime = 0; }
    if (cb) cb();
  }

  release() {
    if (!this._audio) return;
    this._audio.pause();
    this._audio.removeAttribute('src');
    this._audio.load();
    this._audio = null;
    this._loaded = false;
  }

  setVolume(v) { if (this._audio) this._audio.volume = Math.max(0, Math.min(1, v)); return this; }
  getVolume() { return this._audio?.volume ?? 0; }
  setNumberOfLoops(n) { if (this._audio) this._audio.loop = n === -1 || n > 0; return this; }
  getDuration() { return this._audio?.duration ?? -1; }
  getCurrentTime(cb) { if (cb) cb(this._audio?.currentTime ?? 0, !this._audio?.paused); }
  setCurrentTime(t) { if (this._audio) this._audio.currentTime = t; return this; }
  setSpeed(s) { if (this._audio) this._audio.playbackRate = s; return this; }
  setPan() { return this; }
  getPan() { return 0; }
  setSystemVolume() { return this; }
}

export default Sound;
