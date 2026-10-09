/*
 * Página inicial: quadro de destaque que acende sozinho, interruptor da sala,
 * catálogo com filtro, "seu veículo", depoimentos e dúvidas.
 */
(function () {
  'use strict';
  const U = window.U, Q = window.Quadro;
  const $ = U.$;
  const CAT = window.CATALOGO || {};
  const textos = CAT.textos || {};
  const linkMontar = (id) => 'montar.html?q=' + encodeURIComponent(id) + (window.QD_RASCUNHO ? '&rascunho=1' : '');

  U.preencherComuns();
  if (textos.heroTitulo) $('#hero-titulo').textContent = textos.heroTitulo;
  if (textos.heroDestaque) $('#hero-destaque').textContent = textos.heroDestaque;
  if (textos.heroTexto) $('#hero-texto').textContent = textos.heroTexto;
  $('#rodape-slogan').textContent = (window.SITE_CONFIG || {}).slogan || '';

  /* ---------- Destaque: acende uma área por vez e depois apaga a luz da sala ---------- */
  const lista = U.quadros();
  const destaque = lista.find((q) => q.destaque) || lista[0];
  let cfgHero = null, hero = null, escuro = false;
  const parede = $('#parede'), botaoLuz = $('#interruptor');

  function luzDaSala(apagar) {
    escuro = apagar;
    parede.classList.toggle('escura', apagar);
    botaoLuz.setAttribute('aria-pressed', String(apagar));
    botaoLuz.querySelector('.interruptor-txt').textContent = apagar ? 'Acender a luz' : 'Apagar a luz';
    if (hero) hero.escuro(apagar);
  }
  function chipsHero() {
    const box = $('#hero-areas');
    box.replaceChildren();
    (destaque.leds || []).forEach((a) => {
      const ligado = !!cfgHero.z[a.id];
      box.append(U.el('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(ligado), style: { '--c': U.corHex(a.cor) },
        onclick: () => { if (cfgHero.z[a.id]) delete cfgHero.z[a.id]; else cfgHero.z[a.id] = a.cor; hero.atualizar(cfgHero); chipsHero(); }
      }, [U.el('span', { class: 'bolinha' }), a.nome]));
    });
    const ct = !!cfgHero.ct;
    box.append(U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(ct), style: { '--c': U.corHex('azul-gelo') },
      onclick: () => { cfgHero.ct = cfgHero.ct ? '' : 'azul-gelo'; hero.atualizar(cfgHero); chipsHero(); }
    }, [U.el('span', { class: 'bolinha' }), 'Contorno']));
    const seq = cfgHero.e === 'sequencial';
    box.append(U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(seq),
      onclick: () => { cfgHero.e = seq ? 'fixo' : 'sequencial'; hero.atualizar(cfgHero); chipsHero(); }
    }, ['✨ Efeito sequencial']));
  }
  if (destaque) {
    cfgHero = Q.normalizar({ q: destaque.id });
    const todas = (destaque.leds || []).map((a) => a);
    cfgHero.z = {};
    hero = Q.desenhar($('#hero-quadro'), { quadro: destaque, config: cfgHero, carregarJa: true, legenda: 'Quadro ' + destaque.nome + ' com LEDs acesos' });
    chipsHero();
    const passo = U.reduzMovimento() ? 0 : 520;
    todas.forEach((a, i) => setTimeout(() => {
      cfgHero.z[a.id] = a.cor;
      hero.atualizar(cfgHero);
      chipsHero();
    }, 700 + i * passo));
    setTimeout(() => { cfgHero.ct = 'azul-gelo'; hero.atualizar(cfgHero); chipsHero(); luzDaSala(true); }, 900 + todas.length * passo);
  }
  botaoLuz.addEventListener('click', () => luzDaSala(!escuro));

  /* ---------- Catálogo ---------- */
  const grade = $('#grade'), filtros = $('#filtros'), chkEscuro = $('#modelos-escuro');
  const desenhos = [];
  let filtro = '';
  function cartoes() {
    grade.replaceChildren();
    desenhos.length = 0;
    const itens = lista.filter((q) => !filtro || q.categoria === filtro);
    itens.forEach((q) => {
      const cfg = Q.normalizar({ q: q.id });
      const area = U.el('div', { class: 'cartao-quadro' });
      const nomes = (q.leds || []).map((a) => a.nome.replace(/ \(.*\)$/, ''));
      const card = U.el('a', { class: 'cartao revelar', href: linkMontar(q.id) }, [
        q.selo ? U.el('span', { class: 'selo', text: q.selo }) : null,
        area,
        U.el('h3', { text: q.nome }),
        U.el('p', { class: 'muted', text: q.descricao || '' }),
        U.el('div', { class: 'tags' }, nomes.slice(0, 5).map((n) => U.el('span', { class: 'tag', text: '💡 ' + n }))),
        U.el('div', { class: 'cartao-rodape' }, [
          U.el('span', {}, [U.el('span', { class: 'preco-de', text: 'a partir de' }), U.el('span', { class: 'preco', text: U.brl(U.precoMinimo(q)) })]),
          U.el('span', { class: 'btn btn-primario btn-peq', text: 'Personalizar →' })
        ])
      ]);
      grade.append(card);
      const d = Q.desenhar(area, { quadro: q, config: cfg, escuro: chkEscuro.checked });
      desenhos.push(d);
      card.addEventListener('mouseenter', () => { cfg.e = 'sequencial'; d.atualizar(cfg); });
      card.addEventListener('mouseleave', () => { cfg.e = 'fixo'; d.atualizar(cfg); });
    });
    const p = U.opcoes().personalizado || {};
    if (p.ativo && !filtro) {
      const area = U.el('div', { class: 'cartao-quadro' });
      const card = U.el('a', { class: 'cartao cartao-especial revelar', href: linkMontar(Q.FOTO) }, [
        U.el('span', { class: 'selo', text: 'Exclusivo' }), area,
        U.el('h3', { text: p.nome || 'Seu veículo no quadro' }),
        U.el('p', { class: 'muted', text: p.descricao || '' }),
        U.el('div', { class: 'cartao-rodape' }, [
          U.el('span', {}, [U.el('span', { class: 'preco-de', text: 'a partir de' }), U.el('span', { class: 'preco', text: U.brl(U.precoMinimo(p)) })]),
          U.el('span', { class: 'btn btn-primario btn-peq', text: '📷 Enviar foto' })
        ])
      ]);
      grade.append(card);
      desenhos.push(Q.desenhar(area, { quadro: Q.obter(Q.FOTO), config: Q.normalizar({ q: Q.FOTO }), escuro: false }));
    }
    grade.classList.toggle('escuro', chkEscuro.checked);
    U.revelarAoRolar(U.$$('.cartao', grade));
  }
  function botoesFiltro() {
    const cats = (CAT.categorias || []).filter((c) => lista.some((q) => q.categoria === c.id));
    filtros.replaceChildren(...[{ id: '', nome: 'Todos', emoji: '✨' }].concat(cats).map((c) => U.el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(filtro === c.id),
      onclick: () => { filtro = c.id; botoesFiltro(); cartoes(); }
    }, [(c.emoji ? c.emoji + ' ' : '') + c.nome])));
  }
  chkEscuro.addEventListener('change', () => {
    desenhos.forEach((d) => d.escuro(chkEscuro.checked));
    grade.classList.toggle('escuro', chkEscuro.checked);
    chkEscuro.nextElementSibling.textContent = chkEscuro.checked ? 'Luz apagada' : 'Luz acesa';
  });
  botoesFiltro();
  cartoes();

  /* ---------- Seu veículo: LEDs aparecendo onde o "dedo" toca ---------- */
  const p = U.opcoes().personalizado || {};
  if (!p.ativo) $('#seu-veiculo').hidden = true;
  else {
    $('#seu-preco').textContent = 'A partir de ' + U.brl(U.precoMinimo(p)) + '. ' + (U.opcoes().prazo || '');
    const base = U.quadro('hatch-rebaixado') || destaque;
    if (base) {
      const cfg = Q.normalizar({ q: base.id });
      cfg.z = {};
      const d = Q.desenhar($('#seu-quadro'), { quadro: base, config: cfg, escuro: true });
      const roteiro = [
        { k: 'p', p: [[82, 61]], c: 'branco-frio' },
        { k: 'l', p: [[25, 77], [78, 77]], c: 'azul-gelo' },
        { k: 'a', p: [[30.4, 72]], r: 4.4, c: 'rosa' },
        { k: 'a', p: [[71.9, 72]], r: 4.4, c: 'rosa' },
        { k: 'p', p: [[18.5, 58]], c: 'vermelho' }
      ];
      let n = 0;
      const ciclo = () => {
        cfg.x = n <= roteiro.length ? roteiro.slice(0, n) : [];
        if (n > roteiro.length + 1) n = -1;
        n++;
        d.atualizar(cfg);
      };
      ciclo();
      if (!U.reduzMovimento()) setInterval(ciclo, 900);
      else { cfg.x = roteiro; d.atualizar(cfg); }
    }
  }

  /* ---------- Depoimentos e dúvidas ---------- */
  const deps = (CAT.depoimentos || []).filter((d) => d && d.texto);
  if (deps.length) {
    $('#depoimentos').hidden = false;
    $('#lista-depoimentos').replaceChildren(...deps.map((d) => U.el('blockquote', { class: 'depoimento' }, [
      U.el('p', { text: '“' + d.texto + '”' }), U.el('b', { text: d.nome || '' }), d.cidade ? U.el('span', { class: 'muted pequeno', text: ' · ' + d.cidade }) : null
    ])));
  }
  $('#faq').replaceChildren(...(CAT.faq || []).map((f) => U.el('details', {}, [U.el('summary', { text: f.p }), U.el('p', { text: f.r })])));

  U.revelarAoRolar();
})();
