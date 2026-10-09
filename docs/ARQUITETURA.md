# Arquitetura

Site estático (HTML + CSS + JavaScript puro, sem build, sem framework, sem npm no site).
Funciona no GitHub Pages / Cloudflare Pages. O banco de dados (opcional) é o Firebase Firestore
no plano gratuito. Sem Firebase o site roda em **modo de teste** (pedidos chegam só pelo WhatsApp
e ficam no navegador de quem pediu).

## Páginas

| Arquivo | Script | O que é |
|---|---|---|
| `index.html` | `vitrine.js` | Vitrine: destaque que acende sozinho, interruptor, catálogo com filtros, "seu veículo", depoimentos, FAQ. |
| `montar.html` | `montar.js` | Configurador. Aceita `?q=<idDoQuadro>`, `?q=foto` (foto do cliente) e `?c=<montagem>` (link de compartilhar). |
| `links.html` | `links.js` | Página de links para bio do Instagram / Linktree. |
| `admin.html` | `admin.js` | Painel do dono (não indexado). |
| `termos.html`, `privacidade.html`, `404.html` | `texto.js` | Textos. |

Ordem de carregamento: `config.js`, `catalogo.js`, `rascunho.js`, `util.js`, `quadro.js`, depois o resto.
`rascunho.js`: com `?rascunho=1`, troca `CATALOGO`/`SITE_CONFIG` pelo rascunho do painel (`qd:rascunho:*` no localStorage).

## `SITE_CONFIG` (`assets/js/config.js`)

```json
{ "marca": "Neon Garage", "slogan": "...", "siteUrl": "", "repo": "WillianCoder/Quadros2026",
  "whatsapp": "5511912345678", "instagram": "@...", "tiktok": "", "facebook": "", "email": "",
  "atendimento": "Seg a sáb, das 9h às 20h", "firebase": null, "adminEmail": "" }
```

## `CATALOGO` (`assets/js/catalogo.js`)

```json
{
  "textos": { "heroTitulo": "", "heroDestaque": "", "heroTexto": "", "bio": "" },
  "categorias": [ { "id": "motos", "nome": "Motos", "emoji": "🏍️" } ],
  "quadros": [ QUADRO ],
  "opcoes": { ... },
  "faq": [ { "p": "Pergunta?", "r": "Resposta." } ],
  "depoimentos": [ { "nome": "", "cidade": "", "texto": "" } ]
}
```

### QUADRO

```json
{
  "id": "esportivo-gt", "nome": "Esportivo GT Night", "categoria": "esportivos",
  "ativo": true, "destaque": true, "selo": "Mais pedido", "descricao": "...",
  "imagem": "assets/img/quadros/esportivo-gt.svg", "proporcao": 1.5, "preco": 189,
  "leds": [
    { "id": "farois", "nome": "Faróis", "tipo": "linha", "pontos": [[82.67, 58], [86.13, 59.7]], "preco": 0, "cor": "branco-frio", "padrao": true },
    { "id": "rodas", "nome": "Rodas", "tipo": "anel", "pontos": [[28.67, 70, 4.67]], "preco": 25, "cor": "azul-gelo", "padrao": false }
  ]
}
```

- `proporcao`: largura ÷ altura da imagem (o painel calcula ao enviar a foto).
- `preco`: preço no menor tamanho. `imagem`: arquivo em `assets/` (ou data URL até ser publicado).
- `leds[].tipo`: `pontos` (cada ponto é uma luz), `linha` (faixa ligando os pontos, 2+), `anel` (círculo `[x, y, raio]`).
- Coordenadas em **% da imagem**: x de 0 (esquerda) a 100 (direita), y de 0 (topo) a 100 (base); o raio é % da largura.
- `preco` da área: 0 = inclusa. `cor`: cor inicial (id de `opcoes.cores`). `padrao`: já vem acesa.
- O id `foto` é reservado para "Seu veículo no quadro".

### `opcoes`

`tamanhos [{ id, nome, acrescimo }]`, `molduras [{ id, nome, cor, preco }]`, `cores [{ id, nome, hex }]`,
`rgb { ativo, nome, preco }`, `efeitos [{ id, nome, descricao, soRgb }]` (ids fixos: `fixo`, `respirar`, `piscar`, `sequencial`, `arcoiris`),
`contorno { ativo, nome, preco }`, `fundo { ativo, nome, preco }`, `pontoExtra { ativo, preco, max }`,
`personalizado { ativo, nome, descricao, preco, proporcao }`, `extras [{ id, nome, preco }]`, `prazo`, `frete`, `pagamento`.

**Preço** = quadro.preco + tamanho.acrescimo + moldura.preco + áreas acesas com preço + LEDs extras × pontoExtra.preco + RGB + contorno + fundo + extras.

## Montagem (o que o cliente escolheu)

```js
{ q: 'esportivo-gt', t: 'm', m: 'preta',
  z: { farois: 'branco-frio', neon: 'roxo' },          // áreas acesas → cor
  x: [ { k: 'p', p: [[50, 30]], c: 'rosa' },            // LED extra: ponto
       { k: 'l', p: [[10, 80], [90, 80]], c: 'azul' },  //            faixa
       { k: 'a', p: [[30, 70]], r: 4.5, c: 'verde' } ], //            anel
  e: 'sequencial', rgb: false, ct: 'azul-gelo', fd: '', ex: ['placa'], obs: '' }
```

Sempre passe por `Quadro.normalizar(cfg)` (descarta ids inexistentes e limita tamanhos).

## Módulos

| Arquivo | Global | Responsabilidade |
|---|---|---|
| `util.js` | `U` | DOM, escape, preço, catálogo, links (WhatsApp, redes), fotos/links seguros, toast, QR Code, bloqueio de iframe. |
| `quadro.js` | `Quadro` | `obter`, `padrao`, `normalizar`, `preco`, `resumo`, `codificar`/`decodificar`, `desenhar(alvo, opts)`. |
| `fotos.js` | `Fotos` | `comprimir(file, { lado, qualidade })` → `{ src, proporcao }`. |
| `store.js` | `Store` | `enviarPedido`, e para o admin: `entrarAdmin`, `entrarGoogle`, `sair`, `admin`, `pedidos`, `foto`, `atualizar`, `excluir`. |

`Quadro.desenhar` monta: moldura (`--moldura`), imagem, SVG com as luzes (3 camadas: brilho, cor, miolo branco,
com `mix-blend-mode: screen`), contorno (`--ct`) e halo na parede (`--fd`). Efeitos por CSS em `.qd[data-efeito]`.
Com `editavel: true`, mostra as áreas apagadas tracejadas e chama `aoTocarArea(id)` / `aoTocar(x, y)`.

## Firestore (quando `SITE_CONFIG.firebase` está preenchido)

- `pedidos/{id}` → `{ id, dono, status, quadro, valor, configJson, resumo, cliente: { nome, whatsapp, cidade }, temFoto, nota, criadoEm, atualizadoEm }`
  - `status`: `novo` | `confirmado` | `producao` | `enviado` | `entregue` | `cancelado`.
  - `configJson`: a montagem em texto (o Firestore não guarda lista dentro de lista).
- `pedidos/{id}/foto/0` → `{ src }` (data URL da foto do veículo).
- Regras em `firestore.rules`.

## Painel → GitHub

"Publicar" envia as fotos novas (data URL) para `assets/img/quadros/<id>-<aleatório>.jpg` e grava
`assets/js/catalogo.js` e `assets/js/config.js` pela API de conteúdo do GitHub (token fine-grained, só *Contents*).
O push na `main` dispara o `pages.yml`, que roda `scripts/verificar.mjs` e publica.
