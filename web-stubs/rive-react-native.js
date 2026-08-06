// `rive-react-native` on web, backed by the real Rive web runtime.
//
// The native package calls `requireNativeComponent` at module scope, which
// react-native-web does not provide, so importing it anywhere blanks the whole
// page. Ten files import it - four of them the celebration screens that fire at
// the end of every daily story, plus the quiz mascot, the AI chat and four
// onboarding steps.
//
// This is a real renderer, not a placeholder: @rive-app/react-canvas plays the
// same .riv files the app already ships, so nothing had to be re-exported or
// converted. The shim exists because the two packages have different APIs -
// native takes a `<Rive source stateMachineName fit alignment/>` element, web
// takes a `useRive({src, stateMachines, layout})` hook returning a component.
//
// Two things this has to get right, and both are easy to get subtly wrong:
//
//   1. `source` on native is `require('../assets/rive/x.riv')`, which Metro
//      turns into an asset *module*, not a URL. On web that is a number or an
//      object depending on the bundler's mood, so it goes through
//      `resolveAssetSource` to become something fetchable. Passing it straight
//      to `src` fails silently - the canvas just stays blank, which looks
//      exactly like the placeholder this replaced.
//   2. The enums must keep their native values, because call sites import
//      `Fit`/`Alignment` from here and pass them as props. They are translated
//      to the web runtime's own enums at the boundary.

import React from 'react';
import { View } from 'react-native';
import { Image } from 'react-native';
import {
  useRive as useRiveWeb,
  Layout,
  Fit as WebFit,
  Alignment as WebAlignment,
} from '@rive-app/react-canvas';

// Native enum values, preserved exactly - call sites pass these as props.
export const Fit = {
  Cover: 'cover',
  Contain: 'contain',
  Fill: 'fill',
  FitHeight: 'fitHeight',
  FitWidth: 'fitWidth',
  None: 'none',
  ScaleDown: 'scaleDown',
  Layout: 'layout',
};

export const Alignment = {
  TopLeft: 'topLeft',
  TopCenter: 'topCenter',
  TopRight: 'topRight',
  CenterLeft: 'centerLeft',
  Center: 'center',
  CenterRight: 'centerRight',
  BottomLeft: 'bottomLeft',
  BottomCenter: 'bottomCenter',
  BottomRight: 'bottomRight',
};

export const LoopMode = { OneShot: 'oneShot', Loop: 'loop', PingPong: 'pingPong' };
export const Direction = { Backwards: 'backwards', Auto: 'auto', Forwards: 'forwards' };
export const RNRiveError = {};

const FIT_TO_WEB = {
  [Fit.Cover]: WebFit.Cover,
  [Fit.Contain]: WebFit.Contain,
  [Fit.Fill]: WebFit.Fill,
  [Fit.FitHeight]: WebFit.FitHeight,
  [Fit.FitWidth]: WebFit.FitWidth,
  [Fit.None]: WebFit.None,
  [Fit.ScaleDown]: WebFit.ScaleDown,
  [Fit.Layout]: WebFit.Layout,
};

const ALIGNMENT_TO_WEB = {
  [Alignment.TopLeft]: WebAlignment.TopLeft,
  [Alignment.TopCenter]: WebAlignment.TopCenter,
  [Alignment.TopRight]: WebAlignment.TopRight,
  [Alignment.CenterLeft]: WebAlignment.CenterLeft,
  [Alignment.Center]: WebAlignment.Center,
  [Alignment.CenterRight]: WebAlignment.CenterRight,
  [Alignment.BottomLeft]: WebAlignment.BottomLeft,
  [Alignment.BottomCenter]: WebAlignment.BottomCenter,
  [Alignment.BottomRight]: WebAlignment.BottomRight,
};

/**
 * Turns whatever the caller passed as `source` into a URL.
 *
 * Accepts the three shapes in use: a Metro asset module (`require(...)`), an
 * object with a `uri`, and a plain string (`resourceName`/remote URL).
 */
function toSrc(source, url) {
  if (url) return url;
  if (!source) return undefined;
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && source.uri) return source.uri;
  const resolved = Image.resolveAssetSource(source);
  return resolved?.uri;
}

const RiveWeb = React.forwardRef(function RiveWeb(props, ref) {
  const {
    source,
    url,
    resourceName,
    autoplay = true,
    stateMachineName,
    animationName,
    artboardName,
    fit,
    alignment,
    style,
    onPlay,
    onStop,
    onLoopEnd,
    onError,
  } = props;

  const src = toSrc(source ?? resourceName, url);

  const { rive, RiveComponent } = useRiveWeb({
    src,
    artboard: artboardName,
    // The web runtime wants the state machine *or* an animation, not both.
    stateMachines: stateMachineName,
    animations: stateMachineName ? undefined : animationName,
    autoplay,
    layout: new Layout({
      fit: FIT_TO_WEB[fit] ?? WebFit.Contain,
      alignment: ALIGNMENT_TO_WEB[alignment] ?? WebAlignment.Center,
    }),
    onPlay,
    onStop,
    onLoop: onLoopEnd,
    onLoadError: onError,
  });

  // The native ref API, mapped onto the web instance. Call sites use these to
  // drive state machines - firing a trigger is how several celebrations start.
  React.useImperativeHandle(
    ref,
    () => ({
      play: () => rive?.play(),
      pause: () => rive?.pause(),
      stop: () => rive?.stop(),
      reset: () => rive?.reset({ autoplay }),
      fireState: (machine, input) => {
        const inputs = rive?.stateMachineInputs(machine) ?? [];
        inputs.find((i) => i.name === input)?.fire();
      },
      setInputState: (machine, input, value) => {
        const inputs = rive?.stateMachineInputs(machine) ?? [];
        const target = inputs.find((i) => i.name === input);
        if (target) target.value = value;
      },
      // Nested-artboard paths have no direct web equivalent; no-op rather than
      // throw, so a call site that uses them degrades instead of crashing.
      setInputStateAtPath: () => {},
      fireStateAtPath: () => {},
      setTextRunValue: (name, value) => {
        try {
          rive?.setTextRunValue(name, value);
        } catch {
          // Older .riv exports have no text runs.
        }
      },
    }),
    [rive, autoplay]
  );

  if (!src) return <View style={style} pointerEvents="none" />;

  // RiveComponent renders a <canvas>; the View carries the caller's layout so
  // sizing behaves the same as on native.
  return (
    <View style={style} pointerEvents="none">
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </View>
  );
});

export default RiveWeb;
export const Rive = RiveWeb;
export const useRive = useRiveWeb;
