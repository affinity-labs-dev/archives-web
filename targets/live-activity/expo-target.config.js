/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  // ActivityKit requires iOS 16.1+; 16.2 aligns with current ecosystem minimums
  deploymentTarget: '16.2',
  // SwiftUI for layout, ActivityKit for Live Activity APIs, WidgetKit for the widget extension host
  frameworks: ['SwiftUI', 'ActivityKit', 'WidgetKit'],
  entitlements: {},
});
