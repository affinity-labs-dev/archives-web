// Rive loader for the celebration screens.
//
// One place that knows how to put a .riv on a canvas, because there is exactly
// one non-obvious thing about doing it and it needs to be got right once.

const RIVE_BASE = 'assets/rive/';

/** A handle that does nothing, returned when Rive is unavailable. */
const NOOP = {
  ok: false,
  play() {},
  pause() {},
  destroy() {},
};

/**
 * Mount a .riv onto a canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {string} opts.src            filename within assets/rive/
 * @param {string} [opts.artboard]     artboard name, when the file has several
 * @param {string} [opts.stateMachine] state machine name, when the call site knows it
 * @param {string} [opts.animation]    timeline animation name, when the state
 *                                     machine is NOT what should play - see below
 * @param {string} [opts.fit]          'cover' | 'contain' (default 'contain')
 * @param {boolean} [opts.autoplay]    default true; false means the caller plays it
 * @returns {{ok: boolean, play: Function, pause: Function, destroy: Function}}
 */
export function mountRive(canvas, opts) {
  const {
    src,
    artboard,
    stateMachine,
    animation,
    fit = 'contain',
    autoplay = true,
  } = opts || {};

  // Rive comes from a CDN script tag. If it failed to load, every celebration
  // screen must still render its text and its CTA - the caller paints a solid
  // background colour behind the canvas for exactly this case. Returning a
  // no-op handle rather than throwing keeps that decision at the call site.
  //
  // This is stricter than the app's previous behaviour, which wrapped the one
  // Rive it had in a try/catch and left an empty black canvas on failure.
  if (!canvas || typeof window === 'undefined' || !window.rive) return NOOP;

  const R = window.rive;
  let instance = null;
  let observer = null;
  let resizeFrame = 0;
  // What play() should actually play. Resolved on load - see the note there.
  let playTarget = stateMachine || animation || null;

  const handle = {
    ok: false,
    play() {
      if (!instance) return;
      try {
        // Always name the target. `instance.play()` with no argument resumes
        // whatever the runtime picked by default, which for these files is the
        // first TIMELINE animation - so the streak flame played "loop" in
        // isolation instead of its state machine, and rendered a fragment of
        // the scene. Deferred-play call sites hit this because the onLoad
        // fallback below only fires for autoplay.
        if (playTarget) instance.play(playTarget);
        else instance.play();
      } catch (e) {
        /* a stopped-then-played instance can throw; nothing to do */
      }
    },
    pause() {
      if (instance) {
        try {
          instance.pause();
        } catch (e) {
          /* as above */
        }
      }
    },
    destroy() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
      }
      if (instance) {
        try {
          instance.cleanup();
        } catch (e) {
          /* already cleaned up */
        }
        instance = null;
      }
      handle.ok = false;
    },
  };

  // The canvas's backing store must match its displayed size times the device
  // pixel ratio, or the art is rasterised at CSS pixels and upscaled. The old
  // streak flame hardcoded width="220" and never resized, which is why it has
  // been soft on every retina phone the app has ever run on.
  const resize = () => {
    if (!instance) return;
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!instance) return;
      try {
        instance.resizeDrawingSurfaceToCanvas();
      } catch (e) {
        /* instance torn down between the frame request and here */
      }
    });
  };

  try {
    instance = new R.Rive({
      src: RIVE_BASE + src,
      canvas,
      autoplay,
      artboard: artboard || undefined,
      // Pass ONE of these or neither - never both. See the note in onLoad.
      stateMachines: stateMachine || undefined,
      animations: animation || undefined,
      layout: new R.Layout({
        fit: fit === 'cover' ? R.Fit.Cover : R.Fit.Contain,
        alignment: R.Alignment.Center,
      }),
      onLoad() {
        handle.ok = true;
        resize();

        // The one non-obvious thing.
        //
        // Given neither `stateMachines` nor `animations`, the web runtime
        // plays the file's first TIMELINE ANIMATION. Native's <Rive> starts
        // the default STATE MACHINE. Every .riv here keeps its motion in a
        // state machine, so on the web they load, draw perfectly, and then
        // either sit still or play one fragment of the scene in isolation -
        // the streak flame rendered as a puff of smoke this way.
        //
        // Neither failure is visible to a "did it render" check, which is why
        // there is a test comparing canvas contents over time.
        //
        // Resolve the target here, for BOTH paths: autoplay files get it
        // played now, deferred ones get it stored for handle.play(). Ported
        // from the React Native web shim that hit the same wall.
        //
        // The state machine is the right default but NOT a universal rule, so
        // `animation` overrides it. flame.riv is the counter-example: its state
        // machine has no inputs and settles on a still brazier, while its
        // `loop` timeline is the fire actually burning. Playing the machine
        // there produced a lit-but-motionless badge - which reads exactly like
        // the animation failing to load, and was reported as such.
        try {
          if (!playTarget) {
            const machines = instance.stateMachineNames || [];
            const anims = instance.animationNames || [];
            playTarget = machines[0] || anims[0] || null;
          }
          if (autoplay && playTarget) instance.play(playTarget);
        } catch (e) {
          console.warn('[celebration] rive play target resolution failed', src, e);
        }
      },
      onLoadError(err) {
        console.warn('[celebration] rive failed to load', src, err);
        handle.ok = false;
      },
    });
  } catch (e) {
    console.warn('[celebration] rive construction failed', src, e);
    return NOOP;
  }

  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
  }

  return handle;
}

/**
 * Ask the browser to fetch a .riv now, so it is warm by the time a screen
 * wants it. Fire-and-forget; a failure here costs nothing because mountRive
 * will simply fetch it for real.
 */
export function prefetchRive(names) {
  if (typeof document === 'undefined') return;
  names.forEach((name) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'fetch';
    link.href = RIVE_BASE + name;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}
