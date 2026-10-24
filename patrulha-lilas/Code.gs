/**
 * Patrulha Lilás — sistema de apoio ao policial militar
 * Google Apps Script. O mesmo código é publicado DUAS vezes:
 *  1) "App"      → Executar como: usuário que acessa  (salva no Drive de quem logou)
 *  2) "Registro" → Executar como: eu (dono)            (grava o registro que ninguém apaga)
 * Veja LEIA-ME.md para o passo a passo.
 */

const PASTA_RAIZ = 'Patrulha Lilás';
const PROPS = PropertiesService.getScriptProperties();

/* ============ PÁGINA ============ */
function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Patrulha Lilás')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(nome) { return HtmlService.createHtmlOutputFromFile(nome).getContent(); }

/* ============ CONFIGURAÇÃO INICIAL (o dono roda 1 vez no editor) ============ */
function configurarInicial() {
  if (PROPS.getProperty('LOG_ID')) {
    Logger.log('Já configurado. Planilha de registro: ' + SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getUrl());
    return;
  }
  const ss = SpreadsheetApp.create('Patrulha Lilás — Registro de Auditoria (não editável)');
  const sh = ss.getActiveSheet().setName('Registro');
  sh.appendRow(['Data/hora', 'Conta Google', 'Ação', 'Módulo', 'Descrição', 'Link do arquivo']);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#6b4fa0').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  // Protege: só o dono edita. Todos com o link podem VER.
  const p = sh.protect().setDescription('Registro permanente');
  p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false);
  DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const senha = gerarSenha_();
  PROPS.setProperties({ LOG_ID: ss.getId(), ADMIN_HASH: hash_(senha) });
  Logger.log('==============================================');
  Logger.log('SENHA DO ADMINISTRADOR (anote e guarde): ' + senha);
  Logger.log('Planilha de registro: ' + ss.getUrl());
  Logger.log('==============================================');
}

/** O dono roda isto se quiser trocar a senha (aparece no log). */
function trocarSenhaAdmin() {
  const s = gerarSenha_(); PROPS.setProperty('ADMIN_HASH', hash_(s));
  Logger.log('NOVA SENHA DO ADMINISTRADOR: ' + s);
}

/** Depois de publicar a implantação "Registro", cole a URL dela aqui e rode uma vez. */
function definirUrlRegistro() {
  const url = 'COLE_AQUI_A_URL_DA_IMPLANTACAO_REGISTRO';
  if (url.indexOf('https://script.google.com/') !== 0) throw new Error('Cole a URL correta (termina em /exec).');
  PROPS.setProperty('LOG_URL', url);
  Logger.log('URL do registro salva.');
}

/* ============ REGISTRO (roda como DONO, recebe chamadas do app) ============ */
function doPost(e) {
  let r;
  try {
    const req = JSON.parse(e.postData.contents);
    const email = emailDoToken_(req.token);
    if (!email) throw new Error('Conta não identificada.');
    const sh = SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getSheetByName('Registro');
    const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');

    if (req.acao === 'registrar') {
      const d = req.dados || {};
      sh.appendRow([agora, email, limpa_(d.acao), limpa_(d.modulo), limpa_(d.descricao), limpa_(d.link)]);
      r = { ok: true };
    } else if (req.acao === 'listar') {
      const n = sh.getLastRow();
      const ini = Math.max(2, n - 499);
      const vals = n >= 2 ? sh.getRange(ini, 1, n - ini + 1, 6).getDisplayValues().reverse() : [];
      r = { ok: true, linhas: vals, url: SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getUrl() };
    } else if (req.acao === 'admin') {
      const ok = hash_(String(req.senha || '')) === PROPS.getProperty('ADMIN_HASH');
      sh.appendRow([agora, email, ok ? 'Login admin' : 'Tentativa de login admin (senha errada)', 'Admin', '', '']);
      if (!ok) throw new Error('Senha incorreta.');
      if (req.config) {
        const c = lerConfig_();
        ['nome', 'batalhao', 'unidade', 'subunidade', 'cidade'].forEach(k => { if (req.config[k] != null) c[k] = String(req.config[k]).slice(0, 200); });
        PROPS.setProperty('CONFIG', JSON.stringify(c));
        sh.appendRow([agora, email, 'Alterou configurações', 'Admin', 'Cabeçalho/unidade', '']);
      }
      if (req.logo) {
        const c = lerConfig_(), pos = req.logo.pos === 2 ? 1 : 0;
        c.logos = c.logos || ['', ''];
        if (req.logo.remover) c.logos[pos] = '';
        else {
          if (!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(req.logo.mime || '')) throw new Error('Envie uma imagem PNG, JPG, GIF, WEBP ou SVG.');
          const it = DriveApp.getRootFolder().getFoldersByName('Patrulha Lilás - Logos');
          const pasta = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('Patrulha Lilás - Logos');
          const f = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(req.logo.base64), req.logo.mime, 'logo' + (pos + 1)));
          f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          c.logos[pos] = 'https://lh3.googleusercontent.com/d/' + f.getId();
        }
        PROPS.setProperty('CONFIG', JSON.stringify(c));
        sh.appendRow([agora, email, req.logo.remover ? 'Removeu logo ' + (pos + 1) : 'Enviou logo ' + (pos + 1), 'Admin', '', c.logos[pos]]);
      }
      r = { ok: true, config: lerConfig_() };
    } else if (req.acao === 'efetivo') {
      const ef = abaEfetivo_();
      const p = req.dados || {};
      if (req.op === 'add' || req.op === 'del') {
        const re = limpa_(p.re).trim().toUpperCase();
        if (!re) throw new Error('Informe o RE.');
        const vals = ef.getDataRange().getDisplayValues();
        for (let i = vals.length - 1; i >= 1; i--) if (String(vals[i][1]).toUpperCase() === re) ef.deleteRow(i + 1);
        if (req.op === 'add') {
          if (!String(p.qra || '').trim()) throw new Error('Informe o QRA.');
          ef.appendRow([limpa_(p.grad).toUpperCase(), re, limpa_(p.qra).toUpperCase(), limpa_(p.cia)]);
        }
        sh.appendRow([agora, email, req.op === 'add' ? 'Cadastrou/alterou policial' : 'Apagou policial do efetivo', 'Efetivo',
          [p.grad, re, p.qra, p.cia].filter(String).join(' '), '']);
      }
      r = { ok: true, lista: lerEfetivo_(ef) };
    } else throw new Error('Ação inválida.');
  } catch (err) { r = { ok: false, erro: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

function emailDoToken_(token) {
  if (!token) return '';
  const res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return '';
  const j = JSON.parse(res.getContentText());
  return j.email_verified === 'true' || j.email_verified === true ? j.email : '';
}

/** Aba "Efetivo" na planilha do dono: lista de policiais usada nos seletores. */
function abaEfetivo_() {
  const ss = SpreadsheetApp.openById(PROPS.getProperty('LOG_ID'));
  let ef = ss.getSheetByName('Efetivo');
  if (!ef) {
    ef = ss.insertSheet('Efetivo');
    ef.appendRow(['GRAD', 'RE', 'QRA', 'CIA']);
    ef.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#6b4fa0').setFontColor('#ffffff');
    ef.setFrozenRows(1);
    const p = ef.protect().setDescription('Efetivo: alterar só pelo sistema');
    p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false);
  }
  return ef;
}
function lerEfetivo_(ef) {
  const n = ef.getLastRow();
  if (n < 2) return [];
  return ef.getRange(2, 1, n - 1, 4).getDisplayValues().map(l => ({ grad: l[0], re: l[1], qra: l[2], cia: l[3] }))
    .sort((a, b) => (a.cia + a.qra).localeCompare(b.cia + b.qra, 'pt'));
}

/* ============ FUNÇÕES CHAMADAS PELA TELA (rodam como o USUÁRIO) ============ */
function chamarRegistro_(payload) {
  const url = PROPS.getProperty('LOG_URL');
  if (!url) throw new Error('Registro não configurado. Avise o administrador.');
  payload.token = ScriptApp.getOAuthToken();
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true, followRedirects: true });
  const j = JSON.parse(res.getContentText());
  if (!j.ok) throw new Error(j.erro);
  return j;
}

function iniciar() {
  return { email: Session.getActiveUser().getEmail(), config: lerConfig_(), pasta: pasta_([]).getUrl() };
}

/** Salva relatório (PDF + dados) no Drive de quem está logado, organizado por módulo/mês. */
function salvarDocumento(modulo, titulo, html, dados) {
  const mes = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM');
  const pasta = pasta_([modulo, mes]);
  const nome = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HHmm') + ' - ' + limpa_(titulo).slice(0, 80);
  const doc = '<html><head><meta charset="utf-8"><style>' + CSS_PDF + '</style></head><body>' + html + '</body></html>';
  const pdf = pasta.createFile(Utilities.newBlob(doc, 'text/html', nome + '.html').getAs('application/pdf').setName(nome + '.pdf'));
  pasta.createFile(nome + '.json', JSON.stringify(dados || {}, null, 1), 'application/json');
  if (modulo === 'Ligações Mulher Segura' && dados) livroAdicionar_(dados);
  chamarRegistro_({ acao: 'registrar', dados: { acao: 'Criou documento', modulo: modulo, descricao: titulo, link: pdf.getUrl() } });
  return { url: pdf.getUrl(), pasta: pasta.getUrl() };
}

/** Lista arquivos do Drive do usuário dentro da pasta do sistema. */
function listarArquivos() {
  const raiz = pasta_([]), out = [];
  const varrer = (p, caminho) => {
    const fs = p.getFiles();
    while (fs.hasNext()) { const f = fs.next(); if (!/\.json$/.test(f.getName())) out.push({ nome: f.getName(), url: f.getUrl(), caminho: caminho, data: f.getDateCreated().getTime() }); }
    const ps = p.getFolders(); while (ps.hasNext()) { const s = ps.next(); varrer(s, caminho ? caminho + ' / ' + s.getName() : s.getName()); }
  };
  varrer(raiz, '');
  out.sort((a, b) => b.data - a.data);
  return { pasta: raiz.getUrl(), arquivos: out.slice(0, 300) };
}

/** Livro de Registro (planilha no Drive do usuário). */
function livroAdicionar_(d) {
  const sh = livro_();
  sh.appendRow([d.prot || '', d.dataBo || '', d.telefone || '', d.nome || '', d.natureza || '', d.resultado || '', d.aceitaVisita || '',
    d.dataVisita || '', d.re || '', d.qra || '', (d.data || '') + ' ' + (d.hora || ''), d.unidade || '', '']);
}
function lerLivro() {
  const sh = livro_(), n = sh.getLastRow();
  return { url: sh.getParent().getUrl(), linhas: n > 1 ? sh.getRange(2, 1, n - 1, 13).getDisplayValues() : [] };
}
function livro_() {
  const pasta = pasta_(['Livro de Registro']);
  const it = pasta.getFilesByName('Livro de Registro - Ligações');
  let ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create('Livro de Registro - Ligações');
    DriveApp.getFileById(ss.getId()).moveTo(pasta);
    ss.getActiveSheet().appendRow(['PROT', 'DATA', 'TELEFONE', 'NOME DA VÍTIMA', 'NATUREZA', 'RESULTADO DA LIGAÇÃO', 'ACEITA VISITA', 'DATA/HORA VISITA', 'RE DO POLICIAL', 'QRA', 'DATA/HORA DA LIGAÇÃO', 'UNIDADE', 'ASSINATURA']);
    ss.getActiveSheet().getRange(1, 1, 1, 13).setFontWeight('bold');
  }
  return ss.getSheets()[0];
}

function efetivo(op, dados) { return chamarRegistro_({ acao: 'efetivo', op: op, dados: dados || null }).lista; }
function lerRegistro() { return chamarRegistro_({ acao: 'listar' }); }
function registrarAcao(acao, modulo, descricao) { return chamarRegistro_({ acao: 'registrar', dados: { acao: acao, modulo: modulo, descricao: descricao } }); }
function adminEntrar(senha, config, logo) { return chamarRegistro_({ acao: 'admin', senha: senha, config: config || null, logo: logo || null }); }

/* ============ AUXILIARES ============ */
function pasta_(partes) {
  let p; const it = DriveApp.getRootFolder().getFoldersByName(PASTA_RAIZ);
  p = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(PASTA_RAIZ);
  partes.forEach(nome => { const i = p.getFoldersByName(nome); p = i.hasNext() ? i.next() : p.createFolder(nome); });
  return p;
}
function lerConfig_() {
  const padrao = { nome: 'Patrulha Lilás', batalhao: '', unidade: 'Polícia Militar do Estado de São Paulo', subunidade: 'Patrulha Mulher Segura', cidade: 'São Paulo', logos: ['', ''] };
  try { return Object.assign(padrao, JSON.parse(PROPS.getProperty('CONFIG') || '{}')); } catch (e) { return padrao; }
}
function limpa_(s) { s = String(s == null ? '' : s).slice(0, 2000); return /^[=+\-@]/.test(s) ? "'" + s : s; } // evita fórmula na planilha
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'pl#' + s)); }
function gerarSenha_() {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = '';
  for (let i = 0; i < 14; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

const CSS_PDF = 'body{font-family:Arial,sans-serif;font-size:11pt;color:#222}h1{font-size:15pt;color:#4b2e83;margin:0}h2{font-size:12pt;color:#4b2e83;border-bottom:1px solid #c9b8e8;padding-bottom:3px;margin-top:16px}' +
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;font-size:9.5pt;vertical-align:top}th{background:#efe8fa}.cab{text-align:center;border-bottom:2px solid #6b4fa0;padding-bottom:6px;margin-bottom:10px}.ass{margin-top:40px;text-align:center}';
