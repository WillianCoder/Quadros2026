/* Página de links (links.html): botões para bio do Instagram/Linktree e um quadro acendendo. */
(function () {
  'use strict';
  const U = window.U, Q = window.Quadro;
  const CFG = window.SITE_CONFIG || {}, CAT = window.CATALOGO || {};
  U.preencherComuns();
  U.$('#bio').textContent = (CAT.textos || {}).bio || CFG.slogan || '';

  const itens = [
    { href: 'montar.html', ico: '💡', t: 'Monte seu quadro de LED', s: 'Escolha onde acende e veja na hora', cls: 'link-principal' },
    { href: './#modelos', ico: '🚗', t: 'Ver todos os modelos', s: 'Carros, motos, caminhões…' },
    (U.opcoes().personalizado || {}).ativo ? { href: 'montar.html?q=foto', ico: '📷', t: 'Quadro com a foto do SEU veículo', s: 'Exclusivo e personalizado' } : null,
    U.somenteNumeros(CFG.whatsapp) ? { href: U.wa('Olá! Vim pelo Instagram e quero saber dos quadros de LED 💡'), ico: '💬', t: 'Falar no WhatsApp', s: CFG.atendimento || '', cls: 'link-wa', fora: true } : null,
    U.rede('instagram', CFG.instagram) ? { href: U.rede('instagram', CFG.instagram), ico: '📸', t: 'Instagram', fora: true } : null,
    U.rede('tiktok', CFG.tiktok) ? { href: U.rede('tiktok', CFG.tiktok), ico: '🎵', t: 'TikTok', fora: true } : null,
    U.rede('facebook', CFG.facebook) ? { href: U.rede('facebook', CFG.facebook), ico: '👍', t: 'Facebook', fora: true } : null,
    { href: './', ico: '🌐', t: 'Site completo' }
  ].filter(Boolean);
  U.$('#lista').replaceChildren(...itens.map((i) => U.el('a', { class: 'link ' + (i.cls || ''), href: i.href, target: i.fora ? '_blank' : null, rel: i.fora ? 'noopener' : null }, [
    U.el('span', { class: 'ico', 'aria-hidden': 'true', text: i.ico }), U.el('span', {}, [i.t, i.s ? U.el('small', { text: i.s }) : null])
  ])));

  // Quadro de destaque acendendo área por área, sem parar.
  const q = U.quadros().find((x) => x.destaque) || U.quadros()[0];
  if (!q) return;
  const cfg = Q.normalizar({ q: q.id });
  const areas = q.leds || [];
  cfg.z = {};
  const d = Q.desenhar(U.$('#quadro'), { quadro: q, config: cfg, escuro: true, carregarJa: true });
  if (U.reduzMovimento()) { areas.forEach((a) => { cfg.z[a.id] = a.cor; }); d.atualizar(cfg); return; }
  let n = 0;
  setInterval(() => {
    if (n < areas.length) cfg.z[areas[n].id] = areas[n].cor;
    else if (n === areas.length) cfg.ct = 'rosa';
    else { cfg.z = {}; cfg.ct = ''; n = -1; }
    n++;
    d.atualizar(cfg);
  }, 700);
})();
