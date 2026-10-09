# LED Quadros — instruções para o Claude

Site de quadros de carros, motos e caminhões com LED. O diferencial: o cliente escolhe onde vai o LED.
Dono: Willian (leigo em programação). Responda e escreva tudo em **português do Brasil**.

## Preferência do Willian
- Todo projeto/site **novo** vai em um **repositório GitHub novo e separado**. Mudanças neste site ficam neste repositório.

## Arquitetura (detalhes em docs/ARQUITETURA.md)
- Site estático, JavaScript puro em scripts clássicos (IIFE + `'use strict'` + globais), **sem build e sem npm** no site.
- Dados editados pelo painel: `assets/js/config.js` (`SITE_CONFIG`) e `assets/js/catalogo.js` (`CATALOGO`).
  Formato `window.NOME = {JSON};` — o que vem depois do `=` precisa ser **JSON válido**, e o comentário do topo não pode ter chaves.
- `assets/js/quadro.js` (`Quadro`) desenha o quadro e as luzes (SVG por cima da imagem) e valida/precifica a montagem.
- Páginas: `index.html` (`vitrine.js`), `montar.html` (`montar.js`), `links.html` (`links.js`), `admin.html` (`admin.js`).
- Banco: `store.js` (Firebase Firestore com login anônimo, ou modo local em IndexedDB). Regras em `firestore.rules` (marcador `ADMIN_EMAIL`).

## Regras de código
- CSP rígido: **nunca** `<script>` com código dentro do HTML nem atributos `on...=`. Todo JS em arquivo.
- Texto editável sempre por `textContent`/`U.el({ text })` ou `U.esc`; imagens por `U.fotoSegura`; links externos por `U.linkSeguro`.
- Toda montagem vinda de fora (link `?c=`, localStorage, pedido) passa por `Quadro.normalizar`.
- Mobile-first (360 px), alvos de toque ≥ 44 px, respeitar `prefers-reduced-motion`.
- Siga o estilo dos arquivos vizinhos; comentários curtos em português.

## Antes de terminar
- `node scripts/verificar.mjs` precisa passar.
- Teste no navegador: `python3 -m http.server` e abra `index.html`, `montar.html`, `links.html`, `admin.html`.
