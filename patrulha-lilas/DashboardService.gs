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
