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
