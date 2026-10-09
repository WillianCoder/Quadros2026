// Lê os arquivos de dados do site (window.NOME = {...JSON...};) no Node.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function lerDados(relativo) {
  const texto = fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
  const m = texto.match(/window\.\w+\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!m) throw new Error(relativo + ': não encontrei "window.NOME = { ... };"');
  return JSON.parse(m[1]);
}

export function urlDoSite() {
  let url = process.env.SITE_URL || '';
  if (!url) { try { url = lerDados('assets/js/config.js').siteUrl || ''; } catch (e) { /* usa o padrão */ } }
  if (!url) url = 'https://williancoder.github.io/Quadros2026/';
  return url.endsWith('/') ? url : url + '/';
}
