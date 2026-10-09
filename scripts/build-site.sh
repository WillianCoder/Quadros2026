#!/usr/bin/env bash
# Monta em _site/ só os arquivos públicos do site (docs, scripts e README não são publicados).
# Usado pelo GitHub Pages (.github/workflows/pages.yml) e serve também para o Cloudflare Pages
# (comando de build: bash scripts/build-site.sh · pasta de saída: _site).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site
mkdir -p _site
cp index.html montar.html links.html admin.html termos.html privacidade.html 404.html \
   manifest.webmanifest robots.txt _headers .nojekyll firestore.rules _site/
cp -R assets .well-known _site/
SITE_URL="${SITE_URL:-}" node scripts/sitemap.mjs _site
echo "Site montado em _site/ ($(find _site -type f | wc -l) arquivos)"
