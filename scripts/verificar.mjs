// Confere o site antes de publicar: dados válidos, referências, áreas de LED,
// sintaxe do JavaScript e segurança das páginas. Uso: node scripts/verificar.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { lerDados, RAIZ } from './ler-dados.mjs';

let erros = 0, avisos = 0;
const ok = (m) => console.log('✔ ' + m);
const erro = (m) => { erros++; console.log('✖ ' + m); };
const aviso = (m) => { avisos++; console.log('⚠ ' + m); };
const arq = (r) => path.join(RAIZ, r);

/* 1. Dados */
let cfg, cat;
try { cfg = lerDados('assets/js/config.js'); ok('config.js é JSON válido'); } catch (e) { erro('config.js: ' + e.message); }
try { cat = lerDados('assets/js/catalogo.js'); ok('catalogo.js é JSON válido'); } catch (e) { erro('catalogo.js: ' + e.message); }

/* 2. Referências do catálogo */
function unicos(lista, nome) {
  const vistos = new Set();
  (lista || []).forEach((x) => { if (!x || !x.id) erro(nome + ' sem id'); else if (vistos.has(x.id)) erro(nome + ' com id repetido: ' + x.id); vistos.add(x && x.id); });
  return vistos;
}
const imagemOk = (s) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) || (/^assets\/[A-Za-z0-9_\-/.]+\.(jpe?g|png|webp|svg)$/.test(s) && !s.includes('..'));
const dentro = (v) => typeof v === 'number' && v >= 0 && v <= 100;
if (cat) {
  const o = cat.opcoes || {};
  const catIds = unicos(cat.categorias, 'Categoria');
  const corIds = unicos(o.cores, 'Cor');
  ['tamanhos', 'molduras', 'efeitos', 'extras'].forEach((k) => unicos(o[k], 'Opção ' + k));
  if (!(o.tamanhos || []).length) erro('opcoes.tamanhos precisa ter pelo menos 1 tamanho');
  if (!(o.molduras || []).length) erro('opcoes.molduras precisa ter pelo menos 1 moldura');
  (o.cores || []).forEach((c) => { if (!/^#[0-9a-f]{6}$/i.test(c.hex || '')) erro('Cor ' + c.id + ': hex inválido "' + c.hex + '"'); });
  (o.molduras || []).forEach((m) => { if (!/^#[0-9a-f]{6}$/i.test(m.cor || '')) erro('Moldura ' + m.id + ': cor inválida "' + m.cor + '"'); });
  const qIds = unicos(cat.quadros, 'Quadro');
  if (qIds.has('foto')) erro('O id "foto" é reservado para "Seu veículo no quadro"');
  (cat.quadros || []).forEach((q) => {
    const n = 'Quadro ' + q.id;
    if (!q.nome) erro(n + ' sem nome');
    if (q.categoria && !catIds.has(q.categoria)) erro(n + ': categoria inexistente "' + q.categoria + '"');
    if (!imagemOk(q.imagem || '')) erro(n + ': imagem inválida');
    else if (/^assets\//.test(q.imagem) && !fs.existsSync(arq(q.imagem))) erro(n + ': arquivo de imagem não encontrado ' + q.imagem);
    if (q.credito != null) {
      const c = q.credito;
      if (typeof c !== 'object' || ['autor', 'licenca', 'fonte'].some((k) => c[k] != null && typeof c[k] !== 'string')) erro(n + ': credito inválido');
      else if (c.fonte && !/^https:\/\//.test(c.fonte)) erro(n + ': credito.fonte precisa começar com https://');
    }
    if (/^data:/.test(q.imagem || '')) aviso(n + ': imagem dentro do catálogo (publique pelo painel para virar arquivo)');
    if (!(Number(q.proporcao) > 0.3 && Number(q.proporcao) < 3.5)) erro(n + ': proporcao inválida');
    if (typeof q.preco !== 'number' || q.preco < 0) erro(n + ': preco inválido');
    unicos(q.leds, n + ' área');
    (q.leds || []).forEach((a) => {
      const na = n + ' / área ' + a.id;
      if (!['pontos', 'linha', 'anel'].includes(a.tipo)) erro(na + ': tipo inválido "' + a.tipo + '"');
      if (!Array.isArray(a.pontos) || !a.pontos.length) erro(na + ': sem pontos marcados');
      else {
        if (a.tipo === 'linha' && a.pontos.length < 2) erro(na + ': faixa precisa de 2 pontos ou mais');
        a.pontos.forEach((p) => {
          if (!Array.isArray(p) || !dentro(p[0]) || !dentro(p[1])) erro(na + ': ponto fora do quadro ' + JSON.stringify(p));
          if (a.tipo === 'anel' && !(p[2] > 0 && p[2] < 30)) erro(na + ': anel sem raio válido ' + JSON.stringify(p));
        });
      }
      if (a.cor && !corIds.has(a.cor)) erro(na + ': cor inexistente "' + a.cor + '"');
      if (typeof a.preco !== 'number' || a.preco < 0) erro(na + ': preço inválido');
    });
  });
  if (!erros) ok((cat.quadros || []).length + ' quadros e suas áreas de LED conferidos');
}
if (cfg) {
  if (!/^\d{12,13}$/.test(String(cfg.whatsapp || ''))) aviso('config.whatsapp deve ter só números com 55 + DDD (ex.: 5511912345678)');
  if (cfg.siteUrl && !/^https:\/\//.test(cfg.siteUrl)) erro('config.siteUrl precisa começar com https://');
  if (cfg.firebase && !cfg.adminEmail) aviso('Firebase configurado sem adminEmail: ninguém consegue ver os pedidos');
}

/* 3. Sintaxe do JavaScript */
function listar(dir, ext) {
  return fs.readdirSync(arq(dir), { withFileTypes: true }).flatMap((e) => {
    const r = path.join(dir, e.name);
    return e.isDirectory() ? listar(r, ext) : e.name.endsWith(ext) ? [r] : [];
  });
}
let nJs = 0;
for (const f of listar('assets/js', '.js')) {
  try { new vm.Script(fs.readFileSync(arq(f), 'utf8'), { filename: f }); nJs++; } catch (e) { erro('Sintaxe em ' + f + ': ' + e.message); }
}
ok(nJs + ' arquivos JavaScript sem erro de sintaxe');

/* 4. Páginas HTML: CSP, sem script embutido, sem on...=, arquivos existentes */
const paginas = fs.readdirSync(RAIZ).filter((n) => n.endsWith('.html'));
for (const p of paginas) {
  const html = fs.readFileSync(arq(p), 'utf8');
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1] || '';
  if (!csp) erro(p + ': falta o meta Content-Security-Policy');
  else {
    if (/unsafe-eval|script-src[^;]*unsafe-inline/.test(csp)) erro(p + ': CSP permite script inseguro');
    if (!/object-src 'none'/.test(csp) || !/base-uri 'self'/.test(csp)) erro(p + ': CSP precisa de object-src none e base-uri self');
  }
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1]) && m[2].trim()) erro(p + ': <script> com código dentro da página (o CSP bloqueia)');
    if (/\bsrc="https?:/.test(m[1])) erro(p + ': script de outro site direto na página');
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) erro(p + ': atributo on...= (o CSP bloqueia)');
  if (/target="_blank"(?![^>]*rel="noopener)/.test(html)) erro(p + ': link target=_blank sem rel="noopener"');
  for (const m of html.matchAll(/\s(?:src|href)="([^"#?]+)[^"]*"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(u) || u === './') continue;
    if (!fs.existsSync(arq(u.replace(/^\.\//, '')))) erro(p + ': arquivo não encontrado "' + u + '"');
  }
}
const adm = fs.readFileSync(arq('admin.html'), 'utf8');
if (!/name="robots" content="noindex/.test(adm)) erro('admin.html precisa de <meta name="robots" content="noindex, nofollow">');
ok(paginas.length + ' páginas HTML conferidas');

/* 5. Regras do Firestore */
const regras = fs.existsSync(arq('firestore.rules')) ? fs.readFileSync(arq('firestore.rules'), 'utf8') : '';
if (!regras.includes('ADMIN_EMAIL')) erro('firestore.rules precisa conter o marcador ADMIN_EMAIL (o painel troca pelo e-mail)');
else if (!/match \/\{document=\*\*\}[\s\S]*allow read, write: if false/.test(regras)) erro('firestore.rules precisa negar tudo por padrão');
else ok('firestore.rules com marcador ADMIN_EMAIL e negação por padrão');

console.log('\n' + (erros ? '✖ ' + erros + ' erro(s)' : '✔ Tudo certo') + (avisos ? ' · ' + avisos + ' aviso(s)' : ''));
process.exit(erros ? 1 : 0);
