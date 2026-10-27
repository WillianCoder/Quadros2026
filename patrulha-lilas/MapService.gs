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
