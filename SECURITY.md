# Segurança

## Como reportar uma falha
Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Use o botão
"Report a vulnerability" na aba *Security* do repositório. Respondemos em até 7 dias.

## Como o site se protege
| Camada | Proteção |
|---|---|
| Arquitetura | Site estático: não há servidor próprio nem senhas de clientes para serem roubadas. |
| Pedidos (Firebase) | Regras do Firestore (`firestore.rules`): o cliente (login anônimo) só **cria** o próprio pedido, com campos, tamanhos e formatos validados; só o administrador (e-mail confirmado) lista, altera a situação e apaga. Todo o resto é negado por padrão. |
| Injeção de código (XSS) | Texto editável vai para a tela por `textContent`/`U.esc`; imagens só de `assets/` ou `data:image` em base64 (`U.fotoSegura`); links externos só `https://` (`U.linkSeguro`); a montagem que vem pelo link (`?c=`) é validada campo a campo (`Quadro.normalizar`). |
| Política de conteúdo (CSP) | Em todas as páginas: só scripts do próprio site e do Firebase; sem `<script>` embutido, sem `on...=`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. O `scripts/verificar.mjs` barra páginas fora dessa regra. |
| Clickjacking | `X-Frame-Options`/`frame-ancestors` (Cloudflare/Netlify, `_headers`) e bloqueio em JavaScript quando aberto em iframe de outro site. |
| Transporte | HTTPS do GitHub Pages; HSTS e `upgrade-insecure-requests` em `_headers`. |
| Privacidade | `Referrer-Policy` restrita (o painel não envia referência), `Permissions-Policy` desliga câmera, microfone, localização e pagamento. Sem rastreadores. |
| Painel administrador | Não tem senha guardada no site: publicar exige um token do GitHub *fine-grained* (só este repositório, só *Contents*), guardado só na sessão do navegador (ou no aparelho, se você marcar "lembrar"). Ver pedidos exige login Firebase com o e-mail de administrador confirmado. A página não é indexada (`noindex` + `robots.txt`). |
| Cadeia de dependências | Sem npm em produção; a única biblioteca externa (QR Code, MIT) está versionada no repositório. Dependabot acompanha as GitHub Actions. |

## Checklist do responsável
- [ ] Autenticação em dois fatores (2FA) no GitHub e na conta Google do Firebase.
- [ ] Token do painel: *fine-grained*, só este repositório, permissão **Contents: Read and write**, validade de no máximo 90 dias.
- [ ] Ativar em *Settings → Code security*: **Secret scanning**, **Push protection** e **Dependabot alerts**.
- [ ] Proteger a branch `main` (*Settings → Branches*).
- [ ] Firebase: publicar as regras do painel com o seu e-mail; em *Authentication → Domínios autorizados*, deixar só o domínio do site.
- [ ] Opcional: ativar o **App Check** do Firebase para dificultar pedidos falsos automatizados.
