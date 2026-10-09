/*
 * Prévia do rascunho do painel.
 * Com ?rascunho=1 na URL, troca CATALOGO e SITE_CONFIG pelas versões que o painel
 * (admin.html) guardou neste navegador, para conferir antes de publicar.
 * Sem o parâmetro, não faz nada.
 */
(function () {
  'use strict';
  if (!/[?&]rascunho=1\b/.test(location.search)) return;
  [['catalogo', 'CATALOGO'], ['config', 'SITE_CONFIG']].forEach(function (p) {
    try {
      const v = localStorage.getItem('qd:rascunho:' + p[0]);
      if (v) window[p[1]] = JSON.parse(v);
    } catch (e) { /* rascunho inválido: mantém o publicado */ }
  });
  window.QD_RASCUNHO = true;
})();
