// Placeholder for `rive-react-native` on web.
//
// The native package calls `requireNativeComponent` at module scope, which
// react-native-web does not provide, so importing it anywhere blanks the whole
// page. Ten files import it, four of them the celebration screens that fire at
// the end of every daily story.
//
// This renders nothing rather than throwing, which is enough to boot and to
// exercise every surrounding flow. Replacing it with `@rive-app/react-canvas`
// is its own milestone (M6): that package has a different API - `useRive()`
// plus a render prop, and state-machine inputs are set differently - so it is
// a real port, not a swap.

import React from 'react';
import { View } from 'react-native';

// The enums are plain value objects on the native side, and call sites pass
// them as props (`fit={Fit.Contain}`), so they must exist or the import throws
// before render.
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

// Occupies the same space so layouts don't reflow once the real renderer lands.
const RiveStub = React.forwardRef(function RiveStub(props, ref) {
  React.useImperativeHandle(ref, () => ({
    play: () => {},
    pause: () => {},
    stop: () => {},
    reset: () => {},
    fireState: () => {},
    setInputState: () => {},
    setInputStateAtPath: () => {},
    fireStateAtPath: () => {},
    setTextRunValue: () => {},
  }));
  return <View style={props.style} pointerEvents="none" />;
});

export default RiveStub;
export const Rive = RiveStub;
export const useRive = () => ({ rive: null, RiveComponent: RiveStub });
