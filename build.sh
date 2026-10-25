#!/usr/bin/env bash
# Builds a minified copy of the app into ./dist (needs Node.js and internet once for npx).
# Deploy the contents of dist/ instead of the files in this folder.
set -e
rm -rf dist && mkdir dist
npx --yes html-minifier-terser index.html -o dist/index.html \
  --collapse-whitespace --conservative-collapse --remove-comments \
  --minify-js '{"compress":true,"mangle":true}' --minify-css true
cp service-worker.js manifest.json dist/
# auto-bump the cache version from the built HTML so old shells are always replaced
HASH=$(sha1sum dist/index.html | cut -c1-8)
sed -i "s/const CACHE_VERSION = \"[^\"]*\"/const CACHE_VERSION = \"$HASH\"/" dist/service-worker.js
[ -d fonts ] && cp -r fonts dist/ || true
ls -l index.html dist/index.html
echo "Done. Open dist/index.html in a browser and click through the app before deploying."
