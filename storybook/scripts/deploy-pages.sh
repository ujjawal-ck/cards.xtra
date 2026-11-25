#!/usr/bin/env bash
# Builds the PUBLIC Storybook and publishes it to storybook/ in buildsbyanmol/ck-design-system-gallery
# (GitHub Pages). Everything else in that repo stays untouched.
# Public build leaves out: the Gaps page (internal bug list), the harness check stories, the scanner.
# The user approved a public deploy without Gaps on 2026-11-25. Ask the user before each deploy.
set -euo pipefail
REPO=buildsbyanmol/ck-design-system-gallery
HERE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
S='../../stories'
export SB_STORIES="$S/introduction.mdx,$S/foundations/**/*.mdx,$S/foundations/**/*.stories.tsx,$S/components/**/*.mdx,$S/components/**/*.stories.tsx,$S/patterns/**/*.mdx,$S/patterns/**/*.stories.tsx,$S/flows/**/*.mdx,$S/flows/**/*.stories.tsx"
cd "$HERE"
npx storybook build -c .storybook -o "$TMP/sb" --quiet
rm -f "$TMP/sb/scan.js"
git clone -q "https://github.com/$REPO.git" "$TMP/site"
rm -rf "$TMP/site/storybook" && mkdir -p "$TMP/site/storybook"
cp -R "$TMP/sb/." "$TMP/site/storybook/"
touch "$TMP/site/.nojekyll"
cd "$TMP/site"
git add -A
if git diff --cached --quiet; then echo "No changes."; exit 0; fi
git commit -q -m "Deploy Cards.xtra Storybook from cards.xtra $(git -C "$HERE" rev-parse --short HEAD)"
git push -q origin main
echo "Published: https://buildsbyanmol.github.io/ck-design-system-gallery/storybook/"
