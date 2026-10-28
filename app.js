
const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  plannerChecked: 'planner_checked_v1',
  theme: 'theme',
  searchHistory: 'planejador-search-history',
  onboarded: 'planejador_onboarded_v1'
};
const PERIODO_COND = 'Escolha Condicionada';
const APP_VERSION = '1.8.6';
const T = (key, params) => (window.I18N ? window.I18N.t(key, params) : String(key).replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m)));
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

// Regras do SIGA para a carga de um período.
const SIGA_MIN_CRED = 6;
const SIGA_MAX_CRED = 32;
// Usado só na estimativa de conclusão mostrada nos ajustes (não é regra do curso).

const TOTAL_OBRIG_CRED = (typeof disciplinas !== 'undefined' ? disciplinas : [])
  .filter(d => !periodIsCond(d.periodo))
  .reduce((sum, d) => sum + creditsOf(d), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;

let totalObrig = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => !periodIsCond(d.periodo)).length;
let totalCond = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => periodIsCond(d.periodo)).length;

const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;

const normalizeStr = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

// Igual à anterior, mas preserva (um único) espaço entre as palavras.
// A busca precisa das palavras separadas para comparar termo a termo e montar siglas.
const normalizeKeepSpaces = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const STOPWORDS_SIGLA = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'ao', 'as', 'o', 'os', 'na', 'no', 'nas', 'nos', 'para', 'com']);

// "Química Farmacêutica e Medicinal I" -> "qfmi"
function buildAcronym(text) {
  return normalizeKeepSpaces(text)
    .replace(/[()&]/g, ' ')
    .split(' ')
    .filter(word => word && !STOPWORDS_SIGLA.has(word))
    .map(word => word[0])
    .join('');
}

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar.', error);
    showStorageErrorToast(T('Não foi possível salvar suas alterações neste dispositivo.'));
    return false;
  }
};

function formatName(mat) {
  return mat.nome + (typeof disciplinaAjustes !== 'undefined' && disciplinaAjustes[mat.codigo] ? disciplinaAjustes[mat.codigo] : '');
}

function displayPeriod(mat) {
  return mat.periodo === PERIODO_COND ? T('Escolha Condicionada') : T('{n}º Período', { n: mat.periodo });
}

function extractCodes(str) {
  return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}|MACF/g) || []) : [];
}

// Índices internos de desempenho. Não alteram nem duplicam a fonte de dados;
// apenas evitam buscas repetidas por toda a lista de disciplinas.
const disciplinasPorCodigo = new Map();
const preRequisitosPorCodigo = new Map();
const corequisitosPorCodigo = new Map();
const dependentesPorCodigo = new Map();
const buscaIndexPorCodigo = new Map();

function inicializarIndicesDisciplinas() {
  if (typeof disciplinas === 'undefined' || !Array.isArray(disciplinas)) return;

  disciplinasPorCodigo.clear();
  preRequisitosPorCodigo.clear();
  corequisitosPorCodigo.clear();
  dependentesPorCodigo.clear();
  buscaIndexPorCodigo.clear();

  disciplinas.forEach(d => {
    disciplinasPorCodigo.set(d.codigo, d);
    preRequisitosPorCodigo.set(d.codigo, extractCodes(d.pre));
    corequisitosPorCodigo.set(d.codigo, extractCodes(d.co));
    if (!dependentesPorCodigo.has(d.codigo)) dependentesPorCodigo.set(d.codigo, new Set());
  });

  disciplinas.forEach(d => {
    const relacionados = [
      ...preRequisitosPorCodigo.get(d.codigo),
      ...corequisitosPorCodigo.get(d.codigo)
    ];
    relacionados.forEach(codigo => {
      if (!dependentesPorCodigo.has(codigo)) dependentesPorCodigo.set(codigo, new Set());
      dependentesPorCodigo.get(codigo).add(d.codigo);
    });
  });
}

function getDisciplinaByCode(codigo) {
  return disciplinasPorCodigo.get(codigo) || null;
}

inicializarIndicesDisciplinas();

function periodIsCond(periodo) {
  return periodo === PERIODO_COND;
}

function creditsOf(mat) {
  return mat.cred || 4;
}

function hoursOf(mat) {
  return mat.ch || creditsOf(mat) * 15;
}

// Estado reativo: as seleções ficam em memória; o DOM só é consultado
// quando precisamos efetivamente atualizar ou renderizar a interface.
const storedCheckedState = loadJSON(STORAGE_KEYS.checked, []);
const storedPlannerState = loadJSON(STORAGE_KEYS.plannerChecked, []);
const appState = {
  concludedCodes: new Set(Array.isArray(storedCheckedState) ? storedCheckedState : []),
  plannerCheckedCodes: new Set(Array.isArray(storedPlannerState) ? storedPlannerState : [])
};

const checkboxesPorCodigo = new Map();

function getConcludedCodes() {
  return Array.from(appState.concludedCodes);
}

function getCoreqRelatedCodes(codigo) {
  const related = new Set();
  const queue = [codigo];

  while (queue.length) {
    const current = queue.shift();
    const direct = new Set(corequisitosPorCodigo.get(current) || []);

    // Também encontra a disciplina que declara o código atual como co-requisito.
    (dependentesPorCodigo.get(current) || []).forEach(dependente => {
      const coCodes = corequisitosPorCodigo.get(dependente) || [];
      if (coCodes.includes(current)) direct.add(dependente);
    });

    direct.forEach(code => {
      if (code !== codigo && !related.has(code)) {
        related.add(code);
        queue.push(code);
      }
    });
  }

  return Array.from(related);
}

function getCheckboxByCode(codigo) {
  return checkboxesPorCodigo.get(codigo) || null;
}

function setSubjectChecked(codigo, checked, originCodigo = codigo, showAutoToast = false) {
  const cb = getCheckboxByCode(codigo);
  if (!cb) return false;

  const changed = cb.checked !== checked;
  cb.checked = checked;
  if (checked) appState.concludedCodes.add(codigo);
  else appState.concludedCodes.delete(codigo);

  if (checked && changed && showAutoToast && codigo !== originCodigo) {
    const autoMat = getDisciplinaByCode(codigo);
    const originMat = getDisciplinaByCode(originCodigo);
    if (autoMat && originMat) {
      showCoreqAutoToast(formatName(autoMat), formatName(originMat));
    }
  }

  return changed;
}

function synchronizeCorequisites(originCodigo, checked, showAutoToast = false) {
  const related = getCoreqRelatedCodes(originCodigo);
  related.forEach(code => setSubjectChecked(code, checked, originCodigo, showAutoToast));
  return related;
}

// Matérias já marcadas como cursadas cujo pré-requisito deixou de estar cumprido
// depois de desmarcar `codigos`. Só informa; nunca desmarca nada por conta própria.
function getBrokenDependents(codigos, concludedSet) {
  const found = new Map();
  codigos.forEach(codigo => {
    (dependentesPorCodigo.get(codigo) || new Set()).forEach(dep => {
      if (found.has(dep) || !concludedSet.has(dep)) return;
      const mat = getDisciplinaByCode(dep);
      if (!mat || !(preRequisitosPorCodigo.get(dep) || []).includes(codigo)) return;
      if (!checkReqs(mat.pre, concludedSet)) found.set(dep, mat);
    });
  });
  return Array.from(found.values());
}

function showPrereqWarningToast(originMat, brokenMats) {
  if (!originMat || !brokenMats.length) return;
  const highlight = mat => `<span class="toast-coreq-name">${escapeHTML(formatName(mat))}</span>`;
  const names = brokenMats.slice(0, 3).map(highlight).join(', ');
  const extraTxt = brokenMats.length > 3 ? T(' e mais {n}', { n: brokenMats.length - 3 }) : '';
  showToast({
    mode: 'coreq',
    duration: 6500,
    html: T(brokenMats.length === 1
      ? 'Você desmarcou {a}, mas {b}{extra} continua marcada e depende dela como pré-requisito.'
      : 'Você desmarcou {a}, mas {b}{extra} continuam marcadas e dependem dela como pré-requisito.', { a: highlight(originMat), b: names, extra: extraTxt })
  });
}

function handleSubjectCheckboxChange(cb, options = {}) {
  const codigo = cb.value;
  const beforeSet = new Set(appState.concludedCodes);

  if (cb.checked) appState.concludedCodes.add(codigo);
  else appState.concludedCodes.delete(codigo);

  const related = synchronizeCorequisites(codigo, cb.checked, options.showAutoToast !== false);
  const afterSet = new Set(appState.concludedCodes);

  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(afterSet);

  if (cb.checked) {
    const unlocked = getUnlockCascadeCodes(codigo, beforeSet, afterSet);
    animateUnlockedCards(unlocked);
  } else {
    const quebradas = getBrokenDependents([codigo, ...related], afterSet);
    if (quebradas.length) showPrereqWarningToast(getDisciplinaByCode(codigo), quebradas);
  }

  return related;
}

let saveStatusTimer = null;

function persistCheckedState(showStatus = true) {
  const saved = saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  const el = document.getElementById('save-status');
  if (saved && showStatus && el) {
    el.classList.remove('opacity-0');
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => el.classList.add('opacity-0'), 1600);
  }
  return saved;
}

let pendingConfirmationAction = null;

// Aviso do sistema (alertdialog próprio, independente dos painéis de informação).
let systemAlertReturnFocus = null;

function openConfirmationModal({ title, message, confirmText = T('Sim'), cancelText = T('Não'), onConfirm = null }) {
  const root = document.getElementById('system-alert');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  if (!root || !titleEl || !messageEl || !okBtn || !cancelBtn) return;

  titleEl.textContent = title || T('Confirmar ação');
  messageEl.textContent = message || '';
  okBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  pendingConfirmationAction = typeof onConfirm === 'function' ? onConfirm : null;
  okBtn.onclick = () => {
    const action = pendingConfirmationAction;
    closeConfirmationModal();
    if (action) action();
  };

  systemAlertReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('is-open'));
  cancelBtn.focus({ preventScroll: true });
}

function closeConfirmationModal() {
  pendingConfirmationAction = null;
  const root = document.getElementById('system-alert');
  if (!root || root.hidden) return;
  root.classList.remove('is-open');
  root.hidden = true;
  systemAlertReturnFocus?.focus?.({ preventScroll: true });
  systemAlertReturnFocus = null;
}

document.addEventListener('keydown', event => {
  const root = document.getElementById('system-alert');
  if (!root || root.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeConfirmationModal(); return; }
  if (event.key === 'Tab') {
    const buttons = [...root.querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(i + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }
}, true);

function restoreCheckedState() {
  const storedRaw = loadJSON(STORAGE_KEYS.checked, []);
  const stored = new Set(Array.isArray(storedRaw) ? storedRaw : []);
  appState.concludedCodes.clear();
  stored.forEach(codigo => {
    if (disciplinasPorCodigo.has(codigo)) appState.concludedCodes.add(codigo);
  });

  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.checked = appState.concludedCodes.has(cb.value);
  });

  // Mantém os co-requisitos sincronizados mesmo com uma seleção antiga salva.
  Array.from(appState.concludedCodes).forEach(codigo => synchronizeCorequisites(codigo, true, false));
  // Normaliza o que está salvo, mas sem acender o aviso "salvo" ao abrir o app.
  persistCheckedState(false);
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return `<span class='text-gray-500 font-normal'>${T('Nenhum')}</span>`;
  const incompleteColor = html.classList.contains('dark') ? '#f87171' : '#ef4444';
  const completedColor = html.classList.contains('dark') ? '#34d399' : '#10b981';

  return extractCodes(reqStr).map(c => {
    const m = getDisciplinaByCode(c);
    let label = m ? formatName(m) : c;
    if (m && !periodIsCond(m.periodo)) label += ` (${displayPeriod(m)})`;
    const color = concluidas instanceof Set ? (concluidas.has(c) ? completedColor : incompleteColor) : (concluidas.includes(c) ? completedColor : incompleteColor);
    return `<span style="color:${color}" class="font-bold block mb-1">${escapeHTML(label)}</span>`;
  }).join('');
}

function applyCardStatus(cardEl, status) {
  cardEl.classList.remove('status-default', 'status-passed', 'status-eligible', 'status-blocked');
  cardEl.classList.add(
    status === 'passed' ? 'status-passed'
      : status === 'eligible' ? 'status-eligible'
      : status === 'blocked' ? 'status-blocked'
      : 'status-default'
  );
}

function getSubjectStatusForSet(mat, concludedSet) {
  if (!mat) return 'blocked';
  return concludedSet.has(mat.codigo)
    ? 'passed'
    : (checkReqs(mat.pre, concludedSet) ? 'eligible' : 'blocked');
}

function getUnlockCascadeCodes(originCodigo, beforeSet, afterSet) {
  const queue = [{ codigo: originCodigo, distance: 0 }];
  const visited = new Set([originCodigo]);
  const unlocked = [];

  while (queue.length) {
    const { codigo, distance } = queue.shift();
    const dependents = Array.from(dependentesPorCodigo.get(codigo) || []);

    dependents.forEach(dependentCode => {
      if (visited.has(dependentCode)) return;
      visited.add(dependentCode);

      const mat = getDisciplinaByCode(dependentCode);
      if (!mat) return;

      const beforeStatus = getSubjectStatusForSet(mat, beforeSet);
      const afterStatus = getSubjectStatusForSet(mat, afterSet);

      if (beforeStatus === 'blocked' && afterStatus === 'eligible') {
        unlocked.push({ codigo: dependentCode, distance: distance + 1 });
      }

      // Continue through the dependency graph so a chain of already-satisfied
      // prerequisites can receive a staggered unlock animation.
      if (afterStatus === 'eligible' || beforeStatus === 'blocked') {
        queue.push({ codigo: dependentCode, distance: distance + 1 });
      }
    });
  }

  return unlocked.sort((a, b) => a.distance - b.distance);
}

function animateUnlockedCards(unlockedCodes = []) {
  if (!unlockedCodes.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  unlockedCodes.forEach(({ codigo, distance }, index) => {
    const card = document.querySelector(`.subject-card[data-codigo="${CSS.escape(codigo)}"]`);
    if (!card) return;

    card.classList.remove('subject-unlocked-wave');
    card.style.setProperty('--unlock-delay', `${Math.min(index * 70 + (distance - 1) * 45, 520)}ms`);

    // Force a clean animation restart when the same card is unlocked again later.
    void card.offsetWidth;
    card.classList.add('subject-unlocked-wave');

    window.setTimeout(() => {
      card.classList.remove('subject-unlocked-wave');
      card.style.removeProperty('--unlock-delay');
    }, 900);
  });
}

function syncAccordionTheme(dark) {
  const container = document.getElementById('accordions-container');
  if (!container) return;
  container.dataset.themeState = dark ? 'dark' : 'light';
}

function setTheme(isDark, persist = true) {
  const dark = Boolean(isDark);

  // A troca do tema deve ser instantânea. Em navegadores móveis,
  // transições + backdrop-filter podem causar artefatos de composição.
  html.classList.add('theme-switching');
  html.classList.toggle('dark', dark);
  html.classList.toggle('light', !dark);
  html.style.colorScheme = dark ? 'dark' : 'only light';
  const csMeta = document.getElementById('color-scheme-meta');
  if (csMeta) csMeta.content = dark ? 'dark' : 'only light';
  syncAccordionTheme(dark);

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Não foi possível salvar o tema.', error);
    }
  }

  const themeMeta = document.getElementById('theme-color-meta');
  if (themeMeta) themeMeta.content = dark ? '#0f1115' : '#24564b';
  updateThemeUI();

  // Consolida o novo estado antes de reativar animações/transições.
  void html.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => html.classList.remove('theme-switching'));
  });
}

// ---- Preferências do painel de configurações ----
const SETTINGS_KEYS = { textSize: 'planejador_textsize_v1', toastMs: 'planejador_toast_ms_v1' };
const TEXT_SIZES = ['sm', 'md', 'lg', 'xl'];
const TOAST_OPTIONS = [2000, 4000, 6000, 8000, 10000];
const SUPPORT_EMAIL = 'lucas.vambora1@gmail.com';

function readSetting(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function writeSetting(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
}

function getThemePref() {
  const saved = readSetting(STORAGE_KEYS.theme);
  return saved === 'dark' || saved === 'light' ? saved : 'auto';
}
function setThemePref(pref) {
  if (pref === 'auto') {
    try { localStorage.removeItem(STORAGE_KEYS.theme); } catch (_) {}
    setTheme(Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches), false);
  } else if (pref === 'light' || pref === 'dark') {
    setTheme(pref === 'dark', true);
  }
  updateSettingsUI();
}

function getTextSize() {
  const saved = readSetting(SETTINGS_KEYS.textSize);
  return TEXT_SIZES.includes(saved) ? saved : 'md';
}
function applyTextSize(size) {
  html.dataset.textSize = TEXT_SIZES.includes(size) ? size : 'md';
}
function setTextSize(size) {
  if (!TEXT_SIZES.includes(size)) return;
  writeSetting(SETTINGS_KEYS.textSize, size);
  applyTextSize(size);
  updateSettingsUI();
}

function getToastMs() {
  const saved = Number(readSetting(SETTINGS_KEYS.toastMs));
  return TOAST_OPTIONS.includes(saved) ? saved : 6000;
}
function setToastMs(ms) {
  if (!TOAST_OPTIONS.includes(ms)) return;
  writeSetting(SETTINGS_KEYS.toastMs, String(ms));
  updateSettingsUI();
  showToast({ text: T('Os avisos agora ficam {n} s na tela.', { n: ms / 1000 }) });
}

function getLang() { return window.I18N ? window.I18N.lang : 'pt'; }
function setLanguage(code) {
  if (!window.I18N || !window.I18N.supported.includes(code) || code === window.I18N.lang) return;
  window.I18N.save(code);
  // Recarrega para que todo o conteúdo (inclusive o gerado por script) nasça no novo idioma.
  window.location.reload();
}

async function hardRefreshAssets() {
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (_) {}
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map(r => r.unregister()));
  } catch (_) {}
  await Promise.all(['./', 'index.html', 'app.js', 'i18n.js', 'styles.css', 'tailwind.css', 'disciplinas.js']
    .map(u => fetch(u, { cache: 'reload' }).catch(() => null)));
}

async function checkForUpdate() {
  const btn = document.getElementById('check-update-button');
  const status = document.getElementById('update-status');
  if (!btn || !status || btn.disabled) return;
  const say = (text, state) => { status.textContent = text; status.dataset.state = state || ''; };
  btn.disabled = true;
  say(T('Verificando…'), 'busy');
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const res = await fetch(`app.js?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('http ' + res.status);
    const match = (await res.text()).match(/const APP_VERSION = '([^']+)'/);
    const remote = match ? match[1] : null;
    if (remote && remote !== APP_VERSION) {
      say(T('Nova versão {v} encontrada. Atualizando…', { v: remote }), 'busy');
      await hardRefreshAssets();
      window.location.reload();
      return;
    }
    say(T('Você já usa a versão mais recente ({v}).', { v: APP_VERSION }), 'ok');
    navigator.serviceWorker?.getRegistration?.().then(r => r?.update()).catch(() => {});
  } catch (_) {
    say(T('Não foi possível verificar agora. Confira sua conexão e tente de novo.'), 'error');
  } finally {
    btn.disabled = false;
  }
}

function updateSettingsUI() {
  const current = {
    'set-theme': getThemePref(),
    'set-text-size': getTextSize(),
    'set-toast-ms': String(getToastMs()),
    'set-lang': getLang()
  };
  document.querySelectorAll('#modal-settings [data-pa-action^="set-"]').forEach(btn => {
    const on = btn.dataset.value === current[btn.dataset.paAction];
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.classList.toggle('is-selected', on);
  });
  const hint = document.getElementById('settings-theme-hint');
  if (hint) {
    const pref = getThemePref();
    hint.textContent = pref === 'auto'
      ? T('Segue o tema do seu aparelho ({mode}).', { mode: html.classList.contains('dark') ? T('escuro') : T('claro') })
      : pref === 'dark' ? T('Sempre escuro.') : T('Sempre claro.');
  }
  const version = document.getElementById('app-version');
  if (version) version.textContent = APP_VERSION;
}

function updateThemeUI() { updateSettingsUI(); }

function toggleThemeFromSettings() {
  setThemePref(html.classList.contains('dark') ? 'light' : 'dark');
}

const modalFocusReturn = new Map();
const modalStack = [];
const FOCUSABLE_SELECTOR = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object',
  'embed', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])'
].join(',');

function getModalDialogElement(modal) {
  return modal?.querySelector('.modal-content, .info-modal-content, .choice-info-modal') || modal?.firstElementChild || null;
}

function getModalFocusableElements(modal) {
  return Array.from(modal?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(el => {
    const style = window.getComputedStyle(el);
    return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function prepareModalA11y(modal) {
  if (!modal) return;

  // As abas inferiores usam a mesma marcação histórica dos modais, mas não são
  // diálogos. Preservamos a semântica de tabpanel e não aplicamos aria-modal.
  if (typeof bottomTabIds !== 'undefined' && bottomTabIds.includes(modal.id)) {
    modal.setAttribute('role', 'tabpanel');
    modal.removeAttribute('aria-modal');
    modal.setAttribute('aria-hidden', modal.classList.contains('bottom-tab-current') ? 'false' : 'true');
    return;
  }

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', modal.classList.contains('active') ? 'false' : 'true');
  const dialog = getModalDialogElement(modal);
  if (dialog) {
    dialog.setAttribute('tabindex', '-1');
    const heading = dialog.querySelector('h1, h2, h3, h4');
    if (heading && !heading.id) heading.id = `${modal.id}-title`;
    if (heading) modal.setAttribute('aria-labelledby', heading.id);
  }
}

function focusModalContents(modal) {
  if (!modal) return;
  const focusables = getModalFocusableElements(modal);
  const dialog = getModalDialogElement(modal);
  (focusables[0] || dialog)?.focus?.({ preventScroll: true });
}

function getTopActiveModal() {
  for (let i = modalStack.length - 1; i >= 0; i -= 1) {
    const modal = document.getElementById(modalStack[i]);
    if (modal?.classList.contains('active')) return modal;
  }
  return null;
}

const bottomTabIds = ['home-page', 'modal-planner', 'modal-farmacia', 'modal-contatos', 'modal-settings'];
const bottomTabNavIds = {
  'home-page': 'bottom-nav-home',
  'modal-planner': 'bottom-nav-planner',
  'modal-farmacia': 'bottom-nav-farmacia',
  'modal-contatos': 'bottom-nav-contacts',
  'modal-settings': 'bottom-nav-settings'
};

let activeBottomTabId = 'home-page';
let bottomSwipePointerId = null;
let bottomSwipeStartX = 0;
let bottomSwipeStartY = 0;
let bottomSwipeStartIndex = 0;
let bottomSwipeDirection = 0;
let bottomSwipeWidth = 0;
let bottomSwipeTracking = false;
let bottomSwipeLocked = false;
let bottomSwipeJustDragged = false;
let bottomTabTransitionTimer = null;

function setBottomNavActive(id) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const active = item.id === id;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function getBottomTabElement(id) {
  return document.getElementById(id);
}

function getBottomTabIndex(id) {
  return bottomTabIds.indexOf(id);
}

function getViewportWidth() {
  // No iPhone (app instalado) innerWidth pode vir defasado na primeira pintura; clientWidth é estável.
  return Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
}

function setBottomTrackPosition(activeIndex, dragX = 0, transition = false) {
  const width = getViewportWidth();
  bottomTabIds.forEach((id, index) => {
    const tab = getBottomTabElement(id);
    if (!tab) return;
    tab.style.setProperty(
      'transform',
      `translate3d(${((index - activeIndex) * width) + dragX}px, 0, 0)`,
      'important'
    );
    tab.style.setProperty(
      'transition',
      transition ? 'transform .28s cubic-bezier(.22,1,.36,1)' : 'none',
      'important'
    );
  });
}

function normalizeBottomTabs(activeId, instant = true) {
  const activeIndex = getBottomTabIndex(activeId);
  if (activeIndex < 0) return;

  bottomTabIds.forEach((id, index) => {
    const tab = getBottomTabElement(id);
    if (!tab) return;
    const active = index === activeIndex;
    tab.classList.toggle('bottom-tab-current', active);
    tab.classList.remove('bottom-tab-dragging', 'active');
    tab.setAttribute('aria-hidden', active ? 'false' : 'true');
    tab.style.setProperty('pointer-events', active ? 'auto' : 'none', 'important');
    tab.style.setProperty('visibility', 'visible', 'important');
    tab.style.setProperty('opacity', '1', 'important');
    tab.style.setProperty('z-index', '80', 'important');
  });

  setBottomTrackPosition(activeIndex, 0, !instant);
  setBottomNavActive(bottomTabNavIds[activeId]);
  document.body.style.overflow = activeId === 'home-page' ? '' : 'hidden';
  try { localStorage.setItem('planejador_active_tab_v1', activeId); } catch (_) {}
}

function prepareBottomTabForDrag(tab, pointerEvents = true) {
  if (!tab) return;
  tab.classList.add('bottom-tab-dragging');
  tab.style.setProperty('visibility', 'visible', 'important');
  tab.style.setProperty('opacity', '1', 'important');
  tab.style.setProperty('pointer-events', pointerEvents ? 'auto' : 'none', 'important');
  tab.style.setProperty('transition', 'none', 'important');
  tab.style.setProperty('z-index', '80', 'important');
}

function beginBottomSwipe(direction) {
  const currentIndex = getBottomTabIndex(activeBottomTabId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= bottomTabIds.length) return false;

  const current = getBottomTabElement(activeBottomTabId);
  const target = getBottomTabElement(bottomTabIds[nextIndex]);
  if (!current || !target) return false;

  if (target.id === 'modal-planner') renderPlanner();
  if (target.id === 'modal-farmacia') window.FarmacIA?.show();
  if (target.id === 'modal-contatos') renderContatos();

  bottomSwipeStartIndex = currentIndex;
  bottomSwipeDirection = direction;
  bottomSwipeWidth = Math.max(1, window.innerWidth);

  // Todas as quatro telas pertencem ao mesmo trilho horizontal.
  // Não existe tela "por cima" ou "por baixo": cada uma ocupa sua posição
  // consecutiva no eixo X, exatamente como um pager/WhatsApp.
  bottomTabIds.forEach(id => prepareBottomTabForDrag(getBottomTabElement(id), id === current.id || id === target.id));
  setBottomTrackPosition(currentIndex, 0, false);
  document.documentElement.classList.add('tab-dragging');
  return true;
}

function updateBottomSwipe(dx) {
  if (!bottomSwipeDirection) return;
  const width = bottomSwipeWidth || window.innerWidth;
  const progress = Math.max(0, Math.min(1, (-dx * bottomSwipeDirection) / width));
  setBottomTrackPosition(bottomSwipeStartIndex, dx, false);
  const targetIndex = bottomSwipeStartIndex + bottomSwipeDirection;
  setBottomNavActive(
    progress >= 0.5
      ? bottomTabNavIds[bottomTabIds[targetIndex]]
      : bottomTabNavIds[bottomTabIds[bottomSwipeStartIndex]]
  );
}

function clearBottomSwipeState() {
  bottomSwipePointerId = null;
  bottomSwipeDirection = 0;
  bottomSwipeWidth = 0;
  bottomSwipeTracking = false;
  bottomSwipeLocked = false;
  document.documentElement.classList.remove('tab-dragging');
}

function finishBottomSwipe(clientX, clientY, cancelled = false) {
  if (!bottomSwipeTracking && !bottomSwipeDirection) return;

  const dx = clientX - bottomSwipeStartX;
  const dy = clientY - bottomSwipeStartY;
  const direction = bottomSwipeDirection;
  const width = bottomSwipeWidth || window.innerWidth;
  const progress = Math.min(1, Math.abs(dx) / width);
  const validDirection = direction && Math.sign(dx) === -direction;
  const shouldComplete = !cancelled && bottomSwipeLocked && validDirection &&
    Math.abs(dx) > Math.abs(dy) * 1.15 && (progress >= 0.35 || Math.abs(dx) >= 110);

  bottomSwipeTracking = false;
  bottomSwipeLocked = false;
  bottomSwipeJustDragged = Math.abs(dx) > 12;

  if (!direction) {
    clearBottomSwipeState();
    return;
  }

  if (shouldComplete) {
    const targetIndex = bottomSwipeStartIndex + direction;
    const targetId = bottomTabIds[targetIndex];
    setBottomTrackPosition(
      bottomSwipeStartIndex,
      direction > 0 ? -width : width,
      true
    );
    setBottomNavActive(bottomTabNavIds[targetId]);
    activeBottomTabId = targetId;
    document.body.style.overflow = targetId === 'home-page' ? '' : 'hidden';

    bottomTabTransitionTimer = window.setTimeout(() => {
      bottomTabTransitionTimer = null;
      normalizeBottomTabs(activeBottomTabId, true);
      clearBottomSwipeState();
    }, 320);
  } else {
    // Solta antes do limiar: o trilho volta exatamente para a posição atual.
    setBottomTrackPosition(bottomSwipeStartIndex, 0, true);
    setBottomNavActive(bottomTabNavIds[activeBottomTabId]);
    bottomTabTransitionTimer = window.setTimeout(() => {
      bottomTabTransitionTimer = null;
      normalizeBottomTabs(activeBottomTabId, true);
      clearBottomSwipeState();
    }, 320);
  }
}

function isBottomNavInteractiveTarget(target) {
  return !!target?.closest?.(
    '#bottom-nav, input, textarea, select, [contenteditable="true"], [data-no-tab-swipe="true"]'
  );
}

const bottomSwipeActivePointers = new Set();
function handleBottomSwipeStart(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (isBottomNavInteractiveTarget(event.target) || event.target?.closest?.('#search-wrapper, #planner-search-wrapper, #search-suggestions')) return;
  if (bottomTabTransitionTimer !== null) {
    clearTimeout(bottomTabTransitionTimer);
    bottomTabTransitionTimer = null;
  }
  if (bottomSwipeDirection) clearBottomSwipeState();

  const activePage = getBottomTabElement(activeBottomTabId);
  if (!activePage) return;

  bottomSwipePointerId = event.pointerId;
  bottomSwipeStartX = event.clientX;
  bottomSwipeStartY = event.clientY;
  bottomSwipeTracking = true;
  bottomSwipeLocked = false;
  bottomSwipeJustDragged = false;
  // A captura do ponteiro só é feita quando o gesto horizontal é confirmado (handleBottomSwipeMove).
  // Capturar já no toque redirecionava o clique seguinte para a página e quebrava os botões.
}

function handleBottomSwipeMove(event) {
  if (!bottomSwipeTracking || event.pointerId !== bottomSwipePointerId) return;
  const dx = event.clientX - bottomSwipeStartX;
  const dy = event.clientY - bottomSwipeStartY;

  if (!bottomSwipeLocked) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      bottomSwipeTracking = false;
      bottomSwipePointerId = null;
      return;
    }

    const direction = dx < 0 ? 1 : -1;
    if (!beginBottomSwipe(direction)) {
      bottomSwipeTracking = false;
      bottomSwipePointerId = null;
      return;
    }
    bottomSwipeLocked = true;
    try { getBottomTabElement(activeBottomTabId)?.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  event.preventDefault();
  bottomSwipeJustDragged = true;
  updateBottomSwipe(dx);
}

// Pinça (dois dedos) é zoom, nunca troca de aba: qualquer segundo toque cancela o gesto.
document.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch') return;
  bottomSwipeActivePointers.add(event.pointerId);
  if (bottomSwipeActivePointers.size > 1 && bottomSwipePointerId !== null) {
    if (bottomSwipeLocked) finishBottomSwipe(bottomSwipeStartX, bottomSwipeStartY, true);
    bottomSwipeTracking = false;
    bottomSwipePointerId = null;
  }
}, { passive: true, capture: true });
['pointerup', 'pointercancel'].forEach(type => {
  document.addEventListener(type, event => bottomSwipeActivePointers.delete(event.pointerId), { passive: true, capture: true });
});
document.addEventListener('pointerdown', event => {
  if (bottomSwipeActivePointers.size > 1) return;
  handleBottomSwipeStart(event);
}, { passive: true, capture: true });
window.addEventListener('resize', () => normalizeBottomTabs(activeBottomTabId, true), { passive: true });
document.addEventListener('pointermove', handleBottomSwipeMove, { passive: false, capture: true });
document.addEventListener('pointerup', event => {
  if (event.pointerId !== bottomSwipePointerId) return;
  finishBottomSwipe(event.clientX, event.clientY);
}, { passive: true, capture: true });
document.addEventListener('pointercancel', event => {
  if (event.pointerId !== bottomSwipePointerId) return;
  finishBottomSwipe(bottomSwipeStartX, bottomSwipeStartY, true);
}, { passive: true, capture: true });
document.addEventListener('click', event => {
  if (!bottomSwipeJustDragged || isBottomNavInteractiveTarget(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  bottomSwipeJustDragged = false;
}, true);

function dismissRegularModalsForBottomNavigation() {
  const activeIds = modalStack.filter(modalId => !bottomTabIds.includes(modalId));
  activeIds.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  });
  modalStack.length = 0;
  activeModalCount = 0;
  if (activeIds.length && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur?.();
  }
}

function activateBottomTab(id, instant = false) {
  if (!bottomTabIds.includes(id)) return;

  if (bottomTabTransitionTimer !== null) {
    clearTimeout(bottomTabTransitionTimer);
    bottomTabTransitionTimer = null;
  }

  dismissRegularModalsForBottomNavigation();
  const currentId = activeBottomTabId;
  if (currentId === id) return;

  const currentIndex = getBottomTabIndex(currentId);
  const targetIndex = getBottomTabIndex(id);
  if (currentIndex < 0 || targetIndex < 0) return;

  if (id === 'modal-planner') renderPlanner();
  if (id === 'modal-farmacia') window.FarmacIA?.show();
  if (id === 'modal-contatos') renderContatos();

  // O clique também usa o mesmo trilho do swipe. As quatro telas ficam
  // sempre nas posições 0, 1, 2 e 3; só deslocamos o trilho inteiro.
  bottomTabIds.forEach(tabId => {
    const tab = getBottomTabElement(tabId);
    if (!tab) return;
    tab.classList.remove('bottom-tab-current', 'bottom-tab-dragging');
    tab.style.setProperty('visibility', 'visible', 'important');
    tab.style.setProperty('opacity', '1', 'important');
    tab.style.setProperty('pointer-events', 'none', 'important');
    tab.style.setProperty('z-index', '80', 'important');
  });

  setBottomTrackPosition(currentIndex, 0, false);

  if (instant) {
    activeBottomTabId = id;
    normalizeBottomTabs(activeBottomTabId, true);
    return;
  }

  bottomTabIds.forEach(tabId => {
    const tab = getBottomTabElement(tabId);
    if (tab) tab.classList.add('bottom-tab-dragging');
  });

  activeBottomTabId = id;
  const target = getBottomTabElement(id);
  if (target) target.setAttribute('aria-hidden', 'false');
  setBottomNavActive(bottomTabNavIds[id]);
  document.body.style.overflow = id === 'home-page' ? '' : 'hidden';

  requestAnimationFrame(() => {
    setBottomTrackPosition(targetIndex, 0, true);
  });

  bottomTabTransitionTimer = window.setTimeout(() => {
    bottomTabTransitionTimer = null;
    normalizeBottomTabs(activeBottomTabId, true);
  }, 300);
}

function goToHome() {
  activateBottomTab('home-page');
}
function openBottomPlanner() {
  activateBottomTab('modal-planner');
}
function openBottomFarmacia() {
  activateBottomTab('modal-farmacia');
}
function openBottomContacts() {
  activateBottomTab('modal-contatos');
}
function openBottomSettings() {
  activateBottomTab('modal-settings');
}

function openModal(id) {
  if (bottomTabIds.includes(id)) {
    activateBottomTab(id);
    return;
  }
  const modal = document.getElementById(id);
  if (!modal) return;
  prepareModalA11y(modal);

  if (!modal.classList.contains('active')) {
    modalFocusReturn.set(id, document.activeElement instanceof HTMLElement ? document.activeElement : null);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modalStack.push(id);
    activeModalCount++;
  }
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => focusModalContents(modal));
}

function closeModal(id) {
  if (bottomTabIds.includes(id)) {
    if (activeBottomTabId === id) activateBottomTab('home-page');
    return;
  }
  const modal = document.getElementById(id);
  if (!modal) return;

  if (modal.classList.contains('active')) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    activeModalCount = Math.max(0, activeModalCount - 1);
    const stackIndex = modalStack.lastIndexOf(id);
    if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
  }

  if (activeModalCount === 0) {
    document.body.style.overflow = '';
    const previous = modalFocusReturn.get(id);
    modalFocusReturn.delete(id);
    if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
  } else {
    const top = getTopActiveModal();
    if (top) requestAnimationFrame(() => focusModalContents(top));
  }
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  prepareModalA11y(o);
  o.addEventListener('click', e => {
    if (e.target === o) closeModal(o.id);
  });
});

document.addEventListener('keydown', e => {
  const modal = getTopActiveModal();
  if (!modal) return;

  if (e.key === 'Escape' && !e.defaultPrevented) {
    e.preventDefault();
    closeModal(modal.id);
    return;
  }

  if (e.key !== 'Tab') return;
  const focusables = getModalFocusableElements(modal);
  if (!focusables.length) {
    e.preventDefault();
    getModalDialogElement(modal)?.focus?.({ preventScroll: true });
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// Único ponto que mexe no balão (#toast-copy). Os três modos reproduzem os
// estilos que já existiam: padrão (copiar), co-requisito (nomes em destaque) e erro.
function hideToast() {
  const toast = document.getElementById('toast-copy');
  if (!toast) return;
  toast.classList.remove('opacity-100', 'translate-y-0');
  toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.querySelectorAll('.toast-progress').forEach(el => el.remove());
}

function showToast({ text = '', html = null, mode = 'default', action = null, progress = false, icon = 'check' } = {}) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  if (mode === 'error') {
    toast.classList.remove('toast-coreq-mode', 'bg-gray-900', 'dark:bg-gray-100');
    toast.classList.add('bg-red-600', 'dark:bg-red-500', 'text-white');
  } else if (mode === 'coreq') {
    toast.classList.remove('bg-red-600', 'dark:bg-red-500');
    toast.classList.add('toast-coreq-mode', 'bg-gray-900', 'dark:bg-gray-100', 'text-white', 'dark:text-gray-900');
  } else {
    toast.classList.remove('toast-coreq-mode', 'bg-red-600', 'dark:bg-red-500');
    toast.classList.add('bg-gray-900', 'dark:bg-gray-100', 'text-white', 'dark:text-gray-900');
  }

  // Ícone do balão: "check" (V verde, padrão) ou "x" (X vermelho, p.ex. desmarcações).
  const iconKind = mode === 'error' ? 'check' : icon;
  toast.dataset.icon = iconKind;
  const iconPath = toast.querySelector('svg path');
  if (iconPath) iconPath.setAttribute('d', iconKind === 'x' ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7');

  if (html !== null) msgEl.innerHTML = html;
  else msgEl.textContent = text;

  toast.querySelectorAll('.toast-action-btn').forEach(btn => btn.remove());
  if (action && typeof action.onClick === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action-btn';
    if (action.iconHTML) btn.innerHTML = `${action.iconHTML}<span>${escapeHTML(action.label || 'Desfazer')}</span>`;
    else btn.textContent = action.label || 'Desfazer';
    btn.addEventListener('click', event => {
      event.stopPropagation();
      clearTimeout(window.__toastTimer);
      hideToast();
      action.onClick();
    });
    toast.appendChild(btn);
  }

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  toast.querySelectorAll('.toast-progress').forEach(el => el.remove());
  const total = getToastMs();
  if (progress) {
    const bar = document.createElement('div');
    bar.className = 'toast-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.animationDuration = `${total}ms`;
    toast.appendChild(bar);
  }
  window.__toastTimer = setTimeout(hideToast, total);
}

function showStorageErrorToast(message) {
  showToast({ text: message, mode: 'error', duration: 3500 });
}

async function copyTextToClipboard(text, prefixLabel, event, plural = false) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToastCustom(T(plural ? '{label} copiados com sucesso!' : '{label} copiado com sucesso!', { label: prefixLabel }), text);
  } catch (error) {
    console.warn('Não foi possível copiar.', error);
    showToast({ text: T('Não foi possível copiar. Tente novamente.'), mode: 'error', duration: 3000 });
  }
}

async function copyCodeToClipboard(codigo, event) {
  await copyTextToClipboard(codigo, T('Código'), event);
}

function showCoreqInfo(event, codigo) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const m = getDisciplinaByCode(codigo);
  if (!m || !m.co) return;

  const coNames = extractCodes(m.co).map(c => {
    const mat = getDisciplinaByCode(c);
    const name = mat ? formatName(mat) : c;
    const period = mat ? displayPeriod(mat) : '';
    const suffix = period ? ` (${period})` : '';
    return `<span class="coreq-name-highlight">${escapeHTML(name)}</span><span class="coreq-period-highlight">${escapeHTML(suffix)}</span>`;
  }).join(', ');

  const titleEl = document.getElementById('coreq-title');
  const descEl = document.getElementById('coreq-desc');

  if (titleEl) titleEl.innerText = formatName(m);
  if (descEl) {
    descEl.innerHTML = T('Essa matéria possui {names} como co-requisito, ou seja, devem ser cursadas simultaneamente no mesmo período.', { names: coNames });
  }

  openModal('modal-coreq');
}

function showCoreqAutoToast(autoName, originName) {
  showToast({
    mode: 'coreq',
    duration: 3500,
    html: T('A matéria {auto} foi marcada automaticamente por ser co-requisito de {origin}', { auto: `<span class="toast-coreq-name">${escapeHTML(autoName)}</span>`, origin: `<span class="toast-coreq-name">${escapeHTML(originName)}</span>` })
  });
}

function showToastCustom(msg, highlight = '') {
  if (!highlight) {
    showToast({ text: msg });
    return;
  }
  const safeMsg = escapeHTML(msg);
  const safeHighlight = escapeHTML(highlight);
  const chip = `<span class="toast-code-chip">${safeHighlight}</span>`;
  // Antes o destaque só aparecia se o texto da mensagem já contivesse o valor
  // (o que nunca acontecia ao copiar um código). Agora ele é anexado quando falta.
  const html = safeMsg.includes(safeHighlight) ? safeMsg.replace(safeHighlight, chip) : `${safeMsg} ${chip}`;
  showToast({ html });
}

let longPressPointer = null;
let longPressStartX = 0;
let longPressStartY = 0;

function openSubjectDetails(cod) {
  const m = getDisciplinaByCode(cod);
  if (!m) return;
  const concluidas = getConcludedCodes();
  document.getElementById('det-nome').innerText = formatName(m);
  document.getElementById('det-cod').innerText = m.codigo;
  document.getElementById('det-per').innerText = displayPeriod(m);
  document.getElementById('det-cred').innerText = creditsOf(m);
  document.getElementById('det-ch').innerText = `${hoursOf(m)} Horas`;
  document.getElementById('det-pre').innerHTML = resolveReqsColor(m.pre, concluidas);
  document.getElementById('det-co').innerHTML = resolveReqsColor(m.co, concluidas);
  const trancaEl = document.getElementById('det-tranca');
  if (trancaEl) {
    const locked = getPrereqLockedSubjects(m.codigo);
    trancaEl.innerHTML = locked.length
      ? locked.map(t => `<span class="font-bold block mb-1 det-locked det-locked-${getSubjectStatus(t)}">${escapeHTML(formatName(t))}${periodIsCond(t.periodo) ? '' : ` (${escapeHTML(displayPeriod(t))})`}</span>`).join('')
      : `<span class='text-gray-500 font-normal'>${T('Nenhuma')}</span>`;
  }
  const copyBtn = document.getElementById('det-copy-btn');
  if (copyBtn) copyBtn.onclick = (e) => copyCodeToClipboard(m.codigo, e);
  openModal('modal-details');
}

function startLongPress(cod, event) {
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelLongPress();
  longPressPointer = event?.pointerId ?? null;
  longPressStartX = event?.clientX ?? 0;
  longPressStartY = event?.clientY ?? 0;

  timerLongPress = setTimeout(() => {
    timerLongPress = null;
    openSubjectDetails(cod);
  }, 600);
}

function handleLongPressMove(event) {
  if (timerLongPress === null) return;
  if (longPressPointer !== null && event.pointerId !== longPressPointer) return;
  const dx = Math.abs((event.clientX ?? 0) - longPressStartX);
  const dy = Math.abs((event.clientY ?? 0) - longPressStartY);
  if (dx > 10 || dy > 10) cancelLongPress();
}

function cancelLongPress() {
  clearTimeout(timerLongPress);
  timerLongPress = null;
  longPressPointer = null;
}

function getPeriodCodes(periodo) {
  return disciplinas.filter(d => String(d.periodo) === String(periodo)).map(d => d.codigo);
}

// Matérias de OUTROS períodos que são marcadas/desmarcadas junto, por co-requisito.
function getCoreqSideEffects(periodCodes) {
  const inPeriod = new Set(periodCodes);
  const extra = new Set();
  periodCodes.forEach(code => {
    getCoreqRelatedCodes(code).forEach(rel => {
      if (!inPeriod.has(rel)) extra.add(rel);
    });
  });
  return Array.from(extra).map(getDisciplinaByCode).filter(Boolean);
}

function formatSubjectList(mats, limit = 3) {
  const names = mats.slice(0, limit).map(m => `${formatName(m)} (${displayPeriod(m)})`);
  const rest = mats.length - limit;
  return names.join(', ') + (rest > 0 ? ` e mais ${rest}` : '');
}

function marcarTudo(p) {
  const periodCodes = getPeriodCodes(p);
  const sideEffects = getCoreqSideEffects(periodCodes).filter(m => !appState.concludedCodes.has(m.codigo));

  const run = () => {
    const before = snapshotState();
    periodCodes.forEach(codigo => {
      if (!setSubjectChecked(codigo, true)) return;
      synchronizeCorequisites(codigo, true, false);
    });
    // setSubjectChecked só devolve true quando algo mudou; garante co-requisitos mesmo
    // para matérias que já estavam marcadas.
    periodCodes.forEach(codigo => synchronizeCorequisites(codigo, true, false));
    persistCheckedState();
    updateDashboard();
    applySelectedVisualization(appState.concludedCodes);

    if (sameSet(before.concluded, appState.concludedCodes)) return;
    showToast({
      mode: 'coreq',
      duration: 4000,
      text: T('Todas as matérias do período foram marcadas automaticamente.'),
      action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
    });
  };

  if (p === PERIODO_COND) {
    const extraMsg = sideEffects.length
      ? ' ' + T('Isso também marcará, por serem co-requisito: {list}.', { list: formatSubjectList(sideEffects) })
      : '';
    openConfirmationModal({
      title: T('Marcar todas as condicionadas?'),
      message: T('Todas as disciplinas de Escolha Condicionada serão marcadas como cursadas.') + extraMsg,
      confirmText: T('Marcar todas'),
      onConfirm: run
    });
    return;
  }
  run();
}

function limparTudo(p) {
  const before = snapshotState();
  getPeriodCodes(p).forEach(codigo => {
    setSubjectChecked(codigo, false);
    synchronizeCorequisites(codigo, false, false);
  });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);

  const removidas = before.concluded.size - appState.concludedCodes.size;
  if (removidas > 0) {
    showToast({
      mode: 'coreq',
      duration: 4000,
      icon: 'x',
      text: T('Todas as matérias do período foram desmarcadas automaticamente.'),
      action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
    });
  }
}

const UNDO_ICON_HTML = '<svg class="toast-undo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 010 11H11"></path></svg>';

// Pede confirmação antes de limpar tudo; o botão "Não" é vermelho.
function clearAllConcluded() {
  if (!appState.concludedCodes.size) return;
  openConfirmationModal({
    title: T('Limpar tudo?'),
    message: T('Deseja realmente limpar todas as matérias marcadas como concluídas?'),
    confirmText: T('Sim'),
    onConfirm: performClearAllConcluded
  });
}

function performClearAllConcluded() {
  if (!appState.concludedCodes.size) return;

  const before = snapshotState();
  checkboxesPorCodigo.forEach(cb => { cb.checked = false; });

  appState.concludedCodes.clear();
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  showToast({
    icon: 'x',
    text: T('Todas as matérias marcadas como concluídas foram desmarcadas.'),
    duration: 4000,
    progress: true,
    action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
  });
}

function getSelectedCondStats() {
  let condCred = 0, condHoras = 0, condCount = 0;
  appState.concludedCodes.forEach(codigo => {
    const m = getDisciplinaByCode(codigo);
    if (m && periodIsCond(m.periodo)) {
      condCount++;
      condCred += creditsOf(m);
      condHoras += hoursOf(m);
    }
  });
  return { condCred, condHoras, condCount };
}

function updateProgressAccessibility(id, value, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.setAttribute('aria-valuenow', String(Math.round(value)));
  if (label) el.setAttribute('aria-label', label);
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0;

  appState.concludedCodes.forEach(codigo => {
    const m = getDisciplinaByCode(codigo);
    if (!m) return;
    const baseCred = creditsOf(m);
    const baseHor = hoursOf(m);

    if (periodIsCond(m.periodo)) dCond++;
    else {
      dObrig++;
      obrigCredFeitos += baseCred;
    }
    tCred += baseCred;
    tHr += baseHor;
  });

  const countObrigPainel = document.getElementById('count-obrig-feitas-painel');
  if(countObrigPainel) countObrigPainel.textContent = dObrig;
  const countObrigTotal = document.getElementById('count-obrig-total-painel');
  if(countObrigTotal) countObrigTotal.textContent = totalObrig;

  const countObrigFeitas = document.getElementById('count-obrig-feitas');
  if(countObrigFeitas) countObrigFeitas.textContent = dObrig;
  const countObrigFaltam = document.getElementById('count-obrig-faltam');
  if(countObrigFaltam) countObrigFaltam.textContent = Math.max(0, totalObrig - dObrig);

  const pObrig = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
  const percentObrig = document.getElementById('percent-obrig');
  if(percentObrig) percentObrig.textContent = pObrig + '%';
  const barObrig = document.getElementById('bar-obrig');
  if(barObrig) barObrig.style.width = Math.min(100, pObrig) + '%';
  updateProgressAccessibility('bar-obrig', pObrig, T('Progresso das disciplinas obrigatórias: {p}%', { p: pObrig }));

  const countCondFeitas = document.getElementById('count-cond-feitas');
  if(countCondFeitas) countCondFeitas.textContent = dCond;
  const countCondFaltam = document.getElementById('count-cond-faltam');
  if(countCondFaltam) countCondFaltam.textContent = Math.max(0, totalCond - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  const condProgressText = document.getElementById('text-cond-progress');
  if(condProgressText) condProgressText.textContent = T('{c} créd. • {h}h', { c: condCred, h: condHoras });

  const pCondCred = (condCred / META_COND_CRED) * 100;
  const pCondHoras = (condHoras / META_COND_HORAS) * 100;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  const barCond = document.getElementById('bar-cond');
  if(barCond) barCond.style.width = pCond + '%';
  updateProgressAccessibility('bar-cond', pCond, T('Progresso das disciplinas de Escolha Condicionada: {p}%', { p: Math.round(pCond) }));

  const condMeta = document.getElementById('text-cond-meta');
  const condIcon = document.getElementById('icon-cond-exclamation');
  if (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) {
    if(condMeta) condMeta.classList.add('hidden');
    if(condIcon) condIcon.classList.remove('hidden');
  } else {
    if(condMeta) condMeta.classList.remove('hidden');
    if(condIcon) condIcon.classList.add('hidden');
  }

  const condProgress = Math.min(1, condCred / META_COND_CRED, condHoras / META_COND_HORAS);
  const creditosEquivalentes = obrigCredFeitos + (META_COND_CRED * condProgress);
  const percent = Math.min(100, Math.round((creditosEquivalentes / TOTAL_GRAD_CRED_EQUIV) * 100));
  
  const percentTotal = document.getElementById('percent-total');
  if(percentTotal) percentTotal.textContent = `${percent}%`;
  
  const tCreditosNode = document.getElementById('total-creditos');
  if(tCreditosNode) tCreditosNode.textContent = tCred;
  
  const tHorasNode = document.getElementById('total-horas');
  if(tHorasNode) tHorasNode.textContent = tHr;

}

function getSubjectStatus(mat) {
  if (appState.concludedCodes.has(mat.codigo)) return 'passed';
  return checkReqs(mat.pre, appState.concludedCodes) ? 'eligible' : 'blocked';
}

const SUBJECT_STATUS_ICON_CONFIG = {
  passed: { label: T('Cursada'), classes: 'text-blue-600 dark:text-blue-300', type: 'check' },
  eligible: { label: T('Disponível'), classes: 'text-emerald-600 dark:text-emerald-300', type: 'unlocked' },
  blocked: { label: T('Bloqueada'), classes: 'text-red-600 dark:text-red-300', type: 'locked' }
};

const LOCK_BODY = '<rect class="lock-body" x="4" y="11" width="16" height="10" rx="2"></rect>';
const LOCK_SHACKLE = '<path class="lock-shackle" d="M8 11V8a4 4 0 018 0v3"></path>';
const LOCK_CHECK = '<path d="M5 13l4 4L19 7"></path>';

function subjectStatusIconHTML(status, extraClass = '') {
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  const iconMarkup = item.type === 'check' ? LOCK_CHECK : `${LOCK_BODY}${LOCK_SHACKLE}`;
  return `<span class="subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes} ${extraClass}" data-status="${status}" data-icon-type="${item.type}" title="${item.label}" aria-label="${item.label}">
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</svg>
  </span>`;
}

// O cadeado é sempre o mesmo desenho (corpo + haste). O estado "liberado" só
// levanta a haste por CSS, então a troca bloqueado -> liberado anima de verdade.
function updateSubjectStatusIcon(card, status) {
  const icon = card.querySelector('.subject-status-icon');
  if (!icon) return;
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  const prevStatus = icon.dataset.status;
  const prevType = icon.dataset.iconType || '';
  icon.className = `subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes}`;
  icon.dataset.status = status;
  icon.title = item.label;
  icon.setAttribute('aria-label', item.label);

  const svg = icon.querySelector('svg');
  if (!svg) return;
  const wasCheck = prevType === 'check';
  const isCheck = item.type === 'check';
  icon._morphToken = (icon._morphToken || 0) + 1; // cancela animação anterior pendente
  if (isCheck && !wasCheck && prevStatus === 'eligible' && canAnimateIcons()) {
    playLockToCheck(icon, svg);
  } else if (wasCheck !== isCheck || !svg.querySelector('.lock-shackle') && !isCheck) {
    svg.innerHTML = isCheck ? LOCK_CHECK : `${LOCK_BODY}${LOCK_SHACKLE}`;
  }
  icon.dataset.iconType = item.type;
  const swing = prevStatus === 'blocked' && status === 'eligible' ? 'lock-just-unlocked'
    : prevStatus === 'eligible' && status === 'blocked' ? 'lock-just-locked' : '';
  if (swing) {
    icon.classList.add(swing);
    setTimeout(() => icon.classList.remove(swing), 900);
  }
}


function canAnimateIcons() {
  return document.documentElement.classList.contains('app-ready')
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Marcar como cursada: a argola desce para dentro do corpo, o corpo arredonda até
// virar uma esfera, a esfera encolhe e se abre no meio até ficar o "V".
// Feito com requestAnimationFrame sobre atributos SVG para funcionar em qualquer navegador.
const MORPH_MS = 900;
const morphClamp = v => Math.max(0, Math.min(1, v));
const morphEase = v => v < .5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
const morphLerp = (a, b, p) => a + (b - a) * p;

// Monta o cadeado "liberado" com a peça extra do V e devolve set(t), t de 0 a 1.
function createLockMorph(svg) {
  svg.innerHTML = `${LOCK_BODY}${LOCK_SHACKLE}<path class="morph-check" d="M5 13l4 4L19 7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity="0"></path>`;
  const body = svg.querySelector('.lock-body');
  const shackle = svg.querySelector('.lock-shackle');
  const check = svg.querySelector('.morph-check');
  shackle.style.animation = 'none';
  shackle.style.transition = 'none';
  return function set(t) {
    // 1) a argola (parada deslocada, como no cadeado liberado) desce e entra no corpo
    const p1 = morphEase(morphClamp(t / .3));
    shackle.style.transform = `translate(${morphLerp(-8, 0, p1)}px, 0px) translate(12px, 11px) scale(1, ${1 - p1}) translate(-12px, -11px)`;
    shackle.style.opacity = String(1 - morphClamp((p1 - .85) / .15));
    // 2) os cantos vão arredondando: retângulo -> esfera
    const p2 = morphEase(morphClamp((t - .15) / .4));
    body.setAttribute('x', morphLerp(4, 6.5, p2));
    body.setAttribute('y', morphLerp(11, 8.5, p2));
    body.setAttribute('width', morphLerp(16, 11, p2));
    body.setAttribute('height', morphLerp(10, 11, p2));
    body.setAttribute('rx', morphLerp(2, 5.5, p2));
    // 3) a esfera encolhe e 4) se abre no meio, afinando até o "V"
    const p3 = morphEase(morphClamp((t - .55) / .3));
    body.setAttribute('transform', `translate(12 14) scale(${morphLerp(1, .35, p3)}) translate(-12 -14)`);
    body.style.opacity = String(1 - morphClamp((p3 - .5) / .5));
    const p4 = morphEase(morphClamp((t - .62) / .38));
    check.setAttribute('opacity', p4 > 0 ? '1' : '0');
    check.setAttribute('stroke-dashoffset', String(1 - p4));
    check.setAttribute('transform', `translate(12 12) scale(${morphLerp(.7, 1, p4)}) translate(-12 -12)`);
  };
}

function playLockToCheck(icon, svg) {
  const token = icon._morphToken;
  const set = createLockMorph(svg);
  const t0 = performance.now();
  const frame = now => {
    if (icon._morphToken !== token || !svg.isConnected) return;
    const t = morphClamp((now - t0) / MORPH_MS);
    set(t);
    if (t < 1) requestAnimationFrame(frame);
    else svg.innerHTML = LOCK_CHECK;
  };
  requestAnimationFrame(frame);
}

// Quantas matérias têm esta como PRÉ-requisito (co-requisitos não entram na conta).
function getPrereqDependentsCount(codigo) {
  let count = 0;
  (dependentesPorCodigo.get(codigo) || new Set()).forEach(dep => {
    if ((preRequisitosPorCodigo.get(dep) || []).includes(codigo)) count++;
  });
  return count;
}

function unlockChipHTML(codigo) {
  const n = getPrereqDependentsCount(codigo);
  if (!n) return '';
  const label = n === 1 ? T('Pré-requisito de 1 matéria') : T('Pré-requisito de {n} matérias', { n });
  return `<span class="subject-meta-text unlock-chip" title="${escapeHTML(label)}">${T('Pré-req. de {n}', { n })}</span>`;
}

// Alternativa acessível ao toque longo: abre os mesmos detalhes por clique/teclado.
function infoButtonHTML(action, safeCode, safeName) {
  return `<button type="button" class="card-info-button p-1 text-gray-400 hover:text-yellowTheme-600" data-pa-action="${action}" data-codigo="${safeCode}" title="${T('Ver detalhes')}" aria-label="${T('Ver detalhes de {name}', { name: safeName })}">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>
  </button>`;
}

function createSubjectCardHTML(mat) {
  const checked = appState.concludedCodes.has(mat.codigo) ? 'checked' : '';
  const status = getSubjectStatus(mat);
  const safeCode = escapeHTML(mat.codigo);
  const safeName = escapeHTML(formatName(mat));
  const safePeriodo = escapeHTML(mat.periodo);
  const coreqBtn = mat.co
    ? `<button class="coreq-button" type="button" data-pa-action="coreq-info" data-codigo="${safeCode}" title="${T('Ver co-requisito')}" aria-label="${T('Ver co-requisito de {name}', { name: safeName })}">C</button>`
    : '';

  return `
  <div class="subject-card block p-3 rounded-xl relative mb-2 select-none"
       data-codigo="${safeCode}" data-periodo="${safePeriodo}">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML(status)}
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="subject-code text-[0.80rem] md:text-sm font-semibold">${safeCode}</span>
            <button type="button" class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600" data-pa-action="copy-code" data-codigo="${safeCode}" title="${T('Copiar código')}" aria-label="${T('Copiar código {code}', { code: safeCode })}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            ${infoButtonHTML('details', safeCode, safeName)}
          </div>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="subject-meta-text text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(creditsOf(mat))} ${T('Créd.')}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="subject-meta-text text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(hoursOf(mat))}h</span>
          ${unlockChipHTML(mat.codigo)}
        </div>
      </div>
      <div class="flex items-center h-full pt-1">
        <input type="checkbox" value="${safeCode}" data-periodo="${safePeriodo}" ${checked} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="${T('Marcar {name}', { name: safeName })}">
      </div>
    </div>
  </div>`;
}

function showCondInfo(event) {
  event.stopPropagation();
  event.preventDefault();
  const title = document.getElementById('period-info-title');
  const desc = document.getElementById('period-info-desc');
  if (title) title.textContent = T('Escolha Condicionada');
  if (desc) desc.textContent = T('Disciplinas de Escolha Condicionada são as eletivas do currículo novo. Basicamente você precisa ter 12 créditos e 180 horas dessas matérias para se formar.');
  openModal('modal-period-info');
}

function renderAccordions() {
  const container = document.getElementById('accordions-container');
  if (!container || typeof disciplinas === 'undefined') return;

  const periods = {};
  disciplinas.forEach(d => {
    if (!periods[d.periodo]) periods[d.periodo] = [];
    periods[d.periodo].push(d);
  });

  let htmlContent = '';
  const sortedPeriods = Object.keys(periods).sort((a, b) => {
    if (a === PERIODO_COND) return 1;
    if (b === PERIODO_COND) return -1;
    return parseInt(a) - parseInt(b);
  });

  sortedPeriods.forEach(p => {
    const list = periods[p];
    const displayP = p === PERIODO_COND ? T('Escolha Condicionada') : T('{n}º Período', { n: p });
    const count = list.length;
    const isCond = p === PERIODO_COND;
    const safeDisplayP = escapeHTML(displayP);
    const safePeriodoAttr = escapeHTML(String(p));

    const infoBtn = isCond ? `
      <button type="button" class="cond-info-button ml-2 flex-shrink-0" data-pa-action="cond-info" title="${T('Informações')}" aria-label="${T('Informações sobre Escolha Condicionada')}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </button>` : '';

    htmlContent += `
    <details class="group bg-gray-50 dark:bg-[#15171b] rounded-2xl border border-gray-200/60 dark:border-darkBorder/60 overflow-hidden">
      <summary class="flex items-center justify-between p-4 md:p-5 cursor-pointer font-bold text-gray-800 dark:text-gray-100 list-none select-none hover:bg-gray-100 dark:hover:bg-[#1a1c22] transition-colors rounded-t-2xl">
        <div class="flex items-center text-base md:text-lg">
          ${safeDisplayP} ${infoBtn}
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <span class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[0.65rem] md:text-xs font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-lg shadow-sm">
            ${count > 1 ? T('{n} Matérias', { n: count }) : T('{n} Matéria', { n: count })}
          </span>
          <svg class="accordion-chevron w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </summary>
      <div class="p-4 pt-2 space-y-2 accordion-content border-t border-gray-100 dark:border-darkBorder/50">
        ${isCond ? '' : `<div class="flex gap-2 mb-3">
          <button type="button" class="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors" data-pa-action="mark-all" data-periodo="${safePeriodoAttr}">${T('Marcar')}</button>
          <button type="button" class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" data-pa-action="clear-period" data-periodo="${safePeriodoAttr}">${T('Limpar')}</button>
        </div>`}
        ${list.map(createSubjectCardHTML).join('')}
      </div>
    </details>`;
  });

  container.innerHTML = htmlContent;

  // Índice direto código -> checkbox. A seleção automática de co-requisitos usa este
  // mapa. Os eventos de mudança são tratados por delegação (initDelegatedEvents).
  checkboxesPorCodigo.clear();
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    checkboxesPorCodigo.set(cb.value, cb);
  });
}

function getLockedSubjects(codigo) {
  return Array.from(dependentesPorCodigo.get(codigo) || [])
    .map(getDisciplinaByCode)
    .filter(Boolean)
    .sort((a, b) => {
      const pa = parseInt(a.periodo, 10) || 99;
      const pb = parseInt(b.periodo, 10) || 99;
      return pa - pb;
    });
}

function checkReqs(reqsString, concluidas) {
  if (!reqsString) return true;
  const groups = reqsString
    .replace(/;/g, ' E ')
    .split(/\s+OU\s+/i)
    .map(group => group.trim())
    .filter(Boolean);
  if (!groups.length) return true;
  return groups.some(group => {
    const requiredCodes = extractCodes(group);
    if (!requiredCodes.length) return false;
    return requiredCodes.every(code => concluidas instanceof Set ? concluidas.has(code) : concluidas.includes(code));
  });
}

function applySelectedVisualization(concluidas = appState.concludedCodes) {
  const concludedSet = concluidas instanceof Set ? concluidas : new Set(concluidas);
  document.querySelectorAll('.subject-card').forEach(card => {
    const cod = card.dataset.codigo;
    const m = getDisciplinaByCode(cod);
    if (!m) return;
    const status = concludedSet.has(cod) ? 'passed' : (checkReqs(m.pre, concludedSet) ? 'eligible' : 'blocked');
    applyCardStatus(card, status);
    updateSubjectStatusIcon(card, status);
  });
}

// ----------------------------------------------------
// PLANEJAR GRADE LOGIC
// ----------------------------------------------------
function getPlannerAvailableSubjects() {
  const concluidas = appState.concludedCodes;
  return disciplinas.filter(d => !concluidas.has(d.codigo) && checkReqs(d.pre, concluidas));
}

// ---- Filtro da aba "O que puxar?" ----
const PLANNER_FILTER_KEY = 'planejador_planner_filter_v1';
const plannerFilter = { types: { obrig: true, cond: true }, periods: new Set(), group: false };

function loadPlannerFilter() {
  const raw = loadJSON(PLANNER_FILTER_KEY, null);
  if (!raw || typeof raw !== 'object') return;
  const types = raw.types && typeof raw.types === 'object' ? raw.types : {};
  plannerFilter.types.obrig = types.obrig !== false;
  plannerFilter.types.cond = types.cond !== false;
  if (!plannerFilter.types.obrig && !plannerFilter.types.cond) plannerFilter.types.obrig = plannerFilter.types.cond = true;
  plannerFilter.periods = new Set((Array.isArray(raw.periods) ? raw.periods : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 10));
  plannerFilter.group = raw.group === true;
}

function savePlannerFilter() {
  try {
    localStorage.setItem(PLANNER_FILTER_KEY, JSON.stringify({
      types: plannerFilter.types,
      periods: Array.from(plannerFilter.periods).sort((a, b) => a - b),
      group: plannerFilter.group
    }));
  } catch (_) {}
}

function plannerFilterIsActive() {
  return !plannerFilter.types.obrig || !plannerFilter.types.cond || plannerFilter.periods.size > 0;
}

function plannerFilterCount() {
  return (plannerFilter.types.obrig && plannerFilter.types.cond ? 0 : 1) + (plannerFilter.periods.size > 0 ? 1 : 0);
}

function passesPlannerFilter(mat) {
  if (periodIsCond(mat.periodo)) return plannerFilter.types.cond;
  if (!plannerFilter.types.obrig) return false;
  return plannerFilter.periods.size === 0 || plannerFilter.periods.has(parseInt(mat.periodo, 10));
}

function getNextPlanningPeriod() {
  const mandatoryPeriods = [...new Set(
    disciplinas
      .filter(d => !periodIsCond(d.periodo))
      .map(d => parseInt(d.periodo, 10))
      .filter(Number.isFinite)
  )].sort((a, b) => a - b);

  for (const periodo of mandatoryPeriods) {
    const materiasDoPeriodo = disciplinas.filter(d => !periodIsCond(d.periodo) && Number(d.periodo) === periodo);
    if (materiasDoPeriodo.some(d => !appState.concludedCodes.has(d.codigo))) return periodo;
  }

  return mandatoryPeriods.length ? mandatoryPeriods[mandatoryPeriods.length - 1] : 1;
}

function updatePlannerSummary(availableSubjects = null) {
  const disponiveis = availableSubjects || getPlannerAvailableSubjects();
  const availableCodes = new Set(disponiveis.map(d => d.codigo));
  const selected = disponiveis.filter(d => appState.plannerCheckedCodes.has(d.codigo));
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));
  const selectedObrig = selected.filter(d => !periodIsCond(d.periodo));
  const selectedCond = selected.filter(d => periodIsCond(d.periodo));

  const selectedCredits = selected.reduce((sum, d) => sum + creditsOf(d), 0);
  const selectedHours = selected.reduce((sum, d) => sum + hoursOf(d), 0);
  const nextPeriod = getNextPlanningPeriod();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText('planner-period-label', T('Próximo período'));
  setText('planner-period-number', `${nextPeriod}º`);
  setText('planner-selected-credits', selectedCredits);
  setText('planner-selected-hours', selectedHours);
  setText('planner-obrig-selected', selectedObrig.length);
  setText('planner-obrig-available', Math.max(0, obrig.length - selectedObrig.length));
  setText('planner-cond-selected', selectedCond.length);
  setText('planner-cond-available', Math.max(0, cond.length - selectedCond.length));

  const warnings = [];
  if (selectedCredits > SIGA_MAX_CRED) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-danger">${T('<strong>Limite do SIGA:</strong> você selecionou {n} créditos. O SIGA não permite puxar mais de {max} créditos. Retire alguma disciplina.', { n: selectedCredits, max: SIGA_MAX_CRED })}</div>`);
  } else if (selectedCredits < SIGA_MIN_CRED) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-attention">${T('<strong>Carga mínima:</strong> você selecionou {n} créditos. O SIGA não permite puxar menos de {min} créditos. Marque mais alguma disciplina.', { n: selectedCredits, min: SIGA_MIN_CRED })}</div>`);
  }

  const warningEl = document.getElementById('planner-limit-warnings');
  if (warningEl) warningEl.innerHTML = warnings.join('');

  // Remove da seleção persistida qualquer código que deixou de estar disponível.
  // Isso evita que uma seleção antiga apareça novamente sem estar visível na aba.
  let changed = false;
  appState.plannerCheckedCodes.forEach(code => {
    if (!availableCodes.has(code)) {
      appState.plannerCheckedCodes.delete(code);
      changed = true;
    }
  });
  if (changed) persistPlannerCheckedState();
}

function plannerGroupedCardsHTML(list) {
  let html = '';
  let current = null;
  list.forEach(m => {
    const per = parseInt(m.periodo, 10);
    if (per !== current) {
      current = per;
      html += `<div class="planner-period-head" role="heading" aria-level="4">${escapeHTML(T('{n}º Período', { n: per }))}</div>`;
    }
    html += createPlannerCard(m);
  });
  return html;
}

function updatePlannerFilterUI(disponiveis, visiveis) {
  const btn = document.getElementById('planner-filter-btn');
  const badge = document.getElementById('planner-filter-badge');
  const note = document.getElementById('planner-filter-note');
  const active = plannerFilterIsActive();
  const n = plannerFilterCount();
  if (btn) btn.classList.toggle('is-active', active);
  if (badge) { badge.textContent = String(n); badge.hidden = !active; }

  const obrigGroup = document.getElementById('planner-obrig-container')?.closest('details');
  const condGroup = document.getElementById('planner-cond-container')?.closest('details');
  if (obrigGroup) obrigGroup.hidden = !plannerFilter.types.obrig;
  if (condGroup) condGroup.hidden = !plannerFilter.types.cond;
  // Só um grupo à mostra: já abre, sem exigir um toque a mais.
  if (plannerFilter.types.obrig !== plannerFilter.types.cond) {
    (plannerFilter.types.obrig ? obrigGroup : condGroup)?.setAttribute('open', '');
  }

  if (!note) return;
  if (!active) { note.hidden = true; note.textContent = ''; return; }
  const parts = [];
  if (!plannerFilter.types.cond) parts.push(T('só obrigatórias'));
  else if (!plannerFilter.types.obrig) parts.push(T('só escolha condicionada'));
  if (plannerFilter.periods.size && plannerFilter.types.obrig) {
    parts.push(T('períodos: {lista}', { lista: Array.from(plannerFilter.periods).sort((a, b) => a - b).map(p => `${p}º`).join(', ') }));
  }
  const hidden = disponiveis.length - visiveis.length;
  const hiddenSelected = disponiveis.filter(d => !passesPlannerFilter(d) && appState.plannerCheckedCodes.has(d.codigo)).length;
  let text = T('Filtro ativo ({detalhes}) • {n} fora da lista', { detalhes: parts.join('; '), n: hidden });
  if (hiddenSelected) text += ' • ' + (hiddenSelected === 1 ? T('1 selecionada fora do filtro continua contando nos créditos') : T('{n} selecionadas fora do filtro continuam contando nos créditos', { n: hiddenSelected }));
  note.textContent = text;
  note.hidden = false;
}

function renderPlanner() {
  const containerObrig = document.getElementById('planner-obrig-container');
  const containerCond = document.getElementById('planner-cond-container');
  if (!containerObrig || !containerCond) return;
  ensurePlannerTools();

  const disponiveis = getPlannerAvailableSubjects();
  const visiveis = disponiveis.filter(passesPlannerFilter);
  const obrig = visiveis.filter(d => !periodIsCond(d.periodo)).sort((a, b) => parseInt(a.periodo, 10) - parseInt(b.periodo, 10));
  const cond = visiveis.filter(d => periodIsCond(d.periodo));
  const filtered = plannerFilterIsActive();

  if (obrig.length > 0) {
    containerObrig.innerHTML = plannerFilter.group ? plannerGroupedCardsHTML(obrig) : obrig.map(m => createPlannerCard(m)).join('');
  } else if (filtered && disponiveis.some(d => !periodIsCond(d.periodo))) {
    containerObrig.innerHTML = emptyStateHTML(T('Nenhuma obrigatória com esse filtro.'), T('Ajuste os períodos no ícone de filtro para ver mais.'), 'planner');
  } else {
    containerObrig.innerHTML = emptyStateHTML(T('Nenhuma obrigatória disponível para puxar.'), T('Quando você concluir os pré-requisitos de uma matéria, ela aparecerá aqui.'), 'planner');
  }

  if (cond.length > 0) {
    containerCond.innerHTML = cond.map(m => createPlannerCard(m)).join('');
  } else {
    containerCond.innerHTML = emptyStateHTML(T('Nenhuma condicionada disponível para puxar.'), T('As condicionadas aparecem aqui assim que seus pré-requisitos forem cumpridos.'), 'planner');
  }

  restorePlannerCheckedState();
  updatePlannerSummary(disponiveis);
  updatePlannerFilterUI(disponiveis, visiveis);
}

function emptyStateHTML(title, description, icon = 'search') {
  const icons = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
    planner: '<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 9h8M8 13h5"></path>'
  };
  const iconPath = icons[icon] || icons.search;
  return `<div class="flex flex-col items-center justify-center text-center py-5 px-4 text-gray-500 dark:text-gray-400">
    <span class="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 text-gray-400 dark:text-gray-500">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
    </span>
    <p class="text-sm font-bold text-gray-600 dark:text-gray-300">${escapeHTML(title)}</p>
    <p class="text-xs mt-1 max-w-sm">${escapeHTML(description)}</p>
  </div>`;
}

function createPlannerCard(mat) {
  const safeCode = escapeHTML(mat.codigo);
  const safeName = escapeHTML(formatName(mat));
  const coreqBtn = mat.co
    ? `<button type="button" class="planner-coreq-button" data-pa-action="coreq-info" data-codigo="${safeCode}" title="${T('Ver co-requisito')}" aria-label="${T('Ver co-requisito de {name}', { name: safeName })}">C</button>`
    : '';

  return `
  <div class="planner-card block p-3 rounded-xl relative mb-2 select-none bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder transition-all duration-200"
         data-codigo="${safeCode}">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML('eligible')}
          <span class="planner-subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
          <button type="button"
                  data-pa-action="copy-code" data-codigo="${safeCode}"
                  title="${T('Copiar código')}"
                  aria-label="${T('Copiar código {code}', { code: safeCode })}"
                  class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 0-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          ${infoButtonHTML('planner-details', safeCode, safeName)}
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="subject-code text-[0.75rem] font-semibold">${safeCode}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(creditsOf(mat))} ${T('Créd.')}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(hoursOf(mat))}h</span>
          ${unlockChipHTML(mat.codigo)}
        </div>
      </div>
      <div class="flex items-center">
        <input type="checkbox" value="${safeCode}" ${appState.plannerCheckedCodes.has(mat.codigo) ? 'checked' : ''} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="${T('Selecionar {name} para o planejamento', { name: safeName })}">
      </div>
    </div>
  </div>`;
}

function togglePlannerCard(checkbox) {
  const card = checkbox.closest('.planner-card');
  if (!card) return;
  if (checkbox.checked) appState.plannerCheckedCodes.add(checkbox.value);
  else appState.plannerCheckedCodes.delete(checkbox.value);

  card.classList.toggle('line-through', checkbox.checked);
  card.classList.toggle('opacity-50', checkbox.checked);
  persistPlannerCheckedState();
  updatePlannerSummary();
  if (checkbox.checked) suggestPlannerCoreqs(checkbox.value);
}

function setPlannerChecked(codigo, checked) {
  const cb = document.querySelector(`.planner-card[data-codigo="${CSS.escape(codigo)}"] input[type="checkbox"]`);
  if (!cb || cb.checked === checked) return;
  cb.checked = checked;
  togglePlannerCard(cb);
}

// Ao escolher uma matéria com co-requisito, lembra que as duas precisam ser cursadas juntas.
function suggestPlannerCoreqs(codigo) {
  const mat = getDisciplinaByCode(codigo);
  if (!mat) return;
  const pendentes = getCoreqRelatedCodes(codigo)
    .filter(c => !appState.concludedCodes.has(c) && !appState.plannerCheckedCodes.has(c));
  if (!pendentes.length) return;

  const disponiveis = new Set(getPlannerAvailableSubjects().map(d => d.codigo));
  const podem = pendentes.filter(c => disponiveis.has(c));
  const faltam = pendentes.filter(c => !disponiveis.has(c));
  const nomes = codes => codes
    .map(getDisciplinaByCode).filter(Boolean)
    .map(m => `<span class="toast-coreq-name">${escapeHTML(formatName(m))}</span>`).join(', ');
  const origem = `<span class="toast-coreq-name">${escapeHTML(formatName(mat))}</span>`;

  if (podem.length) {
    const nota = faltam.length ? ' ' + T('Também falta {nomes}, que ainda não está disponível.', { nomes: nomes(faltam) }) : '';
    showToast({
      mode: 'coreq',
      duration: 7000,
      html: T('{origem} tem {nomes} como co-requisito: devem ser cursadas juntas.', { origem, nomes: nomes(podem) }) + nota,
      action: { label: T('Marcar também'), onClick: () => podem.forEach(c => setPlannerChecked(c, true)) }
    });
  } else {
    showToast({
      mode: 'coreq',
      duration: 7000,
      html: T('{origem} deve ser cursada junto com {nomes}, que ainda não está disponível (confira os pré-requisitos).', { origem, nomes: nomes(faltam) })
    });
  }
}

function clearPlannerSelection() {
  const checked = document.querySelectorAll('#modal-planner .planner-card input[type="checkbox"]:checked');
  if (!appState.plannerCheckedCodes.size && !checked.length) return;
  // Desmarca pelo mesmo caminho do clique manual (evento "change"), para que todos os
  // indicadores do painel (inclusive os calculados no index.html) sejam atualizados.
  checked.forEach(cb => {
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  appState.plannerCheckedCodes.clear();
  persistPlannerCheckedState();
  updatePlannerSummary();
}

// Copia os códigos das disciplinas selecionadas, prontos para colar no SIGA.
function copyPlannerSelectedCodes(event) {
  const codes = getPlannerAvailableSubjects()
    .filter(d => appState.plannerCheckedCodes.has(d.codigo))
    .map(d => d.codigo);
  if (!codes.length) {
    showToast({ text: T('Selecione ao menos uma disciplina para copiar os códigos.') });
    return;
  }
  copyTextToClipboard(codes.join(', '), codes.length === 1 ? T('Código') : T('Códigos'), event, codes.length > 1);
}

// Os botões abaixo são criados por aqui porque o resumo do planner vem do index.html.
function ensurePlannerTools() {
  if (document.getElementById('planner-tools-row')) return;
  const warnings = document.getElementById('planner-limit-warnings');
  if (!warnings || !warnings.parentElement) return;
  const row = document.createElement('div');
  row.id = 'planner-tools-row';
  row.className = 'pa-tools-row';
  row.innerHTML = `
    <button type="button" class="pa-btn pa-btn-primary" data-pa-action="copy-planner-codes">${T('Copiar códigos')}</button>
    <button type="button" class="pa-btn" data-pa-action="clear-planner-selection">${T('Limpar seleção')}</button>`;
  warnings.parentElement.insertBefore(row, warnings);
}

function persistPlannerCheckedState() {
  saveJSON(STORAGE_KEYS.plannerChecked, Array.from(appState.plannerCheckedCodes));
}

function restorePlannerCheckedState() {
  document.querySelectorAll('.planner-card input[type="checkbox"]').forEach(cb => {
    cb.checked = appState.plannerCheckedCodes.has(cb.value);
    const card = cb.closest('.planner-card');
    if (!card) return;
    card.classList.toggle('line-through', cb.checked);
    card.classList.toggle('opacity-50', cb.checked);
  });
}

let timerPlannerLongPress = null;
let plannerLongPressPointer = null;
let plannerLongPressStartX = 0;
let plannerLongPressStartY = 0;

// Matérias que têm esta como PRÉ-requisito (as que ela "tranca").
function getPrereqLockedSubjects(codigo) {
  return getLockedSubjects(codigo).filter(t => (preRequisitosPorCodigo.get(t.codigo) || []).includes(codigo));
}

// Matérias ligadas a esta por co-requisito (nos dois sentidos).
function getCoreqRelatedSubjects(codigo) {
  const set = new Set(corequisitosPorCodigo.get(codigo) || []);
  disciplinas.forEach(d => { if ((corequisitosPorCodigo.get(d.codigo) || []).includes(codigo)) set.add(d.codigo); });
  return Array.from(set).map(getDisciplinaByCode).filter(Boolean);
}

const PINFO_COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

function pinfoRowHTML(t) {
  const code = escapeHTML(t.codigo);
  return `<li class="pinfo-row">
    <div class="pinfo-row-main">
      <span class="pinfo-row-name">${escapeHTML(formatName(t))}</span>
      <span class="pinfo-row-code"><span class="subject-code">${code}</span><button type="button" class="pinfo-copy" data-pa-action="copy-code" data-codigo="${code}" title="${T('Copiar código')}" aria-label="${T('Copiar código {code}', { code: t.codigo })}">${PINFO_COPY_ICON}</button></span>
    </div>
    <span class="pinfo-row-period">${escapeHTML(displayPeriod(t))}</span>
  </li>`;
}

function renderPlannerFilterSheet() {
  const disponiveis = getPlannerAvailableSubjects();
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));
  const sheet = document.getElementById('modal-planner-filter');
  if (!sheet) return;

  const onlyOne = plannerFilter.types.obrig !== plannerFilter.types.cond;
  sheet.querySelectorAll('[data-pfilter-type]').forEach(btn => {
    const key = btn.dataset.pfilterType;
    const on = plannerFilter.types[key];
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-disabled', onlyOne && on ? 'true' : 'false');
  });
  const setCount = (key, n) => { const el = sheet.querySelector(`[data-pfilter-count="${key}"]`); if (el) el.textContent = String(n); };
  setCount('obrig', obrig.length);
  setCount('cond', cond.length);

  const counts = new Map();
  obrig.forEach(d => { const p = parseInt(d.periodo, 10); counts.set(p, (counts.get(p) || 0) + 1); });
  plannerFilter.periods.forEach(p => { if (!counts.has(p)) counts.set(p, 0); });
  const box = document.getElementById('pfilter-periods');
  if (box) {
    const periods = Array.from(counts.keys()).sort((a, b) => a - b);
    box.innerHTML = periods.length
      ? periods.map(p => {
        const on = plannerFilter.periods.has(p);
        return `<button type="button" class="pfilter-chip pfilter-period${on ? ' is-on' : ''}" data-pfilter-period="${p}" aria-pressed="${on}" aria-label="${escapeHTML(T('{n}º Período', { n: p }))}">${p}º<span class="pfilter-count">${counts.get(p)}</span></button>`;
      }).join('')
      : `<span class="pfilter-hint">${escapeHTML(T('Nenhuma obrigatória disponível agora.'))}</span>`;
  }
  const periodsSection = document.getElementById('pfilter-periods-section');
  if (periodsSection) periodsSection.classList.toggle('is-muted', !plannerFilter.types.obrig);

  const sw = document.getElementById('pfilter-group');
  if (sw) { sw.setAttribute('aria-checked', plannerFilter.group ? 'true' : 'false'); sw.classList.toggle('is-on', plannerFilter.group); }

  const visiveis = disponiveis.filter(passesPlannerFilter).length;
  const sub = document.getElementById('pfilter-sub');
  if (sub) sub.textContent = visiveis === 1 ? T('1 disciplina na lista') : T('{n} disciplinas na lista', { n: visiveis });
  const clearBtn = document.getElementById('pfilter-clear');
  if (clearBtn) clearBtn.disabled = !plannerFilterIsActive() && !plannerFilter.group;
}

function openPlannerFilter() {
  renderPlannerFilterSheet();
  openModal('modal-planner-filter');
}

function applyPlannerFilterChange() {
  savePlannerFilter();
  renderPlanner();
  renderPlannerFilterSheet();
  const input = document.getElementById('planner-search-input');
  if (input && input.value) input.dispatchEvent(new Event('input', { bubbles: true }));
}

function initPlannerFilter() {
  loadPlannerFilter();
  // O cartão interno tem onclick="event.stopPropagation()"; por isso o ouvinte fica nele, não no fundo.
  const sheet = document.querySelector('#modal-planner-filter .pfilter-card');
  if (!sheet) return;
  sheet.addEventListener('click', event => {
    const typeBtn = event.target.closest('[data-pfilter-type]');
    if (typeBtn) {
      const key = typeBtn.dataset.pfilterType;
      const other = key === 'obrig' ? 'cond' : 'obrig';
      if (plannerFilter.types[key] && !plannerFilter.types[other]) return; // sempre fica ao menos um tipo
      plannerFilter.types[key] = !plannerFilter.types[key];
      applyPlannerFilterChange();
      return;
    }
    const periodBtn = event.target.closest('[data-pfilter-period]');
    if (periodBtn) {
      const p = Number(periodBtn.dataset.pfilterPeriod);
      if (plannerFilter.periods.has(p)) plannerFilter.periods.delete(p); else plannerFilter.periods.add(p);
      applyPlannerFilterChange();
      return;
    }
    if (event.target.closest('#pfilter-group')) {
      plannerFilter.group = !plannerFilter.group;
      applyPlannerFilterChange();
      return;
    }
    if (event.target.closest('#pfilter-clear')) {
      plannerFilter.types.obrig = plannerFilter.types.cond = true;
      plannerFilter.periods.clear();
      plannerFilter.group = false;
      applyPlannerFilterChange();
    }
  });
}

function openPlannerDetails(cod) {
  const m = getDisciplinaByCode(cod);
  if (!m) return;
  const locked = getPrereqLockedSubjects(cod);
  const related = getCoreqRelatedSubjects(cod);
  const titleEl = document.getElementById('planner-det-title');
  const subEl = document.getElementById('planner-det-sub');
  const listEl = document.getElementById('planner-det-list');
  const iconEl = document.getElementById('planner-det-icon');
  if (!titleEl || !listEl) return;
  titleEl.textContent = formatName(m);
  const lockedText = locked.length === 0 ? T('Não tranca nenhuma matéria')
    : locked.length === 1 ? T('Tranca 1 matéria por pré-requisito')
    : T('Tranca {n} matérias por pré-requisito', { n: locked.length });
  const coreqText = related.length === 0 ? T('Sem relação de correquisito')
    : related.length === 1 ? T('1 relação de correquisito')
    : T('{n} relações de correquisito', { n: related.length });
  if (subEl) subEl.textContent = `${lockedText} • ${coreqText}`;
  if (iconEl) iconEl.dataset.state = locked.length ? 'locked' : 'free';
  const section = (title, items) => items.length
    ? `<section class="pinfo-section"><h4 class="pinfo-section-title">${title}</h4><ul class="pinfo-list">${items.map(pinfoRowHTML).join('')}</ul></section>` : '';
  listEl.innerHTML = section(T('Tranca por pré-requisito'), locked) + section(T('Relação de correquisito'), related);
  openModal('modal-planner-details');
}

function startPlannerLongPress(cod, event) {
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelPlannerLongPress();
  plannerLongPressPointer = event?.pointerId ?? null;
  plannerLongPressStartX = event?.clientX ?? 0;
  plannerLongPressStartY = event?.clientY ?? 0;

  timerPlannerLongPress = setTimeout(() => {
    timerPlannerLongPress = null;
    openPlannerDetails(cod);
  }, 600);
}

function handlePlannerLongPressMove(event) {
  if (timerPlannerLongPress === null) return;
  if (plannerLongPressPointer !== null && event.pointerId !== plannerLongPressPointer) return;
  const dx = Math.abs((event.clientX ?? 0) - plannerLongPressStartX);
  const dy = Math.abs((event.clientY ?? 0) - plannerLongPressStartY);
  if (dx > 10 || dy > 10) cancelPlannerLongPress();
}

function cancelPlannerLongPress() {
  clearTimeout(timerPlannerLongPress);
  timerPlannerLongPress = null;
  plannerLongPressPointer = null;
}


// ----------------------------------------------------
// CONTATOS SEARCH LOGIC
// ----------------------------------------------------
function renderContatos() {
  if (typeof contatosImportantes === 'undefined') return;
  renderContatosFiltered(contatosImportantes);
}

function renderContatosFiltered(dataToRender) {
  const container = document.getElementById('contatos-content');
  if (!container || typeof contatosImportantes === 'undefined') return;

  if (Array.isArray(dataToRender) && dataToRender.length === 0) {
      container.innerHTML = emptyStateHTML(T('Nenhum professor encontrado.'), T('Tente outro nome ou parte do e-mail.'), 'search');
      return;
  }

  // Identifica se os dados passados já estão no formato original agrupado ou se é uma lista linear de professores do filtro
  let htmlResult = '';
  if (dataToRender[0] && dataToRender[0].professores) {
      // Formato original (agrupado)
      htmlResult = dataToRender.map(grupo => buildContatoCard(grupo.nome, grupo.chefe, grupo.local, grupo.professores)).join('');
  } else {
      // Formato de lista filtrada
      const grouped = {};
      dataToRender.forEach(p => {
          if(!grouped[p.grupo]) grouped[p.grupo] = [];
          grouped[p.grupo].push(p);
      });
      htmlResult = Object.keys(grouped).map(grupoNome => buildContatoCard(grupoNome, '', '', grouped[grupoNome])).join('');
  }

  container.innerHTML = htmlResult;
}

// Rótulos fixos dos contatos (Chefe:, LOCAL:, Bloco, Sala, andar) seguem o idioma; nomes e e-mails não.
function localizeContactLine(text) {
  return String(text || '')
    .replace(/^Chefe:/, T('Chefe:')).replace(/^LOCAL:/, T('LOCAL:'))
    .replace(/\bBloco\b/g, T('Bloco')).replace(/\bSala\b/g, T('Sala')).replace(/\bandar\b/g, T('andar'));
}

function buildContatoCard(nomeGrupo, chefe, local, professores) {
  const safeGrupo = escapeHTML(nomeGrupo);
  const safeChefe = escapeHTML(localizeContactLine(chefe));
  const safeLocal = escapeHTML(localizeContactLine(local));
  return `
    <div class="bg-gray-50 dark:bg-[#15171b] p-4 rounded-xl border border-gray-100 dark:border-darkBorder">
      <h4 class="font-bold text-lg text-yellowTheme-600 dark:text-yellowTheme-400 ${chefe ? 'mb-1' : 'mb-2'}">${safeGrupo}</h4>
      ${chefe ? `<p class="text-sm font-semibold ${local ? 'mb-1' : 'mb-3'}">${safeChefe}</p>` : ''}
      ${local ? `<p class="text-xs text-gray-500 mb-3">${safeLocal}</p>` : ''}
      <ul class="text-xs space-y-2 text-left flex-wrap">
        ${professores.map(p => {
          const name = escapeHTML(p.nome);
          const email = escapeHTML(p.email);
          const mailto = escapeHTML(`mailto:${String(p.email || '').trim()}`);
          const extras = Array.isArray(p.extras) && p.extras.length ? ` | ${p.extras.map(escapeHTML).join(' | ')}` : '';
          const cargo = p.cargo ? ` ${escapeHTML(p.cargo)}` : '';
          return `<li><b>${name}</b> - <a href="${mailto}" class="text-blue-500 hover:underline">${email}</a>${extras}${cargo}</li>`;
        }).join('')}
      </ul>
    </div>
  `;
}

function initContatosSearch() {
  if (typeof contatosImportantes === 'undefined') return;

  const input = document.getElementById('contatos-search-input');
  const suggestions = document.getElementById('contatos-search-suggestions');
  if(!input || !suggestions) return;

  const runSearch = debounce(() => {
    const val = normalizeKeepSpaces(input.value);
    if(!val) {
      suggestions.classList.add('hidden');
      renderContatos();
      return;
    }

    const allProfs = [];
    contatosImportantes.forEach(g => g.professores.forEach(p => allProfs.push({ ...p, grupo: g.nome })));

    const matched = allProfs
      .map(p => ({ p, score: Math.max(scoreSearchText(val, p.nome), scoreSearchText(val, p.email)) }))
      .filter(item => item.score >= (val.length <= 2 ? 430 : 300))
      .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
      .map(item => item.p);

    if (matched.length > 0) {
      suggestions.innerHTML = matched.slice(0, 5).map(p => `
        <button type="button" data-contato-nome="${escapeHTML(p.nome)}" class="w-full text-left p-3 border-b border-gray-100 dark:border-darkBorder cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1c22]">
          <p class="font-bold text-sm text-gray-800 dark:text-gray-100">${escapeHTML(p.nome)}</p>
          <p class="text-[0.65rem] text-gray-500">${escapeHTML(p.email)}</p>
        </button>
      `).join('');
      suggestions.classList.remove('hidden');
    } else {
      suggestions.innerHTML = emptyStateHTML(T('Nenhum professor encontrado.'), T('Tente outro nome ou parte do e-mail.'), 'search');
      suggestions.classList.remove('hidden');
    }

    renderContatosFiltered(matched);
  }, 250);

  input.addEventListener('input', runSearch);
  suggestions.addEventListener('click', e => {
    const button = e.target.closest('[data-contato-nome]');
    if (!button) return;
    selectContatoSearch(button.dataset.contatoNome);
  });

  document.addEventListener('click', (e) => {
    if(!input.contains(e.target) && !suggestions.contains(e.target)) suggestions.classList.add('hidden');
  });
}

function selectContatoSearch(nome) {
  const input = document.getElementById('contatos-search-input');
  if(input) input.value = nome;
  document.getElementById('contatos-search-suggestions').classList.add('hidden');
  
  let allProfs = [];
  contatosImportantes.forEach(g => g.professores.forEach(p => allProfs.push({ ...p, grupo: g.nome })));
  const matched = allProfs.filter(p => p.nome === nome);
  renderContatosFiltered(matched);
}


// ----------------------------------------------------
// MAIN SEARCH LOGIC — BUSCA INTELIGENTE 2.0
// ----------------------------------------------------
function debounce(fn, wait = 250) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function buildSearchIndex(mat) {
  if (!mat) return '';
  if (buscaIndexPorCodigo.has(mat.codigo)) return buscaIndexPorCodigo.get(mat.codigo);
  const value = normalizeKeepSpaces([
    formatName(mat),
    mat.codigo,
    displayPeriod(mat),
    `${mat.periodo} periodo`
  ].join(' '));
  buscaIndexPorCodigo.set(mat.codigo, value);
  return value;
}

// Troca apelidos ("qf", "cif", "orgexp"...) pelo texto completo, palavra por palavra.
// Antes o apelido era procurado como pedaço de texto, o que podia corromper termos
// como "bqm101" ou "experimental".
function expandSearchAliases(rawText) {
  const norm = normalizeKeepSpaces(rawText);
  if (!norm || typeof aliasesPesquisaDisciplinas !== 'object' || !aliasesPesquisaDisciplinas) return norm;

  const aliasMap = new Map();
  Object.entries(aliasesPesquisaDisciplinas).forEach(([alias, target]) => {
    const key = normalizeStr(alias);
    if (key) aliasMap.set(key, normalizeKeepSpaces(target));
  });

  const whole = aliasMap.get(norm.replace(/ /g, ''));
  if (whole) return whole;
  return norm.split(' ').map(token => aliasMap.get(token) || token).join(' ');
}

function levenshteinDistance(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

function subsequenceScore(query, target) {
  if (!query || !target) return 0;
  let qi = 0;
  for (const ch of target) {
    if (ch === query[qi]) qi++;
    if (qi === query.length) break;
  }
  return qi / query.length;
}

function scoreSearchText(query, candidate) {
  const q = normalizeKeepSpaces(query);
  const t = normalizeKeepSpaces(candidate);
  if (!q || !t) return 0;

  if (t === q) return 1200;
  if (t.startsWith(q)) return 1080 - Math.min(140, t.length - q.length);
  if (t.includes(q)) return 940 - Math.min(140, t.indexOf(q) * 4);

  const compact = q.replace(/ /g, '');
  const compactTarget = t.replace(/ /g, '');
  // Consulta digitada sem espaços ("quimicaorganica") ainda encontra o texto.
  if (compact.length >= 3 && compactTarget.includes(compact)) {
    return 900 - Math.min(140, compactTarget.indexOf(compact) * 4);
  }

  // Compara também cada palavra. Isso melhora abreviações e pequenos erros
  // (“fisiolgia”, “farmaceutca”) sem deixar a busca permissiva demais.
  const qWords = q.split(' ').filter(Boolean);
  const tWords = t.split(' ').filter(Boolean);
  let wordBest = 0;
  let unmatched = 0;
  for (const qw of qWords) {
    let best = 0;
    for (const tw of tWords) {
      if (tw === qw) { best = 1; break; }
      if (tw.startsWith(qw) && qw.length >= 2) {
        best = Math.max(best, 0.92 - Math.min(.15, (tw.length - qw.length) * .02));
        continue;
      }
      const maxLen = Math.max(qw.length, tw.length);
      if (maxLen < 3) continue;
      const dist = levenshteinDistance(qw, tw);
      const similarity = 1 - (dist / maxLen);
      const allowed = qw.length <= 4 ? 0.74 : qw.length <= 7 ? 0.70 : 0.67;
      if (similarity >= allowed) best = Math.max(best, similarity);
    }
    if (best === 0) unmatched++;
    wordBest += best;
  }
  let wordScore = qWords.length ? (wordBest / qWords.length) * 880 : 0;
  // Em consultas com várias palavras, uma palavra sem correspondência derruba a nota:
  // "quimica 2" não deve trazer qualquer matéria só porque ela é do 2º período.
  if (unmatched > 0 && qWords.length > 1) wordScore *= 0.45;

  // Só conta quando todas as letras aparecem na ordem (ex.: "qfm"); pontuação parcial
  // deixava passar quase qualquer disciplina.
  const compactSubseq = compact.length >= 3 && subsequenceScore(compact, compactTarget) === 1 ? 1 : 0;

  // Abreviações naturais: “qf” → Química Farmacêutica, “bm” → Bases Morfológicas...
  const acronym = buildAcronym(candidate);
  const acronymScore = acronym === compact ? 900 : acronym.startsWith(compact) && compact.length >= 2 ? 760 : 0;

  return Math.max(wordScore, compactSubseq * 480, acronymScore);
}

// Expressões compartilhadas entre a leitura da busca e a remoção dos chips de filtro.
const CREDITS_QUERY_RE = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*cr(?:[eé]d(?:ito|it)?s?)?(?=\s|$|[,;|.])/i;
const HOURS_QUERY_RE = /(?:^|\s)(\d+)\s*h(?:oras?|ours?)?(?=\s|$|[,;|.])/i;
// Ordem importa: as formas negativas precisam vir antes das positivas.
const STATUS_TEXT_SOURCE = 'n[aã]o\\s*pux[aá]veis?|n[aã]o\\s*dispon[ií]veis?|indispon[ií]veis?|unavailable|not\\s*available|no\\s*disponibles?|bloqueadas?|trancadas?|locked|blocked|j[aá]\\s*cursadas?|conclu[ií]das?|cursadas?|completed?|completadas?|finished|pux[aá]veis?|dispon[ií]veis?|disponibles?|available|livres?';

function parseSearchIntent(rawQuery) {
  const raw = String(rawQuery || '').trim().normalize('NFC');
  let text = raw;
  const normalized = normalizeStr(raw);
  const filters = {
    periodo: null,
    creditos: null,
    horas: null,
    status: null,
    condicionada: false,
    semPre: false
  };

  // Período: "4 período", "4º período", "periodo 4" e formas sem espaço.
  let match = normalized.match(/(?:^|[^0-9])(\d{1,2})(?:o|º|°)?periodo/);
  if (!match) match = normalized.match(/periodo(?:o|º|°)?(\d{1,2})/);
  const termMatch = !match ? (normalized.match(/(?:^|[^0-9])(\d{1,2})(?:st|nd|rd|th)?term/) || normalized.match(/term(\d{1,2})/)) : null;
  if (termMatch) {
    filters.periodo = Number(termMatch[1]);
    text = text.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*term\b/i, ' ').replace(/\bterm\s*\d{1,2}\b/i, ' ');
  }
  if (match && !termMatch) {
    filters.periodo = Number(match[1]);
    text = text.replace(new RegExp(`\\b${match[1]}(?:\\s*(?:º|°|o))?\\s*per[ií]odo\\b`, 'i'), ' ');
    text = text.replace(new RegExp(`per[ií]odo\\s*${match[1]}\\b`, 'i'), ' ');
  } else if (!termMatch && filters.creditos === null && filters.horas === null) {
    // Um número isolado pode significar o período. Quando há texto junto,
    // preservamos o número para permitir buscas como “bio 2” ou “química 2”.
    const onlyNumber = normalized.match(/^(\d{1,2})$/);
    if (onlyNumber && Number(onlyNumber[1]) >= 1 && Number(onlyNumber[1]) <= 10) {
      filters.periodo = Number(onlyNumber[1]);
      text = '';
    }
  }

  // Créditos: "2cr", "2 cred", "2 créd.", "2 créditos". Lê o texto original (com espaços)
  // para não confundir "2 cr" com letras coladas de outra palavra.
  match = raw.match(CREDITS_QUERY_RE);
  if (match) {
    filters.creditos = Number(match[1].replace(',', '.'));
    text = text.replace(match[0], ' ');
  }

  // Carga horária: "30h", "30 horas". Exige fim de palavra: "2 hematologia" não vira 2 horas.
  match = raw.match(HOURS_QUERY_RE);
  if (match) {
    filters.horas = Number(match[1]);
    text = text.replace(match[0], ' ');
  }

  // Os termos NEGATIVOS vêm primeiro: "naopuxaveis" contém "puxaveis" e "indisponiveis"
  // contém "disponiveis"; testados depois, eles seriam lidos como o contrário.
  const statusTerms = [
    { re: /(?:naopuxaveis?|naodisponiveis?|indisponiveis?|unavailable|notavailable|nodisponibles?|bloqueadas?|trancadas?|locked|blocked)/, value: 'bloqueada' },
    { re: /(?:jacursadas?|concluidas?|cursadas?|completed?|completadas?|finished)/, value: 'cursada' },
    { re: /(?:puxaveis?|disponiveis?|disponibles?|available|livres?)/, value: 'disponivel' }
  ];
  for (const term of statusTerms) {
    if (term.re.test(normalized)) {
      filters.status = term.value;
      text = text.replace(new RegExp(STATUS_TEXT_SOURCE, 'ig'), ' ');
      break;
    }
  }

  if (/(?:sem\s*pre|sem\s*pr[eé]-?requisito|sempr[eé]requisito|sin\s*prerrequisitos?|no\s*prerequisites?)/i.test(raw)) {
    filters.semPre = true;
    text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)|sin\s*prerrequisitos?|no\s*prerequisites?/i, ' ');
  }

  if (/(?:escolha\s*condicionada|condicionadas?)/i.test(raw)) {
    filters.condicionada = true;
    text = text.replace(/escolha\s*condicionada|condicionadas?/gi, ' ');
  }

  // Limpa pontuação usada só como separador, preservando o texto real.
  text = text.replace(/[|,;]+/g, ' ').trim();

  return {
    raw,
    text,
    normalizedText: expandSearchAliases(text),
    filters
  };
}

function isDisciplineAvailable(mat, concluidas) {
  return checkReqs(mat.pre, concluidas);
}

function rankDisciplineSearch(query) {
  if (!query || typeof disciplinas === 'undefined') return [];

  const intent = parseSearchIntent(query);
  const q = intent.normalizedText;
  const concluidas = appState.concludedCodes;

  return disciplinas
    .map(mat => {
      const periodNumber = parseInt(String(mat.periodo).match(/\d+/)?.[0] || '', 10);
      const available = isDisciplineAvailable(mat, concluidas);
      const hasPre = Boolean(preRequisitosPorCodigo.get(mat.codigo)?.length);
      const isCond = periodIsCond(mat.periodo);

      if (intent.filters.periodo !== null && periodNumber !== intent.filters.periodo) return null;
      if (intent.filters.creditos !== null && Number(creditsOf(mat)) !== intent.filters.creditos) return null;
      if (intent.filters.horas !== null && Number(hoursOf(mat)) !== intent.filters.horas) return null;
      if (intent.filters.status === 'cursada' && !concluidas.has(mat.codigo)) return null;
      if (intent.filters.status === 'disponivel' && (concluidas.has(mat.codigo) || !available)) return null;
      if (intent.filters.status === 'bloqueada' && (concluidas.has(mat.codigo) || available)) return null;
      if (intent.filters.semPre && hasPre) return null;
      if (intent.filters.condicionada && !isCond) return null;

      // Se a busca é só um filtro (ex.: "3 período"), todas as correspondentes entram.
      if (!q) return { mat, score: 700, available, hasPre, status: getSubjectStatus(mat), intent };

      const name = formatName(mat);
      const normalizedNameWords = normalizeKeepSpaces(name).split(' ').filter(Boolean);
      const acronym = buildAcronym(name);
      const compactName = normalizedNameWords.join('');
      // q já vem com os apelidos expandidos. Incluir o texto digitado como "candidato"
      // fazia toda disciplina casar com ele mesmo (nota 1200) e a busca nunca filtrava.
      const candidates = [
        name,
        mat.codigo,
        displayPeriod(mat),
        `${mat.periodo} periodo`,
        buildSearchIndex(mat),
        acronym,
        compactName
      ];
      const termScores = q.split(/\s+/).filter(Boolean).map(term =>
        Math.max(...candidates.map(candidate => scoreSearchText(term, candidate)))
      );
      const score = Math.max(
        ...candidates.map(candidate => scoreSearchText(q, candidate)),
        scoreSearchText(intent.text, name),
        scoreSearchText(intent.text, mat.codigo),
        termScores.length
          ? (termScores.reduce((sum, value) => sum + value, 0) / termScores.length) * (termScores.every(value => value >= 300) ? 1 : 0.5)
          : 0
      );

      return { mat, score, available, hasPre, status: getSubjectStatus(mat), intent };
    })
    .filter(Boolean)
    .filter(item => item.score >= (q.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'));
}

// Mesmo motor da pesquisa principal (abreviações, apelidos, filtros), restrito às
// disciplinas que a pessoa pode puxar agora. Devolve os códigos em ordem de relevância.
function getPlannerSearchMatches(query) {
  const allowed = new Set(getPlannerAvailableSubjects().filter(passesPlannerFilter).map(d => d.codigo));
  return rankDisciplineSearch(String(query || '').trim())
    .filter(item => allowed.has(item.mat.codigo))
    .map(item => item.mat.codigo);
}
window.getPlannerSearchMatches = getPlannerSearchMatches;

function searchStatusLabel(status) {
  return status === 'passed' ? T('Já cursada') : status === 'eligible' ? T('Puxável') : T('Não puxável');
}

function searchStatusClass(status) {
  return status === 'passed' ? 'search-status-passed' : status === 'eligible' ? 'search-status-eligible' : 'search-status-blocked';
}

function highlightSearchText(value, rawQuery) {
  const text = String(value || '');
  const intent = parseSearchIntent(rawQuery);
  const terms = String(intent.text || '').trim().split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) return escapeHTML(text);

  const normalizedText = normalizeStr(text);
  const aliasTerms = String(intent.normalizedText || '').trim().split(/\s+/).filter(t => t.length >= 2);
  const normalizedTerms = [...new Set([...terms, ...aliasTerms].map(t => normalizeStr(t)).filter(Boolean))];
  const ranges = [];
  normalizedTerms.forEach(term => {
    let from = 0;
    while (from < normalizedText.length) {
      const index = normalizedText.indexOf(term, from);
      if (index < 0) break;
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  });

  // Se não houver correspondência literal (por exemplo, “fisiolgia”),
  // destaca a palavra mais próxima encontrada no nome.
  if (!ranges.length) {
    const wordRegex = /[\p{L}\p{N}]+/gu;
    let match;
    while ((match = wordRegex.exec(text))) {
      const word = normalizeStr(match[0]);
      if (word.length < 3) continue;
      for (const term of normalizedTerms) {
        if (term.length < 3) continue;
        const distance = levenshteinDistance(term, word);
        const similarity = 1 - distance / Math.max(term.length, word.length);
        const threshold = term.length <= 5 ? 0.74 : 0.68;
        if (similarity >= threshold || (word.startsWith(term) && term.length >= 3)) {
          const normalizedStart = normalizeStr(text.slice(0, match.index)).length;
          ranges.push([normalizedStart, normalizedStart + word.length]);
          break;
        }
      }
    }
  }

  if (!ranges.length) return escapeHTML(text);
  ranges.sort((a, b) => a[0] - b[0]);

  // normalizeStr removes accents and spaces, so build an index from normalized
  // positions back to original characters before wrapping the matching spans.
  const map = [];
  let normalizedPos = 0;
  for (let i = 0; i < text.length; i++) {
    const n = normalizeStr(text[i]);
    if (!n) continue;
    for (let j = 0; j < n.length; j++) map[normalizedPos++] = i;
  }

  const originalRanges = [];
  ranges.forEach(([a, b]) => {
    const start = map[a];
    const endChar = map[Math.max(a, b - 1)];
    if (start === undefined || endChar === undefined) return;
    originalRanges.push([start, endChar + 1]);
  });
  originalRanges.sort((a, b) => a[0] - b[0]);

  let merged = [];
  originalRanges.forEach(r => {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  });

  let out = '';
  let cursor = 0;
  merged.forEach(([a, b]) => {
    out += escapeHTML(text.slice(cursor, a));
    out += `<mark class="search-highlight">${escapeHTML(text.slice(a, b))}</mark>`;
    cursor = b;
  });
  out += escapeHTML(text.slice(cursor));
  return out;
}

function searchFilterChipHTML(key, label) {
  return `<button type="button" class="search-filter-chip" data-remove-search-filter="${key}" aria-label="${T('Remover filtro {label}', { label: escapeHTML(label) })}">${escapeHTML(label)}<span aria-hidden="true">×</span></button>`;
}

function renderSearchIntentChips(intent) {
  const chips = [];
  if (intent.filters.periodo !== null) chips.push(searchFilterChipHTML('periodo', T('{n}º período', { n: intent.filters.periodo })));
  if (intent.filters.creditos !== null) chips.push(searchFilterChipHTML('creditos', T('{n} créditos', { n: intent.filters.creditos })));
  if (intent.filters.horas !== null) chips.push(searchFilterChipHTML('horas', `${intent.filters.horas}h`));
  if (intent.filters.status === 'cursada') chips.push(searchFilterChipHTML('status', T('Já cursada')));
  if (intent.filters.status === 'disponivel') chips.push(searchFilterChipHTML('status', T('Puxável')));
  if (intent.filters.status === 'bloqueada') chips.push(searchFilterChipHTML('status', T('Não puxável')));
  if (intent.filters.semPre) chips.push(searchFilterChipHTML('semPre', T('Sem pré-requisito')));
  if (intent.filters.condicionada) chips.push(searchFilterChipHTML('condicionada', T('Escolha condicionada')));
  return chips.length ? `<div class="search-filter-chips" aria-label="${T('Filtros interpretados')}">${chips.join('')}</div>` : '';
}

function removeSearchFilter(raw, key) {
  let text = String(raw || '').normalize('NFC');
  if (key === 'periodo') text = text.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*term\b/ig, ' ').replace(/\bterm\s*\d{1,2}\b/ig, ' ').replace(/\b\d{1,2}(?:\s*(?:º|°|o))?\s*per[ií]odo\b/ig, ' ').replace(/\bper[ií]odo\s*\d{1,2}\b/ig, ' ').replace(/\b\d{1,2}\s*$/, ' ');
  if (key === 'creditos') text = text.replace(new RegExp(CREDITS_QUERY_RE.source, 'ig'), ' ');
  if (key === 'horas') text = text.replace(new RegExp(HOURS_QUERY_RE.source, 'ig'), ' ');
  if (key === 'status') text = text.replace(new RegExp(STATUS_TEXT_SOURCE, 'ig'), ' ');
  if (key === 'semPre') text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)\b|sin\s*prerrequisitos?|no\s*prerequisites?/ig, ' ');
  if (key === 'condicionada') text = text.replace(/escolha\s*condicionada|condicionadas?/ig, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function renderSearchDiscoveryPanel() {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.searchHistory) || '[]'); } catch (_) { recent = []; }
  recent = Array.isArray(recent) ? recent.filter(code => getDisciplinaByCode(code)).slice(0, 5) : [];
  const recentHTML = recent.length ? `
    <section class="search-discovery-section">
      <div class="search-discovery-heading">${T('Pesquisas recentes')}</div>
      <div class="search-recent-list">${recent.map(code => {
        const mat = getDisciplinaByCode(code);
        return `<button type="button" class="search-recent-item" data-search-code="${escapeHTML(code)}"><span class="search-recent-icon">↗</span><span class="min-w-0"><strong>${escapeHTML(formatName(mat))}</strong><small>${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))}</small></span></button>`;
      }).join('')}</div>
    </section>` : '';
  suggestions.innerHTML = `<div class="search-discovery">${recentHTML}<div class="search-discovery-hint">${T('Digite o nome, código, período, créditos, horas ou um status.')}</div></div>`;
  suggestions.classList.remove('hidden');
}

function filterMainSearch(query) {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  const clearBtn = document.getElementById('clear-search-button');
  const raw = String(query ?? '').trim();
  if (!input || !suggestions || !results || typeof disciplinas === 'undefined') return;

  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !raw);
    clearBtn.setAttribute('aria-hidden', raw ? 'false' : 'true');
  }
  input.removeAttribute('aria-activedescendant');
  window.__searchActiveIndex = -1;

  clearSearchFocus();
  const cards = Array.from(document.querySelectorAll('#accordions-container .subject-card'));
  const accordions = Array.from(document.querySelectorAll('#accordions-container > details'));
  // A busca orienta e destaca; não remove do ecrã os restantes períodos ou disciplinas.
  cards.forEach(card => {
    card.hidden = false;
    card.classList.remove('main-search-match');
  });
  accordions.forEach(group => { group.hidden = false; });

  if (!raw) {
    results.textContent = '';
    renderSearchDiscoveryPanel();
    return;
  }

  const ranked = rankDisciplineSearch(raw);
  const matchCodes = new Set(ranked.map(item => item.mat.codigo));
  cards.forEach(card => {
    if (matchCodes.has(card.dataset.codigo)) card.classList.add('main-search-match');
  });
  // Abre apenas grupos que contenham resultados, mantendo os demais acessíveis.
  const matchingGroups = new Set();
  cards.forEach(card => {
    if (matchCodes.has(card.dataset.codigo)) {
      const group = card.closest('details');
      if (group) matchingGroups.add(group);
    }
  });
  matchingGroups.forEach(group => { group.open = true; });

  const intent = parseSearchIntent(raw);
  const filterOnly = !intent.normalizedText && (
    intent.filters.periodo !== null || intent.filters.creditos !== null ||
    intent.filters.horas !== null || intent.filters.status ||
    intent.filters.semPre || intent.filters.condicionada
  );
  results.textContent = filterOnly
    ? T(ranked.length === 1 ? '{n} resultado com esse filtro' : '{n} resultados com esse filtro', { n: ranked.length })
    : T(ranked.length === 1 ? '{n} resultado' : '{n} resultados', { n: ranked.length });

  if (!ranked.length) {
    suggestions.innerHTML = `${renderSearchIntentChips(intent)}${emptyStateHTML(T('Nenhuma disciplina encontrada.'), T('Tente outro nome, código, período, créditos ou um filtro como “disponíveis”.'), 'search')}`;
    suggestions.classList.remove('hidden');
    return;
  }

  suggestions.innerHTML = `${renderSearchIntentChips(intent)}<div class="search-result-list">${ranked.slice(0, 8).map((item, index) => {
    const mat = item.mat;
    const badge = `<span class="search-status-badge ${searchStatusClass(item.status)}">${searchStatusLabel(item.status)}</span>`;
    return `
      <button id="search-option-${index}" type="button" class="search-suggestion text-left" data-search-code="${escapeHTML(mat.codigo)}" role="option" aria-selected="false">
        <div class="search-suggestion-main">
          <div class="search-suggestion-name"><span>${highlightSearchText(formatName(mat), raw)}</span>${badge}</div>
          <div class="search-suggestion-meta">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))} • ${escapeHTML(creditsOf(mat))} ${T('créditos')} • ${escapeHTML(hoursOf(mat))}h</div>
        </div>
      </button>`;
  }).join('')}</div>${ranked.length > 8 ? `<p class="search-more-note">${T('Mostrando {shown} de {total}. Continue digitando para refinar.', { shown: 8, total: ranked.length })}</p>` : ''}`;
  suggestions.classList.remove('hidden');
}

// ---- Localizar a disciplina escolhida no planejador ----
let searchFocusTimer = null;
let searchJumpToken = 0;

function clearSearchFocus() {
  window.clearTimeout(searchFocusTimer);
  searchFocusTimer = null;
  searchJumpToken++;
  document.querySelectorAll('#accordions-container .search-focus-target').forEach(el => el.classList.remove('search-focus-target'));
}

// Quem rola a tela inicial é o #home-page (position: fixed + overflow-y: auto), não a janela.
function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

// Rola até deixar o card no centro da área realmente visível: entre a barra de busca
// fixa (sticky) no topo e a navegação inferior.
function scrollCardToCenter(card, behavior) {
  const scroller = getScrollParent(card);
  const wrapper = document.getElementById('search-wrapper');
  const nav = document.getElementById('bottom-nav');
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
  const viewBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;

  let visibleTop = viewTop;
  if (wrapper) {
    const stickyTop = parseFloat(getComputedStyle(wrapper).top) || 0;
    visibleTop = viewTop + stickyTop + wrapper.offsetHeight + 8;
  }
  let visibleBottom = viewBottom;
  if (nav) {
    const navTop = nav.getBoundingClientRect().top;
    if (navTop > viewTop) visibleBottom = Math.min(viewBottom, navTop - 8);
  }
  const rect = card.getBoundingClientRect();
  const delta = (rect.top + rect.height / 2) - (visibleTop + visibleBottom) / 2;

  if (scroller) {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const top = Math.max(0, Math.min(max, scroller.scrollTop + delta));
    scroller.scrollTo({ top, behavior });
    return top;
  }
  const topWin = Math.max(0, window.scrollY + delta);
  window.scrollTo({ top: topWin, behavior });
  return topWin;
}

// Espera a rolagem (suave) parar: a posição fica estável por ~140 ms, com teto de segurança.
function whenScrollSettled(scroller, callback, target) {
  const read = () => (scroller ? scroller.scrollTop : window.scrollY);
  let last = read();
  let lastChange = performance.now();
  const startedAt = lastChange;
  let moved = false;
  const tick = now => {
    const current = read();
    if (current !== last) { last = current; lastChange = now; moved = true; }
    // A rolagem suave pode demorar a começar: só vale "parou" depois que se moveu,
    // chegou ao destino ou esgotou a espera pelo início.
    const arrived = typeof target === 'number' && Math.abs(current - target) <= 1;
    const canSettle = moved || arrived || typeof target !== 'number' || now - startedAt >= 900;
    if ((canSettle && now - lastChange >= 140) || now - startedAt >= 3500) { callback(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function jumpToSubject(codigo) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.searchHistory) || '[]');
    const recent = Array.isArray(stored) ? stored : [];
    localStorage.setItem(STORAGE_KEYS.searchHistory, JSON.stringify([codigo, ...recent.filter(c => c !== codigo)].slice(0, 6)));
  } catch (_) {}

  const card = Array.from(document.querySelectorAll('#accordions-container .subject-card'))
    .find(item => item.dataset.codigo === codigo);
  if (!card) return;

  // Uma nova seleção apaga qualquer destaque anterior (inclusive os contornos da lista de resultados).
  clearSearchFocus();
  const token = searchJumpToken;
  document.querySelectorAll('#accordions-container .main-search-match').forEach(el => el.classList.remove('main-search-match'));

  if (typeof activeBottomTabId !== 'undefined' && activeBottomTabId !== 'home-page' && typeof goToHome === 'function') goToHome();

  const group = card.closest('details');
  const wasClosed = Boolean(group && !group.open);
  document.querySelectorAll('#accordions-container > details').forEach(item => { item.hidden = false; });
  if (group) group.open = true;
  document.querySelectorAll('#accordions-container .subject-card').forEach(item => { item.hidden = false; });

  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  if (input) {
    input.value = getDisciplinaByCode(codigo)?.nome || codigo;
    const clearBtn = document.getElementById('clear-search-button');
    clearBtn?.classList.remove('hidden');
    clearBtn?.setAttribute('aria-hidden', 'false');
    input.blur();
  }
  if (suggestions) suggestions.classList.add('hidden');
  if (results) results.textContent = T('Disciplina selecionada');

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const behavior = reduced ? 'auto' : 'smooth';
  const highlight = () => {
    if (token !== searchJumpToken) return;           // outra busca começou nesse meio-tempo
    card.classList.remove('search-focus-target');
    void card.offsetWidth;
    card.classList.add('search-focus-target');
    searchFocusTimer = window.setTimeout(() => card.classList.remove('search-focus-target'), 2400);
  };
  const go = () => {
    if (token !== searchJumpToken) return;
    const targetTop = scrollCardToCenter(card, behavior);
    // O destaque começa quando a rolagem termina, para o usuário ver a disciplina já no centro.
    whenScrollSettled(getScrollParent(card), () => highlight(), targetTop);
  };
  // Se o período estava fechado, espera a animação de abertura acabar para medir a posição final.
  if (wasClosed && !reduced) window.setTimeout(go, 420);
  else requestAnimationFrame(go);
}

function clearMainSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-button');
  if (!input) return;
  input.value = '';
  if (clearBtn) {
    clearBtn.classList.add('hidden');
    clearBtn.setAttribute('aria-hidden', 'true');
  }
  filterMainSearch('');
  input.focus();
}

function initMainSearch() {
  const input = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const clearButton = document.getElementById('clear-search-button');
  const suggestions = document.getElementById('search-suggestions');

  if (!input || !suggestions) return;

  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'search-suggestions');
  window.__searchActiveIndex = -1;

  // A busca principal precisa reagir ao mesmo caractere que o usuário acabou de digitar.
  // Não usamos debounce aqui: o conjunto de disciplinas é local e pequeno o bastante
  // para recalcular a ordenação imediatamente, sem a sensação de atraso.
  input.addEventListener('input', e => {
    const value = e.target.value;
    const hasText = Boolean(value.trim());
    clearButton?.classList.toggle('hidden', !hasText);
    clearButton?.setAttribute('aria-hidden', hasText ? 'false' : 'true');
    filterMainSearch(value);
  });

  input.addEventListener('keydown', e => {
    const options = Array.from(suggestions.querySelectorAll('[data-search-code][id^="search-option-"]'));
    if (e.key === 'Escape') {
      e.preventDefault();
      clearMainSearch();
      suggestions.classList.add('hidden');
      return;
    }
    if (!options.length || suggestions.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      let next = (Number.isInteger(window.__searchActiveIndex) ? window.__searchActiveIndex : -1) + direction;
      if (next < 0) next = options.length - 1;
      if (next >= options.length) next = 0;
      window.__searchActiveIndex = next;

      options.forEach((option, index) => {
        const active = index === next;
        option.classList.toggle('search-suggestion-active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      input.setAttribute('aria-activedescendant', `search-option-${next}`);
      options[next].scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const index = Number.isInteger(window.__searchActiveIndex) && window.__searchActiveIndex >= 0
        ? window.__searchActiveIndex : 0;
      const option = options[index];
      if (option) {
        jumpToSubject(option.dataset.searchCode);
        return;
      }
      const query = e.currentTarget.value.trim();
      if (query) {
        const first = rankDisciplineSearch(query)[0];
        if (first) jumpToSubject(first.mat.codigo);
      }
    }
  });

  clearButton?.addEventListener('click', clearMainSearch);
  searchButton?.addEventListener('click', () => { input.focus(); if (!input.value.trim()) renderSearchDiscoveryPanel(); });
  input.addEventListener('focus', () => { if (!input.value.trim()) renderSearchDiscoveryPanel(); });

  suggestions.addEventListener('click', e => {
    const recent = e.target.closest('[data-search-code]');
    const removeFilter = e.target.closest('[data-remove-search-filter]');
    if (removeFilter) {
      const next = removeSearchFilter(input.value, removeFilter.dataset.removeSearchFilter);
      input.value = next;
      filterMainSearch(next);
      input.focus();
      return;
    }
    if (recent && recent.dataset.searchCode) {
      jumpToSubject(recent.dataset.searchCode);
    }
  });

  let gesture = null;
  suggestions.addEventListener('pointerdown', e => {
    const button = e.target.closest('[data-search-code]');
    if (button) button.classList.add('search-suggestion-pressed');
    gesture = { x: e.clientX, y: e.clientY };
  });
  const clearSearchPressedState = () => {
    suggestions.querySelectorAll('.search-suggestion-pressed').forEach(el => el.classList.remove('search-suggestion-pressed'));
  };

  suggestions.addEventListener('pointerup', e => {
    if (!gesture) { clearSearchPressedState(); return; }
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    const horizontal = Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy);
    const vertical = Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx);
    if (horizontal) {
      const options = Array.from(suggestions.querySelectorAll('[data-search-code][id^="search-option-"]'));
      if (options.length) {
        let next = window.__searchActiveIndex >= 0 ? window.__searchActiveIndex : 0;
        next = dx < 0 ? Math.min(options.length - 1, next + 1) : Math.max(0, next - 1);
        window.__searchActiveIndex = next;
        options.forEach((o, i) => o.classList.toggle('search-suggestion-active', i === next));
        options[next]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (vertical && dy < 0) {
      suggestions.classList.add('search-suggestions-expanded');
    } else if (vertical && dy > 0) {
      suggestions.classList.remove('search-suggestions-expanded');
      if (!input.value.trim()) suggestions.classList.add('hidden');
    }
    gesture = null;
    clearSearchPressedState();
  });
  suggestions.addEventListener('pointercancel', () => { gesture = null; clearSearchPressedState(); });

  // O painel de pesquisa é um scroll independente: quando o dedo está nele,
  // o gesto não deve vazar para a página que fica atrás.
  suggestions.addEventListener('touchmove', e => {
    const touch = e.touches?.[0];
    if (!touch) return;
    if (suggestions.scrollHeight <= suggestions.clientHeight + 1) {
      e.preventDefault();
      return;
    }
    const lastY = Number(suggestions.dataset.touchScrollY || touch.clientY);
    const dy = touch.clientY - lastY;
    suggestions.dataset.touchScrollY = String(touch.clientY);
    const atTop = suggestions.scrollTop <= 0;
    const atBottom = suggestions.scrollTop + suggestions.clientHeight >= suggestions.scrollHeight - 1;
    if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
  }, { passive: false });
  suggestions.addEventListener('touchstart', e => {
    const touch = e.touches?.[0];
    if (touch) suggestions.dataset.touchScrollY = String(touch.clientY);
  }, { passive: true });
  suggestions.addEventListener('touchend', () => { delete suggestions.dataset.touchScrollY; }, { passive: true });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target) && !searchButton?.contains?.(e.target) && !clearButton?.contains?.(e.target)) {
      suggestions.classList.add('hidden');
    }
  });
}

// ----------------------------------------------------
// SETTINGS MODAL SUPPORT
// ----------------------------------------------------
function initSettings() {
  applyTextSize(getTextSize());
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // O <head> já definiu o tema inicial antes da primeira pintura.
  // Aqui não reaplicamos o tema, evitando uma segunda troca visual no carregamento.
  updateThemeUI();

  // Sem preferência manual, continua acompanhando alterações posteriores do tema do SO.
  media?.addEventListener?.('change', event => {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.theme)) setTheme(event.matches, false);
    } catch (_) {
      setTheme(event.matches, false);
    }
  });
}

// ----------------------------------------------------
// DESFAZER, BACKUP, TUTORIAL, ESTIMATIVA E SINCRONIZAÇÃO
// ----------------------------------------------------
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function snapshotState() {
  return {
    concluded: new Set(appState.concludedCodes),
    planner: new Set(appState.plannerCheckedCodes)
  };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function applyStateSnapshot(snapshot) {
  appState.concludedCodes.clear();
  snapshot.concluded.forEach(code => { if (disciplinasPorCodigo.has(code)) appState.concludedCodes.add(code); });
  appState.plannerCheckedCodes.clear();
  snapshot.planner.forEach(code => { if (disciplinasPorCodigo.has(code)) appState.plannerCheckedCodes.add(code); });

  checkboxesPorCodigo.forEach((cb, code) => { cb.checked = appState.concludedCodes.has(code); });
  persistCheckedState();
  persistPlannerCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  if (document.getElementById('planner-obrig-container')) renderPlanner();
}

function showUndoToast(message, snapshot) {
  showToast({
    text: message,
    duration: 6000,
    action: { label: T('Desfazer'), onClick: () => applyStateSnapshot(snapshot) }
  });
}

// ---- Tutorial de primeiro acesso ----
const ONBOARDING_STEPS = [
  {
    title: T('Marque o que você já cursou'),
    text: T('Toque na caixinha à direita de cada matéria. As cores mostram a situação: azul é já cursada, verde está disponível para puxar e vermelho está bloqueada por algum pré-requisito.')
  },
  {
    title: T('Veja detalhes e co-requisitos'),
    text: T('Segure o dedo sobre um card (ou toque no ícone de informação) para ver pré-requisitos e co-requisitos. O botão C indica uma matéria que precisa ser cursada junto com outra.')
  },
  {
    title: T('Planeje o próximo período'),
    text: T('Na aba "O que puxar?" você escolhe entre as disciplinas disponíveis e acompanha os créditos (o SIGA aceita de {min} a {max}).', { min: SIGA_MIN_CRED, max: SIGA_MAX_CRED })
  }
];
let onboardingStep = 0;

function ensureOnboardingModal() {
  let modal = document.getElementById('modal-onboarding');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modal-onboarding';
  modal.className = 'modal-overlay pa-onboarding';
  modal.innerHTML = `
    <div class="onboarding-card" tabindex="-1">
      <p class="onboarding-kicker" id="onboarding-kicker"></p>
      <h2 class="onboarding-title" id="onboarding-title"></h2>
      <p class="onboarding-text" id="onboarding-text"></p>
      <div class="onboarding-dots" id="onboarding-dots" aria-hidden="true"></div>
      <div class="onboarding-actions">
        <button type="button" class="pa-btn" id="onboarding-back" data-pa-action="onboarding-back"></button>
        <button type="button" class="pa-btn pa-btn-primary" id="onboarding-next" data-pa-action="onboarding-next"></button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  prepareModalA11y(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
  return modal;
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[onboardingStep];
  const last = onboardingStep === ONBOARDING_STEPS.length - 1;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('onboarding-kicker', T('Passo {n} de {total}', { n: onboardingStep + 1, total: ONBOARDING_STEPS.length }));
  setText('onboarding-title', step.title);
  setText('onboarding-text', step.text);
  setText('onboarding-back', onboardingStep === 0 ? T('Pular') : T('Voltar'));
  setText('onboarding-next', last ? T('Começar') : T('Próximo'));
  const dots = document.getElementById('onboarding-dots');
  if (dots) {
    dots.innerHTML = ONBOARDING_STEPS
      .map((_, index) => `<span class="onboarding-dot${index === onboardingStep ? ' is-active' : ''}"></span>`)
      .join('');
  }
}

function openOnboarding() {
  ensureOnboardingModal();
  onboardingStep = 0;
  renderOnboardingStep();
  openModal('modal-onboarding');
}

function handleOnboardingNav(direction) {
  if (direction < 0 && onboardingStep === 0) { closeModal('modal-onboarding'); return; }
  if (direction > 0 && onboardingStep === ONBOARDING_STEPS.length - 1) { closeModal('modal-onboarding'); return; }
  onboardingStep += direction;
  renderOnboardingStep();
}

function maybeShowOnboarding() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.onboarded)) return;
    localStorage.setItem(STORAGE_KEYS.onboarded, '1');
  } catch (_) {
    return;
  }
  // Quem já tem progresso salvo não é novato: não mostra o tutorial.
  if (appState.concludedCodes.size > 0) return;
  setTimeout(openOnboarding, 700);
}

// ---- Várias abas abertas: mantém o estado sincronizado ----
function refreshFromStorage() {
  const checked = loadJSON(STORAGE_KEYS.checked, []);
  const planner = loadJSON(STORAGE_KEYS.plannerChecked, []);
  appState.concludedCodes.clear();
  (Array.isArray(checked) ? checked : []).forEach(code => { if (disciplinasPorCodigo.has(code)) appState.concludedCodes.add(code); });
  appState.plannerCheckedCodes.clear();
  (Array.isArray(planner) ? planner : []).forEach(code => { if (disciplinasPorCodigo.has(code)) appState.plannerCheckedCodes.add(code); });

  checkboxesPorCodigo.forEach((cb, code) => { cb.checked = appState.concludedCodes.has(code); });
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  if (document.getElementById('planner-obrig-container')) renderPlanner();
}

function initStorageSync() {
  window.addEventListener('storage', event => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === null || event.key === STORAGE_KEYS.checked || event.key === STORAGE_KEYS.plannerChecked) {
      refreshFromStorage();
    } else if (event.key === STORAGE_KEYS.theme) {
      setTheme(event.newValue ? event.newValue === 'dark' : Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches), false);
    }
  });
}

// ---- Eventos por delegação (sem onclick/onpointerdown dentro do HTML dos cards) ----
function handleActionClick(event) {
  const el = event.target.closest?.('[data-pa-action]');
  if (!el) return;
  const { paAction: action, codigo, periodo } = el.dataset;
  switch (action) {
    case 'copy-code': copyCodeToClipboard(codigo, event); break;
    case 'coreq-info': showCoreqInfo(event, codigo); break;
    case 'details': event.stopPropagation(); openSubjectDetails(codigo); break;
    case 'planner-details': event.stopPropagation(); openPlannerDetails(codigo); break;
    case 'mark-all': marcarTudo(periodo); break;
    case 'clear-period': limparTudo(periodo); break;
    case 'cond-info': showCondInfo(event); break;
    case 'copy-planner-codes': copyPlannerSelectedCodes(event); break;
    case 'clear-planner-selection': clearPlannerSelection(); break;
    case 'onboarding-next': handleOnboardingNav(1); break;
    case 'onboarding-back': handleOnboardingNav(-1); break;
    case 'set-theme': setThemePref(el.dataset.value); break;
    case 'set-text-size': setTextSize(el.dataset.value); break;
    case 'set-toast-ms': setToastMs(Number(el.dataset.value)); break;
    case 'set-lang': setLanguage(el.dataset.value); break;
    case 'check-update': checkForUpdate(); break;
    case 'copy-email': copyTextToClipboard(SUPPORT_EMAIL, T('E-mail'), event); break;
    default: break;
  }
}

function initDelegatedEvents() {
  if (window.__paDelegatedBound) return;
  window.__paDelegatedBound = true;

  ['accordions-container', 'planner-obrig-container', 'planner-cond-container'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    const isPlanner = id !== 'accordions-container';
    const cardSelector = isPlanner ? '.planner-card' : '.subject-card';
    const start = isPlanner ? startPlannerLongPress : startLongPress;
    const move = isPlanner ? handlePlannerLongPressMove : handleLongPressMove;
    const cancel = isPlanner ? cancelPlannerLongPress : cancelLongPress;

    container.addEventListener('pointerdown', event => {
      const card = event.target.closest?.(cardSelector);
      if (card) start(card.dataset.codigo, event);
    });
    container.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => container.addEventListener(type, () => cancel()));

    container.addEventListener('change', event => {
      const cb = event.target;
      if (!(cb instanceof HTMLInputElement) || cb.type !== 'checkbox' || !cb.closest(cardSelector)) return;
      if (isPlanner) togglePlannerCard(cb);
      else handleSubjectCheckboxChange(cb);
    });
  });

  // Fase de captura: o .planner-screen do index.html tem onclick="event.stopPropagation()",
  // o que impediria os cliques dentro de "O que puxar?" de chegar ao document.
  document.addEventListener('click', handleActionClick, true);
}

// Fecha as sanfonas com a mesma animação suave da abertura (o <details> nativo some na hora).
function initAccordionAnimation() {
  const container = document.getElementById('accordions-container');
  if (!container || container.dataset.accordionBound) return;
  container.dataset.accordionBound = '1';

  container.addEventListener('click', event => {
    const summary = event.target.closest?.('summary');
    if (!summary || event.target.closest('button, a, input')) return;
    const details = summary.parentElement;
    if (!details || details.tagName !== 'DETAILS' || !details.open) return;
    if (prefersReducedMotion() || details.classList.contains('is-closing')) return;

    event.preventDefault();
    details.classList.add('is-closing');
    window.setTimeout(() => {
      details.open = false;
      details.classList.remove('is-closing');
    }, 200);
  });
}

function initAccessibilityHelpers() {
  const toast = document.getElementById('toast-copy');
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
  }
  // O toque longo abre os detalhes; no celular ele também dispararia o menu do sistema.
  document.addEventListener('contextmenu', event => {
    const fromTouch = event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents;
    if (fromTouch && event.target.closest?.('.subject-card, .planner-card')) event.preventDefault();
  });
}

// ----------------------------------------------------
// CORE INIT
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderContatos();
  initContatosSearch();
  renderAccordions();
  syncAccordionTheme(html.classList.contains('dark'));
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  initMainSearch();
  initSettings();
  initDelegatedEvents();
  initAccordionAnimation();
  initAccessibilityHelpers();
  initStorageSync();
  initPlannerFilter();
  try {
    const savedTab = localStorage.getItem('planejador_active_tab_v1');
    if (savedTab && bottomTabIds.includes(savedTab)) {
      activeBottomTabId = savedTab;
      if (savedTab === 'modal-planner') renderPlanner();
      if (savedTab === 'modal-farmacia') window.FarmacIA?.show();
    }
  } catch (_) {}
  normalizeBottomTabs(activeBottomTabId, true);
  maybeShowOnboarding();
  window.setTimeout(() => html.classList.add('app-ready'), 700);
  initIOSStandaloneFix();
});

// ----------------------------------------------------
// iPhone: app instalado na tela de início
// Sintoma: ao abrir, a tela não rolava nem respondia até trocar de aba e voltar.
// Causa provável: as telas são camadas fixas com rolagem própria; o WebKit só "ativa" essa
// rolagem depois de uma nova composição (o que a troca de aba provoca) e, na primeira pintura,
// 100vw/100dvh podem vir defasados. A correção refaz layout e composição da aba atual ao abrir,
// ao voltar para o app e ao girar o aparelho.
// ----------------------------------------------------
function refreshActiveTabLayout() {
  if (bottomTabTransitionTimer !== null || bottomSwipeDirection) return;
  const page = getBottomTabElement(activeBottomTabId);
  if (!page) return;
  normalizeBottomTabs(activeBottomTabId, true);
  // Força um ciclo de layout no contêiner rolável...
  page.style.setProperty('overflow-y', 'hidden', 'important');
  void page.offsetHeight;
  page.style.removeProperty('overflow-y');
  // ...e uma nova composição (deslocamento de meio pixel por um quadro, imperceptível).
  const index = getBottomTabIndex(activeBottomTabId);
  page.style.setProperty('transform', 'translate3d(0.5px, 0, 0)', 'important');
  requestAnimationFrame(() => {
    if (bottomTabTransitionTimer === null && !bottomSwipeDirection) setBottomTrackPosition(index, 0, false);
  });
}

function initIOSStandaloneFix() {
  const kick = () => refreshActiveTabLayout();
  [0, 120, 450, 1200].forEach(ms => window.setTimeout(kick, ms));
  window.addEventListener('load', kick, { once: true });
  window.addEventListener('pageshow', kick);
  window.addEventListener('orientationchange', () => window.setTimeout(kick, 150));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
  window.visualViewport?.addEventListener('resize', () => {
    if (!document.documentElement.classList.contains('farma-typing')) kick();
  });
}
