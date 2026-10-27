/* ===================== Code ===================== */
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

/* ===================== Config ===================== */
/**
 * Configurações centrais do Sistema Mulher Segura.
 */
const APP_CONFIG = Object.freeze({
  APP_NAME: 'Programa Mulher Segura',
  DATA_SHEET_NAME: 'BASE MULHER SEGURA',
  SOURCE_SHEET_NAME: 'PATRULHA MULHER SEGURA',
  LOG_SHEET_NAME: 'LOG SISTEMA',
  VISIT_SHEET_NAME: 'AGENDA VISITAS',
  MAP_GEO_SHEET_NAME: 'MAPA GEOLOCALIZACAO',
  MAP_BOUNDARY_SHEET_NAME: 'MAPA LIMITES',
  MAP_MY_MAPS_ID: '1YDQ1s1tZ82zgJjgogmFEU_F2-AV7do8',
  MAP_MY_MAPS_LAYER_ID: 'EI4IzDt6otQ',
  MAP_VIEWER_URL: 'https://www.google.com/maps/d/u/0/edit?mid=1YDQ1s1tZ82zgJjgogmFEU_F2-AV7do8&ll=-23.625579382757905%2C-46.622671248002554&z=12',
  MAP_KML_URL: 'https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=1YDQ1s1tZ82zgJjgogmFEU_F2-AV7do8&lid=EI4IzDt6otQ',
  MAP_CENTER_LAT: -23.625579382757905,
  MAP_CENTER_LNG: -46.622671248002554,
  MAP_DEFAULT_ZOOM: 12,
  MAP_GEOCODE_BATCH: 20,
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  VISIT_HEADER_ROW: 1,
  VISIT_DATA_START_ROW: 2,
  TIME_ZONE: 'America/Sao_Paulo',
  VISIT_START_TIME: '13:00',
  VISIT_END_TIME: '19:00',
  MAX_VISITS_PER_OCCURRENCE: 3,
  SECOND_VISIT_MAX_DAYS: 20,
  // URL /exec do projeto auxiliar que envia o FONAR ao Drive do próprio usuário.
  // Pode ficar vazia se FONAR_USER_UPLOADER_URL estiver nas Propriedades do script.
  FONAR_USER_UPLOADER_URL: '',
  FONAR_MAX_BYTES: 10 * 1024 * 1024,
  PAGE_SIZE: 250,
  MAP_MAX_POINTS: 1500
});

const OPTIONS = Object.freeze({
  SIM_NAO: ['SIM', 'NÃO'],
  ORIGEM_REGISTRO: ['BOPM', 'BOPC', 'BOPM E BOPC', 'OUTRA FORMA'],
  NATUREZA: [
    'VIOLÊNCIA DOMÉSTICA',
    'AMEAÇA',
    'INJÚRIA',
    'LESÃO CORPORAL',
    'DESCUMPRIMENTO DE MEDIDA PROTETIVA',
    'PERSEGUIÇÃO',
    'DANO',
    'ESTUPRO',
    'VIAS DE FATO',
    'OUTROS'
  ],
  METODO_PESQUISA: [
    'FILTRO POR BOPM',
    'FILTRO POR BOPC',
    'FILTRO POR NOME DA VÍTIMA',
    'FILTRO POR NOME DO AUTOR',
    'RELATÓRIO/SISTEMA',
    'ENCAMINHAMENTO DE UNIDADE',
    'OUTROS'
  ],
  CIA: ['1ª CIA', '2ª CIA', '3ª CIA', 'OUTRA ÁREA'],
  TIPO_VISITA: [
    'VISITA SOLIDÁRIA',
    'VISITA COMUNITÁRIA',
    'VISITA SOLIDÁRIA A DISTÂNCIA (VIDEOCHAMADA)',
    'VISITA COMUNITÁRIA A DISTÂNCIA (VIDEOCHAMADA)'
  ],
  RESULTADO_LIGACAO: [
    'ATENDEU E ACEITOU O CONTATO',
    'ATENDEU E NÃO ACEITOU O CONTATO',
    'NÃO ATENDEU',
    'TELEFONE INVÁLIDO/SEM TELEFONE'
  ],
  STATUS_VISITA: ['SEM AGENDAMENTO', 'ABERTA', 'REALIZADA'],
  RESULTADO_VISITA: [
    'VISITA REALIZADA SEM ALTERAÇÕES',
    'ORIENTAÇÕES PRESTADAS',
    'ENCAMINHADA À DDM/DP',
    'ENCAMINHADA À REDE DE APOIO',
    'DESPACHADA VIATURA/ABORDAGEM',
    'VÍTIMA NÃO LOCALIZADA',
    'OUTRO'
  ],
  STATUS_CASO: ['AGUARDANDO CONTATO', 'CONTATO CONCLUÍDO', 'VISITA AGENDADA', 'CONCLUÍDO'],
  ORIGEM_AGENDAMENTO: ['CONTATO INICIAL', 'NOVA VISITA APÓS ACOMPANHAMENTO', 'MIGRAÇÃO DE DADOS']
});

/**
 * Uma única linha representa todo o fluxo da ocorrência.
 * A Sala de Operações preenche o bloco SALA; a Patrulha complementa CONTATO,
 * ACOMPANHAMENTO e ARQUIVOS.
 */
const FIELD_DEFINITIONS = Object.freeze([
  { key: 'id', label: 'ID', type: 'text', section: 'SISTEMA', readOnly: true },
  { key: 'numero', label: 'Nº', type: 'number', section: 'SISTEMA', readOnly: true },
  { key: 'dataOcorrencia', label: 'DATA', type: 'date', section: 'SALA', required: true },
  { key: 'qtr', label: 'QTR (HORA)', type: 'time', section: 'SALA', required: true },
  { key: 'origemRegistro', label: 'ORIGEM DO REGISTRO', type: 'select', options: OPTIONS.ORIGEM_REGISTRO, section: 'SALA', required: true },
  { key: 'bopm', label: 'BOPM', type: 'text', section: 'SALA' },
  { key: 'bopc', label: 'BOPC', type: 'text', section: 'SALA' },
  { key: 'nomeVitima', label: 'NOME DA VÍTIMA', type: 'text', section: 'SALA', required: true },
  { key: 'nomeAutor', label: 'NOME DO AUTOR', type: 'text', section: 'SALA' },
  { key: 'telefoneOriginal', label: 'CONTATO TELEFÔNICO DA VÍTIMA', type: 'tel', section: 'SALA', required: true },
  { key: 'natureza', label: 'NATUREZA DA OCORRÊNCIA', type: 'select', options: OPTIONS.NATUREZA, section: 'SALA', required: true },
  { key: 'autorPreso', label: 'AUTOR ESTÁ PRESO', type: 'select', options: OPTIONS.SIM_NAO, section: 'SALA', required: true },
  { key: 'medidaProtetiva', label: 'POSSUI MEDIDA PROTETIVA', type: 'select', options: OPTIONS.SIM_NAO, section: 'SALA', required: true },
  { key: 'numeroMedida', label: 'Nº DA MEDIDA PROTETIVA', type: 'text', section: 'SALA' },
  { key: 'reincidencia', label: 'HOUVE REINCIDÊNCIA', type: 'select', options: OPTIONS.SIM_NAO, section: 'SALA', required: true },
  { key: 'metodoPesquisa', label: 'MÉTODO DE PESQUISA', type: 'select', options: OPTIONS.METODO_PESQUISA, section: 'SALA', required: true },
  { key: 'cia', label: 'CIA DO ENDEREÇO', type: 'select', options: OPTIONS.CIA, section: 'SALA', required: true },
  { key: 'enderecoVitima', label: 'ENDEREÇO DA VÍTIMA', type: 'text', section: 'SALA', required: true },
  { key: 'bairro', label: 'BAIRRO', type: 'text', section: 'SALA', required: true },
  { key: 'breveHistorico', label: 'BREVE HISTÓRICO', type: 'textarea', section: 'SALA', required: true },
  { key: 'salaCriadoEm', label: 'CADASTRADO EM', type: 'datetime', section: 'SISTEMA', readOnly: true },
  { key: 'salaCriadoPor', label: 'CADASTRADO POR', type: 'text', section: 'SISTEMA', readOnly: true },

  { key: 'ligacaoRealizada', label: 'FOI REALIZADA LIGAÇÃO', type: 'select', options: OPTIONS.SIM_NAO, section: 'CONTATO' },
  { key: 'resultadoLigacao', label: 'RESULTADO DA LIGAÇÃO', type: 'select', options: OPTIONS.RESULTADO_LIGACAO, section: 'CONTATO' },
  { key: 'aceitouLigacao', label: 'VÍTIMA ACEITOU O CONTATO', type: 'select', options: OPTIONS.SIM_NAO, section: 'CONTATO' },
  { key: 'desejaVisita', label: 'VÍTIMA GOSTARIA DE VISITA', type: 'select', options: OPTIONS.SIM_NAO, section: 'CONTATO' },
  { key: 'tipoVisita', label: 'TIPO DE VISITA', type: 'select', options: OPTIONS.TIPO_VISITA, section: 'CONTATO' },
  { key: 'dataVisita', label: 'DIA DISPONÍVEL PARA VISITA', type: 'date', section: 'CONTATO' },
  { key: 'horaVisita', label: 'HORA DISPONÍVEL PARA VISITA', type: 'time', section: 'CONTATO' },
  { key: 'telefoneAtualizado', label: 'NOVO TELEFONE PARA CONTATO', type: 'tel', section: 'CONTATO' },
  { key: 'observacoesContato', label: 'OBSERVAÇÕES DO CONTATO', type: 'textarea', section: 'CONTATO' },
  { key: 'contatoAtualizadoEm', label: 'CONTATO ATUALIZADO EM', type: 'datetime', section: 'SISTEMA', readOnly: true },
  { key: 'contatoAtualizadoPor', label: 'CONTATO ATUALIZADO POR', type: 'text', section: 'SISTEMA', readOnly: true },

  { key: 'statusVisita', label: 'STATUS DA VISITA', type: 'select', options: OPTIONS.STATUS_VISITA, section: 'ACOMPANHAMENTO' },
  { key: 'visitaRealizada', label: 'VISITA REALIZADA', type: 'select', options: OPTIONS.SIM_NAO, section: 'ACOMPANHAMENTO' },
  { key: 'dataRealizacao', label: 'DATA DA REALIZAÇÃO', type: 'date', section: 'ACOMPANHAMENTO' },
  { key: 'horaRealizacao', label: 'HORA DA REALIZAÇÃO', type: 'time', section: 'ACOMPANHAMENTO' },
  { key: 'resultadoVisita', label: 'RESULTADO DA VISITA', type: 'select', options: OPTIONS.RESULTADO_VISITA, section: 'ACOMPANHAMENTO' },
  { key: 'observacoesVisita', label: 'OBSERVAÇÕES DA VISITA', type: 'textarea', section: 'ACOMPANHAMENTO' },
  { key: 'visitaAtualizadaEm', label: 'VISITA ATUALIZADA EM', type: 'datetime', section: 'SISTEMA', readOnly: true },
  { key: 'visitaAtualizadaPor', label: 'VISITA ATUALIZADA POR', type: 'text', section: 'SISTEMA', readOnly: true },

  { key: 'linksArquivos', label: 'LINKS DE ARQUIVOS', type: 'textarea', section: 'ARQUIVOS' },
  { key: 'observacoesArquivos', label: 'OBSERVAÇÕES DOS ARQUIVOS', type: 'textarea', section: 'ARQUIVOS' },
  { key: 'arquivosAtualizadosEm', label: 'ARQUIVOS ATUALIZADOS EM', type: 'datetime', section: 'SISTEMA', readOnly: true },
  { key: 'arquivosAtualizadosPor', label: 'ARQUIVOS ATUALIZADOS POR', type: 'text', section: 'SISTEMA', readOnly: true },
  { key: 'ultimaAtualizacao', label: 'ÚLTIMA ATUALIZAÇÃO', type: 'datetime', section: 'SISTEMA', readOnly: true },
  { key: 'statusCaso', label: 'STATUS DO CASO', type: 'select', options: OPTIONS.STATUS_CASO, section: 'SISTEMA', readOnly: true }
]);

const FIELD_BY_KEY = Object.freeze(FIELD_DEFINITIONS.reduce(function(map, field, index) {
  map[field.key] = Object.assign({}, field, { column: index + 1 });
  return map;
}, {}));

const HEADERS = Object.freeze(FIELD_DEFINITIONS.map(function(field) { return field.label; }));
const TOTAL_COLUMNS = FIELD_DEFINITIONS.length;

const SALA_FIELDS = Object.freeze(FIELD_DEFINITIONS.filter(function(field) { return field.section === 'SALA'; }));
const CONTATO_FIELDS = Object.freeze(FIELD_DEFINITIONS.filter(function(field) { return field.section === 'CONTATO'; }));


/**
 * Cada linha desta aba representa uma visita individual. Assim, uma mesma
 * ocorrência pode ter várias visitas sem apagar o histórico anterior.
 */
const VISIT_FIELD_DEFINITIONS = Object.freeze([
  { key: 'visitId', label: 'ID DA VISITA', type: 'text' },
  { key: 'occurrenceId', label: 'ID DA OCORRÊNCIA', type: 'text' },
  { key: 'sequencia', label: 'Nº DA VISITA', type: 'number' },
  { key: 'origemAgendamento', label: 'ORIGEM DO AGENDAMENTO', type: 'select', options: OPTIONS.ORIGEM_AGENDAMENTO },
  { key: 'tipoVisita', label: 'TIPO DE VISITA', type: 'select', options: OPTIONS.TIPO_VISITA },
  { key: 'dataAgendada', label: 'DATA AGENDADA', type: 'date' },
  { key: 'horaAgendada', label: 'HORA AGENDADA', type: 'time' },
  { key: 'statusVisita', label: 'STATUS DA VISITA', type: 'select', options: ['ABERTA', 'REALIZADA'] },
  { key: 'dataRealizacao', label: 'DATA DA REALIZAÇÃO', type: 'date' },
  { key: 'horaRealizacao', label: 'HORA DA REALIZAÇÃO', type: 'time' },
  { key: 'resultadoVisita', label: 'RESULTADO DA VISITA', type: 'select', options: OPTIONS.RESULTADO_VISITA },
  { key: 'observacoesVisita', label: 'OBSERVAÇÕES DA VISITA', type: 'textarea' },
  { key: 'criadoEm', label: 'CRIADO EM', type: 'datetime' },
  { key: 'criadoPor', label: 'CRIADO POR', type: 'text' },
  { key: 'atualizadoEm', label: 'ATUALIZADO EM', type: 'datetime' },
  { key: 'atualizadoPor', label: 'ATUALIZADO POR', type: 'text' },
  { key: 'fonarPreenchido', label: 'FONAR PREENCHIDO', type: 'select', options: OPTIONS.SIM_NAO },
  { key: 'fonarArquivoNome', label: 'ARQUIVO FONAR - NOME', type: 'text' },
  { key: 'fonarArquivoUrl', label: 'ARQUIVO FONAR - LINK', type: 'text' },
  { key: 'fonarArquivoId', label: 'ARQUIVO FONAR - ID DRIVE', type: 'text' },
  { key: 'boeComplementarRealizado', label: 'BO-e DE VISITA COMPLEMENTAR REALIZADO', type: 'select', options: OPTIONS.SIM_NAO },
  { key: 'numeroBoeComplementar', label: 'Nº DO BO-e DE VISITA COMPLEMENTAR', type: 'text' }
]);

const VISIT_FIELD_BY_KEY = Object.freeze(VISIT_FIELD_DEFINITIONS.reduce(function(map, field, index) {
  map[field.key] = Object.assign({}, field, { column: index + 1 });
  return map;
}, {}));
const VISIT_HEADERS = Object.freeze(VISIT_FIELD_DEFINITIONS.map(function(field) { return field.label; }));
const VISIT_TOTAL_COLUMNS = VISIT_FIELD_DEFINITIONS.length;


/**
 * Cache de geolocalização: evita repetir consultas de endereço ao serviço
 * de mapas e mantém os dados cartográficos separados da base operacional.
 */
const MAP_GEO_FIELD_DEFINITIONS = Object.freeze([
  { key: 'occurrenceId', label: 'ID DA OCORRÊNCIA', type: 'text' },
  { key: 'addressQuery', label: 'ENDEREÇO PESQUISADO', type: 'text' },
  { key: 'latitude', label: 'LATITUDE', type: 'number' },
  { key: 'longitude', label: 'LONGITUDE', type: 'number' },
  { key: 'formattedAddress', label: 'ENDEREÇO FORMATADO', type: 'text' },
  { key: 'status', label: 'STATUS', type: 'text' },
  { key: 'updatedAt', label: 'ATUALIZADO EM', type: 'datetime' }
]);

const MAP_GEO_FIELD_BY_KEY = Object.freeze(MAP_GEO_FIELD_DEFINITIONS.reduce(function(map, field, index) {
  map[field.key] = Object.assign({}, field, { column: index + 1 });
  return map;
}, {}));
const MAP_GEO_HEADERS = Object.freeze(MAP_GEO_FIELD_DEFINITIONS.map(function(field) { return field.label; }));
const MAP_GEO_TOTAL_COLUMNS = MAP_GEO_FIELD_DEFINITIONS.length;

/**
 * Limites territoriais importados do mapa público do CPC. Cada linha guarda
 * um polígono ou linha pertencente à 1ª, 2ª ou 3ª Cia do 12º BPM/M.
 */
const MAP_BOUNDARY_HEADERS = Object.freeze([
  'CIA', 'TIPO', 'COORDENADAS JSON', 'NOME NA FONTE', 'ATUALIZADO EM'
]);
const MAP_COMPANIES = Object.freeze(['1ª CIA', '2ª CIA', '3ª CIA']);

/* ===================== Security ===================== */
/**
 * Controle de acesso.
 * O e-mail de quem usa o sistema é confirmado pelo Google (token) no Registro.
 * O dono (conta que publicou) sempre tem acesso; os demais precisam estar
 * liberados no painel do Administrador (lista de e-mails ou domínio).
 */
var USUARIO_API_ = '';

function getCurrentUserEmail_() {
  return String(USUARIO_API_ || Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function ehDono_(email) {
  const dono = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  return !!email && email === dono;
}

function assertAuthorized_() {
  const email = getCurrentUserEmail_();
  if (!email) throw new Error('Não foi possível identificar sua conta Google. Entre com uma conta Google e tente de novo.');
  if (ehDono_(email)) return true;
  const properties = PropertiesService.getScriptProperties();
  const allowedEmails = String(properties.getProperty('ALLOWED_EMAILS') || '')
    .split(/[\s,;]+/).map(function(value) { return value.trim().toLowerCase(); }).filter(String);
  const allowedDomain = String(properties.getProperty('ALLOWED_DOMAIN') || '').replace(/^@/, '').trim().toLowerCase();
  if (allowedEmails.indexOf(email) >= 0) return true;
  if (allowedDomain && email.endsWith('@' + allowedDomain)) return true;
  throw new Error('ACESSO_NEGADO: a conta ' + email + ' ainda não foi liberada. Peça ao administrador para autorizar seu e-mail.');
}

function lerAcesso_() {
  const properties = PropertiesService.getScriptProperties();
  return {
    emails: String(properties.getProperty('ALLOWED_EMAILS') || ''),
    dominio: String(properties.getProperty('ALLOWED_DOMAIN') || '')
  };
}

function gravarAcesso_(emails, dominio) {
  const lista = String(emails || '').split(/[\s,;]+/).map(function(v) { return v.trim().toLowerCase(); })
    .filter(function(v) { return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(v); });
  const dom = String(dominio || '').replace(/^@/, '').trim().toLowerCase();
  if (dom && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom)) throw new Error('Domínio inválido.');
  PropertiesService.getScriptProperties().setProperties({ ALLOWED_EMAILS: lista.join(','), ALLOWED_DOMAIN: dom });
  return lerAcesso_();
}

/* ===================== Setup ===================== */
/**
 * Execute uma vez após cadastrar SPREADSHEET_ID nas Propriedades do script.
 * A planilha original é preservada; o sistema usa a aba BASE MULHER SEGURA.
 */
function setupSistema() {
  assertAuthorized_();
  const spreadsheet = getSpreadsheet_();
  const sheet = ensureDataSheet_(spreadsheet);
  const logSheet = ensureLogSheet_(spreadsheet);
  const visitSheet = ensureVisitSheet_(spreadsheet);
  const mapGeoSheet = ensureMapGeoSheet_(spreadsheet);
  const mapBoundarySheet = ensureMapBoundarySheet_(spreadsheet);
  const migrated = migrateSourceSheetIfNeeded_(spreadsheet, sheet);
  const migratedVisits = syncExistingVisits_(sheet, visitSheet);
  formatDataSheet_(sheet);
  formatLogSheet_(logSheet);
  formatVisitSheet_(visitSheet);
  formatMapGeoSheet_(mapGeoSheet);
  formatMapBoundarySheet_(mapBoundarySheet);
  const mapBoundaryStatus = getMapBoundaryStatus_(mapBoundarySheet);
  const importedBoundaries = mapBoundaryStatus.total;
  const mapBoundaryWarning = mapBoundaryStatus.ready
    ? ''
    : 'Importe uma única vez o KML/KMZ completo na Página 6. Depois disso os limites serão carregados automaticamente.';
  const correctedVisitTimes = syncOpenVisitTimesFromBase_(sheet, visitSheet);
  return {
    message: 'Sistema preparado com sucesso.',
    spreadsheetName: spreadsheet.getName(),
    dataSheet: sheet.getName(),
    visitSheet: visitSheet.getName(),
    migratedRecords: migrated,
    migratedVisits: migratedVisits,
    correctedVisitTimes: correctedVisitTimes,
    importedBoundaries: importedBoundaries,
    mapBoundaryWarning: mapBoundaryWarning,
    mapBoundaryStatus: mapBoundaryStatus
  };
}

function configurarPlanilha(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Informe o ID da planilha.');
  SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
  return 'Planilha configurada com sucesso.';
}

function getSpreadsheet_() {
  const id = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);
  // primeira vez: cria a base central no Drive do dono (o Registro roda como o dono)
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const again = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
    if (again) return SpreadsheetApp.openById(again);
    const ss = SpreadsheetApp.create('Mulher Segura — Base de dados (não editar à mão)');
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  } finally { lock.releaseLock(); }
}

function ensureSystemReady_() {
  const spreadsheet = getSpreadsheet_();
  const dataSheet = ensureDataSheet_(spreadsheet);
  ensureLogSheet_(spreadsheet);
  const visitSheet = ensureVisitSheet_(spreadsheet);
  ensureMapGeoSheet_(spreadsheet);
  ensureMapBoundarySheet_(spreadsheet);
  syncExistingVisits_(dataSheet, visitSheet);
}

function getDataSheet_() {
  return ensureDataSheet_(getSpreadsheet_());
}

function getVisitSheet_() {
  return ensureVisitSheet_(getSpreadsheet_());
}

function ensureDataSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.DATA_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.DATA_SHEET_NAME);

  if (sheet.getMaxColumns() < TOTAL_COLUMNS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), TOTAL_COLUMNS - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 1000) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 1000 - sheet.getMaxRows());
  }

  const currentHeaders = sheet.getRange(APP_CONFIG.HEADER_ROW, 1, 1, TOTAL_COLUMNS).getDisplayValues()[0];
  if (currentHeaders.join('|') !== HEADERS.join('|')) {
    const hasMeaningfulData = sheet.getLastRow() >= APP_CONFIG.DATA_START_ROW &&
      sheet.getRange(APP_CONFIG.DATA_START_ROW, 1, Math.max(1, sheet.getLastRow() - 1), Math.min(sheet.getLastColumn(), TOTAL_COLUMNS))
        .getDisplayValues().some(function(row) { return row.some(function(value) { return String(value).trim(); }); });
    if (hasMeaningfulData && currentHeaders.some(String)) {
      const backupName = 'BACKUP BASE ' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss');
      sheet.copyTo(spreadsheet).setName(backupName);
      sheet.clear();
    }
    sheet.getRange(APP_CONFIG.HEADER_ROW, 1, 1, TOTAL_COLUMNS).setValues([HEADERS]);
  }
  return sheet;
}

function ensureLogSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.LOG_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.LOG_SHEET_NAME);
  const headers = ['DATA/HORA', 'USUÁRIO', 'AÇÃO', 'ID', 'DETALHE'];
  if (sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0].join('|') !== headers.join('|')) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}


function ensureVisitSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.VISIT_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.VISIT_SHEET_NAME);

  if (sheet.getMaxColumns() < VISIT_TOTAL_COLUMNS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), VISIT_TOTAL_COLUMNS - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 1000) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 1000 - sheet.getMaxRows());
  }

  const currentHeaders = sheet.getRange(APP_CONFIG.VISIT_HEADER_ROW, 1, 1, VISIT_TOTAL_COLUMNS).getDisplayValues()[0];
  if (currentHeaders.join('|') !== VISIT_HEADERS.join('|')) {
    // Atualização segura do esquema: quando novas colunas são acrescentadas no fim,
    // preserva todas as visitas existentes e apenas completa os novos cabeçalhos.
    let existingHeaderCount = currentHeaders.length;
    while (existingHeaderCount > 0 && !String(currentHeaders[existingHeaderCount - 1] || '').trim()) existingHeaderCount--;
    const existingHeaders = currentHeaders.slice(0, existingHeaderCount);
    const expectedPrefix = VISIT_HEADERS.slice(0, existingHeaderCount);
    const isSafeAppend = existingHeaderCount > 0 && existingHeaders.join('|') === expectedPrefix.join('|');

    if (!isSafeAppend) {
      const hasMeaningfulData = sheet.getLastRow() >= APP_CONFIG.VISIT_DATA_START_ROW &&
        sheet.getRange(APP_CONFIG.VISIT_DATA_START_ROW, 1, Math.max(1, sheet.getLastRow() - 1), Math.min(sheet.getLastColumn(), VISIT_TOTAL_COLUMNS))
          .getDisplayValues().some(function(row) { return row.some(function(value) { return String(value).trim(); }); });
      if (hasMeaningfulData && currentHeaders.some(String)) {
        const backupName = 'BACKUP VISITAS ' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss');
        sheet.copyTo(spreadsheet).setName(backupName);
        sheet.clear();
      }
    }
    sheet.getRange(APP_CONFIG.VISIT_HEADER_ROW, 1, 1, VISIT_TOTAL_COLUMNS).setValues([VISIT_HEADERS]);
  }
  return sheet;
}


function ensureMapGeoSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.MAP_GEO_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.MAP_GEO_SHEET_NAME);
  if (sheet.getMaxColumns() < MAP_GEO_TOTAL_COLUMNS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), MAP_GEO_TOTAL_COLUMNS - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 1000) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 1000 - sheet.getMaxRows());
  }
  const headers = sheet.getRange(1, 1, 1, MAP_GEO_TOTAL_COLUMNS).getDisplayValues()[0];
  if (headers.join('|') !== MAP_GEO_HEADERS.join('|')) {
    if (sheet.getLastRow() > 1) {
      const backupName = 'BACKUP MAPA GEO ' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss');
      sheet.copyTo(spreadsheet).setName(backupName);
    }
    sheet.clear();
    sheet.getRange(1, 1, 1, MAP_GEO_TOTAL_COLUMNS).setValues([MAP_GEO_HEADERS]);
  }
  return sheet;
}

function ensureMapBoundarySheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.MAP_BOUNDARY_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.MAP_BOUNDARY_SHEET_NAME);
  if (sheet.getMaxColumns() < MAP_BOUNDARY_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), MAP_BOUNDARY_HEADERS.length - sheet.getMaxColumns());
  }
  const headers = sheet.getRange(1, 1, 1, MAP_BOUNDARY_HEADERS.length).getDisplayValues()[0];
  if (headers.join('|') !== MAP_BOUNDARY_HEADERS.join('|')) {
    if (sheet.getLastRow() > 1) {
      const backupName = 'BACKUP MAPA LIMITES ' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss');
      sheet.copyTo(spreadsheet).setName(backupName);
    }
    sheet.clear();
    sheet.getRange(1, 1, 1, MAP_BOUNDARY_HEADERS.length).setValues([MAP_BOUNDARY_HEADERS]);
  }
  return sheet;
}

function formatMapGeoSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, MAP_GEO_TOTAL_COLUMNS)
    .setBackground('#7a3fa0').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setWrap(true);
  sheet.setRowHeight(1, 40);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 360);
  sheet.setColumnWidths(3, 2, 125);
  sheet.setColumnWidth(5, 360);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 170);
  sheet.getRange(2, 3, Math.max(1, sheet.getMaxRows() - 1), 2).setNumberFormat('0.000000');
  sheet.getRange(2, 7, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), MAP_GEO_TOTAL_COLUMNS).createFilter();
}

function formatMapBoundarySheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, MAP_BOUNDARY_HEADERS.length)
    .setBackground('#5d2e7c').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setWrap(true);
  sheet.setRowHeight(1, 40);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 520);
  sheet.setColumnWidth(4, 260);
  sheet.setColumnWidth(5, 170);
  sheet.getRange(2, 5, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), MAP_BOUNDARY_HEADERS.length).createFilter();
}

function formatVisitSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, VISIT_TOTAL_COLUMNS)
    .setBackground('#6f3a93').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 42);
  VISIT_FIELD_DEFINITIONS.forEach(function(field, index) {
    const col = index + 1;
    let width = 135;
    if (field.type === 'textarea') width = 300;
    if (field.type === 'date' || field.type === 'time') width = 115;
    if (field.key === 'visitId' || field.key === 'occurrenceId') width = 185;
    sheet.setColumnWidth(col, width);
    if (field.type === 'date') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy');
    if (field.type === 'datetime') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (field.type === 'time') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('HH:mm');
    if (field.options) {
      const validation = SpreadsheetApp.newDataValidation().requireValueInList(field.options, true).setAllowInvalid(false).build();
      sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(validation);
    }
  });
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), VISIT_TOTAL_COLUMNS).createFilter();
}

/**
 * Migra para a agenda as visitas que já existiam na BASE MULHER SEGURA antes
 * da criação do histórico individual. A verificação pelo ID da ocorrência
 * impede que a migração seja repetida.
 */
function syncExistingVisits_(dataSheet, visitSheet) {
  const visits = readAllVisits_(visitSheet);
  const occurrenceIds = {};
  visits.forEach(function(visit) { occurrenceIds[String(visit.occurrenceId || '')] = true; });
  const now = new Date();
  const rows = [];

  readAllRecords_(dataSheet).forEach(function(record) {
    if (!record.id || occurrenceIds[String(record.id)]) return;
    if (['ABERTA', 'REALIZADA'].indexOf(String(record.statusVisita || '')) < 0) return;
    const visit = {
      visitId: generateVisitId_(),
      occurrenceId: record.id,
      sequencia: 1,
      origemAgendamento: 'MIGRAÇÃO DE DADOS',
      tipoVisita: record.tipoVisita,
      dataAgendada: record.dataVisita,
      horaAgendada: record.horaVisita,
      statusVisita: record.statusVisita,
      dataRealizacao: record.dataRealizacao,
      horaRealizacao: record.horaRealizacao,
      resultadoVisita: record.resultadoVisita,
      observacoesVisita: record.observacoesVisita || record.observacoesContato,
      criadoEm: record.contatoAtualizadoEm || record.salaCriadoEm || now,
      criadoPor: record.contatoAtualizadoPor || record.salaCriadoPor || 'MIGRAÇÃO DE DADOS',
      atualizadoEm: record.visitaAtualizadaEm || record.ultimaAtualizacao || now,
      atualizadoPor: record.visitaAtualizadaPor || 'MIGRAÇÃO DE DADOS'
    };
    rows.push(visitToRow_(visit));
  });

  if (rows.length) {
    const startRow = Math.max(visitSheet.getLastRow() + 1, APP_CONFIG.VISIT_DATA_START_ROW);
    visitSheet.getRange(startRow, 1, rows.length, VISIT_TOTAL_COLUMNS).setValues(rows);
  }
  return rows.length;
}

function formatDataSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, TOTAL_COLUMNS)
    .setBackground('#7a3fa0').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 42);
  sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), TOTAL_COLUMNS).setVerticalAlignment('top');

  FIELD_DEFINITIONS.forEach(function(field, index) {
    const col = index + 1;
    let width = 130;
    if (field.type === 'textarea') width = 280;
    if (field.type === 'date' || field.type === 'time') width = 105;
    if (field.key === 'nomeVitima' || field.key === 'nomeAutor' || field.key === 'enderecoVitima') width = 210;
    if (field.key === 'id') width = 125;
    sheet.setColumnWidth(col, width);
    if (field.type === 'date') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy');
    if (field.type === 'datetime') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (field.type === 'time') sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('HH:mm');
    if (field.options) {
      const validation = SpreadsheetApp.newDataValidation().requireValueInList(field.options, true).setAllowInvalid(false).build();
      sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(validation);
    }
  });
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), TOTAL_COLUMNS).createFilter();
}

function formatLogSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 5).setBackground('#5d2e7c').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidths(1, 5, 160);
  sheet.setColumnWidth(5, 320);
}

function migrateSourceSheetIfNeeded_(spreadsheet, targetSheet) {
  if (targetSheet.getLastRow() >= APP_CONFIG.DATA_START_ROW) return 0;
  const source = spreadsheet.getSheetByName(APP_CONFIG.SOURCE_SHEET_NAME);
  if (!source || source.getLastRow() < 8) return 0;

  const sourceHeaders = source.getRange(7, 1, 1, source.getLastColumn()).getDisplayValues()[0];
  const values = source.getRange(8, 1, source.getLastRow() - 7, source.getLastColumn()).getValues();
  const headerMap = {};
  sourceHeaders.forEach(function(header, index) { headerMap[normalizeKey_(header)] = index; });
  const migrated = [];

  values.forEach(function(row) {
    const get = function(label) {
      const idx = headerMap[normalizeKey_(label)];
      return idx === undefined ? '' : row[idx];
    };
    const name = get('NOME DA VÍTIMA');
    const date = get('DATA');
    if (!name && !date) return;

    const now = new Date();
    const tipoAntigo = normalizeText_(get('TIPO DE CONTATO/VISITA'));
    const resultadoAntigo = normalizeText_(get('RESULTADO DO ATENDIMENTO'));
    const links = [get('LINK BOPC'), get('LINK BOPM'), get('LINK FOTOS/ÁLBUM'), get('LINK RELATÓRIO DE VISITA'), get('LINK OUTROS DOCUMENTOS')]
      .filter(function(value) { return String(value || '').trim(); }).join('\n');
    const tipoVisita = tipoAntigo.indexOf('SOLIDARIA') >= 0 ? 'VISITA SOLIDÁRIA' :
      (tipoAntigo.indexOf('COMUNITARIA') >= 0 ? 'VISITA COMUNITÁRIA' : '');
    const visitaRealizada = resultadoAntigo.indexOf('VISITA REALIZADA') >= 0 ? 'SIM' : '';
    const desejaVisita = get('ACEITOU VISITA');
    const statusVisita = visitaRealizada === 'SIM' ? 'REALIZADA' : (normalizeText_(desejaVisita) === 'SIM' && tipoVisita ? 'ABERTA' : 'SEM AGENDAMENTO');
    const statusCaso = visitaRealizada === 'SIM' ? 'CONCLUÍDO' : (statusVisita === 'ABERTA' ? 'VISITA AGENDADA' : 'AGUARDANDO CONTATO');

    const record = {
      id: String(get('ID') || generateId_()),
      numero: Number(get('Nº')) || migrated.length + 1,
      dataOcorrencia: date,
      qtr: get('QTR'),
      origemRegistro: get('BOPM') && get('BOPC') ? 'BOPM E BOPC' : (get('BOPM') ? 'BOPM' : (get('BOPC') ? 'BOPC' : 'OUTRA FORMA')),
      bopm: get('BOPM'), bopc: get('BOPC'), nomeVitima: name, nomeAutor: get('NOME DO AUTOR'),
      telefoneOriginal: get('CONTATO'), natureza: get('NATUREZA'), autorPreso: get('AUTOR PRESO'),
      medidaProtetiva: get('MEDIDA PROTETIVA'), numeroMedida: get('Nº DA MEDIDA'), reincidencia: get('REINCIDÊNCIA'),
      metodoPesquisa: get('MÉTODO DE PESQUISA'), cia: get('CIA'), enderecoVitima: get('ENDEREÇO'), bairro: get('BAIRRO'),
      breveHistorico: get('BREVE HISTÓRICO'), salaCriadoEm: now, salaCriadoPor: 'MIGRAÇÃO DA PLANILHA',
      ligacaoRealizada: get('ACEITOU LIGAÇÃO') ? 'SIM' : '', aceitouLigacao: get('ACEITOU LIGAÇÃO'), desejaVisita: desejaVisita,
      tipoVisita: tipoVisita, telefoneAtualizado: get('CONTATO'), observacoesContato: get('OBSERVAÇÕES'),
      statusVisita: statusVisita, visitaRealizada: visitaRealizada, resultadoVisita: resultadoAntigo,
      linksArquivos: links, ultimaAtualizacao: now, statusCaso: statusCaso
    };
    migrated.push(recordToRow_(record));
  });

  if (migrated.length) targetSheet.getRange(2, 1, migrated.length, TOTAL_COLUMNS).setValues(migrated);
  return migrated.length;
}

/* ===================== DataService ===================== */
function salvarCadastroSala(payload) {
  assertAuthorized_();
  payload = payload || {};
  validateSalaPayload_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getDataSheet_();
    const records = readAllRecords_(sheet);
    const duplicate = findDuplicate_(records, payload);
    if (duplicate) {
      throw new Error('Cadastro não realizado: já existe uma ocorrência para esta vítima no mesmo dia' +
        (duplicate.bopm ? ' (BOPM ' + duplicate.bopm + ')' : '') +
        (duplicate.bopc ? ' (BOPC ' + duplicate.bopc + ')' : '') + '.');
    }

    const now = new Date();
    const record = {};
    SALA_FIELDS.forEach(function(field) {
      record[field.key] = coerceFieldValue_(field, payload[field.key]);
    });
    record.id = generateId_();
    record.numero = getNextNumber_(records);
    record.salaCriadoEm = now;
    record.salaCriadoPor = getCurrentUserEmail_() || 'USUÁRIO NÃO IDENTIFICADO';
    record.statusVisita = 'SEM AGENDAMENTO';
    record.visitaRealizada = 'NÃO';
    record.statusCaso = 'AGUARDANDO CONTATO';
    record.ultimaAtualizacao = now;

    const targetRow = Math.max(sheet.getLastRow() + 1, APP_CONFIG.DATA_START_ROW);
    sheet.getRange(targetRow, 1, 1, TOTAL_COLUMNS).setValues([recordToRow_(record)]);
    audit_('CADASTRO SALA', record.id, 'Nova ocorrência cadastrada sem dados sensíveis no log.');

    return {
      success: true,
      message: 'Cadastro realizado com sucesso.',
      id: record.id,
      numero: record.numero
    };
  } finally {
    lock.releaseLock();
  }
}

function getPendingContacts(filters) {
  assertAuthorized_();
  const search = normalizeText_((filters || {}).search || '');
  return readAllRecords_().filter(function(record) {
    if (record.statusCaso !== 'AGUARDANDO CONTATO') return false;
    if (!search) return true;
    return [record.nomeVitima, record.nomeAutor, record.bopm, record.bopc, record.telefoneOriginal]
      .some(function(value) { return normalizeText_(value).indexOf(search) >= 0; });
  }).sort(function(a, b) {
    return dateNumber_(b.dataOcorrencia) - dateNumber_(a.dataOcorrencia);
  }).slice(0, APP_CONFIG.PAGE_SIZE).map(projectContactRecord_);
}

function salvarContatoVitima(payload) {
  assertAuthorized_();
  payload = payload || {};
  const id = String(payload.id || '').trim();
  if (!id) throw new Error('Selecione uma ocorrência para registrar o contato.');
  if (OPTIONS.SIM_NAO.indexOf(payload.ligacaoRealizada) < 0) throw new Error('Informe se a ligação foi realizada.');

  if (payload.ligacaoRealizada === 'SIM') {
    if (OPTIONS.RESULTADO_LIGACAO.indexOf(payload.resultadoLigacao) < 0) throw new Error('Informe o resultado da ligação.');
    if (OPTIONS.SIM_NAO.indexOf(payload.aceitouLigacao) < 0) throw new Error('Informe se a vítima aceitou o contato.');
    if (OPTIONS.SIM_NAO.indexOf(payload.desejaVisita) < 0) throw new Error('Informe se a vítima gostaria de uma visita.');
    if (payload.desejaVisita === 'SIM') {
      if (OPTIONS.TIPO_VISITA.indexOf(payload.tipoVisita) < 0) throw new Error('Selecione o tipo de visita.');
      if (!payload.dataVisita || !payload.horaVisita) throw new Error('Informe o dia e a hora disponíveis para a visita.');
      validateVisitTime_(payload.horaVisita, 'O horário da visita');
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getDataSheet_();
    const visitSheet = getVisitSheet_();
    const rowNumber = findRowById_(sheet, id);
    if (!rowNumber) throw new Error('Ocorrência não localizada. Atualize a página e tente novamente.');
    const record = readRecordAtRow_(sheet, rowNumber);
    const now = new Date();

    record.ligacaoRealizada = payload.ligacaoRealizada;
    record.resultadoLigacao = safeCellValue_(payload.resultadoLigacao);
    record.aceitouLigacao = safeCellValue_(payload.aceitouLigacao);
    record.desejaVisita = safeCellValue_(payload.desejaVisita);
    record.tipoVisita = safeCellValue_(payload.tipoVisita);
    record.dataVisita = parseDateInput_(payload.dataVisita);
    record.horaVisita = formatTimeInput_(payload.horaVisita);
    record.telefoneAtualizado = safeCellValue_(payload.telefoneAtualizado);
    record.observacoesContato = safeCellValue_(payload.observacoesContato);
    record.contatoAtualizadoEm = now;
    record.contatoAtualizadoPor = getCurrentUserEmail_() || 'USUÁRIO NÃO IDENTIFICADO';
    record.ultimaAtualizacao = now;

    if (payload.ligacaoRealizada !== 'SIM') {
      record.statusCaso = 'AGUARDANDO CONTATO';
      record.statusVisita = 'SEM AGENDAMENTO';
      record.visitaRealizada = 'NÃO';
    } else if (payload.desejaVisita === 'SIM') {
      record.statusCaso = 'VISITA AGENDADA';
      record.statusVisita = 'ABERTA';
      record.visitaRealizada = 'NÃO';

      const visits = readAllVisits_(visitSheet);
      const openVisit = visits.find(function(visit) {
        return String(visit.occurrenceId) === id && visit.statusVisita === 'ABERTA';
      });
      if (!openVisit) {
        const nextSequence = getNextVisitSequence_(visits, id);
        if (nextSequence > APP_CONFIG.MAX_VISITS_PER_OCCURRENCE) {
          throw new Error('Esta ocorrência já atingiu o limite máximo de 3 visitas.');
        }
        appendVisit_(visitSheet, {
          visitId: generateVisitId_(),
          occurrenceId: id,
          sequencia: nextSequence,
          origemAgendamento: 'CONTATO INICIAL',
          tipoVisita: record.tipoVisita,
          dataAgendada: record.dataVisita,
          horaAgendada: record.horaVisita,
          statusVisita: 'ABERTA',
          observacoesVisita: record.observacoesContato,
          criadoEm: now,
          criadoPor: record.contatoAtualizadoPor,
          atualizadoEm: now,
          atualizadoPor: record.contatoAtualizadoPor
        });
      }
    } else {
      record.statusCaso = 'CONTATO CONCLUÍDO';
      record.statusVisita = 'SEM AGENDAMENTO';
      record.visitaRealizada = 'NÃO';
      record.tipoVisita = '';
      record.dataVisita = '';
      record.horaVisita = '';
    }

    sheet.getRange(rowNumber, 1, 1, TOTAL_COLUMNS).setValues([recordToRow_(record)]);
    audit_('CONTATO COM VÍTIMA', id, 'Informações complementares de contato atualizadas.');
    return { success: true, message: 'Contato cadastrado com sucesso.', id: id, statusCaso: record.statusCaso };
  } finally {
    lock.releaseLock();
  }
}

function getContactReportData(filters) {
  assertAuthorized_();
  filters = filters || {};
  const requestedIds = Array.isArray(filters.ids) ? filters.ids : [];
  const ids = requestedIds.map(function(value) { return String(value || '').trim(); }).filter(Boolean);
  const search = String(filters.search || '').trim();
  if (!ids.length) {
    return {
      generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm'),
      generatedBy: getCurrentUserEmail_() || 'CONTA GOOGLE',
      filterLabel: search ? 'PESQUISA: ' + search : 'TODAS AS OCORRÊNCIAS PENDENTES EXIBIDAS',
      summary: { total: 0, contatosPreenchidos: 0, ligacoesRealizadas: 0, aceitaramContato: 0, solicitaramVisita: 0 },
      records: []
    };
  }

  const idOrder = {};
  ids.forEach(function(id, index) { idOrder[id] = index; });
  const records = readAllRecords_().filter(function(record) {
    const id = String(record.id || '').trim();
    return Object.prototype.hasOwnProperty.call(idOrder, id) && String(record.statusCaso || '') === 'AGUARDANDO CONTATO';
  }).sort(function(a, b) {
    return idOrder[String(a.id || '')] - idOrder[String(b.id || '')];
  });

  const projected = records.map(function(record) {
    return {
      id: String(record.id || ''),
      dataOcorrencia: formatDateBr_(record.dataOcorrencia),
      qtr: formatTimeInput_(record.qtr),
      bopm: String(record.bopm || ''),
      bopc: String(record.bopc || ''),
      nomeVitima: String(record.nomeVitima || ''),
      nomeAutor: String(record.nomeAutor || ''),
      telefoneOriginal: String(record.telefoneOriginal || ''),
      telefoneAtualizado: String(record.telefoneAtualizado || ''),
      natureza: String(record.natureza || ''),
      autorPreso: String(record.autorPreso || ''),
      medidaProtetiva: String(record.medidaProtetiva || ''),
      numeroMedida: String(record.numeroMedida || ''),
      cia: String(record.cia || ''),
      enderecoVitima: String(record.enderecoVitima || ''),
      bairro: String(record.bairro || ''),
      breveHistorico: String(record.breveHistorico || ''),
      ligacaoRealizada: String(record.ligacaoRealizada || ''),
      resultadoLigacao: String(record.resultadoLigacao || ''),
      aceitouLigacao: String(record.aceitouLigacao || ''),
      desejaVisita: String(record.desejaVisita || ''),
      tipoVisita: String(record.tipoVisita || ''),
      dataVisita: formatDateBr_(record.dataVisita),
      horaVisita: formatTimeInput_(record.horaVisita),
      observacoesContato: String(record.observacoesContato || ''),
      contatoAtualizadoEm: formatDateTime_(record.contatoAtualizadoEm),
      contatoAtualizadoPor: String(record.contatoAtualizadoPor || '')
    };
  });

  const summary = projected.reduce(function(total, record) {
    total.total += 1;
    if (record.ligacaoRealizada || record.resultadoLigacao || record.aceitouLigacao || record.desejaVisita || record.observacoesContato) total.contatosPreenchidos += 1;
    if (record.ligacaoRealizada === 'SIM') total.ligacoesRealizadas += 1;
    if (record.aceitouLigacao === 'SIM') total.aceitaramContato += 1;
    if (record.desejaVisita === 'SIM') total.solicitaramVisita += 1;
    return total;
  }, { total: 0, contatosPreenchidos: 0, ligacoesRealizadas: 0, aceitaramContato: 0, solicitaramVisita: 0 });

  return {
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm'),
    generatedBy: getCurrentUserEmail_() || 'CONTA GOOGLE',
    filterLabel: search ? 'PESQUISA: ' + search : 'TODAS AS OCORRÊNCIAS PENDENTES EXIBIDAS',
    summary: summary,
    records: projected
  };
}

function getOpenVisits(filters) {
  assertAuthorized_();
  const search = normalizeText_((filters || {}).search || '');
  const cia = String((filters || {}).cia || '').trim();
  const dataSheet = getDataSheet_();
  const visitSheet = getVisitSheet_();
  syncExistingVisits_(dataSheet, visitSheet);
  syncOpenVisitTimesFromBase_(dataSheet, visitSheet);

  const recordsById = {};
  readAllRecords_(dataSheet).forEach(function(record) { recordsById[String(record.id)] = record; });
  const allVisits = readAllVisits_(visitSheet);

  return allVisits.filter(function(visit) {
    if (visit.statusVisita !== 'ABERTA') return false;
    const record = recordsById[String(visit.occurrenceId)];
    if (!record) return false;
    if (cia && record.cia !== cia) return false;
    if (!search) return true;
    return [record.nomeVitima, record.nomeAutor, record.enderecoVitima, record.bairro, record.telefoneAtualizado, record.telefoneOriginal]
      .some(function(value) { return normalizeText_(value).indexOf(search) >= 0; });
  }).sort(function(a, b) {
    const dateDiff = dateNumber_(a.dataAgendada) - dateNumber_(b.dataAgendada);
    return dateDiff || formatTimeInput_(a.horaAgendada).localeCompare(formatTimeInput_(b.horaAgendada));
  }).slice(0, APP_CONFIG.PAGE_SIZE).map(function(visit) {
    const output = projectVisitAgendaRecord_(visit, recordsById[String(visit.occurrenceId)]);
    if (Number(visit.sequencia) === 2) {
      const previousVisit = allVisits.find(function(item) {
        return String(item.occurrenceId) === String(visit.occurrenceId) && Number(item.sequencia) === 1;
      });
      const referenceDate = previousVisit ? (asDate_(previousVisit.dataRealizacao) || asDate_(previousVisit.dataAgendada)) : null;
      if (referenceDate) {
        const deadline = addDays_(referenceDate, APP_CONFIG.SECOND_VISIT_MAX_DAYS);
        output.secondVisitReferenceDate = formatDateInput_(referenceDate);
        output.secondVisitDeadline = formatDateInput_(deadline);
        output.secondVisitDaysRemaining = daysFromToday_(deadline);
      }
    }
    return output;
  });
}

function salvarAcompanhamento(payload) {
  assertAuthorized_();
  payload = payload || {};
  const visitId = String(payload.visitId || payload.id || '').trim();
  if (!visitId) throw new Error('Selecione uma visita.');
  const status = String(payload.statusVisita || '').trim();
  if (['ABERTA', 'REALIZADA'].indexOf(status) < 0) throw new Error('Informe se a visita permanece aberta ou foi realizada.');

  if (status === 'ABERTA') {
    if (OPTIONS.TIPO_VISITA.indexOf(payload.tipoVisita) < 0) throw new Error('Selecione o tipo da visita.');
    if (!payload.dataVisita || !payload.horaVisita) throw new Error('Informe a data e a hora agendadas.');
    validateVisitTime_(payload.horaVisita, 'O horário agendado');
  }

  const novaVisita = status === 'REALIZADA' && String(payload.novaVisita || 'NÃO') === 'SIM';
  if (status === 'REALIZADA') {
    if (!payload.dataRealizacao || !payload.horaRealizacao) throw new Error('Informe a data e a hora da realização da visita.');
    if (OPTIONS.RESULTADO_VISITA.indexOf(payload.resultadoVisita) < 0) throw new Error('Informe o resultado da visita.');
    if (OPTIONS.SIM_NAO.indexOf(String(payload.fonarPreenchido || '')) < 0) throw new Error('Informe se o formulário FONAR foi preenchido.');
    if (!String(payload.numeroBoeComplementar || '').trim()) {
      throw new Error('Não é possível concluir a visita sem informar o Nº do BO-e de visita complementar.');
    }
    if (novaVisita) {
      if (OPTIONS.TIPO_VISITA.indexOf(payload.proximoTipoVisita) < 0) throw new Error('Selecione o tipo da próxima visita.');
      if (!payload.proximaDataVisita || !payload.proximaHoraVisita) throw new Error('Informe a data e a hora da próxima visita.');
      validateVisitTime_(payload.proximaHoraVisita, 'O horário da próxima visita');
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const dataSheet = getDataSheet_();
    const visitSheet = getVisitSheet_();
    const visitRowNumber = findVisitRowById_(visitSheet, visitId);
    if (!visitRowNumber) throw new Error('Visita não localizada. Atualize a página e tente novamente.');

    const visit = readVisitAtRow_(visitSheet, visitRowNumber);
    const occurrenceId = String(visit.occurrenceId || payload.occurrenceId || '').trim();
    if (status === 'REALIZADA' && String(payload.fonarPreenchido || '') === 'SIM') {
      const fonarUrl = String(payload.fonarArquivoUrl || visit.fonarArquivoUrl || '').trim();
      if (!fonarUrl) throw new Error('Anexe o formulário FONAR antes de concluir a visita.');
    }
    const recordRowNumber = findRowById_(dataSheet, occurrenceId);
    if (!recordRowNumber) throw new Error('Ocorrência vinculada à visita não foi localizada.');
    const record = readRecordAtRow_(dataSheet, recordRowNumber);
    const now = new Date();
    const user = getCurrentUserEmail_() || 'USUÁRIO NÃO IDENTIFICADO';

    visit.tipoVisita = safeCellValue_(payload.tipoVisita) || visit.tipoVisita;
    visit.dataAgendada = parseDateInput_(payload.dataVisita) || visit.dataAgendada;
    visit.horaAgendada = formatTimeInput_(payload.horaVisita) || formatTimeInput_(visit.horaAgendada);
    visit.observacoesVisita = safeCellValue_(payload.observacoesVisita);
    visit.statusVisita = status;
    visit.atualizadoEm = now;
    visit.atualizadoPor = user;

    record.visitaAtualizadaEm = now;
    record.visitaAtualizadaPor = user;
    record.ultimaAtualizacao = now;

    let nextVisit = null;
    const allVisits = readAllVisits_(visitSheet);
    const nextVisitSequence = getNextVisitSequence_(allVisits, occurrenceId);
    if (novaVisita && nextVisitSequence > APP_CONFIG.MAX_VISITS_PER_OCCURRENCE) {
      throw new Error('Limite atingido: são permitidas no máximo 3 visitas para cada ocorrência. Conclua a 3ª visita sem gerar uma nova.');
    }
    if (novaVisita && nextVisitSequence === 2) {
      const realizedDate = asDate_(payload.dataRealizacao);
      const nextDate = asDate_(payload.proximaDataVisita);
      const maxDate = realizedDate ? addDays_(realizedDate, APP_CONFIG.SECOND_VISIT_MAX_DAYS) : null;
      if (realizedDate && nextDate && nextDate < realizedDate) {
        throw new Error('A 2ª visita não pode ser agendada antes da realização da 1ª visita.');
      }
      if (maxDate && nextDate && nextDate > maxDate) {
        throw new Error('A 2ª visita deve ser agendada em até ' + APP_CONFIG.SECOND_VISIT_MAX_DAYS + ' dias após a realização da 1ª visita. Data-limite: ' + formatDateBr_(maxDate) + '.');
      }
    }

    if (status === 'REALIZADA') {
      visit.dataRealizacao = parseDateInput_(payload.dataRealizacao);
      visit.horaRealizacao = safeCellValue_(payload.horaRealizacao);
      visit.resultadoVisita = safeCellValue_(payload.resultadoVisita);
      visit.fonarPreenchido = safeCellValue_(payload.fonarPreenchido);
      visit.boeComplementarRealizado = 'SIM';
      visit.numeroBoeComplementar = safeCellValue_(String(payload.numeroBoeComplementar || '').trim());
      if (visit.fonarPreenchido === 'SIM') {
        visit.fonarArquivoNome = safeCellValue_(payload.fonarArquivoNome) || visit.fonarArquivoNome;
        visit.fonarArquivoUrl = safeCellValue_(payload.fonarArquivoUrl) || visit.fonarArquivoUrl;
        visit.fonarArquivoId = safeCellValue_(payload.fonarArquivoId) || visit.fonarArquivoId;
      } else {
        visit.fonarArquivoNome = '';
        visit.fonarArquivoUrl = '';
        visit.fonarArquivoId = '';
      }

      record.dataRealizacao = visit.dataRealizacao;
      record.horaRealizacao = visit.horaRealizacao;
      record.resultadoVisita = visit.resultadoVisita;
      record.observacoesVisita = visit.observacoesVisita;

      if (novaVisita) {
        nextVisit = {
          visitId: generateVisitId_(),
          occurrenceId: occurrenceId,
          sequencia: nextVisitSequence,
          origemAgendamento: 'NOVA VISITA APÓS ACOMPANHAMENTO',
          tipoVisita: safeCellValue_(payload.proximoTipoVisita),
          dataAgendada: parseDateInput_(payload.proximaDataVisita),
          horaAgendada: formatTimeInput_(payload.proximaHoraVisita),
          statusVisita: 'ABERTA',
          observacoesVisita: safeCellValue_(payload.observacoesProximaVisita),
          criadoEm: now,
          criadoPor: user,
          atualizadoEm: now,
          atualizadoPor: user
        };
        appendVisit_(visitSheet, nextVisit);

        record.statusVisita = 'ABERTA';
        record.visitaRealizada = 'NÃO';
        record.tipoVisita = nextVisit.tipoVisita;
        record.dataVisita = nextVisit.dataAgendada;
        record.horaVisita = nextVisit.horaAgendada;
        record.statusCaso = 'VISITA AGENDADA';
      } else {
        record.statusVisita = 'REALIZADA';
        record.visitaRealizada = 'SIM';
        record.tipoVisita = visit.tipoVisita;
        record.dataVisita = visit.dataAgendada;
        record.horaVisita = visit.horaAgendada;
        record.statusCaso = 'CONCLUÍDO';
      }
    } else {
      visit.dataRealizacao = '';
      visit.horaRealizacao = '';
      visit.resultadoVisita = '';
      record.statusVisita = 'ABERTA';
      record.visitaRealizada = 'NÃO';
      record.tipoVisita = visit.tipoVisita;
      record.dataVisita = visit.dataAgendada;
      record.horaVisita = visit.horaAgendada;
      record.statusCaso = 'VISITA AGENDADA';
      record.observacoesVisita = visit.observacoesVisita;
    }

    visitSheet.getRange(visitRowNumber, 1, 1, VISIT_TOTAL_COLUMNS).setValues([visitToRow_(visit)]);
    dataSheet.getRange(recordRowNumber, 1, 1, TOTAL_COLUMNS).setValues([recordToRow_(record)]);

    const detail = status === 'REALIZADA'
      ? (nextVisit ? 'Visita concluída e nova visita agendada.' : 'Visita concluída.')
      : 'Visita mantida em aberto e agenda atualizada.';
    audit_('ACOMPANHAMENTO', occurrenceId, detail);

    return {
      success: true,
      message: status === 'REALIZADA'
        ? (nextVisit ? 'Visita concluída e nova visita agendada com sucesso.' : 'Visita concluída com sucesso.')
        : 'Acompanhamento e agendamento atualizados com sucesso.',
      id: occurrenceId,
      visitId: visitId,
      nextVisitId: nextVisit ? nextVisit.visitId : ''
    };
  } finally {
    lock.releaseLock();
  }
}

function getConsulta(filters) {
  assertAuthorized_();
  filters = filters || {};
  const year = Number(filters.year || 0);
  const month = Number(filters.month || 0);
  const search = normalizeText_(filters.search || '');
  const onlyFiles = filters.onlyFiles === true || String(filters.onlyFiles) === 'true';
  const legacyVisitCount = String(filters.visitCount === undefined ? '' : filters.visitCount).trim();
  const requestedVisitCounts = Array.isArray(filters.visitCounts)
    ? filters.visitCounts
    : (legacyVisitCount ? [legacyVisitCount] : []);
  const selectedVisitCounts = requestedVisitCounts
    .map(function(value) { return Number(value); })
    .filter(function(value, index, array) {
      return value >= 1 && value <= APP_CONFIG.MAX_VISITS_PER_OCCURRENCE && array.indexOf(value) === index;
    });

  const dataSheet = getDataSheet_();
  const visitSheet = getVisitSheet_();
  syncExistingVisits_(dataSheet, visitSheet);

  const realizedVisitsByOccurrence = {};
  readAllVisits_(visitSheet).forEach(function(visit) {
    if (normalizeText_(visit.statusVisita || '') !== 'REALIZADA') return;
    const occurrenceId = String(visit.occurrenceId || '').trim();
    if (!occurrenceId) return;
    realizedVisitsByOccurrence[occurrenceId] = Math.min(
      (realizedVisitsByOccurrence[occurrenceId] || 0) + 1,
      APP_CONFIG.MAX_VISITS_PER_OCCURRENCE
    );
  });

  return readAllRecords_(dataSheet).filter(function(record) {
    const date = asDate_(record.dataOcorrencia);
    const agendaCount = Number(realizedVisitsByOccurrence[String(record.id)] || 0);
    const legacyCount = normalizeText_(record.visitaRealizada || '') === 'SIM' ? 1 : 0;
    const realizedCount = Math.min(Math.max(agendaCount, legacyCount), APP_CONFIG.MAX_VISITS_PER_OCCURRENCE);
    if (year && (!date || date.getFullYear() !== year)) return false;
    if (month && (!date || date.getMonth() + 1 !== month)) return false;
    if (onlyFiles && !hasFiles_(record.linksArquivos)) return false;
    if (selectedVisitCounts.length && selectedVisitCounts.indexOf(realizedCount) < 0) return false;
    if (search && [record.nomeVitima, record.nomeAutor, record.bopm, record.bopc]
      .every(function(value) { return normalizeText_(value).indexOf(search) < 0; })) return false;
    return true;
  }).sort(function(a, b) {
    return dateNumber_(b.dataOcorrencia) - dateNumber_(a.dataOcorrencia);
  }).slice(0, APP_CONFIG.PAGE_SIZE).map(function(record) {
    const agendaCount = Number(realizedVisitsByOccurrence[String(record.id)] || 0);
    const legacyCount = normalizeText_(record.visitaRealizada || '') === 'SIM' ? 1 : 0;
    const realizedCount = Math.min(Math.max(agendaCount, legacyCount), APP_CONFIG.MAX_VISITS_PER_OCCURRENCE);
    return projectConsultRecord_(record, realizedCount);
  });
}

function getOccurrenceSummary(id) {
  assertAuthorized_();
  id = String(id || '').trim();
  if (!id) throw new Error('Ocorrência não informada.');
  const dataSheet = getDataSheet_();
  const visitSheet = getVisitSheet_();
  syncExistingVisits_(dataSheet, visitSheet);
  const rowNumber = findRowById_(dataSheet, id);
  if (!rowNumber) throw new Error('Ocorrência não localizada.');
  const record = readRecordAtRow_(dataSheet, rowNumber);
  const visits = readAllVisits_(visitSheet).filter(function(visit) {
    return String(visit.occurrenceId || '') === id;
  }).sort(function(a, b) { return (Number(a.sequencia) || 0) - (Number(b.sequencia) || 0); }).map(function(visit) {
    return {
      visitId: String(visit.visitId || ''),
      sequencia: Number(visit.sequencia) || 1,
      tipoVisita: String(visit.tipoVisita || ''),
      dataAgendada: formatDateBr_(visit.dataAgendada),
      horaAgendada: formatTimeInput_(visit.horaAgendada),
      statusVisita: String(visit.statusVisita || ''),
      dataRealizacao: formatDateBr_(visit.dataRealizacao),
      horaRealizacao: formatTimeInput_(visit.horaRealizacao),
      resultadoVisita: String(visit.resultadoVisita || ''),
      observacoesVisita: String(visit.observacoesVisita || ''),
      fonarPreenchido: String(visit.fonarPreenchido || ''),
      fonarArquivoNome: String(visit.fonarArquivoNome || ''),
      fonarArquivoUrl: String(visit.fonarArquivoUrl || ''),
      boeComplementarRealizado: String(visit.boeComplementarRealizado || ''),
      numeroBoeComplementar: String(visit.numeroBoeComplementar || '')
    };
  });
  return {
    id: String(record.id || ''),
    dataOcorrencia: formatDateBr_(record.dataOcorrencia),
    qtr: formatTimeInput_(record.qtr),
    bopm: String(record.bopm || ''),
    bopc: String(record.bopc || ''),
    nomeVitima: String(record.nomeVitima || ''),
    nomeAutor: String(record.nomeAutor || ''),
    telefone: String(record.telefoneAtualizado || record.telefoneOriginal || ''),
    natureza: String(record.natureza || ''),
    cia: String(record.cia || ''),
    endereco: [record.enderecoVitima, record.bairro].filter(Boolean).join(' – '),
    breveHistorico: String(record.breveHistorico || ''),
    statusCaso: String(record.statusCaso || ''),
    resultadoLigacao: String(record.resultadoLigacao || ''),
    aceitouLigacao: String(record.aceitouLigacao || ''),
    desejaVisita: String(record.desejaVisita || ''),
    links: splitLinks_(record.linksArquivos),
    visits: visits
  };
}

function salvarArquivos(payload) {
  assertAuthorized_();
  payload = payload || {};
  const id = String(payload.id || '').trim();
  if (!id) throw new Error('Selecione uma ocorrência.');
  const links = normalizeLinks_(payload.linksArquivos);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getDataSheet_();
    const rowNumber = findRowById_(sheet, id);
    if (!rowNumber) throw new Error('Ocorrência não localizada.');
    const record = readRecordAtRow_(sheet, rowNumber);
    const now = new Date();
    record.linksArquivos = links;
    record.observacoesArquivos = safeCellValue_(payload.observacoesArquivos);
    record.arquivosAtualizadosEm = now;
    record.arquivosAtualizadosPor = getCurrentUserEmail_() || 'USUÁRIO NÃO IDENTIFICADO';
    record.ultimaAtualizacao = now;
    sheet.getRange(rowNumber, 1, 1, TOTAL_COLUMNS).setValues([recordToRow_(record)]);
    audit_('ARQUIVOS', id, links ? 'Links de arquivos atualizados.' : 'Links de arquivos removidos.');
    return { success: true, message: 'Arquivos vinculados com sucesso.', id: id, links: splitLinks_(links) };
  } finally {
    lock.releaseLock();
  }
}


function excluirOcorrencia(payload) {
  assertAuthorized_();
  payload = payload || {};
  const id = String(payload.id || '').trim();
  if (!id) throw new Error('Selecione uma ocorrência para excluir.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const dataSheet = getDataSheet_();
    const visitSheet = getVisitSheet_();
    const rowNumber = findRowById_(dataSheet, id);
    if (!rowNumber) throw new Error('Ocorrência não localizada. Atualize a consulta e tente novamente.');
    const record = readRecordAtRow_(dataSheet, rowNumber);

    const visitRows = [];
    const visitLastRow = visitSheet.getLastRow();
    if (visitLastRow >= APP_CONFIG.VISIT_DATA_START_ROW) {
      const ids = visitSheet.getRange(APP_CONFIG.VISIT_DATA_START_ROW, 2, visitLastRow - APP_CONFIG.VISIT_HEADER_ROW, 1).getValues();
      ids.forEach(function(row, index) {
        if (String(row[0] || '').trim() === id) {
          visitRows.push(APP_CONFIG.VISIT_DATA_START_ROW + index);
        }
      });
    }

    visitRows.sort(function(a, b) { return b - a; }).forEach(function(row) {
      visitSheet.deleteRow(row);
    });
    dataSheet.deleteRow(rowNumber);
    audit_('EXCLUSÃO DE OCORRÊNCIA', id, 'Ocorrência excluída via página de consulta. Vítima: ' + safeAuditText_(record.nomeVitima || 'NÃO INFORMADA') + '. Visitas removidas: ' + visitRows.length + '.');
    return { success: true, message: 'Ocorrência excluída com sucesso.', id: id, removedVisits: visitRows.length };
  } finally {
    lock.releaseLock();
  }
}

function safeAuditText_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function validateSalaPayload_(payload) {
  SALA_FIELDS.forEach(function(field) {
    if (field.required && !String(payload[field.key] || '').trim()) throw new Error('Preencha o campo “' + field.label + '”.');
    if (field.options && payload[field.key] && field.options.indexOf(payload[field.key]) < 0) throw new Error('Valor inválido em “' + field.label + '”.');
  });
  if (payload.medidaProtetiva === 'SIM' && !String(payload.numeroMedida || '').trim()) {
    throw new Error('Informe o número da medida protetiva.');
  }
  if (['BOPM', 'BOPM E BOPC'].indexOf(payload.origemRegistro) >= 0 && !String(payload.bopm || '').trim()) {
    throw new Error('Informe o número do BOPM.');
  }
  if (['BOPC', 'BOPM E BOPC'].indexOf(payload.origemRegistro) >= 0 && !String(payload.bopc || '').trim()) {
    throw new Error('Informe o número do BOPC.');
  }
}

function findDuplicate_(records, payload) {
  const dateKey = dateKey_(parseDateInput_(payload.dataOcorrencia));
  const victimKey = normalizeText_(payload.nomeVitima);
  const bopmKey = normalizeDocument_(payload.bopm);
  const bopcKey = normalizeDocument_(payload.bopc);
  return records.find(function(record) {
    if (dateKey_(record.dataOcorrencia) !== dateKey) return false;
    const sameVictim = victimKey && normalizeText_(record.nomeVitima) === victimKey;
    const sameBopm = bopmKey && normalizeDocument_(record.bopm) === bopmKey;
    const sameBopc = bopcKey && normalizeDocument_(record.bopc) === bopcKey;
    return sameVictim || sameBopm || sameBopc;
  });
}

function readAllRecords_(sheet) {
  sheet = sheet || getDataSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < APP_CONFIG.DATA_START_ROW) return [];
  const range = sheet.getRange(APP_CONFIG.DATA_START_ROW, 1, lastRow - APP_CONFIG.HEADER_ROW, TOTAL_COLUMNS);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values.map(function(row, index) {
    return rowToRecord_(row, displayValues[index]);
  }).filter(function(record) { return record.id || record.nomeVitima || record.dataOcorrencia; });
}

function readRecordAtRow_(sheet, rowNumber) {
  const range = sheet.getRange(rowNumber, 1, 1, TOTAL_COLUMNS);
  return rowToRecord_(range.getValues()[0], range.getDisplayValues()[0]);
}

function rowToRecord_(row, displayRow) {
  const record = {};
  FIELD_DEFINITIONS.forEach(function(field, index) {
    record[field.key] = field.type === 'time'
      ? timeCellValue_(row[index], displayRow && displayRow[index])
      : row[index];
  });
  return record;
}

function recordToRow_(record) {
  return FIELD_DEFINITIONS.map(function(field) {
    const value = record[field.key];
    if (field.type === 'date') return parseDateInput_(value) || '';
    if (field.type === 'datetime') return value instanceof Date ? value : (value ? new Date(value) : '');
    if (field.type === 'number') return value === '' || value === null || value === undefined ? '' : Number(value);
    if (field.type === 'time') return formatTimeInput_(value);
    return safeCellValue_(value);
  });
}

function readAllVisits_(sheet) {
  sheet = sheet || getVisitSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < APP_CONFIG.VISIT_DATA_START_ROW) return [];
  const range = sheet.getRange(APP_CONFIG.VISIT_DATA_START_ROW, 1, lastRow - APP_CONFIG.VISIT_HEADER_ROW, VISIT_TOTAL_COLUMNS);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  return values.map(function(row, index) {
    return visitRowToRecord_(row, displayValues[index]);
  }).filter(function(visit) { return visit.visitId || visit.occurrenceId; });
}

function readVisitAtRow_(sheet, rowNumber) {
  const range = sheet.getRange(rowNumber, 1, 1, VISIT_TOTAL_COLUMNS);
  return visitRowToRecord_(range.getValues()[0], range.getDisplayValues()[0]);
}

function visitRowToRecord_(row, displayRow) {
  const visit = {};
  VISIT_FIELD_DEFINITIONS.forEach(function(field, index) {
    visit[field.key] = field.type === 'time'
      ? timeCellValue_(row[index], displayRow && displayRow[index])
      : row[index];
  });
  return visit;
}

function visitToRow_(visit) {
  return VISIT_FIELD_DEFINITIONS.map(function(field) {
    const value = visit[field.key];
    if (field.type === 'date') return parseDateInput_(value) || '';
    if (field.type === 'datetime') return value instanceof Date ? value : (value ? new Date(value) : '');
    if (field.type === 'number') return value === '' || value === null || value === undefined ? '' : Number(value);
    if (field.type === 'time') return formatTimeInput_(value);
    return safeCellValue_(value);
  });
}

function appendVisit_(sheet, visit) {
  const targetRow = Math.max(sheet.getLastRow() + 1, APP_CONFIG.VISIT_DATA_START_ROW);
  sheet.getRange(targetRow, 1, 1, VISIT_TOTAL_COLUMNS).setValues([visitToRow_(visit)]);
  return visit;
}

function findRowById_(sheet, id) {
  const idColumn = FIELD_BY_KEY.id.column;
  const lastRow = sheet.getLastRow();
  if (lastRow < APP_CONFIG.DATA_START_ROW) return 0;
  const match = sheet.getRange(APP_CONFIG.DATA_START_ROW, idColumn, lastRow - APP_CONFIG.HEADER_ROW, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function findVisitRowById_(sheet, visitId) {
  const idColumn = VISIT_FIELD_BY_KEY.visitId.column;
  const lastRow = sheet.getLastRow();
  if (lastRow < APP_CONFIG.VISIT_DATA_START_ROW) return 0;
  const match = sheet.getRange(APP_CONFIG.VISIT_DATA_START_ROW, idColumn, lastRow - APP_CONFIG.VISIT_HEADER_ROW, 1)
    .createTextFinder(String(visitId)).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function projectContactRecord_(record) {
  return serializeRecord_(record, [
    'id', 'numero', 'dataOcorrencia', 'qtr', 'bopm', 'bopc', 'nomeVitima', 'nomeAutor',
    'telefoneOriginal', 'telefoneAtualizado', 'natureza', 'autorPreso', 'medidaProtetiva',
    'numeroMedida', 'cia', 'enderecoVitima', 'bairro', 'breveHistorico', 'ligacaoRealizada',
    'resultadoLigacao', 'aceitouLigacao', 'desejaVisita', 'tipoVisita', 'dataVisita', 'horaVisita', 'observacoesContato'
  ]);
}

function projectVisitAgendaRecord_(visit, record) {
  const output = serializeRecord_(record, [
    'id', 'numero', 'dataOcorrencia', 'qtr', 'bopm', 'bopc', 'nomeVitima', 'nomeAutor',
    'telefoneOriginal', 'telefoneAtualizado', 'natureza', 'autorPreso', 'medidaProtetiva', 'numeroMedida',
    'cia', 'enderecoVitima', 'bairro', 'breveHistorico', 'ligacaoRealizada', 'resultadoLigacao',
    'aceitouLigacao', 'desejaVisita', 'observacoesContato'
  ]);
  output.occurrenceId = String(record.id || '');
  output.visitId = String(visit.visitId || '');
  output.sequencia = Number(visit.sequencia) || 1;
  output.origemAgendamento = String(visit.origemAgendamento || '');
  output.tipoVisita = String(visit.tipoVisita || '');
  output.dataVisita = formatDateInput_(visit.dataAgendada);
  output.horaVisita = resolveOpenVisitTime_(visit, record);
  output.statusVisita = String(visit.statusVisita || '');
  output.observacoesVisita = String(visit.observacoesVisita || '');
  output.fonarPreenchido = String(visit.fonarPreenchido || '');
  output.fonarArquivoNome = String(visit.fonarArquivoNome || '');
  output.fonarArquivoUrl = String(visit.fonarArquivoUrl || '');
  output.fonarArquivoId = String(visit.fonarArquivoId || '');
  output.boeComplementarRealizado = String(visit.boeComplementarRealizado || '');
  output.numeroBoeComplementar = String(visit.numeroBoeComplementar || '');
  return output;
}

function projectConsultRecord_(record, realizedVisitCount) {
  const projected = serializeRecord_(record, [
    'id', 'numero', 'dataOcorrencia', 'qtr', 'bopm', 'bopc', 'nomeVitima', 'nomeAutor',
    'natureza', 'cia', 'enderecoVitima', 'bairro', 'breveHistorico', 'statusCaso', 'tipoVisita', 'visitaRealizada',
    'ligacaoRealizada', 'resultadoLigacao', 'aceitouLigacao', 'desejaVisita',
    'linksArquivos', 'observacoesArquivos', 'ultimaAtualizacao'
  ]);
  projected.links = splitLinks_(record.linksArquivos);
  projected.hasFiles = projected.links.length > 0;
  projected.visitasRealizadas = Math.min(Number(realizedVisitCount) || 0, APP_CONFIG.MAX_VISITS_PER_OCCURRENCE);
  projected.limiteVisitasAtingido = projected.visitasRealizadas >= APP_CONFIG.MAX_VISITS_PER_OCCURRENCE;
  return projected;
}

function serializeRecord_(record, keys) {
  const output = {};
  keys.forEach(function(key) {
    const field = FIELD_BY_KEY[key] || {};
    const value = record[key];
    if (field.type === 'date') output[key] = formatDateInput_(value);
    else if (field.type === 'datetime') output[key] = formatDateTime_(value);
    else if (field.type === 'time') output[key] = formatTimeInput_(value);
    else output[key] = value === null || value === undefined ? '' : String(value);
  });
  return output;
}

function getNextNumber_(records) {
  return records.reduce(function(max, record) { return Math.max(max, Number(record.numero) || 0); }, 0) + 1;
}

function getNextVisitSequence_(visits, occurrenceId) {
  return visits.reduce(function(max, visit) {
    return String(visit.occurrenceId) === String(occurrenceId) ? Math.max(max, Number(visit.sequencia) || 0) : max;
  }, 0) + 1;
}

function generateId_() {
  return 'MS-' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);
}

function generateVisitId_() {
  return 'VIS-' + Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(1000 + Math.random() * 9000);
}

function coerceFieldValue_(field, value) {
  if (field.type === 'date') return parseDateInput_(value);
  if (field.type === 'number') return value === '' ? '' : Number(value);
  return safeCellValue_(value);
}

function safeCellValue_(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  const text = String(value).trim();
  return /^[=+@]/.test(text) ? "'" + text : text;
}

function addDays_(dateValue, days) {
  const date = asDate_(dateValue);
  if (!date) return null;
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function daysFromToday_(dateValue) {
  const date = asDate_(dateValue);
  if (!date) return null;
  const todayText = Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  const today = parseDateInput_(todayText);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function parseDateInput_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0);
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : parsed;
}

function asDate_(value) {
  const date = parseDateInput_(value);
  return date instanceof Date ? date : null;
}

function formatDateInput_(value) {
  const date = asDate_(value);
  return date ? Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'yyyy-MM-dd') : '';
}

function formatDateBr_(value) {
  const date = asDate_(value);
  return date ? Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy') : '';
}

function timeCellValue_(rawValue, displayedValue) {
  const displayText = String(displayedValue || '').trim().replace(/^'/, '');
  const displayMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(displayText);
  if (displayMatch) {
    const hour = Number(displayMatch[1]);
    const minute = Number(displayMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    }
  }
  return formatTimeInput_(rawValue);
}

function isVisitTimeAllowed_(value) {
  const minutes = timeToMinutes_(value);
  if (minutes === null) return false;
  return minutes >= timeToMinutes_(APP_CONFIG.VISIT_START_TIME) &&
    minutes <= timeToMinutes_(APP_CONFIG.VISIT_END_TIME);
}

function resolveOpenVisitTime_(visit, record) {
  const contactTime = formatTimeInput_(record && record.horaVisita);
  const agendaTime = formatTimeInput_(visit && visit.horaAgendada);
  if (isVisitTimeAllowed_(contactTime)) return contactTime;
  if (isVisitTimeAllowed_(agendaTime)) return agendaTime;
  return contactTime || agendaTime;
}

/**
 * Mantém a agenda aberta com o mesmo horário informado na página Contato.
 * Essa rotina corrige registros antigos que sofreram deslocamento de fuso horário.
 */
function syncOpenVisitTimesFromBase_(dataSheet, visitSheet) {
  const dataRows = Math.max(1, dataSheet.getMaxRows() - APP_CONFIG.HEADER_ROW);
  const visitRows = Math.max(1, visitSheet.getMaxRows() - APP_CONFIG.VISIT_HEADER_ROW);
  dataSheet.getRange(APP_CONFIG.DATA_START_ROW, FIELD_BY_KEY.horaVisita.column, dataRows, 1).setNumberFormat('HH:mm');
  visitSheet.getRange(APP_CONFIG.VISIT_DATA_START_ROW, VISIT_FIELD_BY_KEY.horaAgendada.column, visitRows, 1).setNumberFormat('HH:mm');

  const recordsById = {};
  readAllRecords_(dataSheet).forEach(function(record) {
    recordsById[String(record.id || '')] = record;
  });

  const lastRow = visitSheet.getLastRow();
  if (lastRow < APP_CONFIG.VISIT_DATA_START_ROW) return 0;

  const range = visitSheet.getRange(
    APP_CONFIG.VISIT_DATA_START_ROW,
    1,
    lastRow - APP_CONFIG.VISIT_HEADER_ROW,
    VISIT_TOTAL_COLUMNS
  );
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  let corrected = 0;

  values.forEach(function(row, index) {
    const visit = visitRowToRecord_(row, displayValues[index]);
    if (normalizeText_(visit.statusVisita || '') !== 'ABERTA') return;
    const record = recordsById[String(visit.occurrenceId || '')];
    if (!record) return;

    const contactTime = formatTimeInput_(record.horaVisita);
    const agendaTime = formatTimeInput_(visit.horaAgendada);
    if (!isVisitTimeAllowed_(contactTime) || contactTime === agendaTime) return;

    const cell = visitSheet.getRange(
      APP_CONFIG.VISIT_DATA_START_ROW + index,
      VISIT_FIELD_BY_KEY.horaAgendada.column
    );
    cell.setNumberFormat('HH:mm').setValue(contactTime);
    corrected++;
  });

  return corrected;
}

function corrigirHorariosAgendados() {
  assertAuthorized_();
  const corrected = syncOpenVisitTimesFromBase_(getDataSheet_(), getVisitSheet_());
  return corrected
    ? corrected + ' horário(s) de visita corrigido(s) com sucesso.'
    : 'Nenhum horário precisava de correção.';
}

function formatTimeInput_(value) {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.TIME_ZONE, 'HH:mm');
  }

  if (typeof value === 'number' && isFinite(value)) {
    const fraction = ((value % 1) + 1) % 1;
    const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
    return String(Math.floor(totalMinutes / 60)).padStart(2, '0') + ':' + String(totalMinutes % 60).padStart(2, '0');
  }

  const text = String(value).trim().replace(/^'/, '');
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    }
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : Utilities.formatDate(parsed, APP_CONFIG.TIME_ZONE, 'HH:mm');
}

function timeToMinutes_(value) {
  const normalized = formatTimeInput_(value);
  const match = /^(\d{2}):(\d{2})$/.exec(normalized);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function validateVisitTime_(value, fieldLabel) {
  const minutes = timeToMinutes_(value);
  if (minutes === null) throw new Error((fieldLabel || 'O horário') + ' é inválido. Informe no formato HH:mm.');
  if (!isVisitTimeAllowed_(value)) {
    throw new Error((fieldLabel || 'O horário') + ' deve estar entre 13h00 e 19h00.');
  }
  return formatTimeInput_(value);
}

function formatDateTime_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? String(value) : Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss');
}

function dateKey_(value) {
  const date = asDate_(value);
  return date ? Utilities.formatDate(date, APP_CONFIG.TIME_ZONE, 'yyyy-MM-dd') : '';
}

function dateNumber_(value) {
  const date = asDate_(value);
  return date ? date.getTime() : 0;
}

function normalizeText_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

function normalizeKey_(value) {
  return normalizeText_(value).replace(/[^A-Z0-9]/g, '');
}

function normalizeDocument_(value) {
  return normalizeText_(value).replace(/[^A-Z0-9]/g, '');
}

function normalizeLinks_(value) {
  const links = splitLinks_(value);
  links.forEach(function(link) {
    if (!/^https?:\/\//i.test(link)) throw new Error('Link inválido: ' + link + '. Use endereços iniciados por http:// ou https://.');
  });
  return links.join('\n');
}

function splitLinks_(value) {
  return String(value || '').split(/[\n,;]+/).map(function(link) { return link.trim(); }).filter(String);
}

function hasFiles_(value) {
  return splitLinks_(value).length > 0;
}

function audit_(action, id, detail) {
  try {
    const sheet = ensureLogSheet_(getSpreadsheet_());
    sheet.appendRow([new Date(), getCurrentUserEmail_(), action, id, detail]);
    registroDireto_(action, 'Mulher Segura', (id ? 'ID ' + id + ' — ' : '') + String(detail || ''));
  } catch (error) {
    console.error('Falha ao registrar auditoria: ' + error.message);
  }
}

function getAvailableYears_() {
  const currentYear = Number(Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyy'));
  const years = {};
  years[currentYear] = true;
  readAllRecords_().forEach(function(record) {
    const date = asDate_(record.dataOcorrencia);
    if (date) years[date.getFullYear()] = true;
  });
  readAllVisits_().forEach(function(visit) {
    [visit.dataAgendada, visit.dataRealizacao].forEach(function(value) {
      const date = asDate_(value);
      if (date) years[date.getFullYear()] = true;
    });
  });
  return Object.keys(years).map(Number).sort(function(a, b) { return b - a; });
}

/* ===================== DashboardService ===================== */
function getDashboardData(year, month) {
  assertAuthorized_();
  year = Number(year) || Number(Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'yyyy'));
  month = Number(month) || 0;
  if (month < 0 || month > 12) month = 0;

  const dataSheet = getDataSheet_();
  const visitSheet = getVisitSheet_();
  syncExistingVisits_(dataSheet, visitSheet);

  const allRecords = readAllRecords_(dataSheet);
  const records = allRecords.filter(function(record) {
    return dashboardDateMatchesPeriod_(record.dataOcorrencia, year, month);
  });
  const visits = readAllVisits_(visitSheet);

  const monthly = Array.from({ length: 12 }, function(_, index) {
    return { month: index + 1, label: getMonthOptions_()[index + 1].label.substring(0, 3), registros: 0, ligacoes: 0, visitas: 0 };
  });
  const byCiaMonth = {};
  OPTIONS.CIA.forEach(function(cia) { byCiaMonth[cia] = Array(12).fill(0); });
  const visitTypes = {};
  OPTIONS.TIPO_VISITA.forEach(function(type) { visitTypes[type] = 0; });
  const results = {};
  const natures = {};
  const ciaTotals = {};

  const kpis = {
    registros: records.length,
    visitasAgendadas: 0,
    visitasAbertas: 0,
    visitasRealizadas: 0,
    ligacoesRealizadas: 0,
    aceitouLigacao: 0,
    naoAceitouLigacao: 0,
    medidasProtetivas: 0,
    autoresPresos: 0,
    reincidencias: 0,
    comArquivos: 0,
    fonarPreenchidos: 0,
    boeComplementares: 0
  };

  const recordsById = {};
  allRecords.forEach(function(record) { recordsById[String(record.id)] = record; });

  records.forEach(function(record) {
    const date = asDate_(record.dataOcorrencia);
    const monthIndex = date.getMonth();
    monthly[monthIndex].registros++;

    const contactDate = record.contatoAtualizadoEm instanceof Date ? record.contatoAtualizadoEm : date;
    const contactInSelectedMonth = !month || dashboardDateMatchesPeriod_(contactDate, year, month);
    if (record.ligacaoRealizada === 'SIM' && contactInSelectedMonth) {
      kpis.ligacoesRealizadas++;
      const contactMonth = contactDate && contactDate.getFullYear() === year ? contactDate.getMonth() : monthIndex;
      monthly[contactMonth].ligacoes++;
    }
    if (contactInSelectedMonth && record.aceitouLigacao === 'SIM') kpis.aceitouLigacao++;
    if (contactInSelectedMonth && record.aceitouLigacao === 'NÃO') kpis.naoAceitouLigacao++;
    if (record.medidaProtetiva === 'SIM') kpis.medidasProtetivas++;
    if (record.autorPreso === 'SIM') kpis.autoresPresos++;
    if (record.reincidencia === 'SIM') kpis.reincidencias++;
    if (hasFiles_(record.linksArquivos)) kpis.comArquivos++;

    const cia = record.cia || 'NÃO INFORMADA';
    increment_(ciaTotals, cia);
    if (!byCiaMonth[cia]) byCiaMonth[cia] = Array(12).fill(0);
    byCiaMonth[cia][monthIndex]++;

    increment_(natures, record.natureza || 'NÃO INFORMADA');
    if (contactInSelectedMonth && record.resultadoLigacao) increment_(results, record.resultadoLigacao);
  });

  visits.forEach(function(visit) {
    const occurrence = recordsById[String(visit.occurrenceId)];
    const scheduledDate = asDate_(visit.dataAgendada);
    const realizedDate = asDate_(visit.dataRealizacao);

    if (dashboardDateMatchesPeriod_(scheduledDate, year, month)) {
      kpis.visitasAgendadas++;
      if (visit.statusVisita === 'ABERTA') kpis.visitasAbertas++;
    }

    if (visit.statusVisita === 'REALIZADA' && dashboardDateMatchesPeriod_(realizedDate, year, month)) {
      kpis.visitasRealizadas++;
      monthly[realizedDate.getMonth()].visitas++;
      increment_(visitTypes, visit.tipoVisita || 'NÃO INFORMADA');
      increment_(results, visit.resultadoVisita || 'VISITA REALIZADA SEM RESULTADO INFORMADO');
      if (visit.fonarPreenchido === 'SIM') kpis.fonarPreenchidos++;
      if (visit.boeComplementarRealizado === 'SIM' || String(visit.numeroBoeComplementar || '').trim()) kpis.boeComplementares++;
    }

    // Visitas migradas sem data de realização continuam contabilizadas pelo
    // período da ocorrência, preservando os indicadores já existentes.
    if (visit.statusVisita === 'REALIZADA' && !realizedDate && occurrence) {
      const occurrenceDate = asDate_(occurrence.dataOcorrencia);
      if (dashboardDateMatchesPeriod_(occurrenceDate, year, month)) {
        kpis.visitasRealizadas++;
        monthly[occurrenceDate.getMonth()].visitas++;
        increment_(visitTypes, visit.tipoVisita || 'NÃO INFORMADA');
        increment_(results, visit.resultadoVisita || 'VISITA REALIZADA SEM RESULTADO INFORMADO');
        if (visit.fonarPreenchido === 'SIM') kpis.fonarPreenchidos++;
        if (visit.boeComplementarRealizado === 'SIM' || String(visit.numeroBoeComplementar || '').trim()) kpis.boeComplementares++;
      }
    }
  });

  const monthLabel = month ? getMonthOptions_()[month].label : 'TODOS OS MESES';
  const periodLabel = month ? monthLabel + ' / ' + year : String(year);
  const displayMonthly = month ? [monthly[month - 1]] : monthly;

  return {
    year: year,
    month: month,
    monthLabel: monthLabel,
    periodLabel: periodLabel,
    generatedAt: formatDateTime_(new Date()),
    kpis: kpis,
    monthly: displayMonthly,
    visitTypes: mapToSeries_(visitTypes),
    results: mapToSeries_(results),
    natures: mapToSeries_(natures),
    ciaTotals: mapToSeries_(ciaTotals),
    byCiaMonth: Object.keys(byCiaMonth).map(function(cia) {
      return { cia: cia, months: byCiaMonth[cia], total: byCiaMonth[cia].reduce(function(sum, value) { return sum + value; }, 0) };
    }).sort(function(a, b) { return b.total - a.total; })
  };
}

function dashboardDateMatchesPeriod_(value, year, month) {
  const date = asDate_(value);
  if (!date || date.getFullYear() !== year) return false;
  return !month || (date.getMonth() + 1 === month);
}

function increment_(map, key) {
  key = String(key || 'NÃO INFORMADO');
  map[key] = (map[key] || 0) + 1;
}

function mapToSeries_(map) {
  return Object.keys(map).map(function(label) { return { label: label, value: map[label] }; })
    .sort(function(a, b) { return b.value - a.value || a.label.localeCompare(b.label); });
}

/* ===================== MapService ===================== */
/**
 * Página 6 - Mapa Estatístico.
 *
 * Os pontos são obtidos por geocodificação dos endereços cadastrados. Os
 * limites das três companhias são importados do mapa público do CPC em KML.
 * Por privacidade, o retorno para o navegador não contém nome, telefone ou
 * histórico da vítima; apenas dados estatísticos do local.
 */
function getMapStatisticalData(filters) {
  assertAuthorized_();
  filters = filters || {};

  const dateFrom = parseDateInput_(filters.dateFrom);
  const dateTo = parseDateInput_(filters.dateTo);
  const cia = String(filters.cia || '').trim();
  if (!dateFrom || !dateTo) throw new Error('Informe a data inicial e a data final do mapa.');
  if (dateNumber_(dateFrom) > dateNumber_(dateTo)) throw new Error('A data inicial não pode ser posterior à data final.');
  if (cia && MAP_COMPANIES.indexOf(cia) < 0) throw new Error('Selecione uma CIA válida para o mapa.');

  const spreadsheet = getSpreadsheet_();
  const geoSheet = ensureMapGeoSheet_(spreadsheet);
  const boundarySheet = ensureMapBoundarySheet_(spreadsheet);
  const records = filterMapRecords_(readAllRecords_(), dateFrom, dateTo, cia);
  const boundaryStatus = getMapBoundaryStatus_(boundarySheet);

  const geocodedThisRun = geocodeRecordsForMap_(records, geoSheet, APP_CONFIG.MAP_GEOCODE_BATCH, false);
  const geoByOccurrence = readMapGeoCache_(geoSheet);

  let boundaryWarning = '';
  if (!boundaryStatus.ready) {
    boundaryWarning = 'Os limites ainda não estão salvos. A importação do KML/KMZ completo é necessária somente uma vez; depois o sistema os carrega automaticamente em todos os acessos.';
  }

  const grouped = {};
  let plottedOccurrences = 0;
  let unlocatedCount = 0;
  let missingAddressCount = 0;
  let pendingGeocodingCount = 0;

  records.forEach(function(record) {
    const hasAddress = Boolean(String(record.enderecoVitima || '').trim());
    if (!hasAddress) {
      unlocatedCount++;
      missingAddressCount++;
      return;
    }
    const geo = geoByOccurrence[String(record.id || '')];
    if (!geo || geo.status !== 'OK' || !isFinite(Number(geo.latitude)) || !isFinite(Number(geo.longitude))) {
      unlocatedCount++;
      pendingGeocodingCount++;
      return;
    }

    const latitude = Number(geo.latitude);
    const longitude = Number(geo.longitude);
    const key = latitude.toFixed(5) + ',' + longitude.toFixed(5);
    if (!grouped[key]) {
      grouped[key] = {
        latitude: latitude,
        longitude: longitude,
        count: 0,
        address: String(geo.formattedAddress || geo.addressQuery || record.enderecoVitima || ''),
        cias: {},
        natures: {},
        firstDate: '',
        lastDate: ''
      };
    }

    const item = grouped[key];
    item.count++;
    plottedOccurrences++;
    item.cias[String(record.cia || 'NÃO INFORMADA')] = (item.cias[String(record.cia || 'NÃO INFORMADA')] || 0) + 1;
    item.natures[String(record.natureza || 'NÃO INFORMADA')] = (item.natures[String(record.natureza || 'NÃO INFORMADA')] || 0) + 1;
    const keyDate = dateKey_(record.dataOcorrencia);
    if (!item.firstDate || keyDate < item.firstDate) item.firstDate = keyDate;
    if (!item.lastDate || keyDate > item.lastDate) item.lastDate = keyDate;
  });

  const points = Object.keys(grouped).map(function(key) {
    const item = grouped[key];
    return {
      lat: item.latitude,
      lng: item.longitude,
      count: item.count,
      address: item.address,
      cia: countMapToLabel_(item.cias),
      natures: countMapToItems_(item.natures, 5),
      firstDate: item.firstDate,
      lastDate: item.lastDate
    };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, APP_CONFIG.MAP_MAX_POINTS);

  const maxPointCount = points.reduce(function(max, point) { return Math.max(max, point.count); }, 0);
  const boundaries = readMapBoundaries_(boundarySheet, cia);

  return {
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm:ss'),
    filters: {
      dateFrom: formatDateInput_(dateFrom),
      dateTo: formatDateInput_(dateTo),
      cia: cia
    },
    center: {
      lat: APP_CONFIG.MAP_CENTER_LAT,
      lng: APP_CONFIG.MAP_CENTER_LNG,
      zoom: APP_CONFIG.MAP_DEFAULT_ZOOM
    },
    summary: {
      occurrences: records.length,
      plottedOccurrences: plottedOccurrences,
      uniqueLocations: points.length,
      unlocated: unlocatedCount,
      missingAddress: missingAddressCount,
      pendingGeocoding: pendingGeocodingCount,
      geocodedThisRun: geocodedThisRun,
      maxAtSameLocation: maxPointCount
    },
    points: points,
    boundaries: boundaries,
    boundaryStatus: boundaryStatus,
    boundaryWarning: boundaryWarning,
    privacyNotice: 'O mapa não exibe nomes, telefones ou histórico das vítimas.'
  };
}


/**
 * Informa se os limites territoriais já estão salvos na planilha.
 * Depois da primeira importação bem-sucedida, nenhuma nova importação é
 * necessária: a Página 6 lê automaticamente a aba MAPA LIMITES.
 */
function getMapBoundaryStatus() {
  assertAuthorized_();
  return getMapBoundaryStatus_(ensureMapBoundarySheet_(getSpreadsheet_()));
}

function getMapBoundaryStatus_(sheet) {
  const counts = { '1ª CIA': 0, '2ª CIA': 0, '3ª CIA': 0 };
  let latest = null;
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, MAP_BOUNDARY_HEADERS.length).getValues().forEach(function(row) {
      const cia = String(row[0] || '').trim().toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, cia)) counts[cia]++;
      const updated = row[4];
      if (updated instanceof Date && !isNaN(updated.getTime()) && (!latest || updated > latest)) latest = updated;
    });
  }
  const missingCompanies = MAP_COMPANIES.filter(function(cia) { return !counts[cia]; });
  const total = Object.keys(counts).reduce(function(sum, cia) { return sum + counts[cia]; }, 0);
  return {
    ready: missingCompanies.length === 0 && total > 0,
    total: total,
    counts: counts,
    companies: MAP_COMPANIES.slice(),
    missingCompanies: missingCompanies,
    updatedAt: latest ? Utilities.formatDate(latest, APP_CONFIG.TIME_ZONE, 'dd/MM/yyyy HH:mm') : '',
    storage: APP_CONFIG.MAP_BOUNDARY_SHEET_NAME,
    message: missingCompanies.length === 0 && total > 0
      ? 'Limites carregados automaticamente da aba ' + APP_CONFIG.MAP_BOUNDARY_SHEET_NAME + '.'
      : 'Aguardando a importação única do KML/KMZ completo.'
  };
}

function geocodificarPendentesMapa(filters) {
  assertAuthorized_();
  filters = filters || {};
  const dateFrom = parseDateInput_(filters.dateFrom);
  const dateTo = parseDateInput_(filters.dateTo);
  const cia = String(filters.cia || '').trim();
  if (!dateFrom || !dateTo) throw new Error('Informe a data inicial e a data final.');
  if (dateNumber_(dateFrom) > dateNumber_(dateTo)) throw new Error('A data inicial não pode ser posterior à data final.');
  if (cia && MAP_COMPANIES.indexOf(cia) < 0) throw new Error('Selecione uma CIA válida.');

  const records = filterMapRecords_(readAllRecords_(), dateFrom, dateTo, cia);
  const processed = geocodeRecordsForMap_(records, ensureMapGeoSheet_(getSpreadsheet_()), 40, true);
  audit_('MAPA ESTATÍSTICO', '', 'Geolocalização manual processada: ' + processed + ' registro(s).');
  return {
    success: true,
    processed: processed,
    message: processed
      ? processed + ' endereço(s) processado(s). Clique em Pesquisar para atualizar os mapas.'
      : 'Não há novos endereços pendentes para processar.'
  };
}

/**
 * A API do Drive não exporta arquivos nativos do Google My Maps.
 * Esta função permanece apenas para informar o procedimento correto caso
 * alguém tente executá-la manualmente no editor do Apps Script.
 */
function autorizarEImportarLimites12BPMM() {
  throw new Error(
    'Não é necessário autorizar esta função. O Google My Maps deve ser exportado manualmente para KML/KMZ completo. ' +
    'Na Página 6, clique em “Baixar KML completo do 12º BPM/M” e depois em “Importar KML/KMZ completo”. ' +
    'Não utilize um arquivo NetworkLink.'
  );
}

function importarLimites12BPMM() {
  throw new Error(
    'A importação automática foi desativada porque o Google Drive não exporta arquivos nativos do My Maps. ' +
    'Use a importação local de KML/KMZ completo na Página 6.'
  );
}

function atualizarLimitesMapa() {
  return importarLimites12BPMM();
}

/**
 * Salva os limites lidos localmente no navegador a partir do KML/KMZ
 * exportado do mapa oficial do CPC. Não usa UrlFetchApp e, portanto, não
 * exige a permissão script.external_request.
 */
function salvarLimitesMapaImportados(payload) {
  assertAuthorized_();
  payload = payload || {};
  const received = Array.isArray(payload.boundaries) ? payload.boundaries : [];
  if (!received.length) throw new Error('O arquivo não contém limites territoriais válidos.');
  if (received.length > 250) throw new Error('O arquivo contém elementos territoriais demais. Importe somente o KML/KMZ do mapa CPC informado.');

  const rows = [];
  const foundCompanies = {};
  let totalPoints = 0;

  received.forEach(function(item, index) {
    const cia = String(item && item.cia || '').trim().toUpperCase();
    const normalizedCia = cia.indexOf('1') === 0 ? '1ª CIA' : (cia.indexOf('2') === 0 ? '2ª CIA' : (cia.indexOf('3') === 0 ? '3ª CIA' : ''));
    if (MAP_COMPANIES.indexOf(normalizedCia) < 0) return;

    const type = String(item && item.type || 'POLYGON').toUpperCase() === 'LINE' ? 'LINE' : 'POLYGON';
    const inputCoordinates = Array.isArray(item && item.coordinates) ? item.coordinates : [];
    const coordinates = inputCoordinates.map(function(point) {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lat = Number(point[0]);
      const lng = Number(point[1]);
      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return [Math.round(lat * 1000000) / 1000000, Math.round(lng * 1000000) / 1000000];
    }).filter(Boolean);

    const minimum = type === 'POLYGON' ? 3 : 2;
    if (coordinates.length < minimum) return;
    totalPoints += coordinates.length;
    if (totalPoints > 120000) throw new Error('O arquivo possui coordenadas demais. Exporte novamente apenas as camadas necessárias do 12º BPM/M.');

    foundCompanies[normalizedCia] = true;
    rows.push([
      normalizedCia,
      type,
      JSON.stringify(coordinates),
      safeCellValue_(String(item.sourceName || ('Elemento ' + (index + 1))).slice(0, 250)),
      new Date()
    ]);
  });

  const missingCompanies = MAP_COMPANIES.filter(function(company) { return !foundCompanies[company]; });
  if (missingCompanies.length) {
    throw new Error('O arquivo foi lido, mas não foram encontrados os limites de: ' + missingCompanies.join(', ') + '. Confirme que o arquivo foi exportado do mapa CPC informado.');
  }
  if (!rows.length) throw new Error('Nenhum limite territorial válido foi encontrado no arquivo.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = ensureMapBoundarySheet_(getSpreadsheet_());
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, MAP_BOUNDARY_HEADERS.length).clearContent();
    }
    sheet.getRange(2, 1, rows.length, MAP_BOUNDARY_HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  PropertiesService.getScriptProperties().setProperties({
    MAP_BOUNDARIES_IMPORTED_AT: new Date().toISOString(),
    MAP_BOUNDARIES_SOURCE_FILE: String(payload.fileName || 'KML/KMZ').slice(0, 250)
  });
  audit_('MAPA ESTATÍSTICO', '', 'Limites importados localmente do arquivo ' + String(payload.fileName || 'KML/KMZ') + ': ' + rows.length + ' elemento(s).');
  return {
    success: true,
    count: rows.length,
    companies: MAP_COMPANIES.slice(),
    boundaryStatus: getMapBoundaryStatus_(ensureMapBoundarySheet_(getSpreadsheet_())),
    message: rows.length + ' limite(s) territorial(is) foram salvos. A partir de agora serão carregados automaticamente sempre que a Página 6 for aberta.'
  };
}

function filterMapRecords_(records, dateFrom, dateTo, cia) {
  const fromKey = dateKey_(dateFrom);
  const toKey = dateKey_(dateTo);
  return records.filter(function(record) {
    const recordDate = dateKey_(record.dataOcorrencia);
    if (!recordDate || recordDate < fromKey || recordDate > toKey) return false;
    if (MAP_COMPANIES.indexOf(String(record.cia || '')) < 0) return false;
    if (cia && String(record.cia || '') !== cia) return false;
    // Registros sem endereço também entram no total do período, mas ficam
    // contabilizados como “sem localização” até que o endereço seja informado.
    return true;
  });
}

function geocodeRecordsForMap_(records, geoSheet, limit, forceRetry) {
  const cache = readMapGeoCache_(geoSheet);
  let processed = 0;

  for (let i = 0; i < records.length && processed < limit; i++) {
    const record = records[i];
    const occurrenceId = String(record.id || '').trim();
    if (!occurrenceId) continue;
    const addressQuery = buildMapAddressQuery_(record);
    if (!addressQuery) continue;

    const current = cache[occurrenceId];
    const sameAddress = current && normalizeText_(current.addressQuery) === normalizeText_(addressQuery);
    if (sameAddress && current.status === 'OK') continue;
    if (sameAddress && current.status !== 'OK' && !forceRetry) continue;

    const result = geocodeMapAddress_(addressQuery);
    result.occurrenceId = occurrenceId;
    result.addressQuery = addressQuery;
    result.updatedAt = new Date();
    upsertMapGeoRecord_(geoSheet, current && current.rowNumber, result);
    cache[occurrenceId] = Object.assign({}, result, { rowNumber: current && current.rowNumber });
    processed++;
  }

  return processed;
}

function buildMapAddressQuery_(record) {
  const parts = [record.enderecoVitima, record.bairro, 'São Paulo - SP', 'Brasil']
    .map(function(value) { return String(value || '').trim(); })
    .filter(String);
  return parts.join(', ');
}

function geocodeMapAddress_(addressQuery) {
  try {
    const response = Maps.newGeocoder()
      .setLanguage('pt-BR')
      .setRegion('br')
      .setBounds(-23.90, -47.00, -23.30, -46.20)
      .geocode(addressQuery);
    const result = response && response.results && response.results[0];
    const location = result && result.geometry && result.geometry.location;
    if (!location || !isFinite(Number(location.lat)) || !isFinite(Number(location.lng))) {
      return {
        latitude: '', longitude: '', formattedAddress: '', status: 'NÃO LOCALIZADO'
      };
    }
    return {
      latitude: Number(location.lat),
      longitude: Number(location.lng),
      formattedAddress: String(result.formatted_address || addressQuery),
      status: 'OK'
    };
  } catch (error) {
    return {
      latitude: '', longitude: '', formattedAddress: '', status: 'ERRO: ' + String(error.message || error).substring(0, 180)
    };
  }
}

function readMapGeoCache_(sheet) {
  const cache = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return cache;
  const values = sheet.getRange(2, 1, lastRow - 1, MAP_GEO_TOTAL_COLUMNS).getValues();
  values.forEach(function(row, index) {
    const record = {};
    MAP_GEO_FIELD_DEFINITIONS.forEach(function(field, columnIndex) {
      record[field.key] = row[columnIndex];
    });
    record.rowNumber = index + 2;
    if (record.occurrenceId) cache[String(record.occurrenceId)] = record;
  });
  return cache;
}

function upsertMapGeoRecord_(sheet, rowNumber, record) {
  const row = MAP_GEO_FIELD_DEFINITIONS.map(function(field) {
    const value = record[field.key];
    if (field.type === 'datetime') return value instanceof Date ? value : new Date();
    if (field.type === 'number') return value === '' || value === null || value === undefined ? '' : Number(value);
    return safeCellValue_(value);
  });
  const targetRow = rowNumber || Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(targetRow, 1, 1, MAP_GEO_TOTAL_COLUMNS).setValues([row]);
}

function readMapBoundaries_(sheet, cia) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, MAP_BOUNDARY_HEADERS.length).getValues()
    .map(function(row) {
      let coordinates = [];
      try { coordinates = JSON.parse(String(row[2] || '[]')); } catch (error) { coordinates = []; }
      return {
        cia: String(row[0] || ''),
        type: String(row[1] || 'POLYGON'),
        coordinates: coordinates,
        sourceName: String(row[3] || '')
      };
    })
    .filter(function(item) {
      return MAP_COMPANIES.indexOf(item.cia) >= 0 && (!cia || item.cia === cia) && item.coordinates.length >= 2;
    });
}

function countMapToItems_(map, limit) {
  return Object.keys(map).map(function(label) {
    return { label: label, value: map[label] };
  }).sort(function(a, b) { return b.value - a.value; }).slice(0, limit || 10);
}

function countMapToLabel_(map) {
  return countMapToItems_(map, 10).map(function(item) {
    return item.label + (item.value > 1 ? ' (' + item.value + ')' : '');
  }).join(', ');
}

/* ===================== MulherSegura ===================== */
/** Dados iniciais das páginas Mulher Segura (roda como dono, via api). */
function getBootstrapData() {
  assertAuthorized_();
  ensureSystemReady_();
  const now = new Date();
  return {
    appName: lerConfig_().nome,
    currentUser: getCurrentUserEmail_(),
    salaFields: SALA_FIELDS,
    contatoFields: CONTATO_FIELDS,
    options: OPTIONS,
    months: getMonthOptions_(),
    years: getAvailableYears_(),
    currentMonth: Number(Utilities.formatDate(now, APP_CONFIG.TIME_ZONE, 'M')),
    currentYear: Number(Utilities.formatDate(now, APP_CONFIG.TIME_ZONE, 'yyyy')),
    fonarUploaderUrl: getFonarUploaderUrl_(),
    visitSchedule: {
      minTime: APP_CONFIG.VISIT_START_TIME,
      maxTime: APP_CONFIG.VISIT_END_TIME,
      maxVisits: APP_CONFIG.MAX_VISITS_PER_OCCURRENCE,
      secondVisitMaxDays: APP_CONFIG.SECOND_VISIT_MAX_DAYS,
      label: 'Agendamentos permitidos somente das 13h00 às 19h00'
    },
    mapConfig: {
      companies: MAP_COMPANIES,
      center: { lat: APP_CONFIG.MAP_CENTER_LAT, lng: APP_CONFIG.MAP_CENTER_LNG },
      zoom: APP_CONFIG.MAP_DEFAULT_ZOOM,
      sourceMapId: APP_CONFIG.MAP_MY_MAPS_ID,
      sourceLayerId: APP_CONFIG.MAP_MY_MAPS_LAYER_ID,
      sourceMapUrl: APP_CONFIG.MAP_VIEWER_URL,
      sourceKmlUrl: APP_CONFIG.MAP_KML_URL
    },
    mapBoundaryStatus: getMapBoundaryStatus_(ensureMapBoundarySheet_(getSpreadsheet_()))
  };
}

function getMonthOptions_() {
  return [
    { value: 0, label: 'TODOS OS MESES' },
    { value: 1, label: 'JANEIRO' },
    { value: 2, label: 'FEVEREIRO' },
    { value: 3, label: 'MARÇO' },
    { value: 4, label: 'ABRIL' },
    { value: 5, label: 'MAIO' },
    { value: 6, label: 'JUNHO' },
    { value: 7, label: 'JULHO' },
    { value: 8, label: 'AGOSTO' },
    { value: 9, label: 'SETEMBRO' },
    { value: 10, label: 'OUTUBRO' },
    { value: 11, label: 'NOVEMBRO' },
    { value: 12, label: 'DEZEMBRO' }
  ];
}

function escapeHtmlServer_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

