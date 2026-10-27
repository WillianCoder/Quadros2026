/**
 * Mulher Segura (visual e páginas) + Patrulha Lilás (registro, livro, escala, efetivo…)
 * Google Apps Script. O mesmo código é publicado DUAS vezes:
 *  1) "App"      → Executar como: usuário que acessa  (cada policial entra com a própria conta)
 *  2) "Registro" → Executar como: eu (dono)            (base central e registro que ninguém apaga)
 * A tela chama o App; o App repassa ao Registro com o login confirmado pelo Google.
 * Veja LEIA-ME.md para o passo a passo.
 */

const PROPS = PropertiesService.getScriptProperties();

/* ============ PÁGINA ============ */
function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.appName = lerConfig_().nome;
  return t.evaluate()
    .setTitle(lerConfig_().nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(nome) { return HtmlService.createHtmlOutputFromFile(nome).getContent(); }

/* ============ CONFIGURAÇÃO INICIAL (o dono roda 1 vez no editor) ============ */
function configurarInicial() {
  if (!PROPS.getProperty('LOG_ID')) {
    const ss = SpreadsheetApp.create('Patrulha Lilás — Registro de Auditoria (não editável)');
    const sh = ss.getActiveSheet().setName('Registro');
    sh.appendRow(['Data/hora', 'Conta Google', 'Ação', 'Módulo', 'Descrição', 'Link do arquivo']);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#6b4fa0').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    const p = sh.protect().setDescription('Registro permanente');
    p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false);
    DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    PROPS.setProperty('LOG_ID', ss.getId());
  }
  const base = getSpreadsheet_();
  setupSistema();
  Logger.log('Registro de auditoria: ' + SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getUrl());
  Logger.log('Base de dados Mulher Segura: ' + base.getUrl());
}

/** Depois de publicar a implantação "Registro", cole a URL dela aqui e rode uma vez. */
function definirUrlRegistro() {
  const url = 'COLE_AQUI_A_URL_DA_IMPLANTACAO_REGISTRO';
  if (url.indexOf('https://script.google.com/') !== 0) throw new Error('Cole a URL correta (termina em /exec).');
  PROPS.setProperty('LOG_URL', url);
  Logger.log('URL do registro salva.');
}

/* ============ REGISTRO (roda como DONO, recebe chamadas do app) ============ */
// Funções das páginas Mulher Segura que a tela pode chamar
const API_PERMITIDAS = ['getBootstrapData', 'salvarCadastroSala', 'getPendingContacts', 'salvarContatoVitima', 'getContactReportData',
  'getOpenVisits', 'salvarAcompanhamento', 'getConsulta', 'getOccurrenceSummary', 'salvarArquivos', 'excluirOcorrencia',
  'getDashboardData', 'getMapStatisticalData', 'geocodificarPendentesMapa', 'salvarLimitesMapaImportados', 'livroLer', 'livroEnviar'];
const API_SO_DONO = ['excluirOcorrencia', 'salvarLimitesMapaImportados'];

function doPost(e) {
  let r;
  try {
    const req = JSON.parse(e.postData.contents);
    const email = emailDoToken_(req.token);
    if (!email) throw new Error('Conta não identificada.');
    USUARIO_API_ = email.toLowerCase();
    const dono = ehDono_(USUARIO_API_);
    const quem = dono ? 'Administrador' : email;
    const sh = SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getSheetByName('Registro');
    const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');

    if (req.acao === 'api') {
      if (API_PERMITIDAS.indexOf(req.fn) < 0) throw new Error('Função não permitida.');
      if (API_SO_DONO.indexOf(req.fn) >= 0 && !dono) throw new Error('Somente o administrador pode fazer isso.');
      assertAuthorized_();
      const res = globalThis[req.fn].apply(null, req.args || []); // só nomes da lista acima
      r = { ok: true, res: res === undefined ? null : res };
    } else if (req.acao === 'souDono') {
      let liberado = true;
      try { assertAuthorized_(); } catch (x) { liberado = false; }
      r = { ok: true, dono: dono, liberado: liberado };
    } else if (req.acao === 'registrar') {
      assertAuthorized_();
      const d = req.dados || {};
      sh.appendRow([agora, quem, limpa_(d.acao), limpa_(d.modulo), limpa_(d.descricao), limpa_(d.link)]);
      r = { ok: true };
    } else if (req.acao === 'listar') {
      assertAuthorized_();
      const n = sh.getLastRow();
      const ini = Math.max(2, n - 499);
      const vals = n >= 2 ? sh.getRange(ini, 1, n - ini + 1, 6).getDisplayValues().reverse() : [];
      const donoEmail = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
      vals.forEach(l => { if (String(l[1]).toLowerCase() === donoEmail) l[1] = 'Administrador'; });
      r = { ok: true, linhas: vals, url: SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getUrl() };
    } else if (req.acao === 'admin') {
      // painel do administrador: só a conta dona (o login do Google é a senha)
      if (!dono) { sh.appendRow([agora, quem, 'Tentativa de acesso ao administrador', 'Admin', '', '']); throw new Error('Área restrita ao administrador.'); }
      if (req.config) {
        const c = lerConfig_();
        ['nome', 'batalhao', 'unidade', 'subunidade', 'cidade'].forEach(k => { if (req.config[k] != null) c[k] = String(req.config[k]).slice(0, 200); });
        PROPS.setProperty('CONFIG', JSON.stringify(c));
        sh.appendRow([agora, quem, 'Alterou configurações', 'Admin', 'Cabeçalho/unidade', '']);
      }
      if (req.acesso) {
        gravarAcesso_(req.acesso.emails, req.acesso.dominio);
        sh.appendRow([agora, quem, 'Alterou contas autorizadas', 'Admin', '', '']);
      }
      if (req.logo) {
        const c = lerConfig_();
        c.logos = c.logos || ['', ''];
        if (req.logo.remover) c.logos[0] = '';
        else {
          if (!/^image\/(png|jpeg|gif|webp)$/.test(req.logo.mime || '')) throw new Error('Envie uma imagem PNG, JPG, GIF ou WEBP.');
          const it = DriveApp.getRootFolder().getFoldersByName('Patrulha Lilás - Logos');
          const pasta = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('Patrulha Lilás - Logos');
          const f = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(req.logo.base64), req.logo.mime, 'marca'));
          f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          c.logos[0] = 'https://lh3.googleusercontent.com/d/' + f.getId();
        }
        PROPS.setProperty('CONFIG', JSON.stringify(c));
        sh.appendRow([agora, quem, req.logo.remover ? 'Removeu a imagem da marca' : 'Enviou imagem da marca', 'Admin', '', c.logos[0]]);
      }
      r = { ok: true, config: lerConfig_(), acesso: lerAcesso_(), base: getSpreadsheet_().getUrl() };
    } else if (req.acao === 'efetivo') {
      assertAuthorized_();
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
        sh.appendRow([agora, quem, req.op === 'add' ? 'Cadastrou/alterou policial' : 'Apagou policial do efetivo', 'Efetivo',
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

/** Grava no registro permanente (usado pelas páginas Mulher Segura; roda como dono). */
function registroDireto_(acao, modulo, descricao) {
  try {
    const sh = SpreadsheetApp.openById(PROPS.getProperty('LOG_ID')).getSheetByName('Registro');
    const email = getCurrentUserEmail_();
    sh.appendRow([Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'), ehDono_(email) ? 'Administrador' : email,
      limpa_(acao), limpa_(modulo), limpa_(descricao), '']);
  } catch (e) { console.error('Registro: ' + e.message); }
}

/** O envio do FONAR é feito pelo próprio app (Drive de quem anexou); não há uploader auxiliar. */
function getFonarUploaderUrl_() { return 'interno'; }

/* ============ LIVRO DE REGISTRO (central, roda como dono) ============ */
const LIVRO_COLS = ['PROT', 'DATA', 'TELEFONE', 'NOME DA VÍTIMA', 'NATUREZA', 'RESULTADO DA LIGAÇÃO', 'ACEITA VISITA', 'DATA/HORA VISITA', 'RE DO POLICIAL', 'QRA', 'DATA/HORA DA LIGAÇÃO', 'UNIDADE', 'ASSINATURA', 'ID'];
function abaLivro_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName('LIVRO DE REGISTRO');
  if (!sh) {
    sh = ss.insertSheet('LIVRO DE REGISTRO');
    sh.appendRow(LIVRO_COLS);
    sh.getRange(1, 1, 1, LIVRO_COLS.length).setFontWeight('bold').setBackground('#6b4fa0').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function fmtData_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || '');
}
function fmtDH_(v) { return v instanceof Date ? Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') : String(v || ''); }
function livroLer() {
  const sh = abaLivro_(), n = sh.getLastRow();
  const linhas = n > 1 ? sh.getRange(2, 1, n - 1, LIVRO_COLS.length).getDisplayValues() : [];
  const noLivro = {}; linhas.forEach(l => noLivro[l[13]] = 1);
  const pend = readAllRecords_().filter(r => r.id && !noLivro[r.id] && String(r.ligacaoRealizada).toUpperCase() === 'SIM')
    .map(r => [String(r.id), ('0000' + (r.numero || '')).slice(-5), fmtData_(r.dataOcorrencia), String(r.nomeVitima || ''), String(r.resultadoLigacao || '')]).reverse();
  return { linhas: linhas.map(l => l.slice(0, 13)), pendentes: pend, url: getSpreadsheet_().getUrl() + '#gid=' + sh.getSheetId() };
}
function livroEnviar(ids, pm) {
  const quer = {}; (ids || []).forEach(i => quer[String(i)] = 1);
  const sh = abaLivro_();
  pm = pm || {};
  readAllRecords_().forEach(r => {
    if (!quer[r.id]) return;
    sh.appendRow([('0000' + (r.numero || '')).slice(-5), fmtData_(r.dataOcorrencia), r.telefoneAtualizado || r.telefoneOriginal || '', r.nomeVitima || '',
      r.natureza || '', r.resultadoLigacao || '', r.desejaVisita || '', [fmtData_(r.dataVisita), String(r.horaVisita || '')].join(' ').trim(),
      pm.re || '', pm.qra || '', fmtDH_(r.contatoAtualizadoEm), r.cia || '', '', r.id].map(limpa_));
  });
  registroDireto_('Enviou ao livro de registro', 'Livro de Registro', Object.keys(quer).length + ' ocorrência(s)');
  return livroLer();
}

/* ============ EFETIVO (central, roda como dono) ============ */
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
  let j;
  try { j = JSON.parse(res.getContentText()); } catch (e) { throw new Error('O Registro não respondeu. Confira se a implantação "Registro" está ativa.'); }
  if (!j.ok) throw new Error(j.erro);
  return j;
}

/** Porta única das páginas Mulher Segura: repassa ao Registro com o login confirmado. */
function api(fn, args) { return chamarRegistro_({ acao: 'api', fn: String(fn), args: args || [] }).res; }

function iniciar() {
  let s = { dono: false, liberado: false };
  try { s = chamarRegistro_({ acao: 'souDono' }); } catch (e) { }
  return { email: Session.getActiveUser().getEmail(), config: lerConfig_(), dono: !!s.dono, liberado: !!s.liberado };
}

/** FONAR: salva no Drive de quem anexou (pasta "Mulher Segura - FONAR") e devolve o link. */
function uploadFonar(nome, mime, base64, ocorrencia) {
  if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(String(mime || ''))) throw new Error('Envie o FONAR em PDF ou imagem.');
  const bytes = Utilities.base64Decode(String(base64 || ''));
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Arquivo maior que 10 MB.');
  const it = DriveApp.getRootFolder().getFoldersByName('Mulher Segura - FONAR');
  const pasta = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('Mulher Segura - FONAR');
  const nomeFinal = 'FONAR ' + String(ocorrencia || '').replace(/[^\w-]/g, '').slice(0, 30) + ' - ' + String(nome || 'arquivo').slice(0, 80);
  const f = pasta.createFile(Utilities.newBlob(bytes, mime, nomeFinal));
  return { url: f.getUrl(), fileId: f.getId(), fileName: f.getName() };
}

function lerRegistro() { return chamarRegistro_({ acao: 'listar' }); }
function registrarAcao(acao, modulo, descricao) { return chamarRegistro_({ acao: 'registrar', dados: { acao: acao, modulo: modulo, descricao: descricao } }); }
function efetivo(op, dados) { return chamarRegistro_({ acao: 'efetivo', op: op, dados: dados || null }).lista; }
function adminEntrar(config, logo, acesso) { return chamarRegistro_({ acao: 'admin', config: config || null, logo: logo || null, acesso: acesso || null }); }

/** Salva a escala em PDF no Drive de quem gerou. */
function salvarEscala(titulo, html) {
  const it = DriveApp.getRootFolder().getFoldersByName('Mulher Segura - Escalas');
  const pasta = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('Mulher Segura - Escalas');
  const nome = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HHmm') + ' - ' + limpa_(titulo).slice(0, 80);
  const doc = '<html><head><meta charset="utf-8"><style>' + CSS_PDF + '</style></head><body>' + html + '</body></html>';
  const pdf = pasta.createFile(Utilities.newBlob(doc, 'text/html', nome + '.html').getAs('application/pdf').setName(nome + '.pdf'));
  registrarAcao('Salvou escala', 'Escala', limpa_(titulo));
  return { url: pdf.getUrl() };
}

/* ============ AUXILIARES ============ */
function lerConfig_() {
  const padrao = { nome: 'Mulher Segura', batalhao: '3º BPM/M', unidade: 'Polícia Militar do Estado de São Paulo', subunidade: 'Programa Mulher Segura', cidade: 'São Paulo', logos: ['', ''] };
  try { return Object.assign(padrao, JSON.parse(PROPS.getProperty('CONFIG') || '{}')); } catch (e) { return padrao; }
}
function limpa_(s) { s = String(s == null ? '' : s).slice(0, 2000); return /^[=+\-@]/.test(s) ? "'" + s : s; } // evita fórmula na planilha

const CSS_PDF = 'body{font-family:Arial,sans-serif;font-size:11pt;color:#222}h1{font-size:15pt;color:#4b2e83;margin:0}h2{font-size:12pt;color:#4b2e83;border-bottom:1px solid #c9b8e8;padding-bottom:3px;margin-top:16px}' +
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;font-size:9.5pt;vertical-align:top}th{background:#efe8fa}.cab{text-align:center;border-bottom:2px solid #6b4fa0;padding-bottom:6px;margin-bottom:10px}';
