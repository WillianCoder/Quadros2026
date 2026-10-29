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
