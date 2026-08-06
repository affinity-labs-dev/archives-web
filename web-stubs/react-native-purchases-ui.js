// Placeholder for `react-native-purchases-ui` on web.
//
// This is RevenueCat's *native* paywall UI. It calls `requireNativeComponent`
// at module scope, so importing it on web blanks the page - and unlike most
// blockers here there is no web equivalent to swap in. The web paywall has to
// be rebuilt from RN primitives against `@revenuecat/purchases-js` (M5).
//
// Every method resolves to NOT_PRESENTED so callers take their "user dismissed
// the paywall" branch rather than hanging on a promise that never settles.

import React from 'react';
import { View } from 'react-native';

export const PAYWALL_RESULT = {
  NOT_PRESENTED: 'NOT_PRESENTED',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
  PURCHASED: 'PURCHASED',
  RESTORED: 'RESTORED',
};

const notPresented = async () => PAYWALL_RESULT.NOT_PRESENTED;

const RevenueCatUI = {
  presentPaywall: notPresented,
  presentPaywallIfNeeded: notPresented,
  presentCustomerCenter: async () => {},
  Paywall: (props) => <View style={props?.style} />,
  PaywallFooterContainerView: (props) => <View style={props?.style}>{props?.children}</View>,
};

export default RevenueCatUI;
export const Paywall = RevenueCatUI.Paywall;
export const PaywallFooterContainerView = RevenueCatUI.PaywallFooterContainerView;
