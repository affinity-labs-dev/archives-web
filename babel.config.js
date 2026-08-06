module.exports = function (api) {
  api.cache(true);
  return {
    // `unstable_transformImportMeta` rewrites `import.meta` into something a
    // classic script can run. Without it the web bundle dies before any app
    // code executes: zustand v5 ships `import.meta.env` (a Vite idiom) inside
    // zustand/middleware, which we import for `persist`, and Metro emits the
    // web bundle as a classic <script> - so it is a syntax error, not a
    // runtime one, and the whole page is blank. Native is unaffected.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      './plugins/babel-plugin-font-scaling',
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
