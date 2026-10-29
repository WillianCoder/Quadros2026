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
