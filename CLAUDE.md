# Archives Web

## What this is

The Archives mobile app, running in a browser. This repo is a **fork of the Expo
app** (`affinity-labs-dev/Archives_Expo`), not a reimplementation — same
components, fonts, animations, sounds and quiz logic, rendered by
react-native-web.

It also contains the **Vercel backend** (`api/`), which is the reason the browser
holds no database credential, and the **legacy vanilla app** (`js/`, `css/`,
`index.html`) that this port replaces.

The mobile repo is wired in as a read-only `upstream` remote so mobile changes
can be pulled forward:

```bash
git fetch upstream && git merge upstream/streak-freeze
```

**Never push to `upstream`.** Its push URL is deliberately set to a bogus value.
The mobile app is live on iOS and Android; nothing in this repo ships to it.

## Critical rules

1. **No credential ever ships to a browser.** No Supabase key, no service key,
   no API key. Data goes through `api/`. `EXPO_PUBLIC_*` values are inlined into
   the bundle by Metro — treat every one as public.
2. **NEVER ASSUME — ALWAYS VERIFY.** Read the code, grep for the usage, query
   Supabase for the real shape. Do not reason from column names or naming
   conventions. This rule has paid for itself repeatedly here: the era of an
   adventure genuinely cannot be derived from its id (`prophets_6` is in era
   `prophets_2`), and a live `gamification_data` row has `progress: {}` where the
   type says array.
3. **Never access AsyncStorage directly.** Use `atomicProgressUpdate()` from
   `@/gamification`.
4. **Always use ArchivesTheme constants.** Never hardcode colours or spacing.
5. **Keep merges from mobile cheap.** Prefer a `.web.ts` sibling over editing a
   shared file — Metro resolves `foo.web.ts` over `foo.ts` on web automatically.
   Every edit to a shared file is a future merge conflict.
6. **Git commit attribution** — do not include Claude attribution in commits. No
   `Co-Authored-By: Claude` and no `Generated with Claude Code` lines. Carried
   over from the mobile repo's convention.
7. **JSX text content** — use curly quotes or escape apostrophes, or
   `react/no-unescaped-entities` fails the lint.

## Commands

```bash
npm run web            # Expo dev server on web
npm run build:web      # expo export -p web  ->  dist/
npm test               # vitest (api/ + js/ unit tests)
npm run test:e2e       # playwright
npm run lint
```

## How the data layer works on web

Native talks to Supabase directly with the anon key. A browser cannot, so
`hooks/lib/supabase.web.ts` points the same client at `/api/db` and swaps the
key for a Clerk session token inside a custom `fetch`.

- `api/db/[...path].js` — the proxy. Transport only.
- `api/_lib/db-policy.js` — **every access decision.** Pure and unit-tested.
  Content is read-only; user tables are force-scoped to the token's subject.
- The **ten** modules that import `{ supabase }` are unchanged, and must stay
  that way — that is the whole point of the proxy.

Scoping **appends** `user_id=eq.<sub>` rather than replacing it, because
PostgREST ANDs repeated top-level params, so a forged id is intersected with the
real one and matches nothing.

PostgREST's status and body pass through **untouched**: the modules branch on
supabase-js error codes (`PGRST116`, `23505`) and rewriting them breaks code
that also has to keep working on mobile.

Two things the proxy is the wrong shape for, both handled separately:
`get_xp_percentile` (an oracle if proxied verbatim) and Storage
(`/api/ai/image-upload`).

## Web-specific mechanics

- **`constants/phoneColumn.web.ts` clamps what `Dimensions.get("window")`
  reports.** Layout constants are computed at *module scope*
  (`TodayCardDeck.tsx:119`), so a CSS wrapper cannot fix the desktop letterbox —
  it must be imported before any component module evaluates.
- **`web-stubs/`** — Metro `resolveRequest` aliases for native-only packages.
  `react-native-sound` is a real HTMLAudioElement implementation; Rive and
  `react-native-purchases-ui` are placeholders.
- **`babel-preset-expo` needs `unstable_transformImportMeta`** — zustand v5 ships
  `import.meta` and Metro emits a classic `<script>`, so without it the page is
  blank before any app code runs.
- **`public/` is copied over the build output**, so `public/index.html` clobbers
  the generated `dist/index.html`. Unresolved — see the plan.

## Layout

| Path | What |
|---|---|
| `app/` | expo-router routes. Currently the spike; `app_full/` is the real tree, renamed aside. |
| `components/`, `hooks/`, `gamification/`, `services/`, `constants/` | The app. Merges from upstream. |
| `api/` | Vercel functions. ESM via `api/package.json`; the root is CommonJS for Expo's configs. |
| `scripts/` | One-offs. `migrate-web-progress.mjs` runs at cutover. |
| `js/`, `css/`, `index.html` | The legacy vanilla app. Live today, retired at cutover. |
| `ios/`, `android/`, `backend/`, `modules/` | Mobile-only. Carried for merge hygiene; nothing here builds them. |
