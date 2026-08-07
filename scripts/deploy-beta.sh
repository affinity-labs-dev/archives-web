#!/usr/bin/env bash
#
# Deploy the Expo web build to beta.archiveszone.app.
#
#   ./scripts/deploy-beta.sh
#
# Beta is a SEPARATE Vercel project (archives-web-beta) from the one serving the
# live vanilla app at web.archiveszone.app (archives-web). That separation is
# the point: this repo's vercel.json still describes the live static site, and
# giving that project a build step that emits dist/ would swap production for
# the in-progress port.
#
# It deploys a prebuilt payload rather than the source tree. Building on Vercel
# would mean uploading assets/ - 199MB, mostly images the web build never
# references, against a 25MB output - on every deploy.
#
# Requires: vercel CLI logged in to the account owning affinity-labs1, and
# .env.web-spike for the build-time EXPO_PUBLIC_* values.

set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="archives-web-beta"
SCOPE="affinity-labs1"
DOMAIN="beta.archiveszone.app"
PAYLOAD=".beta-deploy"

echo "==> Building the web bundle"
set -a; . ./.env.web-spike; set +a
rm -rf dist
npx expo export -p web

echo "==> Gate: nothing secret ships, and the shell is the app"
CI=true npx vitest run \
  api/_lib/__tests__/no-secrets-shipped.spec.js \
  api/_lib/__tests__/build-output.spec.js

echo "==> Assembling the payload"
rm -rf "$PAYLOAD"
mkdir -p "$PAYLOAD"
cp -a dist/. "$PAYLOAD"/
cp -a api "$PAYLOAD"/api
# Tests are not part of a deployment, and everything under api/ matching the
# functions glob would otherwise be built as one.
rm -rf "$PAYLOAD"/api/_lib/__tests__
# A dev-only fixture from the spike; the app reads /api/daily/today now.
rm -f "$PAYLOAD"/today.json
printf '.env*\n.vercel\n' > "$PAYLOAD"/.vercelignore

cat > "$PAYLOAD"/vercel.json <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": null,
  "outputDirectory": ".",
  "cleanUrls": false,
  "trailingSlash": false,
  "functions": { "api/**/*.js": { "maxDuration": 15 } },
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "same-origin" }
      ]
    },
    {
      "source": "/_expo/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
JSON

echo "==> Deploying"
cd "$PAYLOAD"

# Link explicitly. The payload directory is rebuilt from scratch every run, so
# it never carries a .vercel/project.json - and without this the CLI treats it
# as a new project and names it after the directory. It did exactly that once,
# creating a stray project called ".beta-deploy" and deploying there instead of
# to beta.
VERCEL_TOKEN= npx vercel link --yes --project "$PROJECT" --scope "$SCOPE" > /dev/null
# VERCEL_TOKEN is cleared per-command: a stale one in the environment overrides
# the logged-in session and deploys as the wrong account.
URL=$(VERCEL_TOKEN= npx vercel deploy --prod --yes --scope "$SCOPE" \
  | grep -oE "https://${PROJECT}[a-z0-9-]*\.vercel\.app" | head -1)
echo "    deployed $URL"

# The alias is explicit because a deployment only picks up project domains that
# existed when it was created - the first beta deploy predated the domain and
# silently served nothing on it.
echo "==> Aliasing $DOMAIN"
VERCEL_TOKEN= npx vercel alias set "$URL" "$DOMAIN" --scope "$SCOPE" > /dev/null
echo "    https://$DOMAIN"

echo "==> Smoke test"
fail=0
check() {
  local path="$1" want="$2" label="$3"
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://$DOMAIN$path")
  if [ "$got" = "$want" ]; then
    printf '    ok   %-44s %s\n' "$label" "$got"
  else
    printf '    FAIL %-44s got %s want %s\n' "$label" "$got" "$want"
    fail=1
  fi
}
check "/" 200 "app shell"
check "/api/daily/today?date=$(date +%Y-%m-%d)" 200 "daily story"
check "/api/db/rest/v1/content?select=readable_id&limit=1" 200 "proxy: public read"
check "/api/db/rest/v1/gamification_data?select=data" 401 "proxy: scoped needs a token"
check "/api/db/rest/v1/billing_events?select=id" 404 "proxy: table not allowlisted"
check "/api/db/rest/v1/daily_content?select=*,user_daily_quest_progress(*)" 403 "proxy: cannot embed a scoped table"

exit $fail
