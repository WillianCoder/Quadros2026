# Patrulha Lilás — sistema de apoio ao PM (Google Apps Script, gratuito)

Site com menu lateral para: atendimento de violência doméstica/MPU, crime sexual, roteiro da ligação
Mulher Segura (lança no Livro de Registro), visita da patrulha, gerador de escala editável, indicadores,
POP 2.09 e rede de apoio. Quase tudo tem botão discreto **🖨 imprimir** e **💾 Salvar no Drive**.

## Como funciona
- Cada policial entra com a **própria conta Google**. O que ele salva vai para o **Drive dele**, na pasta
  `Patrulha Lilás / <assunto> / <mês>` (PDF + dados).
- Toda ação é gravada numa **planilha de registro** que fica no **seu** Drive, protegida: todos podem ver,
  ninguém apaga (só você, dono). A conta é confirmada pelo Google (não dá para fingir outro e-mail).
- **Senha de administrador**: gerada na instalação e mostrada só para você.

## Instalação (uma vez, ~10 min)
1. Entre em https://script.google.com com a SUA conta → **Novo projeto** → nomeie “Patrulha Lilás”.
2. Em ⚙️ *Configurações do projeto*, marque **“Mostrar arquivo de manifesto appsscript.json”**.
3. Crie os arquivos e cole o conteúdo desta pasta:
   `Code.gs`, `appsscript.json`, e os HTML (**+ → HTML**) `Index`, `Estilo`, `App` (sem “.html” no nome).
4. No editor, escolha a função **configurarInicial** → **Executar** → autorize.
   Abra **Registro de execução**: lá aparece a **SENHA DO ADMINISTRADOR**. Anote e guarde.
5. **Implantar → Nova implantação → App da Web** (implantação “Registro”):
   - Executar como: **Eu** · Quem pode acessar: **Qualquer pessoa** → copie a URL (termina em `/exec`).
6. Cole essa URL na função **definirUrlRegistro** (no lugar de `COLE_AQUI...`), salve e **Execute** ela.
7. **Implantar → Nova implantação → App da Web** (implantação “App”):
   - Executar como: **Usuário que acessa o app da Web** · Quem pode acessar: **Qualquer pessoa com conta do Google**.
   - Essa URL é o **link para todos**. Mande para a equipe.

No primeiro acesso cada policial autoriza o app (o Google mostra “app não verificado” → *Avançado → Acessar*;
é normal em apps internos gratuitos).

## Trocar a senha
Execute **trocarSenhaAdmin** no editor; a nova senha aparece no registro de execução.

## Testar sem Google
Abra `Index.html` montado (ou o preview) no navegador: entra em **modo demonstração** (nada é salvo).
