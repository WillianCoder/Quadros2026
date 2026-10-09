/*
 * Painel do dono do site (admin.html).
 *
 * Edita cópias de CATALOGO e SITE_CONFIG. Cada mudança vira um rascunho neste navegador
 * (localStorage, dá para ver no site com ?rascunho=1). "Salvar e publicar" envia as fotos novas
 * para assets/img/quadros/ e grava assets/js/catalogo.js e config.js no GitHub, usando um token
 * pessoal guardado só neste aparelho. Pedidos vêm do Store (Firebase ou modo de teste).
 */
(function () {
  'use strict';
  const U = window.U, Q = window.Quadro, Store = window.Store;
  const $ = U.$;
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const TOKEN = 'qd:gh-token';
  const ARQ = {
    catalogo: { caminho: 'assets/js/catalogo.js', global: 'CATALOGO', nome: 'catálogo' },
    config: { caminho: 'assets/js/config.js', global: 'SITE_CONFIG', nome: 'configurações' }
  };
  const CABECALHOS = {};
  const publicado = { catalogo: clonar(window.CATALOGO || {}), config: clonar(window.SITE_CONFIG || {}) };
  const dados = {};
  Object.keys(ARQ).forEach((k) => { dados[k] = U.ls.get('qd:rascunho:' + k, null) || clonar(publicado[k]); });
  const C = () => dados.catalogo;
  const O = () => C().opcoes || (C().opcoes = {});
  // O resto do site (Quadro, U) lê window.CATALOGO: aponta para o rascunho para a prévia ficar igual.
  window.CATALOGO = dados.catalogo;
  window.SITE_CONFIG = dados.config;
  let abaAtual = (location.hash || '').slice(1) || 'inicio';

  /* ================= Token do GitHub ================= */
  const token = () => { try { return sessionStorage.getItem(TOKEN) || localStorage.getItem(TOKEN) || ''; } catch (e) { return ''; } };
  function guardarToken(t, lembrar) {
    try { sessionStorage.removeItem(TOKEN); localStorage.removeItem(TOKEN); (lembrar ? localStorage : sessionStorage).setItem(TOKEN, t); } catch (e) { /* ignora */ }
  }
  function apagarToken() { try { sessionStorage.removeItem(TOKEN); localStorage.removeItem(TOKEN); } catch (e) { /* ignora */ } }

  /* ================= Rascunho e publicação ================= */
  function mudou(qual) {
    if (!U.ls.set('qd:rascunho:' + qual, dados[qual])) U.toast('O rascunho ficou grande demais para guardar neste aparelho. Publique agora para não perder.', 'erro');
    barraRascunho();
  }
  const pendentes = () => Object.keys(ARQ).filter((k) => JSON.stringify(dados[k]) !== JSON.stringify(publicado[k]));
  function barraRascunho() {
    const pend = pendentes();
    $('#barra-rascunho').hidden = !pend.length;
    if (pend.length) $('#rasc-txt').textContent = '✏️ Alterações ainda não publicadas (' + pend.map((k) => ARQ[k].nome).join(' e ') + ')';
  }
  function descartar() {
    if (!confirm('Descartar todas as alterações não publicadas?')) return;
    Object.keys(ARQ).forEach((k) => { U.ls.del('qd:rascunho:' + k); dados[k] = clonar(publicado[k]); });
    window.CATALOGO = dados.catalogo; window.SITE_CONFIG = dados.config;
    barraRascunho(); render();
  }
  function textoArquivo(k) {
    const cab = CABECALHOS[k] || '/*\n * Editado pelo Painel (admin.html). Tudo depois do sinal de igual precisa ser JSON válido.\n */\n';
    return cab + 'window.' + ARQ[k].global + ' = ' + JSON.stringify(dados[k], null, 2) + ';\n';
  }
  function b64(texto) {
    const bytes = new TextEncoder().encode(texto);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function deB64(s) {
    const bin = atob(String(s).replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function extrair(texto) {
    const cab = texto.slice(0, texto.indexOf('window.'));
    const m = texto.match(/window\.\w+\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    return { cab, obj: m ? JSON.parse(m[1]) : null };
  }
  const repo = () => String(dados.config.repo || publicado.config.repo || '').trim();
  async function gh(caminho, opcoes) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo())) throw new Error('Repositório inválido nas Configurações (formato: usuario/repositorio).');
    const r = await fetch('https://api.github.com/repos/' + repo() + '/contents/' + caminho, Object.assign({}, opcoes, {
      headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }
    }));
    if (r.status === 401) throw new Error('Token inválido ou vencido. Entre de novo na aba Configurações.');
    if (r.status === 403) throw new Error('O token não tem permissão no repositório ' + repo() + ' (precisa de "Contents: Read and write").');
    if (r.status === 404 && (!opcoes || opcoes.method !== 'GET')) throw new Error('Repositório ' + repo() + ' não encontrado para este token.');
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('O GitHub respondeu ' + r.status + '. Tente de novo em instantes.');
    return r.json();
  }
  async function carregarDoGithub() {
    if (!token() || !repo()) return;
    try {
      for (const k of Object.keys(ARQ)) {
        const r = await gh(ARQ[k].caminho + '?t=' + Date.now(), { method: 'GET', cache: 'no-store' });
        if (!r) continue;
        const { cab, obj } = extrair(deB64(r.content));
        if (cab) CABECALHOS[k] = cab;
        if (obj && JSON.stringify(obj) !== JSON.stringify(publicado[k])) {
          publicado[k] = obj;
          if (!U.ls.get('qd:rascunho:' + k, null)) { dados[k] = clonar(obj); window.CATALOGO = dados.catalogo; window.SITE_CONFIG = dados.config; }
          else U.toast('O ' + ARQ[k].nome + ' no GitHub está mais novo. Seu rascunho foi mantido.');
        }
      }
      barraRascunho(); render();
    } catch (e) { U.toast(e.message, 'erro'); }
  }
  // Fotos novas (data URL) viram arquivos em assets/img/quadros/ antes de publicar o catálogo.
  async function enviarFotos(aoProgresso) {
    const novos = (C().quadros || []).filter((q) => /^data:image\//.test(q.imagem || ''));
    for (let i = 0; i < novos.length; i++) {
      const q = novos[i];
      aoProgresso('Enviando foto ' + (i + 1) + ' de ' + novos.length + '…');
      const m = q.imagem.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!m) continue;
      const caminho = 'assets/img/quadros/' + U.slug(q.id) + '-' + U.uid(4) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
      await gh(caminho, { method: 'PUT', body: JSON.stringify({ message: 'Painel: foto do quadro ' + q.nome, content: m[2] }) });
      q.imagem = caminho;
    }
    if (novos.length) mudou('catalogo');
  }
  async function publicar() {
    if (!pendentes().length) { U.toast('Nada novo para publicar. ✅'); return; }
    if (!token()) { U.toast('Para publicar, conecte o GitHub (aba Configurações). Ou use "Baixar arquivos".', 'erro'); trocarAba('config'); return; }
    const btns = [$('#publicar'), $('#publicar2')];
    const texto = (t) => btns.forEach((b) => { b.disabled = true; b.textContent = t; });
    try {
      texto('Publicando…');
      await enviarFotos(texto);
      for (const k of pendentes()) {
        texto('Publicando ' + ARQ[k].nome + '…');
        const atual = await gh(ARQ[k].caminho, { method: 'GET', cache: 'no-store' });
        await gh(ARQ[k].caminho, { method: 'PUT', body: JSON.stringify({ message: 'Painel: atualiza ' + ARQ[k].nome, content: b64(textoArquivo(k)), sha: atual ? atual.sha : undefined }) });
        publicado[k] = clonar(dados[k]);
        U.ls.del('qd:rascunho:' + k);
      }
      barraRascunho();
      U.toast('Publicado! O site atualiza em 1 a 2 minutos. 🎉', 'ok');
      render();
    } catch (e) { U.toast(e.message, 'erro'); }
    btns.forEach((b) => { b.disabled = false; });
    $('#publicar').textContent = '🚀 Salvar e publicar';
    $('#publicar2').textContent = '🚀 Publicar';
  }
  function baixarArquivos() {
    const ks = pendentes().length ? pendentes() : Object.keys(ARQ);
    ks.forEach((k, i) => setTimeout(() => U.baixar(ARQ[k].caminho.split('/').pop(), textoArquivo(k), 'text/javascript'), i * 400));
  }

  /* ================= Peças de interface ================= */
  function modal(titulo, corpo, botoes, largo) {
    const fundo = U.el('div', { class: 'modal-fundo' });
    const m = U.el('div', { class: 'modal ' + (largo ? 'modal-tela' : 'modal-largo'), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    m.append(U.el('div', { class: 'modal-cabeca' }, [U.el('h2', { text: titulo }), U.el('button', { type: 'button', class: 'btn btn-icone btn-fantasma', text: '✕', 'aria-label': 'Fechar', onclick: fechar })]),
      U.el('div', { class: 'modal-corpo' }, [corpo]));
    if (botoes) m.append(U.el('div', { class: 'modal-rodape' }, typeof botoes === 'function' ? botoes(fechar) : botoes));
    fundo.append(m);
    document.addEventListener('keydown', tecla);
    document.body.append(fundo);
    return fechar;
  }
  function campo(rotulo, input, ajuda) {
    return U.el('label', { class: 'campo' }, [U.el('span', { text: rotulo }), input, ajuda ? U.el('p', { class: 'ajuda', text: ajuda }) : null]);
  }
  function entrada(valor, attrs, aoMudar) {
    const tipo = (attrs && attrs.type) || 'text';
    const i = U.el(tipo === 'area' ? 'textarea' : 'input', Object.assign({ class: tipo === 'checkbox' || tipo === 'color' ? null : 'input' }, attrs, tipo === 'area' ? { type: null } : {}));
    if (tipo === 'checkbox') i.checked = !!valor; else i.value = valor == null ? '' : valor;
    i.addEventListener(tipo === 'checkbox' || tipo === 'color' ? 'change' : 'input', () => {
      aoMudar(tipo === 'checkbox' ? i.checked : tipo === 'number' ? (i.value === '' ? 0 : Number(i.value)) : i.value);
    });
    return i;
  }
  // Lista editável: campos = [{ k, r: 'Rótulo', t: 'texto'|'numero'|'cor'|'sim'|'area', largura }]
  function tabela(lista, campos, opcoes) {
    const o = opcoes || {};
    const box = U.el('div', { class: 'tabela' });
    const desenhar = () => {
      box.replaceChildren(...lista.map((item, i) => {
        const linha = U.el('div', { class: 'tabela-linha', style: { gridTemplateColumns: campos.map((c) => c.largura || '1fr').join(' ') + ' auto' } });
        campos.forEach((c) => {
          const tipo = { numero: 'number', cor: 'color', sim: 'checkbox', area: 'area' }[c.t] || 'text';
          const attrs = { type: tipo, 'aria-label': c.r };
          if (tipo === 'number') { attrs.step = 'any'; attrs.min = '0'; attrs.class = 'input'; }
          const inp = entrada(item[c.k], attrs, (v) => { item[c.k] = v; if (c.aoMudar) c.aoMudar(item); mudou('catalogo'); });
          if (tipo === 'color' || tipo === 'checkbox') inp.className = '';
          linha.append(U.el('label', {}, [c.r, inp]));
        });
        const acoes = U.el('div', { class: 'acoes' }, [
          U.el('button', { type: 'button', class: 'btn btn-peq btn-icone', title: 'Subir', 'aria-label': 'Subir', text: '↑', disabled: i === 0, onclick: () => { lista.splice(i - 1, 0, lista.splice(i, 1)[0]); mudou('catalogo'); desenhar(); } }),
          U.el('button', { type: 'button', class: 'btn btn-peq btn-icone btn-perigo', title: 'Remover', 'aria-label': 'Remover', text: '✕', onclick: () => { if (o.min && lista.length <= o.min) { U.toast('Precisa ter pelo menos ' + o.min + '.'); return; } if (!confirm('Remover este item?')) return; lista.splice(i, 1); mudou('catalogo'); desenhar(); } })
        ]);
        linha.append(acoes);
        return linha;
      }));
      if (o.novo) box.append(U.el('button', { type: 'button', class: 'btn btn-peq', text: '+ ' + (o.rotuloNovo || 'Adicionar'), onclick: () => { lista.push(o.novo()); mudou('catalogo'); desenhar(); } }));
    };
    desenhar();
    return box;
  }
  const card = (titulo, filhos, ajuda) => U.el('section', { class: 'card' }, [U.el('h2', { text: titulo }), ajuda ? U.el('p', { class: 'ajuda', text: ajuda }) : null].concat(filhos));

  /* ================= Abas ================= */
  const ABAS = [
    { id: 'inicio', nome: '🏠 Início' },
    { id: 'quadros', nome: '🖼️ Quadros' },
    { id: 'pedidos', nome: '🧾 Pedidos' },
    { id: 'precos', nome: '💲 Preços e opções' },
    { id: 'textos', nome: '✍️ Textos' },
    { id: 'divulgar', nome: '🔗 Link para Instagram' },
    { id: 'config', nome: '⚙️ Configurações' }
  ];
  function trocarAba(id) { abaAtual = id; history.replaceState(null, '', '#' + id); render(); window.scrollTo(0, 0); }
  function render() {
    $('#abas').replaceChildren(...ABAS.map((a) => U.el('button', { type: 'button', class: 'aba', 'aria-current': a.id === abaAtual ? 'page' : null, text: a.nome, onclick: () => trocarAba(a.id) })));
    const p = $('#painel');
    p.replaceChildren();
    ({ inicio, quadros, pedidos, precos, textos, divulgar, config })[abaAtual in { inicio: 1, quadros: 1, pedidos: 1, precos: 1, textos: 1, divulgar: 1, config: 1 } ? abaAtual : 'inicio'](p);
  }

  /* ---------- Início ---------- */
  function inicio(p) {
    const qs = C().quadros || [];
    const cfg = dados.config;
    const itens = [
      ['WhatsApp de atendimento', !!U.somenteNumeros(cfg.whatsapp), 'config'],
      ['Instagram', !!cfg.instagram, 'config'],
      ['GitHub conectado (para publicar pelo painel)', !!token(), 'config'],
      ['Pedidos guardados online (Firebase)', Store.modo === 'firebase', 'config']
    ];
    p.append(
      U.el('h1', { text: 'Olá! 👋 O que vamos fazer hoje?' }),
      U.el('button', { type: 'button', class: 'grande-acao', onclick: () => editarQuadro(null) }, [U.el('span', { class: 'ico', text: '➕' }), U.el('span', {}, [U.el('b', { text: 'Adicionar quadro novo' }), U.el('span', { class: 'muted', text: 'Foto → nome e preço → toque onde vai o LED. Pronto!' })])]),
      U.el('div', { class: 'numeros' }, [
        U.el('div', { class: 'numero' }, [U.el('b', { text: String(qs.filter((q) => q.ativo !== false).length) }), 'quadros no site']),
        U.el('div', { class: 'numero', id: 'n-pedidos' }, [U.el('b', { text: '…' }), 'pedidos novos']),
        U.el('div', { class: 'numero' }, [U.el('b', { text: String((C().categorias || []).length) }), 'categorias'])
      ]),
      card('✅ Deixe tudo pronto', [U.el('ul', { class: 'passo-a-passo' }, itens.map(([n, ok, aba]) => U.el('li', {}, [U.el('span', { class: ok ? 'status-ok' : 'status-falta', text: ok ? '✔ ' : '• ' }), n + ' ', ok ? null : U.el('button', { type: 'button', class: 'btn btn-peq btn-fantasma', text: 'configurar', onclick: () => trocarAba(aba) })])))]),
      card('🔗 Link do site para divulgar', [U.el('div', { class: 'url-caixa' }, [U.el('input', { class: 'input', readonly: true, value: U.siteBase() + 'links.html', 'aria-label': 'Link' }), U.el('button', { type: 'button', class: 'btn', text: 'Copiar', onclick: () => U.copiar(U.siteBase() + 'links.html', 'Link copiado! Cole na bio do Instagram.') }), U.el('button', { type: 'button', class: 'btn btn-fantasma', text: 'Mais opções', onclick: () => trocarAba('divulgar') })])], 'Cole este link na bio do Instagram, no Linktree, no WhatsApp Business…')
    );
    if (Store.modo === 'local' || Store.admin()) Store.pedidos().then((l) => { const n = l.filter((x) => x.status === 'novo').length; const b = $('#n-pedidos b'); if (b) b.textContent = String(n); }).catch(() => {});
    else { const b = $('#n-pedidos b'); if (b) b.textContent = '🔒'; }
  }

  /* ---------- Quadros ---------- */
  function quadros(p) {
    const qs = C().quadros || (C().quadros = []);
    p.append(
      U.el('h1', { text: '🖼️ Quadros' }),
      U.el('button', { type: 'button', class: 'grande-acao', onclick: () => editarQuadro(null) }, [U.el('span', { class: 'ico', text: '➕' }), U.el('span', {}, [U.el('b', { text: 'Adicionar quadro novo' }), U.el('span', { class: 'muted', text: 'Leva 1 minuto. Funciona pelo celular.' })])]),
      U.el('div', { class: 'lista-quadros' }, qs.map((q, i) => {
        const cat = (C().categorias || []).find((c) => c.id === q.categoria);
        return U.el('div', { class: 'item-quadro' + (q.ativo === false ? ' inativo' : '') }, [
          U.el('img', { src: U.fotoSegura(q.imagem) || 'assets/img/sua-foto.svg', alt: '' }),
          U.el('div', {}, [
            U.el('h3', { text: q.nome + (q.ativo === false ? ' (escondido)' : '') + (q.destaque ? ' ⭐' : '') }),
            U.el('p', { class: 'mini', text: (cat ? cat.nome + ' · ' : '') + 'a partir de ' + U.brl(U.precoMinimo(q)) + ' · ' + (q.leds || []).length + ' áreas de LED' })
          ]),
          U.el('div', { class: 'item-acoes' }, [
            U.el('button', { type: 'button', class: 'btn btn-peq btn-primario', text: '✏️ Editar', onclick: () => editarQuadro(q) }),
            U.el('button', { type: 'button', class: 'btn btn-peq', text: q.ativo === false ? '👁️ Mostrar' : '🙈 Esconder', onclick: () => { q.ativo = q.ativo === false; mudou('catalogo'); render(); } }),
            U.el('button', { type: 'button', class: 'btn btn-peq btn-icone', title: 'Subir na lista', 'aria-label': 'Subir', text: '↑', disabled: i === 0, onclick: () => { qs.splice(i - 1, 0, qs.splice(i, 1)[0]); mudou('catalogo'); render(); } }),
            U.el('button', { type: 'button', class: 'btn btn-peq', text: '⧉ Duplicar', onclick: () => { const c = clonar(q); c.id = idUnico(q.id); c.nome = q.nome + ' (cópia)'; c.destaque = false; qs.splice(i + 1, 0, c); mudou('catalogo'); render(); } }),
            U.el('button', { type: 'button', class: 'btn btn-peq btn-perigo', text: '🗑️', 'aria-label': 'Excluir ' + q.nome, onclick: () => { if (confirm('Excluir o quadro "' + q.nome + '"?')) { qs.splice(i, 1); mudou('catalogo'); render(); } } })
          ])
        ]);
      })),
      card('🏷️ Categorias', [tabela(C().categorias || (C().categorias = []), [{ k: 'emoji', r: 'Emoji', largura: '70px' }, { k: 'nome', r: 'Nome', aoMudar: (c) => { if (!c.id) c.id = U.slug(c.nome); } }], { novo: () => ({ id: 'cat-' + U.uid(4), nome: 'Nova categoria', emoji: '🚗' }), rotuloNovo: 'Nova categoria' })], 'Os filtros do catálogo (Carros, Motos…).')
    );
  }
  function idUnico(base) {
    const b = U.slug(base) || 'quadro';
    const usados = new Set((C().quadros || []).map((q) => q.id).concat(['foto']));
    let id = b, n = 2;
    while (usados.has(id)) id = b + '-' + n++;
    return id;
  }

  // Modelos prontos de área de LED (o dono só toca na foto depois).
  const PRESETS = [
    { nome: 'Faróis', emoji: '💡', tipo: 'linha', cor: 'branco-frio', preco: 0, padrao: true },
    { nome: 'Lanternas', emoji: '🔴', tipo: 'linha', cor: 'vermelho', preco: 0, padrao: true },
    { nome: 'Rodas (anel nos aros)', emoji: '⭕', tipo: 'anel', cor: 'azul-gelo', preco: 25, padrao: false },
    { nome: 'Neon embaixo', emoji: '🟣', tipo: 'linha', cor: 'roxo', preco: 30, padrao: true },
    { nome: 'Faixa / friso', emoji: '➖', tipo: 'linha', cor: 'azul-gelo', preco: 20, padrao: false },
    { nome: 'Pontos de luz', emoji: '✨', tipo: 'pontos', cor: 'amarelo', preco: 15, padrao: false }
  ];
  const TIPOS = { pontos: 'Pontos (cada toque = 1 luz)', linha: 'Faixa (os toques formam uma linha)', anel: 'Anel (toque no centro da roda)' };

  function editarQuadro(original) {
    const q = original ? clonar(original) : { id: '', nome: '', categoria: ((C().categorias || [])[0] || {}).id || '', ativo: true, destaque: false, selo: '', descricao: '', imagem: '', proporcao: 1.5, preco: 189, leds: [] };
    let sel = q.leds.length ? 0 : -1;
    let raio = 5;
    const corpo = U.el('div', { class: 'editor' });
    const palcoBox = U.el('div', { class: 'editor-palco' });
    const alvo = U.el('div');
    const dica = U.el('p', { class: 'dica' });
    palcoBox.append(alvo, dica);
    const lado = U.el('div');
    corpo.append(palcoBox, lado);
    const cfgPrevia = () => ({ q: q.id || '__ed', t: '', m: (O().molduras || [{}])[0].id, z: Object.fromEntries(q.leds.map((a) => [a.id, a.cor])), x: [], e: 'fixo', rgb: false, ct: '', fd: '', ex: [], obs: '' });
    const palco = Q.desenhar(alvo, {
      quadro: q, config: cfgPrevia(), escuro: true, editavel: true, carregarJa: true,
      aoTocar: (x, y) => tocar(x, y)
    });
    function previa() {
      palco.atualizar(cfgPrevia(), q);
      const a = q.leds[sel];
      palco.marcas(a ? a.pontos.map((p) => [p[0], p[1]]) : []);
      if (!q.imagem) dica.innerHTML = '① Comece enviando a <b>foto do quadro</b>';
      else if (!a) dica.innerHTML = '③ Escolha uma área de LED à direita (ex.: <b>Faróis</b>) e toque na foto';
      else dica.innerHTML = '👆 Toque na foto para marcar: <b>' + U.esc(a.nome) + '</b>' + (a.tipo === 'linha' ? ' (cada toque continua a linha)' : a.tipo === 'anel' ? ' (toque no centro da roda)' : '');
    }
    function tocar(x, y) {
      const a = q.leds[sel];
      if (!q.imagem) { U.toast('Envie a foto primeiro.'); return; }
      if (!a) { U.toast('Escolha ou crie uma área de LED (ex.: Faróis) e depois toque na foto.'); return; }
      if (a.pontos.length >= 40) { U.toast('Máximo de 40 pontos por área.'); return; }
      a.pontos.push(a.tipo === 'anel' ? [x, y, raio] : [x, y]);
      previa(); lista();
    }
    function lista() {
      lado.replaceChildren();
      // 1. Foto
      const arq = U.el('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: 'ed-foto' });
      arq.addEventListener('change', async () => {
        const f = arq.files && arq.files[0];
        if (!f) return;
        try {
          U.toast('Preparando a foto…');
          const r = await window.Fotos.comprimir(f, { lado: 1600, qualidade: 0.84 });
          q.imagem = r.src; q.proporcao = r.proporcao;
          previa(); lista();
          U.toast('Foto pronta (' + window.Fotos.tamanhoKB(r.src) + ' KB). Agora marque os LEDs! 💡', 'ok');
        } catch (e) { U.toast(e.message, 'erro'); }
      });
      lado.append(U.el('h3', {}, [U.el('span', { class: 'n', text: '1' }), 'Foto do quadro']),
        U.el('label', { class: 'btn ' + (q.imagem ? '' : 'btn-primario ') + 'btn-bloco', for: 'ed-foto', text: q.imagem ? '📷 Trocar foto' : '📷 Escolher foto do quadro' }), arq,
        U.el('p', { class: 'ajuda', text: 'Use a foto ou a arte do quadro, de preferência deitada (horizontal). Ela é reduzida automaticamente.' }));
      // 2. Dados
      const cats = C().categorias || [];
      const selCat = U.el('select', { class: 'input' }, cats.map((c) => { const o = U.el('option', { value: c.id, text: (c.emoji || '') + ' ' + c.nome }); if (c.id === q.categoria) o.selected = true; return o; }));
      selCat.addEventListener('change', () => { q.categoria = selCat.value; });
      lado.append(U.el('h3', {}, [U.el('span', { class: 'n', text: '2' }), 'Nome e preço']),
        campo('Nome do quadro *', entrada(q.nome, { maxlength: 60, placeholder: 'Ex.: Civic Rebaixado Azul' }, (v) => { q.nome = v; })),
        U.el('div', { class: 'grade-2' }, [
          campo('Preço (menor tamanho) R$', entrada(q.preco, { type: 'number', min: 0, step: 'any' }, (v) => { q.preco = v; })),
          campo('Categoria', selCat)
        ]),
        campo('Descrição curta', entrada(q.descricao, { type: 'area', maxlength: 200, placeholder: 'Ex.: Fica top com neon azul embaixo.' }, (v) => { q.descricao = v; })),
        U.el('div', { class: 'grade-2' }, [
          campo('Selo (opcional)', entrada(q.selo, { maxlength: 20, placeholder: 'Novo, Promoção…' }, (v) => { q.selo = v; })),
          U.el('div', {}, [
            U.el('label', { class: 'check' }, [entrada(q.ativo !== false, { type: 'checkbox' }, (v) => { q.ativo = v; }), U.el('span', { text: 'Mostrar no site' })]),
            U.el('label', { class: 'check' }, [entrada(!!q.destaque, { type: 'checkbox' }, (v) => { q.destaque = v; }), U.el('span', { text: '⭐ Destaque' })])
          ])
        ]));
      // 3. LEDs
      lado.append(U.el('h3', {}, [U.el('span', { class: 'n', text: '3' }), 'Onde vai LED']),
        U.el('p', { class: 'ajuda', text: 'Toque em um botão para criar a área e depois toque na foto onde ela fica. O cliente vai poder ligar/desligar cada área e escolher a cor.' }),
        U.el('div', { class: 'presets' }, PRESETS.map((pr) => U.el('button', {
          type: 'button', class: 'chip', text: pr.emoji + ' ' + pr.nome,
          onclick: () => {
            const ids = new Set(q.leds.map((a) => a.id));
            let id = U.slug(pr.nome) || 'area', n = 2;
            while (ids.has(id)) id = U.slug(pr.nome) + '-' + n++;
            q.leds.push({ id, nome: pr.nome, tipo: pr.tipo, pontos: [], preco: pr.preco, cor: pr.cor, padrao: pr.padrao });
            sel = q.leds.length - 1;
            previa(); lista();
          }
        }))));
      q.leds.forEach((a, i) => {
        const box = U.el('div', { class: 'area-ed' + (i === sel ? ' sel' : '') });
        box.addEventListener('click', (e) => { if (sel !== i && !e.target.closest('input,select,button')) { sel = i; previa(); lista(); } });
        const selTipo = U.el('select', { class: 'input', 'aria-label': 'Tipo' }, Object.keys(TIPOS).map((t) => { const o = U.el('option', { value: t, text: TIPOS[t] }); if (t === a.tipo) o.selected = true; return o; }));
        selTipo.addEventListener('change', () => { a.tipo = selTipo.value; a.pontos = a.pontos.map((p) => (a.tipo === 'anel' ? [p[0], p[1], p[2] || raio] : [p[0], p[1]])); previa(); lista(); });
        const selCor = U.el('select', { class: 'input', 'aria-label': 'Cor inicial' }, (O().cores || []).map((c) => { const o = U.el('option', { value: c.id, text: c.nome }); if (c.id === a.cor) o.selected = true; return o; }));
        selCor.addEventListener('change', () => { a.cor = selCor.value; previa(); });
        box.append(
          U.el('div', { class: 'linha' }, [
            U.el('button', { type: 'button', class: 'btn btn-peq ' + (i === sel ? 'btn-primario' : ''), text: i === sel ? '👆 Marcando aqui' : 'Marcar na foto', onclick: () => { sel = i; previa(); lista(); } }),
            U.el('span', { class: 'mini', text: a.pontos.length + (a.pontos.length === 1 ? ' ponto' : ' pontos') })
          ]),
          U.el('div', { class: 'grade-2', style: { marginTop: '8px' } }, [
            campo('Nome', entrada(a.nome, { maxlength: 40 }, (v) => { a.nome = v; })),
            campo('Preço extra R$ (0 = incluso)', entrada(a.preco, { type: 'number', min: 0, step: 'any' }, (v) => { a.preco = v; })),
            campo('Tipo', selTipo),
            campo('Cor inicial', selCor)
          ]),
          U.el('label', { class: 'check' }, [entrada(!!a.padrao, { type: 'checkbox' }, (v) => { a.padrao = v; }), U.el('span', { text: 'Já vem acesa quando o cliente abre' })]),
          a.tipo === 'anel' && i === sel ? U.el('div', { class: 'linha', style: { margin: '8px 0' } }, [U.el('span', { class: 'mini', text: 'Tamanho do anel:' })].concat([['P', 3], ['M', 5], ['G', 7]].map(([n, r]) => U.el('button', { type: 'button', class: 'chip' + (raio === r ? ' ativo' : ''), text: n, onclick: () => { raio = r; lista(); } })))) : null,
          U.el('div', { class: 'linha', style: { marginTop: '8px' } }, [
            U.el('button', { type: 'button', class: 'btn btn-peq', text: '↩️ Desfazer ponto', disabled: !a.pontos.length, onclick: () => { a.pontos.pop(); previa(); lista(); } }),
            U.el('button', { type: 'button', class: 'btn btn-peq', text: 'Limpar pontos', disabled: !a.pontos.length, onclick: () => { a.pontos = []; previa(); lista(); } }),
            U.el('button', { type: 'button', class: 'btn btn-peq btn-perigo', text: 'Remover área', onclick: () => { if (!confirm('Remover a área "' + a.nome + '"?')) return; q.leds.splice(i, 1); sel = Math.min(sel, q.leds.length - 1); previa(); lista(); } })
          ])
        );
        lado.append(box);
      });
    }
    previa(); lista();
    modal(original ? 'Editar quadro' : 'Novo quadro', corpo, (fechar) => [
      U.el('button', { type: 'button', class: 'btn btn-fantasma', text: 'Cancelar', onclick: fechar }),
      U.el('button', {
        type: 'button', class: 'btn btn-primario', text: '✔ Salvar quadro', onclick: () => {
          q.nome = String(q.nome || '').trim();
          if (!q.imagem) { U.toast('Envie a foto do quadro.', 'erro'); return; }
          if (!q.nome) { U.toast('Dê um nome para o quadro.', 'erro'); return; }
          const vazias = q.leds.filter((a) => !a.pontos.length || (a.tipo === 'linha' && a.pontos.length < 2));
          if (vazias.length) { U.toast('Marque na foto a área "' + vazias[0].nome + '"' + (vazias[0].tipo === 'linha' ? ' (faixa precisa de 2 toques ou mais)' : '') + ', ou remova.', 'erro'); return; }
          q.preco = Number(q.preco) || 0;
          q.leds.forEach((a) => { a.preco = Number(a.preco) || 0; });
          const qs = C().quadros || (C().quadros = []);
          if (original) { const i = qs.indexOf(original); q.id = original.id; qs[i] = q; }
          else { q.id = idUnico(q.nome); qs.unshift(q); }
          mudou('catalogo');
          fechar();
          trocarAba('quadros');
          U.toast('Quadro salvo! Toque em "Publicar" para ir ao ar. 🚀', 'ok');
        }
      })
    ], true);
  }

  /* ---------- Pedidos ---------- */
  const NOMES_STATUS = { novo: '🆕 Novo', confirmado: '👍 Confirmado', producao: '🛠️ Em produção', enviado: '📦 Enviado', entregue: '✅ Entregue', cancelado: '❌ Cancelado' };
  let filtroStatus = '';
  async function pedidos(p) {
    p.append(U.el('h1', { text: '🧾 Pedidos' }));
    if (Store.modo === 'local') p.append(U.el('p', { class: 'aviso', text: '🧪 Modo de teste: sem o Firebase, só aparecem aqui os pedidos feitos neste navegador. Os pedidos dos clientes chegam completos no seu WhatsApp (com o link da montagem). Para guardar todos online, configure o Firebase na aba Configurações.' }));
    else {
      try { await Store.iniciar(); } catch (e) { p.append(U.el('p', { class: 'aviso', text: 'Não consegui conectar ao Firebase. Confira a configuração.' })); return; }
      if (!Store.admin()) { p.append(login()); return; }
      p.append(U.el('p', { class: 'linha' }, [U.el('span', { class: 'muted', text: 'Entrou como ' + Store.admin().email }), U.el('button', { type: 'button', class: 'btn btn-peq btn-fantasma', text: 'Sair', onclick: async () => { await Store.sair(); render(); } })]));
    }
    const box = U.el('div', {}, [U.el('p', { class: 'centro' }, [U.el('span', { class: 'carregando' })])]);
    p.append(box);
    let lista;
    try { lista = await Store.pedidos(); } catch (e) { box.replaceChildren(U.el('p', { class: 'aviso', text: 'Não consegui carregar os pedidos (' + (e.code || e.message) + '). Confira se as regras do Firestore foram publicadas com o seu e-mail.' })); return; }
    const filtros = U.el('div', { class: 'chips', style: { marginBottom: '14px' } }, [['', 'Todos']].concat(Object.entries(NOMES_STATUS)).map(([id, nome]) => {
      const n = lista.filter((x) => !id || x.status === id).length;
      return U.el('button', { type: 'button', class: 'chip', 'aria-pressed': String(filtroStatus === id), text: nome + ' (' + n + ')', onclick: () => { filtroStatus = id; render(); } });
    }));
    const vis = lista.filter((x) => !filtroStatus || x.status === filtroStatus);
    box.replaceChildren(filtros, vis.length ? U.el('div', {}, vis.map(cartaoPedido)) : U.el('p', { class: 'muted', text: 'Nenhum pedido aqui ainda.' }));
  }
  function login() {
    const email = entrada(dados.config.adminEmail || '', { type: 'email', autocomplete: 'username' }, () => {});
    const senha = entrada('', { type: 'password', autocomplete: 'current-password' }, () => {});
    return card('🔒 Entrar como administrador', [
      campo('E-mail', email), campo('Senha', senha),
      U.el('div', { class: 'linha' }, [
        U.el('button', { type: 'button', class: 'btn btn-primario', text: 'Entrar', onclick: async () => { try { await Store.entrarAdmin(email.value.trim(), senha.value); render(); } catch (e) { U.toast(e.message, 'erro'); } } }),
        U.el('button', { type: 'button', class: 'btn', text: 'Entrar com Google', onclick: async () => { try { await Store.entrarGoogle(); render(); } catch (e) { U.toast('Não deu para entrar com o Google.', 'erro'); } } })
      ]),
      U.el('p', { class: 'ajuda', text: 'Só o e-mail de administrador configurado (e confirmado) consegue ver os pedidos.' })
    ]);
  }
  function cartaoPedido(ped) {
    const quando = ped.criadoEm ? new Date(ped.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    let recalc = null;
    if (ped.config) { try { recalc = Q.preco(Q.normalizar(ped.config)).total; } catch (e) { recalc = null; } }
    const sel = U.el('select', { class: 'input', 'aria-label': 'Situação', style: { width: 'auto' } }, Store.STATUS.map((s) => { const o = U.el('option', { value: s, text: NOMES_STATUS[s] }); if (s === ped.status) o.selected = true; return o; }));
    sel.addEventListener('change', async () => { try { await Store.atualizar(ped.id, { status: sel.value }); ped.status = sel.value; U.toast('Situação atualizada.', 'ok'); } catch (e) { U.toast('Não consegui salvar.', 'erro'); } });
    const nota = entrada(ped.nota || '', { type: 'area', maxlength: 1000, placeholder: 'Anotações internas (frete, pagamento…)' }, U.debounce(async (v) => { try { await Store.atualizar(ped.id, { nota: v }); } catch (e) { U.toast('Não consegui salvar a anotação.', 'erro'); } }, 800));
    const c = ped.cliente || {};
    return U.el('article', { class: 'pedido' }, [
      U.el('div', { class: 'pedido-topo' }, [
        U.el('span', { class: 'codigo', text: '#' + String(ped.id).toUpperCase() }),
        U.el('span', { class: 'etiqueta st-' + ped.status, text: NOMES_STATUS[ped.status] || ped.status }),
        U.el('span', { class: 'muted pequeno', text: quando }),
        U.el('b', { text: U.brl(ped.valor) }),
        recalc != null && Math.abs(recalc - ped.valor) > 0.01 ? U.el('span', { class: 'status-falta pequeno', text: '⚠ pelos preços de hoje: ' + U.brl(recalc) }) : null
      ]),
      U.el('p', { style: { margin: '8px 0 0' } }, [U.el('b', { text: c.nome || '' }), c.cidade ? ' · ' + c.cidade : '', c.whatsapp ? ' · ' + c.whatsapp : '']),
      U.el('pre', { text: ped.resumo || '' }),
      U.el('div', { class: 'linha' }, [
        sel,
        U.el('button', { type: 'button', class: 'btn btn-peq', text: '👀 Ver quadro', onclick: () => verPedido(ped) }),
        c.whatsapp ? U.el('a', { class: 'btn btn-peq btn-wa', href: U.wa('Olá, ' + (c.nome || '') + '! Aqui é da ' + (dados.config.marca || '') + ' sobre o seu pedido #' + String(ped.id).toUpperCase() + ' 😊', '55' + U.somenteNumeros(c.whatsapp).replace(/^55(?=\d{10,11}$)/, '')), target: '_blank', rel: 'noopener', text: '💬 WhatsApp' }) : null,
        U.el('button', { type: 'button', class: 'btn btn-peq btn-perigo', text: '🗑️ Excluir', onclick: async () => { if (!confirm('Excluir o pedido #' + String(ped.id).toUpperCase() + '?')) return; try { await Store.excluir(ped.id); render(); } catch (e) { U.toast('Não consegui excluir.', 'erro'); } } })
      ]),
      U.el('div', { style: { marginTop: '10px' } }, [nota])
    ]);
  }
  async function verPedido(ped) {
    if (!ped.config) { U.toast('Este pedido não tem a montagem salva.'); return; }
    const caixa = U.el('div', { style: { maxWidth: '720px', margin: '0 auto' } });
    const fechar = modal('Pedido #' + String(ped.id).toUpperCase(), caixa);
    let foto = null;
    if (ped.temFoto) {
      try {
        const src = await Store.foto(ped.id);
        if (src) {
          foto = await new Promise((ok) => { const i = new Image(); i.onload = () => ok({ src, proporcao: i.naturalWidth / i.naturalHeight }); i.onerror = () => ok({ src, proporcao: 1.5 }); i.src = src; });
          caixa.append(U.el('p', {}, [U.el('a', { class: 'btn btn-peq', href: '#', text: '⬇️ Baixar a foto do cliente', onclick: (e) => { e.preventDefault(); U.baixar('pedido-' + ped.id + '.jpg', src); } })]));
        }
      } catch (e) { /* sem foto */ }
    }
    const q = Q.obter(ped.config.q, foto);
    if (!q) { caixa.append(U.el('p', { text: 'O quadro deste pedido não existe mais no catálogo. Veja o resumo no cartão do pedido.' })); return; }
    const alvo = U.el('div');
    caixa.prepend(alvo);
    const cfg = Object.assign({ z: {}, x: [], ex: [], e: 'fixo' }, ped.config);
    Q.desenhar(alvo, { quadro: q, config: cfg, escuro: true, carregarJa: true });
    caixa.append(U.el('pre', { class: 'muted', text: ped.resumo || '' }));
    return fechar;
  }

  /* ---------- Preços e opções ---------- */
  function precos(p) {
    const o = O();
    ['tamanhos', 'molduras', 'cores', 'efeitos', 'extras'].forEach((k) => { if (!o[k]) o[k] = []; });
    ['rgb', 'contorno', 'fundo', 'pontoExtra', 'personalizado'].forEach((k) => { if (!o[k]) o[k] = { ativo: false }; });
    const simples = (obj, campos) => U.el('div', { class: 'grade-2' }, campos.map((c) => {
      const tipo = { numero: 'number', sim: 'checkbox', area: 'area' }[c.t] || 'text';
      const inp = entrada(obj[c.k], { type: tipo }, (v) => { obj[c.k] = v; mudou('catalogo'); });
      return tipo === 'checkbox' ? U.el('label', { class: 'check' }, [inp, U.el('span', { text: c.r })]) : campo(c.r, inp);
    }));
    p.append(
      U.el('h1', { text: '💲 Preços e opções' }),
      U.el('p', { class: 'muted', text: 'O preço final = preço do quadro + tamanho + moldura + áreas de LED com preço + opcionais. O preço de cada quadro e de cada área fica na aba Quadros.' }),
      card('📐 Tamanhos', [tabela(o.tamanhos, [{ k: 'nome', r: 'Tamanho' }, { k: 'acrescimo', r: 'Acréscimo R$', t: 'numero', largura: '130px' }], { min: 1, novo: () => ({ id: 't-' + U.uid(4), nome: '50 × 75 cm', acrescimo: 120 }), rotuloNovo: 'Novo tamanho' })], 'O primeiro é o tamanho base (acréscimo 0).'),
      card('🖼️ Molduras', [tabela(o.molduras, [{ k: 'nome', r: 'Moldura' }, { k: 'cor', r: 'Cor', t: 'cor', largura: '70px' }, { k: 'preco', r: 'Preço R$', t: 'numero', largura: '120px' }], { min: 1, novo: () => ({ id: 'm-' + U.uid(4), nome: 'Nova moldura', cor: '#333333', preco: 0 }), rotuloNovo: 'Nova moldura' })]),
      card('🌈 Cores de LED', [tabela(o.cores, [{ k: 'nome', r: 'Nome' }, { k: 'hex', r: 'Cor', t: 'cor', largura: '70px' }], { min: 1, novo: () => ({ id: 'c-' + U.uid(4), nome: 'Nova cor', hex: '#ffffff' }), rotuloNovo: 'Nova cor' })]),
      card('🎛️ RGB com controle', [simples(o.rgb, [{ k: 'ativo', r: 'Oferecer RGB', t: 'sim' }, { k: 'nome', r: 'Nome' }, { k: 'preco', r: 'Preço R$', t: 'numero' }])]),
      card('✨ Efeitos', [tabela(o.efeitos, [{ k: 'nome', r: 'Nome' }, { k: 'descricao', r: 'Explicação' }])], 'Os efeitos animados são fixos (Fixo, Respirando, Pisca, Sequencial, Arco-íris); aqui você muda o nome e a explicação ou remove algum.'),
      card('🔲 Contorno com LED', [simples(o.contorno, [{ k: 'ativo', r: 'Oferecer', t: 'sim' }, { k: 'nome', r: 'Nome' }, { k: 'preco', r: 'Preço R$', t: 'numero' }])]),
      card('🌌 Luz atrás do quadro', [simples(o.fundo, [{ k: 'ativo', r: 'Oferecer', t: 'sim' }, { k: 'nome', r: 'Nome' }, { k: 'preco', r: 'Preço R$', t: 'numero' }])]),
      card('➕ LED onde o cliente quiser', [simples(o.pontoExtra, [{ k: 'ativo', r: 'Permitir', t: 'sim' }, { k: 'preco', r: 'Preço por LED R$', t: 'numero' }, { k: 'max', r: 'Máximo por quadro', t: 'numero' }])]),
      card('📷 Quadro com a foto do cliente', [simples(o.personalizado, [{ k: 'ativo', r: 'Oferecer', t: 'sim' }, { k: 'nome', r: 'Nome' }, { k: 'preco', r: 'Preço base R$', t: 'numero' }, { k: 'descricao', r: 'Descrição', t: 'area' }])]),
      card('🎁 Extras', [tabela(o.extras, [{ k: 'nome', r: 'Nome' }, { k: 'preco', r: 'Preço R$', t: 'numero', largura: '120px' }], { novo: () => ({ id: 'x-' + U.uid(4), nome: 'Novo extra', preco: 10 }), rotuloNovo: 'Novo extra' })]),
      card('🚚 Prazo, frete e pagamento', [simples(o, [{ k: 'prazo', r: 'Prazo de produção' }, { k: 'frete', r: 'Frete', t: 'area' }, { k: 'pagamento', r: 'Pagamento', t: 'area' }])])
    );
  }

  /* ---------- Textos ---------- */
  function textos(p) {
    const t = C().textos || (C().textos = {});
    const linha = (k, r, area) => campo(r, entrada(t[k], { type: area ? 'area' : 'text', maxlength: 300 }, (v) => { t[k] = v; mudou('catalogo'); }));
    p.append(
      U.el('h1', { text: '✍️ Textos do site' }),
      card('🏁 Topo da página inicial', [linha('heroTitulo', 'Título'), linha('heroDestaque', 'Frase em destaque (neon)'), linha('heroTexto', 'Texto', true)]),
      card('🔗 Bio da página de links', [linha('bio', 'Frase de apresentação', true)]),
      card('❓ Perguntas frequentes', [tabela(C().faq || (C().faq = []), [{ k: 'p', r: 'Pergunta' }, { k: 'r', r: 'Resposta', t: 'area', largura: '2fr' }], { novo: () => ({ p: 'Nova pergunta?', r: 'Resposta.' }), rotuloNovo: 'Nova pergunta' })]),
      card('💬 Depoimentos', [tabela(C().depoimentos || (C().depoimentos = []), [{ k: 'nome', r: 'Nome', largura: '160px' }, { k: 'cidade', r: 'Cidade', largura: '140px' }, { k: 'texto', r: 'O que disse', t: 'area', largura: '2fr' }], { novo: () => ({ nome: '', cidade: '', texto: '' }), rotuloNovo: 'Novo depoimento' })], 'Coloque só depoimentos reais de clientes. Sem depoimentos, a seção não aparece no site.')
    );
  }

  /* ---------- Link para Instagram ---------- */
  function divulgar(p) {
    const base = U.siteBase();
    const url = (s) => U.el('div', { class: 'url-caixa' }, [U.el('input', { class: 'input', readonly: true, value: s, 'aria-label': 'Endereço' }), U.el('button', { type: 'button', class: 'btn btn-primario', text: 'Copiar', onclick: () => U.copiar(s) }), U.el('a', { class: 'btn', href: s, target: '_blank', rel: 'noopener', text: 'Abrir' })]);
    const qr = U.el('div', { class: 'qr', html: U.qrSvg(base) });
    p.append(
      U.el('h1', { text: '🔗 Link para Instagram, Linktree e WhatsApp' }),
      card('⭐ Link da bio (recomendado)', [url(base + 'links.html'), U.el('p', { class: 'ajuda', text: 'Página no estilo Linktree com seus botões: Monte o seu, Modelos, WhatsApp, Instagram… Cole em Instagram → Editar perfil → Links.' })]),
      card('🏠 Site completo', [url(base)]),
      card('🛠️ Direto no "Monte o seu"', [url(base + 'montar.html'), U.el('p', { class: 'ajuda', text: 'Ótimo para stories com figurinha de link e anúncios.' })]),
      card('📷 Direto no "Seu veículo no quadro"', [url(base + 'montar.html?q=foto')]),
      card('🔳 QR Code do site', [qr, U.el('p', { class: 'ajuda', text: 'Para imprimir na embalagem, cartão de visita ou atrás do quadro.' }), U.el('button', { type: 'button', class: 'btn btn-peq', text: '⬇️ Baixar QR Code (SVG)', onclick: () => U.baixar('qrcode-site.svg', U.qrSvg(base), 'image/svg+xml') })]),
      card('💡 Dicas para divulgar', [U.el('ul', { class: 'passo-a-passo' }, [
        'Grave um Reels apagando a luz do quarto com o quadro ligado — é o que mais chama atenção.',
        'Nos stories, use a figurinha de link com o "Monte o seu" e peça para a pessoa mandar print da montagem.',
        'Cada pedido que chega no WhatsApp tem o link da montagem: abra para ver exatamente o que o cliente escolheu.',
        'Se tiver domínio próprio (ex.: www.suamarca.com.br), preencha "Endereço do site" em Configurações.'
      ].map((t) => U.el('li', { text: t })))])
    );
    if (!dados.config.siteUrl) p.insertBefore(U.el('p', { class: 'aviso', text: 'Os links acima usam o endereço em que você abriu o painel. Se ele não for o endereço público do site, preencha "Endereço do site" na aba Configurações.' }), p.children[1]);
  }

  /* ---------- Configurações ---------- */
  function config(p) {
    const cfg = dados.config;
    const c = (k, r, attrs, ajuda) => campo(r, entrada(cfg[k], Object.assign({ maxlength: 200 }, attrs || {}), (v) => { cfg[k] = v; mudou('config'); }), ajuda);
    const tk = token();
    const tokenBox = tk
      ? [U.el('p', {}, ['✅ GitHub conectado neste aparelho. Repositório: ', U.el('b', { text: repo() })]), U.el('div', { class: 'linha' }, [
        U.el('button', { type: 'button', class: 'btn btn-peq', text: 'Testar conexão', onclick: async () => { try { await gh(ARQ.config.caminho, { method: 'GET', cache: 'no-store' }); U.toast('Conexão ok! ✅', 'ok'); } catch (e) { U.toast(e.message, 'erro'); } } }),
        U.el('button', { type: 'button', class: 'btn btn-peq btn-perigo', text: 'Desconectar (apagar token)', onclick: () => { apagarToken(); render(); } })])]
      : (() => {
        const inp = U.el('input', { class: 'input', type: 'password', placeholder: 'github_pat_...', autocomplete: 'off', 'aria-label': 'Token do GitHub' });
        const lembrar = U.el('input', { type: 'checkbox' });
        return [U.el('ol', { class: 'passo-a-passo' }, [
          U.el('li', {}, ['Abra ', U.el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: 'github.com/settings/personal-access-tokens/new' }), '.']),
          U.el('li', { text: 'Nome: "Painel quadros". Validade: 90 dias.' }),
          U.el('li', {}, [U.el('b', { text: 'Repository access → Only select repositories' }), ' → ', U.el('b', { text: repo() }), '.']),
          U.el('li', {}, [U.el('b', { text: 'Permissions → Contents: Read and write' }), ' (só essa).']),
          U.el('li', { text: 'Generate token → copie e cole aqui:' })
        ]), U.el('div', { class: 'linha' }, [inp, U.el('button', { type: 'button', class: 'btn btn-primario', text: 'Conectar', onclick: async () => { const t = inp.value.trim(); if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(t)) { U.toast('Isso não parece um token do GitHub.', 'erro'); return; } guardarToken(t, lembrar.checked); await carregarDoGithub(); render(); } })]),
        U.el('label', { class: 'check', style: { marginTop: '8px' } }, [lembrar, U.el('span', {}, [U.el('b', { text: 'Lembrar neste aparelho' }), U.el('span', { class: 'ajuda', text: 'Deixe desmarcado em aparelho que outras pessoas usam: o token some ao fechar o navegador.' })])])];
      })();
    const fbTxt = U.el('textarea', { class: 'input', rows: 6, placeholder: '{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }', 'aria-label': 'Configuração do Firebase' });
    fbTxt.value = cfg.firebase ? JSON.stringify(cfg.firebase, null, 2) : '';
    fbTxt.addEventListener('change', () => {
      const v = fbTxt.value.trim();
      if (!v) { cfg.firebase = null; mudou('config'); return; }
      try {
        const m = v.match(/\{[\s\S]*\}/);
        const txt = m ? m[0].replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,\s*}/g, '}') : '';
        const o = JSON.parse(txt);
        if (!o.apiKey || !o.projectId) throw new Error('faltando');
        const limpo = {};
        ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].forEach((k) => { if (o[k]) limpo[k] = String(o[k]); });
        cfg.firebase = limpo; mudou('config'); U.toast('Firebase configurado. Publique para valer no site.', 'ok');
      } catch (e) { U.toast('Não entendi o firebaseConfig. Cole o bloco { ... } do Firebase.', 'erro'); }
    });
    const regras = U.el('pre', { class: 'regras', text: 'Carregando…' });
    fetch('firestore.rules', { cache: 'no-store' }).then((r) => r.text()).then((t) => { regras.textContent = t.replace(/ADMIN_EMAIL/g, String(cfg.adminEmail || 'SEU-EMAIL@exemplo.com').replace(/["\\]/g, '')); }).catch(() => { regras.textContent = 'Abra o arquivo firestore.rules do repositório.'; });

    p.append(
      U.el('h1', { text: '⚙️ Configurações' }),
      card('🏪 Sua marca e contato', [U.el('div', { class: 'grade-2' }, [
        c('marca', 'Nome da marca'), c('slogan', 'Slogan'),
        c('whatsapp', 'WhatsApp (com 55 + DDD)', { inputmode: 'tel', placeholder: '5511912345678' }, 'Só números. É para onde vão os pedidos.'),
        c('instagram', 'Instagram', { placeholder: '@suamarca' }), c('tiktok', 'TikTok', { placeholder: '@suamarca' }), c('facebook', 'Facebook', { placeholder: 'suamarca' }),
        c('email', 'E-mail de contato', { type: 'email' }), c('atendimento', 'Horário de atendimento'),
        c('siteUrl', 'Endereço do site (opcional)', { placeholder: 'https://williancoder.github.io/Quadros2026/' }, 'Use se tiver domínio próprio. Vazio = endereço atual.'),
        c('repo', 'Repositório no GitHub', { placeholder: 'usuario/repositorio' })
      ])]),
      card('🔑 GitHub (para publicar pelo painel)', tokenBox),
      card('🔥 Firebase (pedidos online, opcional)', [
        U.el('ol', { class: 'passo-a-passo' }, [
          'Crie um projeto grátis em console.firebase.google.com (plano Spark).',
          'Authentication → ative "Anônimo", "E-mail/senha" (e Google, se quiser). Em Configurações → Domínios autorizados, adicione williancoder.github.io (e seu domínio).',
          'Firestore Database → criar banco em modo produção (região southamerica-east1).',
          'Preencha o e-mail do administrador abaixo, copie as regras e cole em Firestore → Regras → Publicar.',
          'Registre um app Web, cole o firebaseConfig abaixo e toque em Publicar.'
        ].map((t) => U.el('li', { text: t }))),
        c('adminEmail', 'E-mail do administrador', { type: 'email' }, 'Só este e-mail (confirmado) vê os pedidos.'),
        campo('firebaseConfig', fbTxt),
        U.el('h3', { text: 'Regras de segurança do Firestore' }), regras,
        U.el('button', { type: 'button', class: 'btn btn-peq', text: 'Copiar regras', onclick: () => U.copiar(regras.textContent, 'Regras copiadas!') })
      ]),
      card('📦 Cópia de segurança', [U.el('div', { class: 'linha' }, [
        U.el('button', { type: 'button', class: 'btn', text: '⬇️ Baixar arquivos (catalogo.js e config.js)', onclick: baixarArquivos })
      ]), U.el('p', { class: 'ajuda', text: 'Sem GitHub conectado? Baixe e envie os arquivos em assets/js/ pelo site do GitHub (Add file → Upload files). Fotos novas vão junto dentro do catálogo.' })])
    );
  }

  /* ================= Início ================= */
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== abaAtual && ABAS.some((a) => a.id === id)) { abaAtual = id; render(); } });
  $('#publicar').addEventListener('click', publicar);
  $('#publicar2').addEventListener('click', publicar);
  $('#descartar').addEventListener('click', descartar);
  window.addEventListener('beforeunload', (e) => { if (pendentes().length) { e.preventDefault(); e.returnValue = ''; } });
  barraRascunho();
  render();
  carregarDoGithub();
})();
