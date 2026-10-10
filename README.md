# LED Quadros 💡 — quadros de carros e motos com LED

Site para divulgar e vender **quadros decorativos com LED** de carros, motos e caminhões.
O grande diferencial: **o cliente escolhe onde vai o LED** — toca no quadro para acender faróis, rodas,
neon embaixo, contorno… escolhe a cor de cada parte, o efeito (fixo, respirando, pisca, sequencial, arco-íris),
o tamanho e a moldura, vê a prévia na hora (com o botão **"Apagar a luz"**) e manda o pedido pronto no WhatsApp.
Também dá para montar com a **foto do próprio veículo** e marcar os LEDs com o dedo.

## Páginas

| Página | Para quem | O que faz |
|---|---|---|
| `index.html` | Clientes | Quadro em destaque que acende sozinho, interruptor da sala, catálogo com filtros, "Seu veículo no quadro", dúvidas. |
| `montar.html` | Clientes | **Monte o seu**: modelo → onde acender → cor e efeito → tamanho e moldura → extras → pedido pelo WhatsApp. |
| `links.html` | Instagram / Linktree | Página de links para a bio, com os botões principais e um quadro acendendo. |
| `admin.html` | Você | Painel (abaixo). Não aparece no Google. |
| `termos.html`, `privacidade.html` | Todos | Textos legais (LGPD). |

## 🔗 Link para divulgar (Instagram, Linktree, WhatsApp)

Depois de publicado no GitHub Pages:

- **Bio do Instagram / Linktree:** `https://williancoder.github.io/Quadros2026/links.html`
- **Site completo:** `https://williancoder.github.io/Quadros2026/`
- **Direto no "Monte o seu":** `https://williancoder.github.io/Quadros2026/montar.html`

O painel (aba **🔗 Link para Instagram**) mostra esses links com botão de copiar e um **QR Code** para imprimir.

## ➕ Adicionar um quadro novo (1 minuto, funciona no celular)

1. Abra `admin.html` → **➕ Adicionar quadro novo**.
2. **Foto:** escolha a foto/arte do quadro.
3. **Nome e preço:** nome, preço do menor tamanho, categoria.
4. **Onde vai LED:** toque em um botão pronto (💡 Faróis, 🔴 Lanternas, ⭕ Rodas, 🟣 Neon embaixo, ➖ Faixa, ✨ Pontos)
   e depois **toque na foto** onde a luz fica. Faixa = vários toques formando a linha; Anel = toque no centro da roda.
5. **✔ Salvar quadro** → **🚀 Publicar**. O site atualiza em 1–2 minutos.

## O painel (`/admin.html`)

| Aba | Para quê |
|---|---|
| 🏠 Início | Atalho para quadro novo, números, checklist do que falta configurar, link para divulgar. |
| 🖼️ Quadros | Criar, editar (foto, preço, áreas de LED), esconder, duplicar, reordenar, excluir; categorias. |
| 🧾 Pedidos | Pedidos com prévia do quadro, situação (novo → confirmado → produção → enviado → entregue), anotações e WhatsApp do cliente. |
| 💲 Preços e opções | Tamanhos, molduras, cores de LED, RGB, efeitos, contorno, luz de fundo, LED extra, "seu veículo", extras, prazo/frete/pagamento. |
| ✍️ Textos | Textos do topo, bio da página de links, perguntas frequentes e depoimentos (só reais). |
| 🔗 Link para Instagram | Links prontos para copiar e QR Code. |
| ⚙️ Configurações | Marca, WhatsApp, redes, endereço do site, GitHub, Firebase. |

**Como salvar:** cada mudança vira um rascunho neste aparelho (barra amarela; "Ver no site" mostra o rascunho).
Para valer no site, toque em **Publicar**. Na primeira vez, conecte o GitHub na aba Configurações (o passo a passo está lá:
token *fine-grained*, só este repositório, **Contents: Read and write**, 90 dias).

## Como chegam os pedidos

- O cliente toca em **Enviar pedido pelo WhatsApp**: abre uma conversa com o seu número com o resumo completo,
  o valor estimado, o **código do pedido** e o **link da montagem** (abrindo o link você vê exatamente o quadro que ele montou).
- Logo depois, o site entrega ao cliente a **imagem do quadro montado** (com os LEDs, o código e o resumo) e, no
  "Seu veículo no quadro", a **foto original** — no celular ele toca em "Enviar imagens no WhatsApp" e manda na mesma conversa.
- **Consultar a foto pelo link:** abra o link da montagem e toque em **"Carregar a foto que o cliente mandou"** —
  os LEDs aparecem exatamente onde ele marcou (a foto não viaja dentro do link).
- **Sem Firebase** (modo de teste) isso já funciona: o pedido chega pelo WhatsApp.
- **Com Firebase** (grátis), os pedidos também ficam guardados na aba **Pedidos** do painel, inclusive a foto do veículo.
  Passo a passo no painel → Configurações → Firebase.

## Publicar o site (GitHub Pages, grátis)

1. No GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Cada mudança na branch `main` publica sozinha (o workflow `pages.yml` confere o site antes).
3. Domínio próprio (opcional): Settings → Pages → Custom domain, e preencha **Endereço do site** no painel.

## Conferir antes de publicar

```bash
node scripts/verificar.mjs     # dados, áreas de LED, sintaxe, CSP e links das páginas, regras do Firestore
bash scripts/build-site.sh     # monta _site/ como vai para o ar
python3 -m http.server 8000    # abre em http://localhost:8000
```

Mapa técnico: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) · Segurança: [`SECURITY.md`](SECURITY.md).
