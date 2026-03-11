import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * This file exists solely to resolve a bare workflow compatibility issue with runtimeVersion.
 *
 * Problem:
 *   app.json uses { policy: "appVersion" } for runtimeVersion, which works on EAS Build
 *   but throws "runtime version policies are not supported" when running locally with
 *   `npx expo run:ios` or `npx expo run:android` (bare workflow).
 *
 * Solution:
 *   This config overrides runtimeVersion with a static string derived from config.version
 *   (the "version" field in app.json). Since the appVersion policy also reads from the
 *   same "version" field, both local dev and EAS builds resolve to the same runtime version
 *   (e.g., "3.5.7"), avoiding any mismatch.
 *
 * Important:
 *   - Do NOT remove this file unless Expo adds bare workflow support for runtime version policies.
 *   - Do NOT hardcode a version string here — always use config.version to stay in sync with app.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Archives",
  slug: config.slug ?? "archives",
  runtimeVersion: config.version ?? "1.0.0",
});
