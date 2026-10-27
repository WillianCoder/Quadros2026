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
