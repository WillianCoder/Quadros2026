// Gera <pasta>/sitemap.xml com as páginas públicas e os quadros ativos, e completa o og:image.
import fs from 'node:fs';
import path from 'node:path';
import { lerDados, urlDoSite } from './ler-dados.mjs';

const destino = process.argv[2] || '_site';
const base = urlDoSite();
const cat = lerDados('assets/js/catalogo.js');
const hoje = new Date().toISOString().slice(0, 10);
const urls = ['', 'montar.html', 'links.html', 'termos.html', 'privacidade.html']
  .concat((cat.quadros || []).filter((q) => q.ativo !== false).map((q) => 'montar.html?q=' + encodeURIComponent(q.id)));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => '  <url><loc>' + (base + u).replace(/&/g, '&amp;') + '</loc><lastmod>' + hoje + '</lastmod></url>').join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(destino, 'sitemap.xml'), xml);
const robots = path.join(destino, 'robots.txt');
if (fs.existsSync(robots)) fs.appendFileSync(robots, '\nSitemap: ' + base + 'sitemap.xml\n');
console.log('sitemap.xml com', urls.length, 'endereços');

// Redes sociais exigem o endereço completo da imagem de prévia.
for (const f of fs.readdirSync(destino).filter((n) => n.endsWith('.html'))) {
  const arq = path.join(destino, f);
  const html = fs.readFileSync(arq, 'utf8');
  const novo = html.replace(/content="assets\/img\/og\.png"/g, 'content="' + base + 'assets/img/og.png"');
  if (novo !== html) fs.writeFileSync(arq, novo);
}
