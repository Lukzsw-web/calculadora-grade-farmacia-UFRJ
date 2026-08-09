
const APP_VERSION = 'v8';
const STORAGE_KEYS = {
  checked: 'farma_checked_v8',
  notasCR: 'farma_notasCR_v8',
  theme: 'grade-theme-v8',
  dismissedUpdate: 'grade-update-dismissed-v8'
};

const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;
const TOTAL_CREDITS = 161;
const TOTAL_HOURS = 3250;

const cifAjustes = {"FFW361":" (Agentes infecciosos)","FFW362":" (Imunologia)","FFW471":" (Cardio / Renal)","FFW472":" (Endócrino)","FFW481":" (Neurologia)","FFW591":" (Parasitologia)","FFW502":" (Oncologia)"};

const disciplinas=[
{"periodo":"1","codigo":"BMW103","nome":"Bases Morfológicas Aplicadas à Farmácia","pre":"","co":"","cred":6,"ch":105},
{"periodo":"1","codigo":"BQM101","nome":"Bioquímica I","pre":"","co":"","cred":3,"ch":45},
{"periodo":"1","codigo":"FFW111","nome":"Farmacêutico e Sociedade","pre":"","co":"","cred":2,"ch":30},
{"periodo":"1","codigo":"IQG114","nome":"Química Geral I","pre":"","co":"","cred":4,"ch":60},
{"periodo":"1","codigo":"MAC108","nome":"Cálculo para Farmácia","pre":"","co":"","cred":3,"ch":45},
{"periodo":"2","codigo":"BQM103","nome":"Bioquímica II","pre":"BQM101","co":"","cred":3,"ch":45},
{"periodo":"2","codigo":"IQF235","nome":"Físico-Química I","pre":"MAC108; IQG114","co":"","cred":2,"ch":30},
{"periodo":"2","codigo":"CFF122","nome":"Fisiologia Humana","pre":"BMW103; BQM101","co":"","cred":6,"ch":90},
{"periodo":"2","codigo":"FFW121","nome":"Políticas e Planejamento em Saúde Pública","pre":"FFW111","co":"","cred":2,"ch":30},
{"periodo":"2","codigo":"IQG122","nome":"Química Inorgânica Estrutural FF","pre":"IQG114","co":"","cred":2,"ch":30},
{"periodo":"2","codigo":"IQO120","nome":"Química Orgânica I","pre":"IQG114","co":"","cred":4,"ch":60},
{"periodo":"3","codigo":"BMF310","nome":"Farmacocinética e Farmacodinâmica Fundamental","pre":"CFF122","co":"","cred":4,"ch":60},
{"periodo":"3","codigo":"FFW231","nome":"Farmácia Clínica","pre":"FFW111; CFF122","co":"","cred":2,"ch":30},
{"periodo":"3","codigo":"FFW232","nome":"Diagnóstico Laboratorial no Cuidado Farmacêutico","pre":"BQM103; CFF122","co":"","cred":2,"ch":30},
{"periodo":"3","codigo":"IQA123","nome":"Química Analítica Farmacêutica I","pre":"IQG114","co":"","cred":2,"ch":30},
{"periodo":"3","codigo":"IQF232","nome":"Físico-Química II","pre":"IQF235","co":"","cred":2,"ch":30},
{"periodo":"3","codigo":"IQO220","nome":"Métodos Espectrométricos","pre":"IQO120","co":"","cred":3,"ch":60},
{"periodo":"3","codigo":"IQO230","nome":"Química Orgânica II","pre":"IQO120","co":"","cred":4,"ch":60},
{"periodo":"4","codigo":"FFW241","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos I (PCQ I)","pre":"IQA123; IQO220","co":"","cred":3,"ch":60},
{"periodo":"4","codigo":"FFW243","nome":"Métodos Computacionais Aplicados às Ciências Farmacêuticas (MACF)","pre":"BMF310; IQO230","co":"FFW242","cred":1,"ch":30},
{"periodo":"4","codigo":"FFW242","nome":"Química Farmacêutica e Medicinal I","pre":"BMF310; IQO230","co":"","cred":2,"ch":30},
{"periodo":"4","codigo":"IQA240","nome":"Química Analítica Farmacêutica Experimental","pre":"IQA123","co":"IQA233","cred":1,"ch":30},
{"periodo":"4","codigo":"IQA233","nome":"Química Analítica Farmacêutica II","pre":"IQA123","co":"","cred":2,"ch":30},
{"periodo":"4","codigo":"IQG241","nome":"Química de Coordenações","pre":"IQG122","co":"","cred":2,"ch":30},
{"periodo":"4","codigo":"IQO242","nome":"Química Orgânica Experimental FF","pre":"IQO230; IQO220","co":"","cred":2,"ch":60},
{"periodo":"5","codigo":"FFW353","nome":"Gestão e Planejamento da Assistência Farmacêutica","pre":"FFW121","co":"","cred":4,"ch":60},
{"periodo":"5","codigo":"FFW351","nome":"Toxicologia Geral","pre":"FFW242","co":"","cred":2,"ch":30},
{"periodo":"5","codigo":"FFW352","nome":"Química Farmacêutica II & Toxicológica","pre":"FFW242; FFW243","co":"FFW351","cred":2,"ch":30},
{"periodo":"5","codigo":"IMW360","nome":"Microbiologia e Imunologia Fundamental","pre":"CFF122; BQM103","co":"","cred":5,"ch":90},
{"periodo":"5","codigo":"FFW354","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos II","pre":"FFW241","co":"","cred":4,"ch":60},
{"periodo":"5","codigo":"FFW355","nome":"Hematologia F","pre":"FFW232; BMF310","co":"","cred":2,"ch":30},
{"periodo":"6","codigo":"FFW361","nome":"Cuidado Integrado em Farmácia I","pre":"IMW360; FFW242; FFW231; FFW232","co":"","cred":5,"ch":90},
{"periodo":"6","codigo":"FFW363","nome":"Farmacobotânica","pre":"BMW103","co":"","cred":1,"ch":30},
{"periodo":"6","codigo":"FFW362","nome":"Cuidado Integrado em Farmácia II","pre":"IMW360; FFW231; FFW232; FFW242","co":"","cred":4,"ch":60},
{"periodo":"6","codigo":"FFW364","nome":"Gestão Farmacêutica","pre":"FFW121","co":"","cred":2,"ch":30},
{"periodo":"6","codigo":"FFW365","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos III","pre":"FFW241","co":"","cred":3,"ch":45},
{"periodo":"7","codigo":"FFW471","nome":"Cuidado Integrado em Farmácia III","pre":"FFW242; FFW231; FFW232","co":"","cred":6,"ch":90},
{"periodo":"7","codigo":"FFW472","nome":"Cuidado Integrado em Farmácia IV","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":60},
{"periodo":"7","codigo":"FFW473","nome":"Farmacognosia","pre":"IQO242; FFW363","co":"","cred":4,"ch":90},
{"periodo":"7","codigo":"FFW474","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos IV","pre":"FFW354; FFW365","co":"","cred":2,"ch":60},
{"periodo":"8","codigo":"FFW481","nome":"Cuidado Integrado em Farmácia V","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":75},
{"periodo":"8","codigo":"FFW482","nome":"Farmacoepidemiologia e Bioestatística Aplicada","pre":"FFW121","co":"","cred":3,"ch":45},
{"periodo":"8","codigo":"FFW483","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos V","pre":"FFW354; FFW365","co":"","cred":2,"ch":30},
{"periodo":"8","codigo":"FFW484","nome":"Genética e Biologia Molecular Aplicadas","pre":"BMW103; BQM103","co":"","cred":2,"ch":30},
{"periodo":"8","codigo":"FFW485","nome":"Biotecnologia Farmacêutica","pre":"IMW360","co":"","cred":2,"ch":30},
{"periodo":"8","codigo":"FFW486","nome":"Metodologia Científica","pre":"","co":"","cred":2,"ch":30},
{"periodo":"9","codigo":"FFW591","nome":"Cuidado Integrado em Farmácia VI","pre":"FFW242; FFW231; FFW232","co":"","cred":6,"ch":90},
{"periodo":"9","codigo":"FFW592","nome":"Processamento e Controle de Qualidade de Alimentos","pre":"IQA233; BQM103","co":"","cred":3,"ch":60},
{"periodo":"9","codigo":"FFW593","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos VI","pre":"FFW483","co":"","cred":1,"ch":30},
{"periodo":"9","codigo":"IEE326","nome":"Economia e Administração de Empresas","pre":"","co":"","cred":3,"ch":45},
{"periodo":"9","codigo":"FFWK03","nome":"Trabalho de Conclusão de Curso (TCC)","pre":"FFW486","co":"","cred":1,"ch":45},
{"periodo":"10","codigo":"FFW501","nome":"Farmacoterapia no Cuidado Farmacêutico","pre":"FFW361; FFW362; FFW471; FFW472; FFW481; FFW591","co":"","cred":3,"ch":60},
{"periodo":"10","codigo":"FFW502","nome":"Cuidado Integrado em Farmácia VII","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":60},
{"periodo":"10","codigo":"FFW503","nome":"Produção e Controle de Qualidade em Farmácia VII","pre":"FFW473; FFW483","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFM010","nome":"Análise Proteo Apli Diag Terap","pre":"BMW103; BQM103","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFC501","nome":"Bioquímica Clin Experimental","pre":"FFW232","co":"","cred":2,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC008","nome":"Citopatologia Clinica Aplicada","pre":"FFW232","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC005","nome":"Hematologia Clínica","pre":"FFW355","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC009","nome":"Micologia Médica","pre":"FFW591","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC007","nome":"Microbiologia Clínica Aplicada","pre":"FFW361","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC004","nome":"Parasitologia Clínica Avançada","pre":"FFW472","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC003","nome":"Toxico Aplic Análises Clínicas","pre":"IMW360","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFM009","nome":"Bases da Terapêutica Racional","pre":"FFW471","co":"FFW482","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFI005","nome":"Bases Mol Doenças Metabólicas","pre":"","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFW003","nome":"Diabetes","pre":"CFF122; BQM103","co":"","cred":3,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFM024","nome":"Farmácia Estética","pre":"FFW483","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"BMF001","nome":"Farmacologia Clínica","pre":"FFW471","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFM012","nome":"Farmacometria Lab Clínico","pre":"BMF310","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFI019","nome":"Metabol Lipídeos e Obesidade","pre":"BQM103","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFP002","nome":"Téc Aplicações de Injetáveis","pre":"","co":"","cred":2,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFP001","nome":"Técnicas de Socorrismo","pre":"","co":"","cred":2,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFP015","nome":"Bases da Fitoterapia","pre":"FFW473","co":"","cred":4,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFP007","nome":"Botânica Aplicada","pre":"FFW363","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFM413","nome":"Farmacotécnica Homeopática","pre":"FFW354","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFP304","nome":"Introd à Quím de Prod Naturais","pre":"IQO230","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFP004","nome":"Ctrl Micr. Drogas e Alim Orig Veg","pre":"FFW363","co":"","cred":2,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFP016","nome":"Tópicos Especiais em Produtos Naturais","pre":"FFW473","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFI013","nome":"Biocatal Processos Industriais","pre":"BQM103; IQO230","co":"FFI013","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFM027","nome":"Cosmetologia","pre":"FFW483","co":"","cred":2,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFM022","nome":"Química Industr Farmacêutica","pre":"IQO230","co":"","cred":3,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFM018","nome":"Téc de Purificação na Ind Farm","pre":"BQM103","co":"FFM018","cred":2,"ch":35},
{"periodo":"Escolha Condicionada","codigo":"FFM415","nome":"Tecnologia Farmacêutica","pre":"FFW354","co":"","cred":4,"ch":90},
{"periodo":"Escolha Condicionada","codigo":"FFM026","nome":"Tópicos Especiais em Cromatografia na Indústria Farmacêutica","pre":"FFW241","co":"","cred":1,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFW006","nome":"Tec Prod Hemocomp Hemoderiv","pre":"FFW355","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"PNN015","nome":"Cromatografia","pre":"IQO230","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFC015","nome":"Análises Forenses","pre":"","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFP008","nome":"Botânica Forense","pre":"FFW353","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFM006","nome":"Téc Mod de Proteína Ap C Farmacêuticas","pre":"IQG114","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFI021","nome":"Empreendedorismo Ciênc Farmac","pre":"","co":"","cred":3,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"FFW007","nome":"Gestão de Proj e Comport Organiz","pre":"","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFW008","nome":"Gestão Farmacêutica Aplicada","pre":"","co":"","cred":1,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFI010","nome":"Inovação Ciênc Farmacêuticas","pre":"","co":"","cred":3,"ch":45},
{"periodo":"Escolha Condicionada","codigo":"FFM025","nome":"Patentes Farmacêuticas e Farmoquímicas","pre":"","co":"","cred":2,"ch":30},
{"periodo":"Escolha Condicionada","codigo":"FFW005","nome":"História Descoberta Fármacos","pre":"","co":"","cred":1,"ch":15},
{"periodo":"Escolha Condicionada","codigo":"LEB599","nome":"Líng Bras de Sinais","pre":"","co":"","cred":4,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"NEP148","nome":"Direitos Humanos e Racismo","pre":"","co":"","cred":4,"ch":60},
{"periodo":"Escolha Condicionada","codigo":"NEP149","nome":"Direitos Humanos e Meio Ambiente","pre":"","co":"","cred":4,"ch":60}
];


const totalObrig = disciplinas.filter(d => !periodIsCond(d.periodo)).length;
const totalCond = disciplinas.filter(d => periodIsCond(d.periodo)).length;

const DOM = {
  html: document.documentElement,
  body: document.body,
  themeButtons: Array.from(document.querySelectorAll('[data-theme-mode]')),
  btnInfo: document.getElementById('btn-info'),
  btnClearSelection: document.getElementById('btn-clear-selection'),
  btnCalc: document.getElementById('btn-calcular'),
  btnCR: document.getElementById('btn-open-cr'),
  searchInput: document.getElementById('search-input'),
  searchStatus: document.getElementById('search-status'),
  sections: document.getElementById('sections'),
  stats: {
    completed: document.getElementById('stat-completed'),
    credits: document.getElementById('stat-credits'),
    hours: document.getElementById('stat-hours'),
    progress: document.getElementById('stat-progress'),
    ec: document.getElementById('stat-ec'),
    cr: document.getElementById('stat-cr'),
  },
  bars: {
    obrig: document.getElementById('bar-obrig'),
    cond: document.getElementById('bar-cond'),
  },
  counts: {
    obrigFeitas: document.getElementById('count-obrig-feitas'),
    obrigFaltam: document.getElementById('count-obrig-faltam'),
    condFeitas: document.getElementById('count-cond-feitas'),
    condFaltam: document.getElementById('count-cond-faltam'),
    percentObrig: document.getElementById('percent-obrig'),
    textCondMeta: document.getElementById('text-cond-meta'),
    textCondProgress: document.getElementById('text-cond-progress'),
    iconCondDone: document.getElementById('icon-cond-exclamation'),
  },
  modals: {
    info: document.getElementById('modal-info'),
    details: document.getElementById('modal-details'),
    cr: document.getElementById('modal-cr'),
    condDone: document.getElementById('modal-cond-done'),
    condInfo: document.getElementById('modal-cond-info'),
  },
  detailFields: {
    nome: document.getElementById('det-nome'),
    cod: document.getElementById('det-cod'),
    per: document.getElementById('det-per'),
    cred: document.getElementById('det-cred'),
    ch: document.getElementById('det-ch'),
    pre: document.getElementById('det-pre'),
    co: document.getElementById('det-co'),
  },
  crInputs: document.getElementById('cr-inputs'),
  crResult: document.getElementById('cr-result'),
  updateBanner: document.getElementById('update-banner'),
  updateBtn: document.getElementById('update-now'),
  selectionSaved: document.getElementById('selection-saved'),
  searchNav: document.getElementById('search-nav'),
  searchPrev: document.getElementById('search-prev'),
  searchNext: document.getElementById('search-next'),
  searchCounter: document.getElementById('search-counter'),
  searchToolbar: document.getElementById('search-toolbar'),
};

let notasCR = loadJSON(STORAGE_KEYS.notasCR, {});
let timerLongPress = null;
let swRegistration = null;
let pendingUpdateWorker = null;
let searchMatches = [];
let searchIndex = 0;
let buildState = {
  periodosMap: {},
  periodosKeys: [],
};

function normalizeStr(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function periodIsCond(periodo) {
  return periodo === PERIODO_COND;
}

function creditsOf(mat) {
  return mat.cred || 4;
}

function hoursOf(mat) {
  return mat.ch || creditsOf(mat) * 15;
}

function formatName(mat) {
  return mat.nome + (cifAjustes[mat.codigo] || '');
}

function displayPeriod(mat) {
  return periodIsCond(mat.periodo) ? PERIODO_COND : `${mat.periodo}º Período`;
}

function extractCodes(str) {
  return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}/g) || []) : [];
}

function buildSearchIndex(mat) {
  return normalizeStr([
    formatName(mat),
    mat.codigo,
    displayPeriod(mat),
    `${mat.periodo} periodo`,
    creditsOf(mat),
    hoursOf(mat)
  ].join(' '));
}

function expandSearchAliases(rawText) {
  let r = String(rawText || '').toLowerCase();

  const replacements = [
    [/\bcif\s*(1|i)\b/g, 'cuidado integrado em farmacia i'],
    [/\bcif\s*(2|ii)\b/g, 'cuidado integrado em farmacia ii'],
    [/\bcif\s*(3|iii)\b/g, 'cuidado integrado em farmacia iii'],
    [/\bcif\s*(4|iv)\b/g, 'cuidado integrado em farmacia iv'],
    [/\bcif\s*(5|v)\b/g, 'cuidado integrado em farmacia v'],
    [/\bcif\s*(6|vi)\b/g, 'cuidado integrado em farmacia vi'],
    [/\bcif\s*(7|vii)\b/g, 'cuidado integrado em farmacia vii'],
    [/\bcif\b/g, 'cuidado integrado em farmacia'],

    [/\bpcq\s*(1|i)\b/g, 'producao e controle de qualidade de produtos farmaceuticos i'],
    [/\bpcq\s*(2|ii)\b/g, 'producao e controle de qualidade de produtos farmaceuticos ii'],
    [/\bpcq\s*(3|iii)\b/g, 'producao e controle de qualidade de produtos farmaceuticos iii'],
    [/\bpcq\s*(4|iv)\b/g, 'producao e controle de qualidade de produtos farmaceuticos iv'],
    [/\bpcq\s*(5|v)\b/g, 'producao e controle de qualidade de produtos farmaceuticos v'],
    [/\bpcq\s*(6|vi)\b/g, 'producao e controle de qualidade de produtos farmaceuticos vi'],
    [/\bpcq\s*(7|vii)\b/g, 'producao e controle de qualidade de produtos farmaceuticos vii'],
    [/\bpcq\b/g, 'producao e controle de qualidade'],

    [/\bbqm\s*(1|i)\b/g, 'bioquimica i'],
    [/\bbqm\s*(2|ii)\b/g, 'bioquimica ii'],
    [/\bbqm\b/g, 'bioquimica'],

    [/\bqfm\s*(1|i)\b/g, 'quimica farmaceutica e medicinal i'],
    [/\bqfm\s*(2|ii)\b/g, 'quimica farmaceutica ii'],
    [/\bqfm\b/g, 'quimica farmaceutica'],

    [/\bfisqui\s*(1|i)\b/g, 'fisico-quimica i'],
    [/\bfisqui\s*(2|ii)\b/g, 'fisico-quimica ii'],
    [/\bfisqui\b/g, 'fisico-quimica'],
  ];

  for (const [pattern, replacement] of replacements) r = r.replace(pattern, replacement);
  return normalizeStr(r);
}

function normalizePeriodTerm(raw) {
  const trimmed = String(raw || '').trim().toLowerCase();
  const clean = normalizeStr(trimmed).replace(/periodo/g, '').trim();
  const match = clean.match(/^(0?[1-9]|10)$/);
  return match ? String(parseInt(match[1], 10)) : null;
}

function getConcludedCodes() {
  return Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

function persistCheckedState() {
  saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  flashSavedIndicator();
}

function restoreCheckedState() {
  const stored = loadJSON(STORAGE_KEYS.checked, []);
  const set = new Set(stored);
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });
}

function getCurrentCR() {
  let tP = 0;
  let div = 0;
  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
    const d = notasCR[c.value];
    if (d && d.nota !== '' && !Number.isNaN(d.nota)) {
      const n = parseFloat(d.nota);
      const cr = parseFloat(d.cred || 4);
      tP += n * cr;
      div += cr;
    }
  });
  return div === 0 ? null : (tP / div);
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return "<span class='muted'>Nenhum</span>";
  return extractCodes(reqStr).map(c => {
    const m = disciplinas.find(d => d.codigo === c);
    let label = m ? formatName(m) : c;
    if (m && !periodIsCond(m.periodo)) label += ` (${displayPeriod(m)})`;
    const ok = concluidas.includes(c);
    return `<span class="${ok ? 'req-ok' : 'req-bad'}">${label}</span>`;
  }).join('');
}

function applyCardStatus(cardEl, status) {
  cardEl.classList.remove('status-passed', 'status-eligible', 'status-blocked', 'status-default');
  cardEl.classList.add(status === 'passed' ? 'status-passed' : status === 'eligible' ? 'status-eligible' : status === 'blocked' ? 'status-blocked' : 'status-default');
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.classList.remove('modal-open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach(modal => closeModal(modal.id));
}

function startLongPress(cod) {
  clearTimeout(timerLongPress);
  timerLongPress = setTimeout(() => {
    const m = disciplinas.find(d => d.codigo === cod);
    if (!m) return;
    const concluidas = getConcludedCodes();
    DOM.detailFields.nome.innerText = formatName(m);
    DOM.detailFields.cod.innerText = m.codigo;
    DOM.detailFields.per.innerText = displayPeriod(m);
    DOM.detailFields.cred.innerText = creditsOf(m);
    DOM.detailFields.ch.innerText = `${hoursOf(m)} Horas`;
    DOM.detailFields.pre.innerHTML = resolveReqsColor(m.pre, concluidas);
    DOM.detailFields.co.innerHTML = resolveReqsColor(m.co, concluidas);
    openModal('modal-details');
  }, 600);
}

function cancelLongPress() {
  clearTimeout(timerLongPress);
}

function saveCR(cod, val, tipo) {
  if (!notasCR[cod]) notasCR[cod] = { nota: '', cred: 4 };
  notasCR[cod][tipo] = val !== '' ? parseFloat(val) : '';
  saveJSON(STORAGE_KEYS.notasCR, notasCR);
  updateDashboard();
  renderCRInputsIfOpen();
}

function renderCRInputsIfOpen() {
  if (!DOM.modals.cr.classList.contains('active')) return;
  carregarModalCR();
}

function carregarModalCR() {
  const c = DOM.crInputs;
  c.innerHTML = '';
  DOM.crResult.classList.add('hidden');

  const ch = document.querySelectorAll('input[type="checkbox"]:checked');
  if (!ch.length) {
    c.innerHTML = `<p class="empty-state">Nenhuma matéria marcada como concluída.</p>`;
    return;
  }

  ch.forEach(x => {
    const m = disciplinas.find(d => d.codigo === x.value);
    if (!m) return;
    const s = notasCR[x.value] || { nota: '', cred: creditsOf(m) };
    c.insertAdjacentHTML('beforeend', `
      <div class="cr-row">
        <span class="cr-name">${formatName(m)}</span>
        <input type="number" min="0" max="10" step="0.1" class="cr-input" value="${s.nota}" onchange="saveCR('${x.value}',this.value,'nota')" placeholder="Nota">
        <input type="number" min="1" max="20" step="1" class="cr-cred" value="${s.cred}" onchange="saveCR('${x.value}',this.value,'cred')" placeholder="Créd.">
      </div>`);
  });
}

function calcularCRValue() {
  let tP = 0, div = 0;
  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
    const d = notasCR[c.value];
    if (d && d.nota !== '' && !Number.isNaN(d.nota)) {
      const n = parseFloat(d.nota);
      const cr = parseFloat(d.cred || 4);
      tP += (n * cr);
      div += cr;
    }
  });
  const r = DOM.crResult;
  r.classList.remove('hidden');
  if (div === 0) { r.innerHTML = 'Insira ao menos uma nota válida para calcular o CR.'; return; }
  const withNotes = Array.from(document.querySelectorAll('.cr-input')).filter(input => input.value !== '').length;
  r.innerHTML = `<div class="cr-result-main">CR = ${(tP / div).toFixed(2)}</div><div class="cr-result-sub">${withNotes} disciplina${withNotes===1?'':'s'} considerada${withNotes===1?'':'s'} • ${div} créd. ponderados</div>`;
}

function isApta(m, concluidas) {
  const pR = extractCodes(m.pre);
  const cR = extractCodes(m.co);

  if (!pR.every(r => concluidas.includes(r))) return false;
  return cR.every(r => concluidas.includes(r));
}

function getSelectedCondStats() {
  let condCred = 0;
  let condHoras = 0;
  let condCount = 0;

  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
    const m = disciplinas.find(d => d.codigo === c.value);
    if (!m || !periodIsCond(m.periodo)) return;
    condCount++;
    condCred += creditsOf(m);
    condHoras += hoursOf(m);
  });

  return { condCred, condHoras, condCount };
}

function updateSummaryCards() {
  const concluidas = getConcludedCodes();
  const selectedTotal = concluidas.length;
  const { condCred, condHoras } = getSelectedCondStats();
  const cr = getCurrentCR();
  const totalSubjects = disciplinas.length;
  const percent = TOTAL_CREDITS ? Math.round(((DOM.creditsNow || 0) / TOTAL_CREDITS) * 100) : 0;

  DOM.stats.completed.textContent = `${selectedTotal} / ${totalSubjects}`;
  DOM.stats.credits.textContent = `${DOM.creditsNow || 0} / ${TOTAL_CREDITS}`;
  DOM.stats.hours.textContent = `${DOM.hoursNow || 0} / ${TOTAL_HOURS}`;
  DOM.stats.progress.textContent = `${percent}%`;
  DOM.stats.ec.textContent = `${condCred} créd. • ${condHoras}h`;
  DOM.stats.cr.textContent = cr === null ? '--' : cr.toFixed(2);
}

function flashSavedIndicator() {
  DOM.selectionSaved.classList.add('show');
  clearTimeout(flashSavedIndicator._t);
  flashSavedIndicator._t = setTimeout(() => DOM.selectionSaved.classList.remove('show'), 1000);
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0;
  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
    const m = disciplinas.find(d => d.codigo === c.value);
    if (!m) return;
    const baseCred = creditsOf(m);
    const baseHor = hoursOf(m);

    if (periodIsCond(c.dataset.periodo)) dCond++;
    else dObrig++;

    tCred += baseCred;
    tHr += baseHor;
  });

  DOM.creditsNow = tCred;
  DOM.hoursNow = tHr;

  DOM.counts.obrigFeitas.textContent = dObrig;
  DOM.counts.obrigFaltam.textContent = Math.max(0, totalObrig - dObrig);
  const pObrig = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
  DOM.counts.percentObrig.textContent = `${pObrig}%`;
  DOM.bars.obrig.style.width = `${Math.min(100, pObrig)}%`;

  DOM.counts.condFeitas.textContent = dCond;
  DOM.counts.condFaltam.textContent = Math.max(0, totalCond - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  const faltaCred = Math.max(0, META_COND_CRED - condCred);
  const faltaHoras = Math.max(0, META_COND_HORAS - condHoras);
  DOM.counts.textCondMeta.textContent = (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) ? 'Meta atingida' : `Faltam ${faltaCred} créd. e ${faltaHoras}h`;
  DOM.counts.textCondProgress.textContent = `${condCred} créd. • ${condHoras}h`;

  const pCondCred = META_COND_CRED ? (condCred / META_COND_CRED) * 100 : 0;
  const pCondHoras = META_COND_HORAS ? (condHoras / META_COND_HORAS) * 100 : 0;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  DOM.bars.cond.style.width = `${pCond}%`;

  if (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) {
    DOM.counts.textCondMeta.classList.add('hidden');
    DOM.counts.iconCondDone.classList.remove('hidden');
  } else {
    DOM.counts.textCondMeta.classList.remove('hidden');
    DOM.counts.iconCondDone.classList.add('hidden');
  }

  DOM.stats.credits.textContent = `${tCred} / ${TOTAL_CREDITS}`;
  DOM.stats.hours.textContent = `${tHr} / ${TOTAL_HOURS}`;
  updateSummaryCards();
}

function abrirPeriodo(periodo) {
  document.querySelectorAll('details[data-periodo]').forEach(d => {
    d.open = String(d.dataset.periodo) === String(periodo);
  });
}

function buildSections() {
  buildState.periodosMap = {};
  disciplinas.forEach(d => {
    if (!buildState.periodosMap[d.periodo]) buildState.periodosMap[d.periodo] = [];
    buildState.periodosMap[d.periodo].push(d);
  });

  buildState.periodosKeys = Object.keys(buildState.periodosMap).sort((a, b) => {
    if (a === PERIODO_COND) return 1;
    if (b === PERIODO_COND) return -1;
    return parseInt(a, 10) - parseInt(b, 10);
  });

  const container = DOM.sections;
  container.innerHTML = '';

  buildState.periodosKeys.forEach((periodo, index) => {
    const titulo = periodo === PERIODO_COND ? periodo : `${periodo}º Período`;
    const periodSearch = normalizeStr(periodo === PERIODO_COND ? PERIODO_COND : `${periodo} período`);
    const iconHtml = periodo === PERIODO_COND
      ? `<button type="button" class="cond-info-icon" aria-label="Saiba mais sobre escolha condicionada" onclick="event.preventDefault(); openModal('modal-cond-info');">i</button>`
      : '';

    const materiasHtml = buildState.periodosMap[periodo].map(m => `
      <label id="card-${m.codigo}"
             data-periodo="${periodo}"
             data-periodo-search="${periodSearch}"
             data-search="${buildSearchIndex(m)}"
             class="subject-card status-default"
             onmousedown="startLongPress('${m.codigo}')"
             onmouseup="cancelLongPress()"
             onmouseleave="cancelLongPress()"
             ontouchstart="startLongPress('${m.codigo}')"
             ontouchend="cancelLongPress()">
        <input type="checkbox"
               class="check"
               value="${m.codigo}"
               data-periodo="${periodo}"
               onchange="persistCheckedState(); updateDashboard(); applySelectedVisualization(getConcludedCodes());">
        <div class="subject-copy">
          <div class="subject-name">${formatName(m)}</div>
          <div class="subject-meta">${m.codigo} • ${creditsOf(m)} créd. • ${hoursOf(m)} Horas.</div>
          <div class="subject-status-note hidden" aria-live="polite"></div>
        </div>
      </label>`).join('');

    const section = document.createElement('details');
    section.className = 'period-section';
    section.dataset.periodo = periodo;
    section.dataset.index = String(index);
    section.open = index === 0;

    section.innerHTML = `
      <summary class="period-summary">
        <span class="period-title">${titulo} ${iconHtml}</span>
        <span class="period-arrow">⌄</span>
      </summary>
      <div class="period-content">
        <div class="period-actions">
          <button onclick="marcarTudo('${periodo}')" class="action-btn action-btn-primary">Marcar Tudo</button>
          <button onclick="limparTudo('${periodo}')" class="action-btn action-btn-danger">Limpar Tudo</button>
        </div>
        ${materiasHtml}
      </div>`;
    container.appendChild(section);
  });
}

function markSection(periodo, checked) {
  document.querySelectorAll(`input[data-periodo="${periodo}"]`).forEach(cb => { cb.checked = checked; });
}

function marcarTudo(p) {
  if (periodIsCond(p) && !confirm('Isso vai marcar todas as disciplinas de Escolha Condicionada. Continuar?')) return;
  markSection(p, true);
  persistCheckedState();
  updateDashboard();
}

function limparTudo(p) {
  markSection(p, false);
  persistCheckedState();
  updateDashboard();
}

function clearSelection() {
  if (!confirm('Deseja desmarcar todas as disciplinas?')) return;
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  persistCheckedState();
  updateDashboard();
  document.querySelectorAll('.subject-card').forEach(card => applyCardStatus(card, 'default'));
}

function requirementSummary(m, concluidas) {
  if(concluidas.includes(m.codigo)) return '✓ Cursada';
  const missingPre=extractCodes(m.pre).filter(code=>!concluidas.includes(code));
  const missingCo=extractCodes(m.co).filter(code=>!concluidas.includes(code));
  const parts=[];
  if(missingPre.length) parts.push(`Pré-requisito${missingPre.length>1?'s':''}: ${missingPre.join(', ')}`);
  if(missingCo.length) parts.push(`Correquisito${missingCo.length>1?'s':''}: ${missingCo.join(', ')} — cursar junto`);
  return parts.length ? `Falta${parts.length>1?'m':''}: ${parts.join(' • ')}` : '✓ Pode puxar';
}
function applySelectedVisualization(concluidas) {
  disciplinas.forEach(m=>{
    const c=document.getElementById(`card-${m.codigo}`); if(!c)return;
    const note=c.querySelector('.subject-status-note');
    if(!concluidas.length){
      applyCardStatus(c,'default');
      if(note) note.classList.add('hidden');
      return;
    }
    const status=concluidas.includes(m.codigo)?'passed':(isApta(m,concluidas)?'eligible':'blocked');
    applyCardStatus(c,status);
    if(note){note.textContent=requirementSummary(m,concluidas);note.classList.remove('hidden');}
  });
}

function normalizePeriodDisplayForSearch(value) {
  const q = expandSearchAliases(value);
  return q;
}

function clearSearchNavigation() {
  searchMatches = []; searchIndex = 0;
  DOM.searchNav.classList.add('hidden');
  DOM.searchToolbar.classList.remove('floating');
  DOM.searchCounter.textContent = '0 / 0';
  document.querySelectorAll('.search-hit-current').forEach(el => el.classList.remove('search-hit-current'));
}
function getSearchMatches() { return Array.from(document.querySelectorAll('.subject-card')).filter(card => !card.hidden); }
function focusSearchResult(index, behavior='smooth') {
  if (!searchMatches.length) return;
  searchIndex = (index + searchMatches.length) % searchMatches.length;
  const card = searchMatches[searchIndex];
  document.querySelectorAll('.search-hit-current').forEach(el => el.classList.remove('search-hit-current'));
  const section = card.closest('.period-section'); if (section) section.open = true;
  card.classList.add('search-hit-current');
  DOM.searchCounter.textContent = `${searchIndex + 1} / ${searchMatches.length}`;
  card.scrollIntoView({behavior, block:'center'});
  clearTimeout(focusSearchResult._timer);
  focusSearchResult._timer = setTimeout(() => card.classList.remove('search-hit-current'), 1800);
}
function updateSearchNavigation(rawValue, shouldScroll=true) {
  const raw=String(rawValue||'').trim();
  if(!raw){clearSearchNavigation();return;}
  searchMatches=getSearchMatches();
  if(!searchMatches.length){clearSearchNavigation();return;}
  searchIndex=0;
  if(searchMatches.length>1){DOM.searchNav.classList.remove('hidden');DOM.searchToolbar.classList.add('floating');DOM.searchCounter.textContent=`1 / ${searchMatches.length}`;}
  else {DOM.searchNav.classList.add('hidden');DOM.searchToolbar.classList.remove('floating');}
  if(shouldScroll) focusSearchResult(0);
}
function nextSearchResult(){ if(searchMatches.length) focusSearchResult(searchIndex+1); }
function prevSearchResult(){ if(searchMatches.length) focusSearchResult(searchIndex-1); }

function filterSubjects(rawValue, options={}) {
  const raw=String(rawValue||'').trim();
  const periodMatch=normalizePeriodTerm(raw);
  const q=normalizePeriodDisplayForSearch(raw);
  const periodOnly = Boolean(periodMatch && normalizeStr(raw).replace(/periodo/g, '').trim() === periodMatch);
  let visibleCards=0;
  document.querySelectorAll('.period-section').forEach(section=>{
    let sectionVisible=false;
    section.querySelectorAll('.subject-card').forEach(card=>{
      const matches=raw==='' || (periodOnly ? card.dataset.periodo===periodMatch : ((periodMatch && card.dataset.periodo===periodMatch) || card.dataset.search.includes(q) || card.dataset.periodoSearch.includes(q)));
      card.hidden=!matches; if(matches){visibleCards++;sectionVisible=true;}
    });
    section.hidden=!sectionVisible; section.open=raw==='' ? section.dataset.index==='0' : sectionVisible;
  });
  if(raw===''){DOM.searchStatus.textContent=`Mostrando ${disciplinas.length} disciplinas em ${buildState.periodosKeys.length} períodos.`;clearSearchNavigation();}
  else if(!visibleCards){DOM.searchStatus.textContent=`Nenhuma disciplina encontrada para “${raw}”.`;clearSearchNavigation();}
  else {DOM.searchStatus.textContent=`${visibleCards} disciplina${visibleCards===1?'':'s'} encontrada${visibleCards===1?'':'s'} para “${raw}”.`;updateSearchNavigation(raw,options.navigate!==false);}
}

function setTheme(mode) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
  document.body.classList.add(`theme-${mode}`);
  localStorage.setItem(STORAGE_KEYS.theme, mode);
  DOM.themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeMode === mode);
    btn.setAttribute('aria-pressed', btn.dataset.themeMode === mode ? 'true' : 'false');
  });
}

function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEYS.theme);
  const mode = stored || 'light';
  setTheme(mode);
}

function showUpdateBanner() {
  DOM.updateBanner.classList.add('show');
}

function hideUpdateBanner() {
  DOM.updateBanner.classList.remove('show');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    swRegistration = reg;

    const showPrompt = () => {
      if (reg.waiting) {
        pendingUpdateWorker = reg.waiting;
        showUpdateBanner();
      }
    };

    if (reg.waiting) showPrompt();

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          pendingUpdateWorker = reg.waiting || newWorker;
          showUpdateBanner();
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }).catch(err => {
    console.error('Service worker registration failed:', err);
  });
}

function requestUpdate() {
  if (!pendingUpdateWorker) return;
  pendingUpdateWorker.postMessage({ type: 'SKIP_WAITING' });
  hideUpdateBanner();
}


function handleSummaryAction(action) {
  if(action==='cr'){ carregarModalCR(); openModal('modal-cr'); return; }
  if(action==='cond'){
    const section=document.querySelector(`details[data-periodo=\"${PERIODO_COND}\"]`);
    if(section){section.open=true; section.scrollIntoView({behavior:'smooth',block:'start'});}
    return;
  }
  if(action==='dashboard'){
    document.querySelector('.dashboard')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  if(action==='completed'){
    const card=Array.from(document.querySelectorAll('.subject-card')).find(c=>c.querySelector('input[type=\"checkbox\"]')?.checked);
    if(card){card.closest('.period-section').open=true; card.scrollIntoView({behavior:'smooth',block:'center'}); card.classList.add('search-hit-current'); setTimeout(()=>card.classList.remove('search-hit-current'),1600);}
  }
}

function init() {
  initTheme();
  buildSections();
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
  filterSubjects(DOM.searchInput.value || '');
  registerServiceWorker();

  DOM.btnInfo.addEventListener('click', () => openModal('modal-info'));
  DOM.btnClearSelection.addEventListener('click', clearSelection);
  DOM.btnCalc.addEventListener('click', () => { applySelectedVisualization(getConcludedCodes()); window.scrollTo({top:0,behavior:'smooth'}); });
  DOM.btnCR.addEventListener('click', () => { carregarModalCR(); openModal('modal-cr'); });
  DOM.searchInput.addEventListener('input', e => { const raw=e.target.value; const periodMatch=normalizePeriodTerm(raw); if(periodMatch) abrirPeriodo(periodMatch); filterSubjects(raw,{navigate:true}); });
  DOM.searchNext.addEventListener('click', nextSearchResult);
  DOM.searchPrev.addEventListener('click', prevSearchResult);
  DOM.searchInput.addEventListener('keydown', e => { if(e.key==='Enter' && searchMatches.length>1){e.preventDefault();nextSearchResult();} });

  DOM.themeButtons.forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeMode));
  });

  DOM.updateBtn.addEventListener('click', requestUpdate);
  document.querySelectorAll('.summary-card.interactive').forEach(card => {
    const action=card.dataset.summaryAction;
    card.addEventListener('click',()=>handleSummaryAction(action));
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleSummaryAction(action);}});
  });
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) closeModal(o.id);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

}

window.extractCodes = extractCodes;
window.normalizeStr = normalizeStr;
window.expandSearchAliases = expandSearchAliases;
window.normalizePeriodTerm = normalizePeriodTerm;
window.periodIsCond = periodIsCond;
window.creditsOf = creditsOf;
window.hoursOf = hoursOf;
window.isApta = isApta;
window.formatName = formatName;
window.saveCR = saveCR;
window.calcularCRValue = calcularCRValue;
window.carregarModalCR = carregarModalCR;
window.marcarTudo = marcarTudo;
window.limparTudo = limparTudo;
window.clearSelection = clearSelection;
window.disciplinas = disciplinas;
window.totalObrig = totalObrig;
window.totalCond = totalCond;
window.filterSubjects = filterSubjects;
window.nextSearchResult = nextSearchResult;
window.prevSearchResult = prevSearchResult;
window.focusSearchResult = focusSearchResult;

document.addEventListener('DOMContentLoaded', init);
