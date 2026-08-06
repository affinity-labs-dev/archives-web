# public/

Expo copies everything here **verbatim over the build output**, after the app
shell is generated. So a file named `index.html` in this directory does not sit
alongside the app — it replaces it.

That is exactly what used to happen. The mobile repo keeps a deep-link
interstitial at `public/index.html`: it tries `archives:/<path>`, offers the App
Store, then bounces to `archiveszone.app` after five seconds. Harmless where it
belongs, fatal here — every visitor to the web app would have been redirected
away before seeing it, and the app would have been unreachable in production
while looking fine in `expo start`.

It belongs to a **different site**. `app.json` declares
`applinks:link.archiveszone.app`, so the interstitial and the `.well-known/`
association files are the `link.archiveszone.app` deployment, which ships from
the mobile repo and has its own `vercel.json`. None of it is the web app.

So in this repo:

| File | Why it is like this |
|---|---|
| `open.html` | The interstitial, renamed off `/`. Still reachable at `/open` if a deep link ever wants it; no longer able to shadow the app. |
| `.well-known/` | Kept. Inert here — iOS only honours an association for domains the app declares, and it declares `link.archiveszone.app`. Deleting it would just create merge conflicts with upstream. |
| `phone.html` | Development only. The app in a device frame with a size switcher. |
| `today.json` | Development only. A snapshot of one day's story, because `/api/*` sends no CORS headers and the Expo dev server runs on a different port. Delete once the app reads through the proxy. |

**Before adding anything here, check it does not collide with a path the app
routes.** `api/_lib/__tests__/build-output.spec.js` asserts `dist/index.html` is
the app shell, which is the specific regression that test exists to catch.
