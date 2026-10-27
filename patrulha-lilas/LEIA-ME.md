# Mulher Segura · 3º BPM/M (Google Apps Script, gratuito)

Visual e páginas do modelo **Mulher Segura** (Cadastro Sala de Operações, Contato com as Vítimas,
Acompanhamento, Dados Numéricos, Consulta, Mapa Estatístico) somados às abas da **Patrulha Lilás**
(Livro de Registro com protocolo, Gerador de Escala, Efetivo, Rede de Apoio, POP 2.09,
Registro de Edições, Administrador, temas e modo escuro).

## Como funciona
- Cada policial entra com a **própria conta Google**. Só entram contas liberadas no **Administrador**.
- As ocorrências ficam numa **base central** (planilha no Drive do dono), que só o sistema altera.
- FONAR e escalas vão para o **Drive de quem anexou/gerou**.
- Toda ação fica no **Registro de Edições** (planilha protegida: todos veem, ninguém apaga).
- O **Administrador** aparece só para a conta dona. O e-mail do dono não fica no código e aparece como "Administrador".

## Arquivos do projeto no Apps Script
Scripts (`.gs`): `Código` (Code.gs), `Config`, `DataService`, `DashboardService`, `MapService`,
`MulherSegura`, `Security`, `Setup`.
HTML: `Index`, `Styles`, `Scripts`, `Extras`, `EstilosExtras`, `Marca`.
Manifesto: `appsscript.json`.
Se o projeto tiver os arquivos antigos `App` e `Estilo`, **apague** os dois.

## Instalação / atualização
1. Crie (ou atualize) cada arquivo da lista acima com o conteúdo desta pasta.
2. No editor, escolha **configurarInicial** → **Executar** → autorize. Ela cria o registro e a base de dados.
3. Implantações (Implantar → Gerenciar implantações):
   - **Registro**: Executar como **Eu** · Quem pode acessar **Qualquer pessoa**.
   - **App**: Executar como **Usuário que acessa o app da Web** · Quem pode acessar **Qualquer pessoa com Conta do Google**.
   - Em cada atualização: lápis ✏️ → **Nova versão** → Implantar (nos dois).
4. Se o link do Registro mudou, cole-o em **definirUrlRegistro** e execute.
5. Abra o site com a sua conta → **Administrador** → libere os e-mails dos policiais (ou o domínio).

## Mapa Estatístico
Os limites das Cias vêm de um arquivo KML/KMZ importado uma vez na página 6.
O código original apontava para o mapa do 12º BPM/M; para o 3º BPM/M, importe o KML do mapa de vocês.
