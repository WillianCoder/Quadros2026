/*
 * Utilitários compartilhados por todas as páginas (global `U`).
 * Carregue depois de config.js, catalogo.js e rascunho.js.
 */
(function () {
  'use strict';

  const CFG = () => window.SITE_CONFIG || {};
  const CAT = () => window.CATALOGO || { quadros: [], categorias: [], opcoes: {}, faq: [], depoimentos: [], textos: {} };

  /* ---------------- DOM ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Escapa texto para HTML (use SEMPRE em dados editáveis antes de innerHTML).
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Cria elemento: U.el('button', { class: 'btn', onclick: fn, text: 'Ok' }, [filhos])
  function el(tag, attrs, filhos) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach((s) => e.style.setProperty(s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v[s]));
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(e.dataset, v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    (filhos || []).forEach((f) => { if (f != null) e.append(f.nodeType ? f : document.createTextNode(String(f))); });
    return e;
  }

  /* ---------------- Texto e números ---------------- */
  function brl(n) {
    const v = Number(n) || 0;
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  // Id aleatório só com letras minúsculas e números (sem caracteres parecidos: 0/o, 1/l).
  function uid(n) {
    const ab = 'abcdefghijkmnpqrstuvwxyz23456789';
    const arr = new Uint32Array(n || 8);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (x) => ab[x % ab.length]).join('');
  }
  const somenteNumeros = (s) => String(s || '').replace(/\D/g, '');
  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms || 250); };
  }
  const limitar = (s, max) => String(s == null ? '' : s).slice(0, max);

  /* ---------------- Catálogo ---------------- */
  const opcoes = () => CAT().opcoes || {};
  const quadros = (todos) => (CAT().quadros || []).filter((q) => todos || q.ativo !== false);
  const quadro = (id) => (CAT().quadros || []).find((q) => q.id === id) || null;
  const categoria = (id) => (CAT().categorias || []).find((c) => c.id === id) || null;
  const cor = (id) => (opcoes().cores || []).find((c) => c.id === id) || null;
  const corHex = (id) => (cor(id) || {}).hex || '#ffffff';
  const corValida = (hex) => (/^#[0-9a-f]{6}$/i.test(String(hex || '')) ? hex : '#ffffff');
  const precoMinimo = (q) => (Number(q.preco) || 0) + Math.min.apply(null, (opcoes().tamanhos || [{ acrescimo: 0 }]).map((t) => Number(t.acrescimo) || 0));

  /* ---------------- Endereços ---------------- */
  function siteBase() {
    let b = String(CFG().siteUrl || '').trim();
    if (!/^https:\/\//.test(b)) b = location.origin + location.pathname.replace(/[^/]*$/, '');
    return b.endsWith('/') ? b : b + '/';
  }
  const param = (k) => new URLSearchParams(location.search).get(k);

  // Aceita só https:// (e devolve '' para qualquer outra coisa: javascript:, data:, etc.).
  function linkSeguro(url) {
    try {
      const u = new URL(String(url || '').trim());
      return u.protocol === 'https:' ? u.href : '';
    } catch (e) { return ''; }
  }
  // Link do WhatsApp com mensagem pronta.
  function wa(texto, numero) {
    const n = somenteNumeros(numero || CFG().whatsapp);
    return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }
  // Instagram/TikTok/Facebook: aceita @usuario ou link completo.
  function rede(tipo, valor) {
    const v = String(valor || '').trim();
    if (!v) return '';
    if (/^https:\/\//.test(v)) return linkSeguro(v);
    const u = v.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '');
    if (!u) return '';
    return { instagram: 'https://instagram.com/', tiktok: 'https://www.tiktok.com/@', facebook: 'https://facebook.com/' }[tipo] + u;
  }

  // Só aceita imagens em data URL (base64) ou arquivos do próprio site — evita que uma "foto"
  // com conteúdo malicioso quebre o HTML onde é usada (src="...").
  function fotoSegura(src) {
    const s = String(src || '');
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
    if (/^assets\/[A-Za-z0-9_\-/.]+\.(jpe?g|png|webp|svg)$/.test(s) && s.indexOf('..') < 0) return s;
    return '';
  }

  /* ---------------- Avisos, cópia e downloads ---------------- */
  let toastTimer;
  function toast(msg, tipo) {
    let t = document.getElementById('toast');
    if (!t) { t = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast mostrar' + (tipo ? ' toast-' + tipo : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3600);
  }
  async function copiar(texto, aviso) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
      ta.value = texto; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignora */ }
      ta.remove();
    }
    if (aviso !== false) toast(aviso || 'Copiado!');
  }
  function baixar(nome, conteudo, mime) {
    let url, revogar = false;
    if (conteudo instanceof Blob) { url = URL.createObjectURL(conteudo); revogar = true; }
    else if (/^data:/.test(conteudo)) url = conteudo;
    else { url = URL.createObjectURL(new Blob([conteudo], { type: mime || 'text/plain;charset=utf-8' })); revogar = true; }
    const a = el('a', { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    if (revogar) setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function compartilhar(dados) {
    if (navigator.share) {
      try { await navigator.share(dados); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    if (dados.url) copiar(dados.url, 'Link copiado!');
    return false;
  }

  // QR Code em <svg> (usa assets/js/vendor/qrcode.js, MIT). Devolve '' se a biblioteca não carregou.
  function qrSvg(texto) {
    const g = window.qrcode;
    if (typeof g !== 'function') return '';
    const q = g(0, 'M');
    q.addData(String(texto || ''), 'Byte');
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 8, scalable: true }).replace('<svg ', '<svg role="img" aria-label="QR Code" shape-rendering="crispEdges" ');
  }

  // localStorage com JSON e sem quebrar em modo anônimo.
  const ls = {
    get(k, padrao) { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } }
  };
  const reduzMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mostra elementos com a classe .revelar quando entram na tela.
  function revelarAoRolar(elementos) {
    const lista = elementos || $$('.revelar');
    if (!('IntersectionObserver' in window) || reduzMovimento()) { lista.forEach((e) => e.classList.add('visivel')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('visivel'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    lista.forEach((e) => io.observe(e));
  }

  // Ano no rodapé, marca e links de contato marcados com data-* (comuns a todas as páginas).
  function preencherComuns() {
    const c = CFG();
    $$('[data-marca]').forEach((e) => { e.textContent = c.marca || ''; });
    $$('[data-ano]').forEach((e) => { e.textContent = String(new Date().getFullYear()); });
    $$('[data-whatsapp]').forEach((e) => { e.href = wa(e.getAttribute('data-whatsapp') || 'Olá! Vim pelo site e quero saber mais sobre os quadros de LED.'); e.target = '_blank'; e.rel = 'noopener'; });
    ['instagram', 'tiktok', 'facebook'].forEach((r) => $$('[data-' + r + ']').forEach((e) => {
      const u = rede(r, c[r]);
      if (u) { e.href = u; e.target = '_blank'; e.rel = 'noopener'; } else e.hidden = true;
    }));
  }

  // Impede que o site seja aberto dentro de um iframe de outro domínio (clickjacking).
  try { if (window.top !== window.self && window.top.location.origin !== location.origin) throw 0; }
  catch (e) { document.documentElement.style.display = 'none'; try { window.top.location = location.href; } catch (e2) { /* ignora */ } }

  window.U = {
    $, $$, esc, el, brl, slug, uid, somenteNumeros, debounce, limitar,
    opcoes, quadros, quadro, categoria, cor, corHex, corValida, precoMinimo,
    siteBase, param, linkSeguro, wa, rede, fotoSegura,
    toast, copiar, baixar, compartilhar, qrSvg, ls, reduzMovimento, revelarAoRolar, preencherComuns
  };
})();
