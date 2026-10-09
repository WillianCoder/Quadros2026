/*
 * Quadro — desenha um quadro com LEDs acesos e cuida da "montagem" escolhida pelo cliente (global `Quadro`).
 *
 * Montagem (config), com chaves curtas porque também vai no link de compartilhar:
 *   { q: id do quadro ('foto' = foto do cliente), t: tamanho, m: moldura,
 *     z: { idDaArea: idDaCor },               áreas de LED acesas
 *     x: [ { k: 'p'|'l'|'a', p: [[x,y],...], r, c } ],  LEDs extras (ponto, faixa, anel) em % da arte
 *     e: efeito, rgb: true|false, ct: cor do contorno ('' = sem), fd: cor da luz de fundo ('' = sem),
 *     ex: [ids de extras], obs: 'observação' }
 *
 * API (contratos em docs/ARQUITETURA.md):
 *   Quadro.obter(id, foto)          → objeto do quadro (inclui o "Seu veículo" quando id === 'foto')
 *   Quadro.padrao(quadro)           → montagem inicial (áreas marcadas como padrão já acesas)
 *   Quadro.normalizar(cfg)          → montagem limpa e validada (ids que não existem são descartados)
 *   Quadro.preco(cfg)               → { total, itens: [{ nome, valor }] }
 *   Quadro.resumo(cfg)              → linhas de texto (para o WhatsApp e o painel)
 *   Quadro.codificar(cfg) / Quadro.decodificar(texto)   → texto para o link ?c=
 *   Quadro.desenhar(alvo, { quadro, config, escuro, ligado, editavel, aoTocar(x, y), aoTocarArea(id), legenda })
 *       → { el, atualizar(cfg, quadro?), escuro(bool), ligado(bool), marcas([[x,y]]) }
 *   await Quadro.imagem(quadro, cfg, { marca, codigo, linhas, total }) → <canvas> 1080×1350 do pedido
 */
(function () {
  'use strict';
  const U = window.U;
  const FOTO = 'foto';
  const NS = 'http://www.w3.org/2000/svg';
  let contador = 0;

  const num = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
  const arred = (v) => Math.round(v * 100) / 100;

  /* ======================= Dados ======================= */
  function personalizado(foto) {
    const p = U.opcoes().personalizado || {};
    return {
      id: FOTO, nome: p.nome || 'Seu veículo no quadro', categoria: '', descricao: p.descricao || '',
      imagem: (foto && foto.src) || 'assets/img/sua-foto.svg', proporcao: (foto && foto.proporcao) || p.proporcao || 1.5,
      preco: Number(p.preco) || 0, leds: [], ativo: p.ativo !== false
    };
  }
  function obter(id, foto) {
    if (id === FOTO) return personalizado(foto);
    return U.quadro(id);
  }

  function padrao(q) {
    const o = U.opcoes();
    const z = {};
    ((q && q.leds) || []).forEach((a) => { if (a.padrao) z[a.id] = a.cor || 'branco-frio'; });
    return {
      q: q ? q.id : '', t: ((o.tamanhos || [])[0] || {}).id || '', m: ((o.molduras || [])[0] || {}).id || '',
      z, x: [], e: 'fixo', rgb: false, ct: '', fd: '', ex: [], obs: ''
    };
  }

  function normalizar(cfg) {
    const o = U.opcoes();
    const c = cfg && typeof cfg === 'object' ? cfg : {};
    let q = obter(String(c.q || ''));
    if (!q || (q.id !== FOTO && q.ativo === false) || (q.id === FOTO && !(o.personalizado || {}).ativo)) q = U.quadros()[0] || null;
    const base = padrao(q);
    const temId = (lista, id) => (lista || []).some((x) => x.id === id);
    const corOk = (id) => !!U.cor(id);
    const r = base;
    if (temId(o.tamanhos, c.t)) r.t = c.t;
    if (temId(o.molduras, c.m)) r.m = c.m;
    if (c.z && typeof c.z === 'object') {
      r.z = {};
      Object.keys(c.z).forEach((id) => { if (temId(q && q.leds, id)) r.z[id] = corOk(c.z[id]) ? c.z[id] : 'branco-frio'; });
    }
    const max = Number((o.pontoExtra || {}).max) || 0;
    if (Array.isArray(c.x) && (o.pontoExtra || {}).ativo !== false) {
      r.x = c.x.slice(0, max).map((x) => {
        if (!x || !['p', 'l', 'a'].includes(x.k) || !Array.isArray(x.p)) return null;
        const pts = x.p.slice(0, 12).map((p) => [arred(num(p[0], 0, 100)), arred(num(p[1], 0, 100))]);
        if (!pts.length || (x.k === 'l' && pts.length < 2)) return null;
        const item = { k: x.k, p: x.k === 'l' ? pts : [pts[0]], c: corOk(x.c) ? x.c : 'branco-frio' };
        if (x.k === 'a') item.r = arred(num(x.r || 4, 0.5, 25));
        return item;
      }).filter(Boolean);
    }
    r.rgb = !!c.rgb && (o.rgb || {}).ativo !== false;
    const ef = (o.efeitos || []).find((e) => e.id === c.e);
    if (ef && (!ef.soRgb || r.rgb)) r.e = ef.id;
    if ((o.contorno || {}).ativo !== false && corOk(c.ct)) r.ct = c.ct;
    if ((o.fundo || {}).ativo !== false && corOk(c.fd)) r.fd = c.fd;
    if (Array.isArray(c.ex)) r.ex = c.ex.filter((id, i, a) => temId(o.extras, id) && a.indexOf(id) === i);
    r.obs = U.limitar(c.obs, 500);
    return r;
  }

  function preco(cfg) {
    const o = U.opcoes();
    const q = obter(cfg.q) || {};
    const itens = [];
    const t = (o.tamanhos || []).find((x) => x.id === cfg.t) || { nome: '', acrescimo: 0 };
    itens.push({ nome: q.nome + (t.nome ? ' — ' + t.nome : ''), valor: (Number(q.preco) || 0) + (Number(t.acrescimo) || 0) });
    const m = (o.molduras || []).find((x) => x.id === cfg.m);
    if (m && Number(m.preco)) itens.push({ nome: 'Moldura ' + m.nome, valor: Number(m.preco) });
    (q.leds || []).forEach((a) => { if (cfg.z[a.id] && Number(a.preco)) itens.push({ nome: 'LED: ' + a.nome, valor: Number(a.preco) }); });
    if (cfg.x.length) itens.push({ nome: cfg.x.length + (cfg.x.length === 1 ? ' LED extra' : ' LEDs extras'), valor: cfg.x.length * (Number((o.pontoExtra || {}).preco) || 0) });
    if (cfg.rgb) itens.push({ nome: (o.rgb || {}).nome || 'RGB', valor: Number((o.rgb || {}).preco) || 0 });
    if (cfg.ct) itens.push({ nome: (o.contorno || {}).nome || 'Contorno', valor: Number((o.contorno || {}).preco) || 0 });
    if (cfg.fd) itens.push({ nome: (o.fundo || {}).nome || 'Luz de fundo', valor: Number((o.fundo || {}).preco) || 0 });
    (o.extras || []).forEach((x) => { if (cfg.ex.includes(x.id)) itens.push({ nome: x.nome, valor: Number(x.preco) || 0 }); });
    return { total: itens.reduce((s, i) => s + i.valor, 0), itens };
  }

  function resumo(cfg) {
    const o = U.opcoes();
    const q = obter(cfg.q) || {};
    const nomeCor = (id) => (U.cor(id) || {}).nome || id;
    const t = (o.tamanhos || []).find((x) => x.id === cfg.t);
    const m = (o.molduras || []).find((x) => x.id === cfg.m);
    const l = [];
    l.push('🖼️ Quadro: ' + q.nome + (t ? ' (' + t.nome + ')' : '') + (m ? ' · moldura ' + m.nome : ''));
    const areas = (q.leds || []).filter((a) => cfg.z[a.id]).map((a) => a.nome + (cfg.rgb ? '' : ' (' + nomeCor(cfg.z[a.id]) + ')'));
    l.push('💡 LEDs: ' + (areas.length ? areas.join(', ') : 'nenhuma área do modelo'));
    if (cfg.x.length) l.push('➕ LEDs extras marcados por mim: ' + cfg.x.length + ' (' + cfg.x.map((x) => ({ p: 'ponto', l: 'faixa', a: 'anel' })[x.k] + (cfg.rgb ? '' : ' ' + nomeCor(x.c))).join(', ') + ')');
    const ef = (o.efeitos || []).find((e) => e.id === cfg.e);
    l.push('✨ Efeito: ' + (ef ? ef.nome : 'Fixo') + (cfg.rgb ? ' · RGB com controle' : ''));
    if (cfg.ct) l.push('🔲 Contorno com LED: ' + (cfg.rgb ? 'RGB' : nomeCor(cfg.ct)));
    if (cfg.fd) l.push('🌌 Luz atrás do quadro: ' + (cfg.rgb ? 'RGB' : nomeCor(cfg.fd)));
    const ex = (o.extras || []).filter((x) => cfg.ex.includes(x.id)).map((x) => x.nome);
    if (ex.length) l.push('🎁 Extras: ' + ex.join(', '));
    if (cfg.obs) l.push('📝 Obs.: ' + cfg.obs);
    return l;
  }

  // Link de compartilhar: JSON → base64 "de URL" (sem + / =).
  function codificar(cfg) {
    const bytes = new TextEncoder().encode(JSON.stringify(cfg));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodificar(txt) {
    try {
      const s = String(txt || '');
      if (!s || s.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } catch (e) { return null; }
  }

  /* ======================= Desenho ======================= */
  function svg(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
    return e;
  }

  // Desenha uma luz (ponto, faixa ou anel) com 3 camadas: brilho espalhado, cor e miolo branco.
  function luz(tipo, pts, raio, hex, W, H, filtro, i) {
    const g = svg('g', { class: 'led led-' + tipo, style: '--i:' + i });
    const X = (p) => arred(p[0] / 100 * W), Y = (p) => arred(p[1] / 100 * H);
    const camadas = [
      { cls: 'led-brilho', larg: 34, raioP: 34, op: 0.55, f: filtro },
      { cls: 'led-cor', larg: 11, raioP: 11, op: 1, f: filtro + '-p' },
      { cls: 'led-miolo', larg: 3.5, raioP: 4.5, op: 0.95, branco: true }
    ];
    camadas.forEach((c) => {
      const cor = c.branco ? '#ffffff' : hex;
      const comum = { class: c.cls, opacity: c.op, filter: c.f ? 'url(#' + c.f + ')' : null };
      if (tipo === 'p') {
        pts.forEach((p) => g.append(svg('circle', Object.assign({ cx: X(p), cy: Y(p), r: c.raioP, fill: cor }, comum))));
      } else if (tipo === 'l') {
        g.append(svg('polyline', Object.assign({ points: pts.map((p) => X(p) + ',' + Y(p)).join(' '), fill: 'none', stroke: cor, 'stroke-width': c.larg, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 100 }, comum)));
      } else {
        pts.forEach((p) => g.append(svg('circle', Object.assign({ cx: X(p), cy: Y(p), r: arred((p[2] != null ? p[2] : raio) / 100 * W), fill: 'none', stroke: cor, 'stroke-width': c.larg, pathLength: 100 }, comum))));
      }
    });
    return g;
  }
  // Contorno tracejado de uma área apagada (mostra onde dá para acender) + área de toque larga.
  function fantasma(tipo, pts, W, H, acesa) {
    const g = svg('g', { class: 'area-toque' + (acesa ? ' acesa' : '') });
    const X = (p) => arred(p[0] / 100 * W), Y = (p) => arred(p[1] / 100 * H);
    const desenha = (attrs) => {
      if (tipo === 'p') pts.forEach((p) => g.append(svg('circle', Object.assign({ cx: X(p), cy: Y(p), r: attrs.r }, attrs.a))));
      else if (tipo === 'l') g.append(svg('polyline', Object.assign({ points: pts.map((p) => X(p) + ',' + Y(p)).join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, attrs.a)));
      else pts.forEach((p) => g.append(svg('circle', Object.assign({ cx: X(p), cy: Y(p), r: arred(p[2] / 100 * W), fill: 'none' }, attrs.a))));
    };
    if (!acesa) desenha({ r: 16, a: { class: 'fantasma', fill: tipo === 'p' ? 'rgba(255,255,255,.12)' : 'none', stroke: '#fff', 'stroke-width': 4, 'stroke-dasharray': '10 10' } });
    desenha({ r: 46, a: { class: 'toque', fill: tipo === 'p' ? 'transparent' : 'none', stroke: 'transparent', 'stroke-width': 60 } });
    return g;
  }

  function desenhar(alvo, opts) {
    const o = opts || {};
    const id = 'qdf' + (++contador);
    let q = o.quadro, cfg = o.config;
    const raiz = U.el('div', { class: 'qd' });
    const halo = U.el('div', { class: 'qd-halo', 'aria-hidden': 'true' });
    const moldura = U.el('div', { class: 'qd-moldura' });
    const arte = U.el('div', { class: 'qd-arte' });
    const img = U.el('img', { class: 'qd-img', alt: '', decoding: 'async', loading: o.carregarJa ? 'eager' : 'lazy', draggable: 'false' });
    const leds = svg('svg', { class: 'qd-leds', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    const contorno = U.el('div', { class: 'qd-contorno', 'aria-hidden': 'true' });
    const marcas = svg('g', { class: 'qd-marcas' });
    arte.append(img, leds, contorno);
    moldura.append(arte);
    raiz.append(halo, moldura);
    if (o.legenda) raiz.append(U.el('span', { class: 'sr-only', text: o.legenda }));
    alvo.replaceChildren(raiz);

    if (o.editavel) {
      raiz.classList.add('qd--editavel');
      leds.addEventListener('click', (ev) => {
        const area = ev.target.closest && ev.target.closest('[data-area]');
        if (area && o.aoTocarArea) { o.aoTocarArea(area.getAttribute('data-area')); return; }
        if (!o.aoTocar) return;
        const r = leds.getBoundingClientRect();
        o.aoTocar(arred(num((ev.clientX - r.left) / r.width * 100, 0, 100)), arred(num((ev.clientY - r.top) / r.height * 100, 0, 100)));
      });
    }

    function render() {
      if (!q || !cfg) return;
      const prop = num(q.proporcao || 1.5, 0.4, 3);
      const W = Math.round(1000 * prop), H = 1000;
      const mold = (U.opcoes().molduras || []).find((m) => m.id === cfg.m);
      raiz.style.setProperty('--moldura', U.corValida(mold ? mold.cor : '#121214'));
      arte.style.aspectRatio = W + ' / ' + H;
      const src = U.fotoSegura(q.imagem) || 'assets/img/sua-foto.svg';
      if (img.getAttribute('src') !== src) img.src = src;
      img.alt = o.legenda ? '' : 'Quadro ' + (q.nome || '');
      leds.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

      const defs = svg('defs');
      // Região do filtro no espaço do desenho: com a caixa do próprio elemento, uma faixa reta (altura 0) perderia o brilho.
      const regiao = { filterUnits: 'userSpaceOnUse', x: -100, y: -100, width: W + 200, height: H + 200 };
      const f1 = svg('filter', Object.assign({ id }, regiao));
      f1.append(svg('feGaussianBlur', { stdDeviation: 16 }));
      const f2 = svg('filter', Object.assign({ id: id + '-p' }, regiao));
      f2.append(svg('feGaussianBlur', { stdDeviation: 3.5 }));
      defs.append(f1, f2);
      const camada = svg('g', { class: 'qd-camada' });
      const toques = svg('g', { class: 'qd-toques' });
      let i = 0;
      (q.leds || []).forEach((a) => {
        const acesa = !!cfg.z[a.id];
        const pts = a.pontos || [];
        if (acesa) {
          const g = luz(a.tipo === 'pontos' ? 'p' : a.tipo === 'anel' ? 'a' : 'l', pts, 4, U.corHex(cfg.z[a.id]), W, H, id, i++);
          g.setAttribute('data-led', a.id);
          camada.append(g);
        }
        if (o.editavel && o.aoTocarArea) {
          const t = fantasma(a.tipo === 'pontos' ? 'p' : a.tipo === 'anel' ? 'a' : 'l', pts, W, H, acesa);
          t.setAttribute('data-area', a.id);
          const titulo = svg('title');
          titulo.textContent = a.nome;
          t.append(titulo);
          toques.append(t);
        }
      });
      (cfg.x || []).forEach((x) => camada.append(luz(x.k, x.p, x.r, U.corHex(x.c), W, H, id, i++)));
      leds.replaceChildren(defs, camada, toques, marcas);

      raiz.style.setProperty('--ct', cfg.ct ? U.corHex(cfg.ct) : 'transparent');
      raiz.style.setProperty('--fd', cfg.fd ? U.corHex(cfg.fd) : 'transparent');
      raiz.classList.toggle('qd--contorno', !!cfg.ct);
      raiz.classList.toggle('qd--fundo', !!cfg.fd);
      raiz.dataset.efeito = cfg.rgb && cfg.e === 'arcoiris' ? 'arcoiris' : cfg.e === 'arcoiris' ? 'fixo' : cfg.e || 'fixo';
    }

    const api = {
      el: raiz,
      atualizar(novo, novoQuadro) { cfg = novo; if (novoQuadro) q = novoQuadro; render(); },
      escuro(b) { raiz.classList.toggle('qd--escuro', !!b); },
      ligado(b) { raiz.classList.toggle('qd--apagado', !b); },
      // Marcas temporárias (ex.: 1º toque de uma faixa ainda não terminada).
      marcas(pts) {
        const W = Number((leds.getAttribute('viewBox') || '0 0 1500 1000').split(' ')[2]);
        marcas.replaceChildren(...(pts || []).map((p) => svg('circle', { class: 'marca', cx: p[0] / 100 * W, cy: p[1] / 100 * 1000, r: 14 })));
      }
    };
    api.escuro(o.escuro);
    api.ligado(o.ligado !== false);
    render();
    return api;
  }

  /* ======================= Imagem do pedido (para mandar no WhatsApp) ======================= */
  function carregarImagem(src) {
    return new Promise((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error('Não consegui abrir a imagem.'));
      i.src = src;
    });
  }
  // Quebra o texto em linhas que cabem na largura.
  function linhasQueCabem(ctx, texto, largura) {
    const saida = [];
    String(texto).split('\n').forEach((par) => {
      let atual = '';
      par.split(' ').forEach((p) => {
        const teste = atual ? atual + ' ' + p : p;
        if (ctx.measureText(teste).width > largura && atual) { saida.push(atual); atual = p; } else atual = teste;
      });
      saida.push(atual);
    });
    return saida;
  }
  // Desenha o quadro montado (com os LEDs acesos) + código + resumo num <canvas> 1080×1350.
  // info: { marca, codigo, linhas: [texto], total: 'R$ 0' }
  async function imagem(q, cfg, info) {
    const o = info || {};
    const LW = 1080, LH = 1350;
    const c = document.createElement('canvas');
    c.width = LW; c.height = LH;
    const ctx = c.getContext('2d');
    const fundo = ctx.createRadialGradient(LW / 2, 380, 50, LW / 2, 380, 900);
    fundo.addColorStop(0, '#141826'); fundo.addColorStop(1, '#05060a');
    ctx.fillStyle = fundo; ctx.fillRect(0, 0, LW, LH);

    // Área do quadro
    const prop = num(q.proporcao || 1.5, 0.4, 3);
    let fw = 920, borda = Math.round(fw * 0.032);
    let aw = fw - borda * 2, ah = aw / prop;
    if (ah > 680) { ah = 680; aw = ah * prop; borda = Math.round(aw * 0.034); fw = aw + borda * 2; }
    const fx = (LW - fw) / 2, fy = 70, fh = ah + borda * 2;
    const ax = fx + borda, ay = fy + borda;
    const mold = (U.opcoes().molduras || []).find((m) => m.id === cfg.m);
    if (cfg.fd) {
      ctx.save(); ctx.shadowColor = U.corHex(cfg.fd); ctx.shadowBlur = 90; ctx.fillStyle = U.corHex(cfg.fd);
      ctx.globalAlpha = 0.7; ctx.fillRect(fx + 20, fy + 20, fw - 40, fh - 40); ctx.restore();
    }
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = U.corValida(mold ? mold.cor : '#121214'); ctx.fillRect(fx, fy, fw, fh); ctx.restore();

    // Arte (cobre a área, como no site) levemente escurecida, e os LEDs por cima (modo "tela")
    try {
      const img = await carregarImagem(U.fotoSegura(q.imagem) || 'assets/img/sua-foto.svg');
      const iw = img.naturalWidth || 1500, ih = img.naturalHeight || 1000;
      const esc = Math.max(aw / iw, ah / ih);
      ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
      ctx.drawImage(img, ax + (aw - iw * esc) / 2, ay + (ah - ih * esc) / 2, iw * esc, ih * esc);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(ax, ay, aw, ah);
      ctx.restore();
    } catch (e) { ctx.fillStyle = '#000'; ctx.fillRect(ax, ay, aw, ah); }
    const caixa = document.createElement('div');
    caixa.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + Math.round(aw) + 'px';
    document.body.append(caixa);
    try {
      desenhar(caixa, { quadro: q, config: Object.assign({}, cfg, { e: 'fixo', ct: '', fd: '' }) });
      const s = caixa.querySelector('.qd-leds').cloneNode(true);
      s.setAttribute('xmlns', NS);
      s.setAttribute('width', Math.round(aw)); s.setAttribute('height', Math.round(ah));
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(s)], { type: 'image/svg+xml' }));
      try {
        const luzes = await carregarImagem(url);
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(luzes, ax, ay, aw, ah); ctx.restore();
      } finally { URL.revokeObjectURL(url); }
    } catch (e) { /* sem as luzes: segue com a arte */ }
    caixa.remove();
    if (cfg.ct) {
      ctx.save(); const h = U.corHex(cfg.ct); ctx.strokeStyle = h; ctx.lineWidth = 6; ctx.shadowColor = h; ctx.shadowBlur = 24;
      ctx.strokeRect(ax + 3, ay + 3, aw - 6, ah - 6); ctx.restore();
    }

    // Textos
    let y = fy + fh + 70;
    const fonte = (peso, tam) => peso + ' ' + tam + "px 'Inter', 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#22e6ff'; ctx.font = fonte(800, 28);
    ctx.fillText(String(o.marca || '').toUpperCase(), 70, y);
    if (o.codigo) { ctx.fillStyle = '#ffffff'; ctx.font = fonte(800, 52); ctx.fillText('Pedido #' + o.codigo, 70, y + 62); y += 62; }
    y += 50;
    ctx.fillStyle = '#c9cfe6'; ctx.font = fonte(500, 28);
    const linhas = [];
    (o.linhas || []).forEach((l) => linhasQueCabem(ctx, l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim(), LW - 140).forEach((x) => linhas.push(x)));
    const espaco = o.total ? 110 : 40;
    for (const l of linhas) {
      if (y + 38 > LH - espaco) { ctx.fillText('…', 70, y); y += 38; break; }
      ctx.fillText(l, 70, y); y += 38;
    }
    if (o.total) {
      ctx.fillStyle = '#ffffff'; ctx.font = fonte(800, 44);
      ctx.fillText('Total estimado: ' + o.total, 70, LH - 60);
    }
    return c;
  }

  window.Quadro = { FOTO, obter, padrao, normalizar, preco, resumo, codificar, decodificar, desenhar, imagem };
})();
