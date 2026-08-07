// The host the celebration screens live in, and the crossfade between them.
//
// Mounted on document.body rather than inside #app, for both callers.
//
// The daily story needs it because .ds__panel animates with a transform, and a
// transformed ancestor becomes the containing block for position:fixed
// descendants - so a fixed full-screen overlay inside it is neither fixed nor
// full-screen. The old score screen already worked around this by appending to
// body; here that workaround becomes the design.
//
// The adventure quiz needs it because it renders into #app, which the router
// empties on navigation - a screen rendered there would be destroyed by the
// very navigation it is supposed to survive long enough to animate out of.

import { T } from './timing.js';
import * as cues from './cues.js';

const G = typeof window !== 'undefined' ? window.gsap : null;
const HOST_ID = 'cel-root';

/**
 * Create the stage.
 *
 * Returns a controller the flow drives: `show(factory)` swaps in a new screen,
 * `destroy()` tears everything down synchronously.
 */
export function createStage() {
  const host = document.createElement('div');
  host.className = 'cel';
  host.id = HOST_ID;
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-label', 'Quiz results');

  const slotA = document.createElement('div');
  const slotB = document.createElement('div');
  slotA.className = 'cel__slot';
  slotB.className = 'cel__slot';
  host.appendChild(slotA);
  host.appendChild(slotB);
  document.body.appendChild(host);

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  let active = slotA;
  let idle = slotB;
  let current = null; // the mounted screen: { el, timeline, pauseRives?, destroy }
  let destroyed = false;
  // True while a crossfade is in flight. Two taps on CONTINUE used to start
  // two transitions: the second mounted into the slot the first was still
  // using and cleared it with innerHTML, orphaning that screen's timeline and
  // Rive instances on detached nodes.
  let transitioning = false;

  // The router binds Escape to "go back". Mid-celebration that navigates out
  // from under a screen that is still animating, so it is swallowed here.
  //
  // On `document`, in the CAPTURE phase, not on the host. Keydown fires at the
  // focused element - which is `body`, or a stale quiz button behind the
  // overlay, since nothing here takes focus. Those events bubble straight to
  // document without ever passing through the host, so a listener on the host
  // never ran and the router navigated anyway. Capturing at the document means
  // it is seen before the router's own listener regardless of focus.
  const onKeyDown = (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
  };
  document.addEventListener('keydown', onKeyDown, true);

  // A hidden tab pauses requestAnimationFrame, so GSAP stops. Someone who
  // switches away at 2s and comes back at 30s would otherwise return to a
  // frozen frame and have to wait out the rest of a choreography whose audio
  // finished long ago. Land them on the end state instead.
  const onVisibility = () => {
    if (document.hidden) {
      cues.stopAll();
      if (current && current.pauseRives) current.pauseRives();
    } else {
      if (current && current.timeline) {
        const tl = current.timeline.tl;
        if (tl && tl.time() > 0 && tl.progress() < 1) current.timeline.finish();
      }
      // Resume the art too. Pausing on hide without resuming left the screen
      // holding a frozen frame - a still flame, a motionless Ibu - for the
      // rest of the celebration.
      if (current && current.resumeRives) current.resumeRives();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  function mount(slot, factory) {
    slot.innerHTML = '';
    return factory(slot);
  }

  return {
    host,

    /**
     * Put the first screen up, with no transition.
     */
    first(factory) {
      if (destroyed) return null;
      current = mount(active, factory);
      if (G) G.set(active, { opacity: 1 });
      else active.style.opacity = '1';
      return current;
    },

    /**
     * Crossfade to the next screen.
     *
     * A fade-OVER, not a cross-dissolve: the outgoing slot stays fully opaque
     * for the whole transition while the incoming one animates 0 -> 1 above
     * it. A true cross-dissolve - both slots at 50% at the midpoint - lets
     * whatever is behind the stage show through, which reads as a flash. The
     * mobile app documents landing on the same answer.
     */
    next(factory) {
      if (destroyed || transitioning) return null;
      transitioning = true;
      const outgoing = active;
      const incoming = idle;
      const leaving = current;

      incoming.style.zIndex = '2';
      outgoing.style.zIndex = '1';
      // It is fading out; its buttons should not still be live underneath.
      outgoing.style.pointerEvents = 'none';
      incoming.style.pointerEvents = '';
      if (G) G.set(outgoing, { opacity: 1 });

      const entered = mount(incoming, factory);
      current = entered;

      const settle = () => {
        if (leaving) {
          // Only cleanup() the Rives now. Pausing them at the START of the
          // fade (below) leaves the last drawn frame on the canvas, so the
          // outgoing screen fades out as a still image - which is what you
          // want. Destroying them early would blank it mid-fade.
          try {
            leaving.destroy();
          } catch (e) {
            console.warn('[celebration] outgoing screen failed to destroy', e);
          }
        }
        if (G) G.set(outgoing, { opacity: 0 });
        else outgoing.style.opacity = '0';
        outgoing.innerHTML = '';
        active = incoming;
        idle = outgoing;
        transitioning = false;
      };

      if (!G) {
        incoming.style.opacity = '1';
        settle();
        return entered;
      }

      let settled = false;
      const settleOnce = () => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        settle();
      };

      // If onComplete never fires - a killed tween, a tab hidden across the
      // whole transition - the two slots would both stay mounted and the
      // outgoing screen would keep its Rives running forever.
      const guard = setTimeout(settleOnce, 1000);

      G.fromTo(
        incoming,
        { opacity: 0 },
        {
          opacity: 1,
          duration: T(400),
          ease: 'power2.inOut',
          onStart() {
            if (leaving && leaving.pauseRives) leaving.pauseRives();
          },
          onComplete: settleOnce,
        },
      );

      return entered;
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKeyDown, true);
      cues.stopAll();
      if (current) {
        try {
          current.destroy();
        } catch (e) {
          console.warn('[celebration] screen failed to destroy', e);
        }
        current = null;
      }
      if (host.parentNode) host.parentNode.removeChild(host);
      document.body.style.overflow = previousOverflow;
    },
  };
}
