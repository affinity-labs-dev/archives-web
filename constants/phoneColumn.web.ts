import { Dimensions } from "react-native";

// Phone-width column: the web app renders the mobile layout in a fixed-width
// column instead of stretching to the browser window.
//
// A CSS wrapper alone does not do it. The layout constants are computed from
// `Dimensions.get("window")` at MODULE SCOPE - e.g. TodayCardDeck.tsx:119,
// `const CARD_WIDTH = (SCREEN_WIDTH - 28) * 0.7` - so on a 1500px window the
// card is ~1030px wide against a viewport-clamped height, which is the
// letterbox. Constraining the container would not change what those constants
// already read.
//
// So clamp the reported window width at the source. Everything downstream -
// card geometry, carousel paging, the lesson's full-bleed video, safe-area
// maths - then behaves exactly as it does on a phone, because as far as it can
// tell it is on one.
//
// Height is deliberately NOT clamped: a taller browser window just shows more
// of the column, which is the behaviour you want. Card heights are already
// clamped to 42-55% of the viewport by TodayCardDeck itself.
//
// This module must be imported before any component module evaluates, since
// those constants are read at import time. app/_layout.tsx imports it first.
//
// Native never loads this file - there is no phoneColumn.ts sibling, only the
// .web.ts, and nothing on native imports it.

export const PHONE_COLUMN_WIDTH = 430;

const originalGet = Dimensions.get.bind(Dimensions);

Dimensions.get = ((dim: "window" | "screen") => {
  const value = originalGet(dim);
  if (dim !== "window") return value;
  const width = Math.min(value.width, PHONE_COLUMN_WIDTH);
  // Return a new object rather than mutating: callers cache these.
  return { ...value, width };
}) as typeof Dimensions.get;

/**
 * Keep react-native Modals inside the column too.
 *
 * Clamping Dimensions is not enough by itself. `Modal` renders through a portal
 * appended to document.body, so it never sees the wrapper in app/_layout.tsx -
 * the celebration screens escaped to full window width while the page behind
 * them stayed 430px. Every sheet and the paywall would have done the same.
 *
 * The load-bearing declaration is `transform`. Modal content is
 * `position: fixed`, which is resolved against the viewport and is therefore
 * normally immune to an ancestor's width - but a transformed ancestor becomes
 * the containing block for fixed descendants. Centring some other way (margin,
 * inset) looks equivalent and silently stops constraining them.
 *
 * Portals are identified by having no id: #root and #clerk-components both have
 * one, and react-native-web's portals never do.
 */
function constrainPortalsToColumn() {
  if (typeof document === "undefined") return;
  const id = "phone-column-portal-style";
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  // pointer-events is not decoration. The containing block has to be full
  // height for a fixed child with top/bottom to resolve against it, which turns
  // every one of these wrappers - including the empty ones react-native-web
  // leaves lying around for modals that are not open - into an invisible sheet
  // over the whole column. The first version of this swallowed every click on
  // the page. Children re-enable it, so real modal content still receives
  // input.
  style.textContent = `
    body > div:not([id]) {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 100%;
      max-width: ${PHONE_COLUMN_WIDTH}px;
      transform: translateX(-50%);
      pointer-events: none;
    }
    body > div:not([id]) > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
}

constrainPortalsToColumn();
