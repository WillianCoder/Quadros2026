/*
 * "Monte o seu" (montar.html): o cliente escolhe o modelo, toca onde quer LED, escolhe cores,
 * efeito, tamanho, moldura e extras, vê a prévia e manda o pedido pelo WhatsApp.
 *
 * Endereços aceitos: montar.html?q=<idDoQuadro> · montar.html?q=foto (foto do cliente)
 *                    montar.html?c=<montagem codificada> (link de compartilhar)
 * A montagem atual fica guardada neste aparelho (qd:montagem) para não perder ao sair.
 */
(function () {
  'use strict';
  const U = window.U, Q = window.Quadro;
  const $ = U.$;
  const O = U.opcoes();
  const GUARDA = 'qd:montagem';
  const MAX_EXTRA = Number((O.pontoExtra || {}).max) || 0;
  const precoExtra = Number((O.pontoExtra || {}).preco) || 0;

  U.preencherComuns();

  /* ---------- Estado ---------- */
  let foto = null;   // { src, proporcao } da foto do cliente (só no modo 'foto')
  try { foto = JSON.parse(sessionStorage.getItem('qd:foto') || 'null'); if (foto && !U.fotoSegura(foto.src)) foto = null; } catch (e) { foto = null; }
  let cfg;
  const doLink = Q.decodificar(U.param('c'));
  if (doLink) cfg = Q.normalizar(doLink);
  else if (U.param('q')) cfg = Q.normalizar(Q.padrao(Q.obter(U.param('q')) || U.quadros()[0]));
  else cfg = Q.normalizar(U.ls.get(GUARDA, null) || {});
  let ferramenta = cfg.q === Q.FOTO ? 'p' : '';   // '' | 'p' ponto | 'l' faixa | 'a' anel
  let corLivre = 'azul-gelo';
  let raioAnel = 4.5;
  let inicioFaixa = null;
  let escuro = true, ligado = true;

  const quadroAtual = () => Q.obter(cfg.q, foto);
  const palco = Q.desenhar($('#palco-quadro'), {
    quadro: quadroAtual(), config: cfg, escuro, editavel: true, carregarJa: true,
    aoTocarArea: (id) => alternarArea(id),
    aoTocar: (x, y) => tocarLivre(x, y)
  });

  function salvar() { U.ls.set(GUARDA, cfg); }
  function atualizar(tudo) {
    cfg = Q.normalizar(cfg);
    palco.atualizar(cfg, quadroAtual());
    salvar();
    if (tudo) desenharTudo(); else { desenharAreas(); desenharLivre(); desenharEfeito(); desenharAcabamentos(); }
    conta();
    dica();
  }

  /* ---------- 1. Modelo ---------- */
  function desenharModelos() {
    const lista = U.quadros().map((q) => ({ id: q.id, nome: q.nome, img: q.imagem, preco: U.precoMinimo(q) }));
    const p = O.personalizado || {};
    if (p.ativo) lista.push({ id: Q.FOTO, nome: '📷 ' + (p.nome || 'Minha foto'), img: (foto && foto.src) || 'assets/img/sua-foto.svg', preco: U.precoMinimo(p) });
    $('#modelos').replaceChildren(...lista.map((m) => U.el('button', {
      type: 'button', class: 'modelo' + (m.id === Q.FOTO ? ' modelo-foto' : ''), role: 'option', 'aria-selected': String(cfg.q === m.id),
      onclick: () => trocarModelo(m.id)
    }, [U.el('img', { src: U.fotoSegura(m.img) || 'assets/img/sua-foto.svg', alt: '', loading: 'lazy' }), m.nome, U.el('span', { class: 'preco-mini', text: 'a partir de ' + U.brl(m.preco) })])));
    const sel = $('#modelos [aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('#foto-box').hidden = cfg.q !== Q.FOTO;
    $('#foto-rotulo').textContent = foto ? 'Trocar a foto' : 'Enviar a foto do meu veículo';
  }
  function trocarModelo(id) {
    if (id === cfg.q) return;
    const manter = { t: cfg.t, m: cfg.m, e: cfg.e, rgb: cfg.rgb, ct: cfg.ct, fd: cfg.fd, ex: cfg.ex, obs: cfg.obs };
    cfg = Object.assign(Q.padrao(Q.obter(id, foto)), manter);
    ferramenta = id === Q.FOTO ? 'p' : '';
    inicioFaixa = null; palco.marcas([]);
    atualizar(true);
    if (id === Q.FOTO && !foto) $('#foto-arquivo').click();
  }
  $('#foto-arquivo').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    U.toast('Preparando a foto…');
    try {
      foto = await window.Fotos.comprimir(f, { lado: 1400, qualidade: 0.8 });
      try { sessionStorage.setItem('qd:foto', JSON.stringify(foto)); } catch (e) { /* foto grande: fica só na memória */ }
      cfg.x = []; ferramenta = 'p';
      atualizar(true);
      U.toast('Foto pronta! Agora toque nela onde quer o LED 💡', 'ok');
    } catch (e) { U.toast(e.message, 'erro'); }
  });

  /* ---------- 2. Onde acender ---------- */
  function paleta(atual, aoEscolher, rotulo) {
    return U.el('div', { class: 'paleta', role: 'group', 'aria-label': rotulo || 'Cores' }, (O.cores || []).map((c) => U.el('button', {
      type: 'button', class: 'cor', title: c.nome, 'aria-label': c.nome, 'aria-pressed': String(atual === c.id), style: { '--c': U.corValida(c.hex) },
      onclick: () => aoEscolher(c.id)
    })));
  }
  function alternarArea(id) {
    const a = (quadroAtual().leds || []).find((x) => x.id === id);
    if (!a) return;
    if (cfg.z[id]) delete cfg.z[id]; else cfg.z[id] = a.cor || corLivre;
    atualizar();
  }
  function desenharAreas() {
    const q = quadroAtual();
    const leds = q.leds || [];
    $('#ajuda-areas').hidden = !leds.length;
    $('#areas').replaceChildren(...leds.map((a) => {
      const on = !!cfg.z[a.id];
      const hex = U.corHex(on ? cfg.z[a.id] : a.cor);
      const box = U.el('div', { class: 'area' + (on ? ' ligada' : ''), style: { '--c': hex } });
      box.append(U.el('button', { type: 'button', class: 'area-botao', 'aria-pressed': String(on), onclick: () => alternarArea(a.id) }, [
        U.el('span', { class: 'lampada', 'aria-hidden': 'true', text: on ? '' : '💡' }),
        U.el('span', {}, [a.nome]),
        U.el('span', { class: 'area-preco', text: Number(a.preco) ? '+ ' + U.brl(a.preco) : 'incluso' })
      ]));
      if (on && !cfg.rgb) box.append(U.el('div', { class: 'area-cores' }, [paleta(cfg.z[a.id], (c) => { cfg.z[a.id] = c; atualizar(); }, 'Cor de ' + a.nome)]));
      return box;
    }));
    $('#etapa-leds').classList.toggle('rgb-ativo', !!cfg.rgb);
  }

  const NOMES_FERR = { p: '💡 Ponto de luz', l: '➖ Faixa (2 toques)', a: '⭕ Anel' };
  function desenharLivre() {
    const ativo = (O.pontoExtra || {}).ativo !== false && MAX_EXTRA > 0;
    $('#livre').hidden = !ativo;
    if (!ativo) return;
    $('#livre-ajuda').textContent = 'Escolha o tipo e toque no quadro onde quer a luz.' + (precoExtra ? ' Cada LED extra: ' + U.brl(precoExtra) + '.' : '') + ' Até ' + MAX_EXTRA + '.';
    $('#ferramentas').replaceChildren(...Object.keys(NOMES_FERR).map((k) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(ferramenta === k),
      onclick: () => { ferramenta = ferramenta === k ? '' : k; inicioFaixa = null; palco.marcas([]); desenharLivre(); dica(); }
    }, [NOMES_FERR[k]])));
    $('#anel-tamanho').hidden = ferramenta !== 'a';
    $('#aneis').replaceChildren(...[['P', 2.5], ['M', 4.5], ['G', 7]].map(([n, r]) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(raioAnel === r), onclick: () => { raioAnel = r; desenharLivre(); }
    }, [n])));
    $('#paleta-livre').replaceWith(Object.assign(paleta(corLivre, (c) => { corLivre = c; desenharLivre(); }, 'Cor do LED extra'), { id: 'paleta-livre' }));
    const nomes = { p: 'Ponto', l: 'Faixa', a: 'Anel' };
    $('#extras-lista').replaceChildren(...cfg.x.map((x, i) => U.el('li', {}, [
      U.el('span', { class: 'bolinha', style: { '--c': U.corHex(x.c) } }), nomes[x.k] + ' ' + (i + 1),
      U.el('button', { type: 'button', class: 'btn btn-peq btn-fantasma', 'aria-label': 'Remover ' + nomes[x.k] + ' ' + (i + 1), text: '✕ remover', onclick: () => { cfg.x.splice(i, 1); atualizar(); } })
    ])));
  }
  function tocarLivre(x, y) {
    if (!ferramenta) {
      U.toast(MAX_EXTRA ? 'Para pôr LED aqui, escolha "💡 Ponto de luz" em LED onde eu quiser.' : 'Toque nas linhas pontilhadas para acender.');
      if (MAX_EXTRA) $('#livre').scrollIntoView({ behavior: U.reduzMovimento() ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    if (cfg.x.length >= MAX_EXTRA) { U.toast('Chegou ao máximo de ' + MAX_EXTRA + ' LEDs extras.'); return; }
    if (ferramenta === 'l') {
      if (!inicioFaixa) { inicioFaixa = [x, y]; palco.marcas([inicioFaixa]); dica(); return; }
      cfg.x.push({ k: 'l', p: [inicioFaixa, [x, y]], c: corLivre });
      inicioFaixa = null; palco.marcas([]);
    } else if (ferramenta === 'a') cfg.x.push({ k: 'a', p: [[x, y]], r: raioAnel, c: corLivre });
    else cfg.x.push({ k: 'p', p: [[x, y]], c: corLivre });
    atualizar();
  }

  /* ---------- 3. Cor e efeito ---------- */
  $('#paleta-tudo').replaceWith(Object.assign(paleta('', (c) => {
    Object.keys(cfg.z).forEach((k) => { cfg.z[k] = c; });
    cfg.x.forEach((x) => { x.c = c; });
    corLivre = c;
    if (cfg.ct) cfg.ct = c;
    atualizar();
  }, 'Pintar todos os LEDs'), { id: 'paleta-tudo' }));
  const rgb = O.rgb || {};
  $('#rgb-box').hidden = rgb.ativo === false;
  $('#rgb-nome').textContent = rgb.nome || 'RGB';
  $('#rgb-preco').textContent = '+ ' + U.brl(rgb.preco);
  $('#rgb').addEventListener('change', (e) => { cfg.rgb = e.target.checked; if (!cfg.rgb && cfg.e === 'arcoiris') cfg.e = 'fixo'; if (cfg.rgb && cfg.e === 'fixo') cfg.e = 'arcoiris'; atualizar(); });
  function desenharEfeito() {
    $('#rgb').checked = !!cfg.rgb;
    $('#efeitos').replaceChildren(...(O.efeitos || []).map((e) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(cfg.e === e.id), title: e.descricao || '',
      onclick: () => {
        if (e.soRgb && !cfg.rgb) { cfg.rgb = true; U.toast('Arco-íris precisa do RGB — adicionei para você.'); }
        cfg.e = e.id; atualizar();
      }
    }, [e.nome + (e.soRgb ? ' 🌈' : '')])));
  }

  /* ---------- 4. Tamanho e moldura ---------- */
  function desenharTamanho() {
    $('#tamanhos').replaceChildren(...(O.tamanhos || []).map((t) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(cfg.t === t.id), onclick: () => { cfg.t = t.id; atualizar(true); }
    }, [t.nome + (Number(t.acrescimo) ? ' (+' + U.brl(t.acrescimo) + ')' : '')])));
    $('#molduras').replaceChildren(...(O.molduras || []).map((m) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(cfg.m === m.id), style: { '--c': U.corValida(m.cor) }, onclick: () => { cfg.m = m.id; atualizar(true); }
    }, [U.el('span', { class: 'bolinha', style: { boxShadow: 'none' } }), m.nome + (Number(m.preco) ? ' (+' + U.brl(m.preco) + ')' : '')])));
  }

  /* ---------- 5. Acabamentos ---------- */
  function desenharAcabamentos() {
    const box = $('#acabamentos');
    const itens = [];
    const comCor = (chave, op, padraoCor) => {
      if (!op || op.ativo === false) return;
      const on = !!cfg[chave];
      const lbl = U.el('div', { class: 'check' });
      const inp = U.el('input', { type: 'checkbox', id: 'chk-' + chave });
      inp.checked = on;
      inp.addEventListener('change', () => { cfg[chave] = inp.checked ? padraoCor : ''; atualizar(); });
      const textos = U.el('label', { for: 'chk-' + chave, style: { flex: '1', cursor: 'pointer' } }, [U.el('b', { text: op.nome })]);
      const corpo = U.el('div', { style: { flex: '1' } }, [textos]);
      if (on && !cfg.rgb) corpo.append(paleta(cfg[chave], (c) => { cfg[chave] = c; atualizar(); }, 'Cor: ' + op.nome));
      lbl.append(inp, corpo, U.el('span', { class: 'preco-mais', text: '+ ' + U.brl(op.preco) }));
      itens.push(lbl);
    };
    comCor('ct', O.contorno, 'azul-gelo');
    comCor('fd', O.fundo, 'roxo');
    (O.extras || []).forEach((x) => {
      const inp = U.el('input', { type: 'checkbox' });
      inp.checked = cfg.ex.includes(x.id);
      inp.addEventListener('change', () => { cfg.ex = inp.checked ? cfg.ex.concat(x.id) : cfg.ex.filter((i) => i !== x.id); atualizar(); });
      itens.push(U.el('label', { class: 'check' }, [inp, U.el('span', {}, [U.el('b', { text: x.nome })]), U.el('span', { class: 'preco-mais', text: Number(x.preco) ? '+ ' + U.brl(x.preco) : 'grátis' })]));
    });
    box.replaceChildren(...itens);
  }
  $('#obs').addEventListener('input', U.debounce((e) => { cfg.obs = e.target.value; salvar(); }, 300));

  /* ---------- Conta e dica ---------- */
  function conta() {
    const p = Q.preco(cfg);
    $('#conta').replaceChildren(...p.itens.map((i) => U.el('li', {}, [U.el('span', { text: i.nome }), U.el('b', { text: U.brl(i.valor) })])));
    $('#total').textContent = U.brl(p.total);
    $('#total-barra').textContent = U.brl(p.total);
  }
  function dica() {
    const d = $('#dica');
    if (cfg.q === Q.FOTO && !foto) d.innerHTML = '📷 <b>Envie a foto</b> do seu veículo para começar';
    else if (ferramenta === 'l' && inicioFaixa) d.innerHTML = '➖ Agora toque onde a <b>faixa termina</b>';
    else if (ferramenta) d.innerHTML = '👆 Toque no quadro para pôr um <b>' + NOMES_FERR[ferramenta].replace(/^\S+ /, '').replace(/ \(.*\)/, '').toLowerCase() + '</b>';
    else d.innerHTML = '👆 Toque nas <b>linhas pontilhadas</b> do quadro para acender';
  }
  $('#info-entrega').textContent = [O.prazo, O.frete, O.pagamento].filter(Boolean).join(' · ');

  function desenharTudo() {
    desenharModelos(); desenharAreas(); desenharLivre(); desenharEfeito(); desenharTamanho(); desenharAcabamentos();
    $('#obs').value = cfg.obs || '';
  }

  /* ---------- Barra da prévia ---------- */
  $('#b-luz').addEventListener('click', (e) => {
    escuro = !escuro;
    palco.escuro(escuro);
    $('#parede').classList.toggle('escura', escuro);
    e.currentTarget.textContent = escuro ? '🌙 Luz apagada' : '☀️ Luz acesa';
    e.currentTarget.setAttribute('aria-pressed', String(escuro));
  });
  $('#b-leds').addEventListener('click', (e) => {
    ligado = !ligado;
    palco.ligado(ligado);
    e.currentTarget.textContent = ligado ? '💡 LEDs ligados' : '⚫ LEDs desligados';
    e.currentTarget.setAttribute('aria-pressed', String(ligado));
  });
  const linkMontagem = () => U.siteBase() + 'montar.html?c=' + Q.codificar(cfg);
  $('#b-compartilhar').addEventListener('click', () => {
    U.compartilhar({ title: 'Meu quadro de LED', text: 'Olha o quadro de LED que eu montei 🔥', url: linkMontagem() });
  });
  $('#parede').classList.add('escura');

  /* ---------- Pedido ---------- */
  function janela(conteudo) {
    const fundo = U.el('div', { class: 'modal-fundo' });
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    const m = U.el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Pedido' }, [
      U.el('div', { class: 'modal-cabeca' }, [U.el('h2', { text: 'Seu pedido está pronto!' }), U.el('button', { type: 'button', class: 'btn btn-icone btn-fantasma', 'aria-label': 'Fechar', text: '✕', onclick: fechar })]),
      U.el('div', { class: 'modal-corpo pronto' }, conteudo)
    ]);
    fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', tecla);
    fundo.append(m);
    document.body.append(fundo);
    const b = m.querySelector('.btn-wa');
    if (b) b.focus();
  }
  $('#c-nome').value = U.ls.get('qd:cliente', {}).nome || '';
  $('#c-whats').value = U.ls.get('qd:cliente', {}).whatsapp || '';
  $('#c-cidade').value = U.ls.get('qd:cliente', {}).cidade || '';
  $('#form-pedido').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const cliente = { nome: $('#c-nome').value.trim(), whatsapp: $('#c-whats').value.trim(), cidade: $('#c-cidade').value.trim() };
    if (cliente.nome.length < 2) { U.toast('Digite seu nome.', 'erro'); $('#c-nome').focus(); return; }
    if (U.somenteNumeros(cliente.whatsapp).length < 10) { U.toast('Digite seu WhatsApp com DDD.', 'erro'); $('#c-whats').focus(); return; }
    if (cfg.q === Q.FOTO && !foto) { U.toast('Envie a foto do seu veículo primeiro.', 'erro'); $('#etapa-modelo').scrollIntoView({ behavior: 'smooth' }); return; }
    U.ls.set('qd:cliente', cliente);
    cfg.obs = $('#obs').value;
    cfg = Q.normalizar(cfg);
    const preco = Q.preco(cfg);
    const resumo = Q.resumo(cfg);
    const btn = $('#enviar');
    btn.disabled = true; btn.textContent = 'Preparando…';
    let id = '';
    try { id = (await window.Store.enviarPedido({ config: cfg, valor: preco.total, resumo: resumo.join('\n'), cliente, foto: cfg.q === Q.FOTO && foto ? foto.src : null })).id; }
    catch (e) { console.warn(e); }
    btn.disabled = false; btn.textContent = 'Enviar pedido pelo WhatsApp';
    const msg = ['Olá! Montei meu quadro de LED no site e quero fazer o pedido 👇', '']
      .concat(id ? ['🧾 Pedido #' + id.toUpperCase()] : [])
      .concat(resumo)
      .concat(['💰 Total estimado: ' + U.brl(preco.total), '', '👤 ' + cliente.nome + (cliente.cidade ? ' — ' + cliente.cidade : ''), '🔗 Minha montagem: ' + linkMontagem()])
      .concat(cfg.q === Q.FOTO ? ['', '📷 Vou mandar a foto do meu veículo aqui na conversa.'] : [])
      .join('\n');
    janela([
      U.el('p', { text: id ? 'Código do seu pedido:' : 'Falta só um passo:' }),
      id ? U.el('div', { class: 'codigo', text: '#' + id.toUpperCase() }) : null,
      U.el('p', { class: 'muted', text: 'Toque no botão para mandar o resumo no nosso WhatsApp. A gente confirma o frete, a forma de pagamento e começa a produzir. 🚀' }),
      U.el('a', { class: 'btn btn-wa btn-grande btn-bloco', href: U.wa(msg), target: '_blank', rel: 'noopener', text: '💬 Enviar no WhatsApp' })
    ]);
  });

  desenharTudo();
  conta();
  dica();
  salvar();
  if (doLink) U.toast('Montagem carregada do link 👍');
})();
