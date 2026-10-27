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
