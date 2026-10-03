// --- CONSTANTES E ESTADO GLOBAL REATIVO ---
const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  plannerChecked: 'planner_checked_v1',
  theme: 'theme'
};
const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

const TOTAL_OBRIG_CRED = (typeof disciplinas !== 'undefined' ? disciplinas : [])
  .filter(d => !periodIsCond(d.periodo))
  .reduce((sum, d) => sum + creditsOf(d), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;

let totalObrig = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => !periodIsCond(d.periodo)).length;
let totalCond = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => periodIsCond(d.periodo)).length;

// Estado centralizado e reativo (evita leituras desnecessárias do DOM querySelectorAll(':checked'))
const appState = {
  concluidas: new Set()
};

const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;
let previousActiveElement = null; // Para Focus Trap

// --- UTILITÁRIOS BASE ---
const normalizeStr = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
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
  } catch (error) {
    console.warn('Não foi possível salvar.', error);
    showToastError('Erro ao salvar localmente. O armazenamento pode estar cheio.');
  }
};

function formatName(mat) {
  return mat.nome + (typeof disciplinaAjustes !== 'undefined' && disciplinaAjustes[mat.codigo] ? disciplinaAjustes[mat.codigo] : '');
}

function displayPeriod(mat) {
  return mat.periodo === PERIODO_COND ? PERIODO_COND : `${mat.periodo}º Período`;
}

function extractCodes(str) {
  return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}|MACF/g) || []) : [];
}

// --- ÍNDICES E ESTRUTURAS DE DADOS RÁPIDAS ---
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
    const relacionados = [...preRequisitosPorCodigo.get(d.codigo), ...corequisitosPorCodigo.get(d.codigo)];
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

function periodIsCond(periodo) { return periodo === PERIODO_COND; }
function creditsOf(mat) { return mat.cred || 4; }
function hoursOf(mat) { return mat.ch || creditsOf(mat) * 15; }

// Agora utilizamos O(1) do appState ao invés de buscar do DOM
function getConcludedCodes() {
  return Array.from(appState.concluidas);
}

function getCoreqRelatedCodes(codigo) {
  const related = new Set();
  const queue = [codigo];

  while (queue.length) {
    const current = queue.shift();
    const direct = new Set(corequisitosPorCodigo.get(current) || []);
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
  return document.querySelector(`.subject-card input[type="checkbox"][value="${CSS.escape(codigo)}"]`);
}

// Gerenciamento Reativo
function setSubjectChecked(codigo, checked, originCodigo = codigo, showAutoToast = false) {
  const changed = appState.concluidas.has(codigo) !== checked;
  if (!changed) return false;

  if (checked) appState.concluidas.add(codigo);
  else appState.concluidas.delete(codigo);

  const cb = getCheckboxByCode(codigo);
  if (cb) cb.checked = checked;

  if (checked && showAutoToast && codigo !== originCodigo) {
    const autoMat = getDisciplinaByCode(codigo);
    const originMat = getDisciplinaByCode(originCodigo);
    if (autoMat && originMat) {
      showCoreqAutoToast(formatName(autoMat), formatName(originMat));
    }
  }
  return true;
}

function synchronizeCorequisites(originCodigo, checked, showAutoToast = false) {
  const related = getCoreqRelatedCodes(originCodigo);
  related.forEach(code => setSubjectChecked(code, checked, originCodigo, showAutoToast));
  return related;
}

function handleSubjectCheckboxChange(cb, options = {}) {
  const codigo = cb.value;
  synchronizeCorequisites(codigo, cb.checked, options.showAutoToast !== false);
  setSubjectChecked(codigo, cb.checked); // Garante que a raiz está certa no appState

  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function persistCheckedState() {
  saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  const el = document.getElementById('save-status');
  if (el) {
    el.classList.remove('opacity-0');
    setTimeout(() => el.classList.add('opacity-0'), 1600);
  }
}

function restoreCheckedState() {
  const stored = loadJSON(STORAGE_KEYS.checked, []);
  appState.concluidas = new Set(stored);
  
  // Atualiza as checkbox no DOM baseadas no estado
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.checked = appState.concluidas.has(cb.value);
  });

  Array.from(appState.concluidas).forEach(codigo => synchronizeCorequisites(codigo, true, false));
  persistCheckedState();
}

function confirmarLimparSelecao() {
  if (appState.concluidas.size === 0) return;
  showConfirmModal('Resetar Seleção', 'Tem certeza que deseja desmarcar TODAS as disciplinas? Essa ação não pode ser desfeita.', () => {
    appState.concluidas.clear();
    document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => cb.checked = false);
    persistCheckedState();
    updateDashboard();
    applySelectedVisualization([]);
  });
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return "<span class='text-gray-500 font-normal'>Nenhum</span>";
  const incompleteColor = html.classList.contains('dark') ? '#f87171' : '#ef4444';
  const completedColor = html.classList.contains('dark') ? '#34d399' : '#10b981';

  return extractCodes(reqStr).map(c => {
    const m = getDisciplinaByCode(c);
    let label = m ? escapeHTML(formatName(m)) : escapeHTML(c);
    if (m && !periodIsCond(m.periodo)) label += ` (${escapeHTML(displayPeriod(m))})`;
    const color = concluidas.includes(c) ? completedColor : incompleteColor;
    return `<span style="color:${color}" class="font-bold block mb-1">${label}</span>`;
  }).join('');
}

function applyCardStatus(cardEl, status) {
  cardEl.classList.remove('status-default', 'status-passed', 'status-eligible', 'status-blocked');
  cardEl.classList.add(`status-${status}`);
}

// --- THEMING ---
function setTheme(isDark, persist = true) {
  const css = document.createElement('style');
  css.innerHTML = '* { transition: none !important; }';
  document.head.appendChild(css);

  if (isDark) {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
  if (persist) localStorage.theme = isDark ? 'dark' : 'light';
  html.style.colorScheme = isDark ? 'only dark' : 'only light';
  const themeMeta = document.getElementById('theme-color-meta');
  if (themeMeta) themeMeta.content = isDark ? '#121212' : '#ca8a04';
  updateThemeUI();

  window.getComputedStyle(document.body).getPropertyValue('background-color');
  setTimeout(() => document.head.removeChild(css), 50);
}

function updateThemeUI() {
  const isDark = html.classList.contains('dark');
  const sun = document.getElementById('settings-theme-icon-sun');
  const moon = document.getElementById('settings-theme-icon-moon');
  if (sun) sun.classList.toggle('hidden', isDark);
  if (moon) moon.classList.toggle('hidden', !isDark);
}

function toggleThemeFromSettings() {
  setTheme(!html.classList.contains('dark'));
}

function initSettings() {
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    setTheme(storedTheme === 'dark');
  } else {
    setTheme(Boolean(media?.matches), false);
  }
  media?.addEventListener?.('change', event => {
    if (!localStorage.getItem('theme')) setTheme(event.matches, false);
  });
}

// --- MODALS E A11Y FOCUS TRAP ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.classList.contains('active')) return;
  previousActiveElement = document.activeElement;
  modal.classList.add('active');
  modal.classList.remove('hidden');
  activeModalCount++;
  document.body.style.overflow = 'hidden';
  modal.setAttribute('tabindex', '-1');
  modal.focus();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal || !modal.classList.contains('active')) return;
  modal.classList.remove('active');
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) document.body.style.overflow = '';
  if (previousActiveElement) previousActiveElement.focus();
}

function showConfirmModal(title, message, onConfirm) {
  const titleEl = document.getElementById('modal-confirm-title');
  const descEl = document.getElementById('modal-confirm-desc');
  const okBtn = document.getElementById('modal-confirm-ok');
  
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = message;
  
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal('modal-confirm');
    okBtn.removeEventListener('click', handleConfirm);
  };
  
  okBtn.onclick = handleConfirm; // Sobrescreve para previnir bugs
  openModal('modal-confirm');
}

// Focus trap handling para melhor A11y
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
  }
  if (e.key === 'Tab' && activeModalCount > 0) {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (!activeModal) return;
    const focusableEls = activeModal.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if(focusableEls.length === 0) return;
    
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }
});

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) closeModal(o.id);
  });
  const cancelBtn = o.querySelector('#modal-confirm-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', () => closeModal(o.id));
});

// --- CLIPBOARD E TOASTS ---
async function copyTextToClipboard(text, prefixLabel, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
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
    showToastCustom(`${prefixLabel} copiado com sucesso!`, text);
  } catch (error) {
    console.warn('Não foi possível copiar.', error);
    showToastError('Erro ao copiar para a área de transferência.');
  }
}

async function copyCodeToClipboard(codigo, event) {
  await copyTextToClipboard(codigo, "Código", event);
}

function showToastCustom(msg, highlight = '') {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  if (highlight) {
    const safeMsg = escapeHTML(msg);
    const safeHighlight = escapeHTML(highlight);
    msgEl.innerHTML = safeMsg.replace(safeHighlight, `<span class="text-yellow-400 font-black px-1 tracking-wider bg-black/30 rounded">${safeHighlight}</span>`);
  } else {
    msgEl.textContent = msg;
  }

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 2500);
}

function showToastError(msg) {
  const toast = document.getElementById('toast-error');
  const msgEl = document.getElementById('toast-error-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.remove('hidden', 'opacity-0', 'translate-y-[-1rem]');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastErrTimer);
  window.__toastErrTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-[-1rem]');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3500);
}

function showCoreqInfo(event, codigo) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const m = getDisciplinaByCode(codigo);
  if (!m || !m.co) return;

  const coNames = extractCodes(m.co).map(c => {
    const mat = getDisciplinaByCode(c);
    const name = mat ? escapeHTML(formatName(mat)) : escapeHTML(c);
    const period = mat ? escapeHTML(displayPeriod(mat)) : '';
    return `<span class="coreq-name-highlight">${name}</span><span class="coreq-period-highlight">${period ? ` (${period})` : ''}</span>`;
  }).join(', ');

  const titleEl = document.getElementById('coreq-title');
  const descEl = document.getElementById('coreq-desc');
  if (titleEl) titleEl.innerText = formatName(m);
  if (descEl) descEl.innerHTML = `Essa matéria possui ${coNames} como co-requisito, cursadas simultaneamente.`;
  openModal('modal-coreq');
}

function showCoreqAutoToast(autoName, originName) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.innerHTML = `A matéria <span class="text-yellow-400 font-bold">${escapeHTML(autoName)}</span> foi marcada por ser correquesito de <span class="text-yellow-400 font-bold">${escapeHTML(originName)}</span>`;

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 3000);
}

// --- LONG PRESS INTERACTION ---
let longPressPointer = null;
let longPressStartX = 0;
let longPressStartY = 0;

function startLongPress(cod, event) {
  // Ignora clique com o botão direito (event.button !== 0 para MouseEvents)
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  
  cancelLongPress();
  longPressPointer = event?.pointerId ?? null;
  longPressStartX = event?.clientX ?? 0;
  longPressStartY = event?.clientY ?? 0;

  timerLongPress = setTimeout(() => {
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
    const copyBtn = document.getElementById('det-copy-btn');
    if (copyBtn) copyBtn.onclick = (e) => copyCodeToClipboard(m.codigo, e);
    openModal('modal-details');
    timerLongPress = null;
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

// --- CORE DASHBOARD & CARDS ---
function marcarTudo(p) {
  const processMarcar = () => {
    let mudou = false;
    document.querySelectorAll(`.subject-card input[data-periodo="${CSS.escape(p)}"]`).forEach(cb => {
      if(setSubjectChecked(cb.value, true)) mudou = true;
      synchronizeCorequisites(cb.value, true, false);
    });
    if(mudou) {
      persistCheckedState();
      updateDashboard();
      applySelectedVisualization(getConcludedCodes());
    }
  };

  if (p === PERIODO_COND) {
    showConfirmModal('Marcar Condicionadas?', 'Tem certeza que deseja marcar todas as disciplinas de Escolha Condicionada?', processMarcar);
  } else {
    processMarcar();
  }
}

function limparTudo(p) {
  document.querySelectorAll(`.subject-card input[data-periodo="${CSS.escape(p)}"]`).forEach(cb => {
    setSubjectChecked(cb.value, false);
    synchronizeCorequisites(cb.value, false, false);
  });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function updateDashboard() {
  // Reatividade baseada no appState, ZERO chamadas repetidas ao DOM
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0;
  let condCred = 0, condHoras = 0;

  appState.concluidas.forEach(codigo => {
    const m = getDisciplinaByCode(codigo);
    if (!m) return;
    const baseCred = creditsOf(m);
    const baseHor = hoursOf(m);

    if (periodIsCond(m.periodo)) {
      dCond++;
      condCred += baseCred;
      condHoras += baseHor;
    } else {
      dObrig++;
      obrigCredFeitos += baseCred;
    }
    tCred += baseCred;
    tHr += baseHor;
  });

  const updateEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  
  updateEl('count-obrig-feitas', dObrig);
  updateEl('count-obrig-faltam', Math.max(0, totalObrig - dObrig));
  
  const pObrig = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
  updateEl('percent-obrig', pObrig + '%');
  const barObrig = document.getElementById('bar-obrig');
  if(barObrig) barObrig.style.width = Math.min(100, pObrig) + '%';

  updateEl('count-cond-feitas', dCond);
  updateEl('count-cond-faltam', Math.max(0, totalCond - dCond));
  updateEl('text-cond-progress', `${condCred} créd. • ${condHoras}h`);

  const pCondCred = (condCred / META_COND_CRED) * 100;
  const pCondHoras = (condHoras / META_COND_HORAS) * 100;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  const barCond = document.getElementById('bar-cond');
  if(barCond) barCond.style.width = pCond + '%';

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
  
  updateEl('percent-total', `${percent}%`);
  updateEl('total-creditos', tCred);
  updateEl('total-horas', tHr);
}

function createSubjectCardHTML(mat) {
  const isChecked = appState.concluidas.has(mat.codigo);
  const checkedAttr = isChecked ? 'checked' : '';
  let coreqBtn = '';
  
  if (mat.co) {
    coreqBtn = `<button class="coreq-button ml-2 p-1 text-yellowTheme-600 bg-yellow-100 dark:bg-yellow-900/30 rounded font-bold text-[0.65rem] hover:bg-yellow-200" type="button" onclick="showCoreqInfo(event, '${escapeHTML(mat.codigo)}')" title="Ver co-requisito" aria-label="Ver co-requisito">CO</button>`;
  }

  return `
  <div class="subject-card block p-3 rounded-xl relative mb-2 select-none border border-transparent dark:bg-darkCard/50 transition-colors"
       data-codigo="${escapeHTML(mat.codigo)}" data-periodo="${escapeHTML(mat.periodo)}"
       onpointerdown="startLongPress('${escapeHTML(mat.codigo)}', event)"
       onpointermove="handleLongPressMove(event)"
       onpointerup="cancelLongPress()"
       onpointercancel="cancelLongPress()"
       onpointerleave="cancelLongPress()">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1">
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${escapeHTML(formatName(mat))}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="text-[0.80rem] md:text-sm font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${escapeHTML(mat.codigo)}</span>
            <button type="button" class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600" onclick="copyCodeToClipboard('${escapeHTML(mat.codigo)}', event)" title="Copiar código" aria-label="Copiar código">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${creditsOf(mat)} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${hoursOf(mat)}h</span>
        </div>
      </div>
      <div class="flex items-center flex-col justify-center gap-2 pt-1">
        <input type="checkbox" value="${escapeHTML(mat.codigo)}" data-periodo="${escapeHTML(mat.periodo)}" ${checkedAttr} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="Marcar ${escapeHTML(formatName(mat))}">
        
        <!-- Indicadores Visuais p/ Acessibilidade (Daltônicos) -->
        <span class="status-indicator pointer-events-none" aria-hidden="true">
          <svg class="status-icon-check w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <svg class="status-icon-unlock w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
          <svg class="status-icon-lock w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </span>
      </div>
    </div>
  </div>`;
}

function showCondInfo(event) {
  event.stopPropagation();
  event.preventDefault();
  const title = document.getElementById('period-info-title');
  const desc = document.getElementById('period-info-desc');
  if (title) title.textContent = 'Escolha Condicionada';
  if (desc) desc.textContent = 'Disciplinas de Escolha Condicionada são as eletivas do currículo novo. Basicamente você precisa ter 12 créditos e 180 horas dessas matérias para se formar.';
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
    const displayP = p === PERIODO_COND ? PERIODO_COND : `${p}º Período`;
    const count = list.length;
    const isCond = p === PERIODO_COND;
    
    const infoBtn = isCond ? `
      <button type="button" class="ml-2 text-purple-500 hover:text-purple-700 flex-shrink-0" onclick="showCondInfo(event)" title="Informações" aria-label="Informações sobre condicionadas">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </button>` : '';

    htmlContent += `
    <details class="group bg-gray-50 dark:bg-[#15171b] rounded-2xl border border-gray-200/60 dark:border-darkBorder/60 overflow-hidden">
      <summary class="flex items-center justify-between p-4 md:p-5 cursor-pointer font-bold text-gray-800 dark:text-gray-100 list-none select-none hover:bg-gray-100 dark:hover:bg-[#1a1c22] transition-colors rounded-t-2xl">
        <div class="flex items-center text-base md:text-lg">
          ${displayP} ${infoBtn}
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <span class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[0.65rem] md:text-xs font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-lg shadow-sm">
            ${count} Matéria${count > 1 ? 's' : ''}
          </span>
          <svg class="accordion-chevron w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </summary>
      <div class="p-4 pt-2 space-y-2 accordion-content border-t border-gray-100 dark:border-darkBorder/50">
        <div class="flex gap-2 mb-3">
          <button type="button" class="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors" onclick="marcarTudo('${escapeHTML(p)}')">Marcar</button>
          <button type="button" class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onclick="limparTudo('${escapeHTML(p)}')">Limpar</button>
        </div>
        ${list.map(createSubjectCardHTML).join('')}
      </div>
    </details>`;
  });
  
  container.innerHTML = htmlContent;
  
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => handleSubjectCheckboxChange(cb));
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
    return requiredCodes.every(code => concluidas.includes(code));
  });
}

function applySelectedVisualization(concluidas) {
  document.querySelectorAll('.subject-card').forEach(card => {
    const cod = card.dataset.codigo;
    const m = getDisciplinaByCode(cod);
    if (!m) return;
    
    if (concluidas.includes(cod)) {
      applyCardStatus(card, 'passed');
    } else {
      applyCardStatus(card, checkReqs(m.pre, concluidas) ? 'eligible' : 'blocked');
    }
  });
}


// --- PLANEJADOR ---
function openPlanner() {
  renderPlanner();
  openModal('modal-planner');
}

function renderPlanner() {
  const containerObrig = document.getElementById('planner-obrig-container');
  const containerCond = document.getElementById('planner-cond-container');
  if (!containerObrig || !containerCond) return;

  const concluidas = getConcludedCodes();
  const disponiveis = disciplinas.filter(d => !concluidas.includes(d.codigo) && checkReqs(d.pre, concluidas));
  
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));

  const emptyStateHTML = (msg) => `
    <div class="flex flex-col items-center justify-center p-6 text-gray-400 bg-gray-50/50 dark:bg-darkCard/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
      <p class="text-sm font-medium">${msg}</p>
    </div>`;

  containerObrig.innerHTML = obrig.length > 0 ? obrig.map(m => createPlannerCard(m)).join('') : emptyStateHTML('Nenhuma obrigatória disponível');
  containerCond.innerHTML = cond.length > 0 ? cond.map(m => createPlannerCard(m)).join('') : emptyStateHTML('Nenhuma condicionada disponível');
  
  restorePlannerCheckedState();
}

function createPlannerCard(mat) {
  const coreqBtn = mat.co
    ? `<button type="button" class="ml-2 px-1 text-[0.65rem] font-bold text-yellowTheme-600 bg-yellow-100 dark:bg-yellow-900/30 rounded" onclick="showCoreqInfo(event, '${escapeHTML(mat.codigo)}')" title="Ver co-requisito">CO</button>`
    : '';

  return `
  <div class="planner-card block p-3 rounded-xl relative mb-2 select-none bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder transition-all duration-200"
         data-codigo="${escapeHTML(mat.codigo)}"
         onpointerdown="startPlannerLongPress('${escapeHTML(mat.codigo)}', event)"
         onpointermove="handlePlannerLongPressMove(event)"
         onpointerup="cancelPlannerLongPress()"
         onpointercancel="cancelPlannerLongPress()"
         onpointerleave="cancelPlannerLongPress()">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1">
          <span class="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100">${escapeHTML(formatName(mat))}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-[0.75rem] font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${escapeHTML(mat.codigo)}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${creditsOf(mat)} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${hoursOf(mat)}h</span>
        </div>
      </div>
      <div class="flex items-center">
        <input type="checkbox" value="${escapeHTML(mat.codigo)}" onchange="togglePlannerCard(this)" class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700">
      </div>
    </div>
  </div>`;
}

function togglePlannerCard(checkbox) {
  const card = checkbox.closest('.planner-card');
  if (checkbox.checked) card.classList.add('opacity-40');
  else card.classList.remove('opacity-40');
  persistPlannerCheckedState();
}

function persistPlannerCheckedState() {
  const checkedBoxes = Array.from(document.querySelectorAll('.planner-card input[type="checkbox"]:checked')).map(cb => cb.value);
  saveJSON(STORAGE_KEYS.plannerChecked, checkedBoxes);
}

function restorePlannerCheckedState() {
  const stored = loadJSON(STORAGE_KEYS.plannerChecked, []);
  document.querySelectorAll('.planner-card input[type="checkbox"]').forEach(cb => {
    cb.checked = stored.includes(cb.value);
    togglePlannerCard(cb);
  });
}

let timerPlannerLongPress = null;
let plannerLongPressPointer = null;
let plannerLongPressStartX = 0;
let plannerLongPressStartY = 0;

function startPlannerLongPress(cod, event) {
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelPlannerLongPress();
  
  plannerLongPressPointer = event?.pointerId ?? null;
  plannerLongPressStartX = event?.clientX ?? 0;
  plannerLongPressStartY = event?.clientY ?? 0;

  timerPlannerLongPress = setTimeout(() => {
    const m = getDisciplinaByCode(cod);
    if (!m) return;
    const trancadas = getLockedSubjects(cod);
    const titleEl = document.getElementById('planner-det-title');
    const listEl = document.getElementById('planner-det-list');
    if (!titleEl || !listEl) return;
    if (trancadas.length === 0) {
      titleEl.textContent = `A matéria ${m.nome} não tranca nenhuma disciplina!`;
      listEl.innerHTML = '';
    } else if (trancadas.length === 1) {
      titleEl.textContent = `A matéria ${m.nome} tranca a seguinte disciplina:`;
      listEl.innerHTML = `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${escapeHTML(trancadas[0].nome)} (${escapeHTML(trancadas[0].codigo)})</li>`;
    } else {
      titleEl.textContent = `A matéria ${m.nome} tranca as seguintes matérias:`;
      listEl.innerHTML = trancadas.map(t => `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${escapeHTML(t.nome)} (${escapeHTML(t.codigo)})</li>`).join('');
    }
    openModal('modal-planner-details');
    timerPlannerLongPress = null;
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


// --- CONTATOS SEARCH LOGIC ---
function renderContatos() {
  if (typeof contatosImportantes === 'undefined') return;
  renderContatosFiltered(contatosImportantes);
}

function renderContatosFiltered(dataToRender) {
  const container = document.getElementById('contatos-content');
  if (!container || typeof contatosImportantes === 'undefined') return;

  if (Array.isArray(dataToRender) && dataToRender.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10 text-gray-400">
        <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <p class="font-medium">Nenhum professor encontrado.</p>
      </div>`;
    return;
  }

  let htmlResult = '';
  if (dataToRender[0] && dataToRender[0].professores) {
    htmlResult = dataToRender.map(grupo => buildContatoCard(grupo.nome, grupo.chefe, grupo.local, grupo.professores)).join('');
  } else {
    const grouped = {};
    dataToRender.forEach(p => {
      if(!grouped[p.grupo]) grouped[p.grupo] = [];
      grouped[p.grupo].push(p);
    });
    htmlResult = Object.keys(grouped).map(grupoNome => buildContatoCard(grupoNome, '', '', grouped[grupoNome])).join('');
  }
  container.innerHTML = htmlResult;
}

function buildContatoCard(nomeGrupo, chefe, local, professores) {
  return `
    <div class="bg-gray-50 dark:bg-[#15171b] p-4 rounded-xl border border-gray-100 dark:border-darkBorder mb-4">
      <h4 class="font-bold text-lg text-yellowTheme-600 dark:text-yellowTheme-400 ${chefe ? 'mb-1' : 'mb-2'}">${escapeHTML(nomeGrupo)}</h4>
      ${chefe ? `<p class="text-sm font-semibold text-gray-700 dark:text-gray-300 ${local ? 'mb-1' : 'mb-3'}">${escapeHTML(chefe)}</p>` : ''}
      ${local ? `<p class="text-xs text-gray-500 mb-3">${escapeHTML(local)}</p>` : ''}
      <ul class="text-xs space-y-2 text-left flex-wrap">
        ${professores.map(p => `
          <li class="border-b border-gray-200 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
            <b class="text-gray-800 dark:text-gray-200">${escapeHTML(p.nome)}</b><br>
            <a href="mailto:${escapeHTML(p.email)}" class="text-blue-500 hover:underline break-all">${escapeHTML(p.email)}</a>${p.extras && p.extras.length ? `<br><span class="text-gray-500">Alt: ${escapeHTML(p.extras.join(' | '))}</span>` : ''}
            ${p.cargo ? `<span class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[0.60rem] ml-1">${escapeHTML(p.cargo)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function initContatosSearch() {
  if (typeof contatosImportantes === 'undefined') return;
  const input = document.getElementById('contatos-search-input');
  const suggestions = document.getElementById('contatos-search-suggestions');
  if(!input || !suggestions) return;
  
  // Debounce implementado
  input.addEventListener('input', debounce((e) => {
    const val = normalizeStr(e.target.value);
    if(!val) {
      suggestions.classList.add('hidden');
      renderContatos(); 
      return;
    }
    
    let allProfs = [];
    contatosImportantes.forEach(g => {
      g.professores.forEach(p => { allProfs.push({ ...p, grupo: g.nome }); });
    });
    
    const matched = allProfs
      .map(p => ({ p, score: Math.max(scoreSearchText(val, p.nome), scoreSearchText(val, p.email)) }))
      .filter(item => item.score >= (val.length <= 2 ? 430 : 300))
      .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
      .map(item => item.p);
    
    if (matched.length > 0) {
      suggestions.innerHTML = matched.slice(0, 5).map(p => `
        <div class="p-3 border-b border-gray-100 dark:border-darkBorder cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1c22]" onclick="selectContatoSearch('${escapeHTML(p.nome)}')">
          <p class="font-bold text-sm text-gray-800 dark:text-gray-100">${escapeHTML(p.nome)}</p>
          <p class="text-[0.65rem] text-gray-500">${escapeHTML(p.email)}</p>
        </div>
      `).join('');
      suggestions.classList.remove('hidden');
    } else {
      suggestions.innerHTML = '<div class="p-3 text-sm text-gray-500 font-medium">Nenhum professor encontrado.</div>';
      suggestions.classList.remove('hidden');
    }
    renderContatosFiltered(matched);
  }, 250));
  
  document.addEventListener('click', (e) => {
    if(!input.contains(e.target) && !suggestions.contains(e.target)) suggestions.classList.add('hidden');
  });
}

window.selectContatoSearch = function(nome) {
  const input = document.getElementById('contatos-search-input');
  if(input) input.value = nome;
  document.getElementById('contatos-search-suggestions').classList.add('hidden');
  
  let allProfs = [];
  contatosImportantes.forEach(g => g.professores.forEach(p => allProfs.push({ ...p, grupo: g.nome })));
  const matched = allProfs.filter(p => p.nome === nome);
  renderContatosFiltered(matched);
}


// --- MAIN SEARCH LOGIC ---
function buildSearchIndex(mat) {
  if (!mat) return '';
  if (buscaIndexPorCodigo.has(mat.codigo)) return buscaIndexPorCodigo.get(mat.codigo);
  const value = normalizeStr([formatName(mat), mat.codigo, displayPeriod(mat), `${mat.periodo} periodo`].join(' '));
  buscaIndexPorCodigo.set(mat.codigo, value);
  return value;
}

function expandSearchAliases(rawText) {
  let r = String(rawText || '').trim().toLowerCase();
  let norm = normalizeStr(r);
  if (typeof aliasesPesquisaDisciplinas === 'object' && aliasesPesquisaDisciplinas) {
    Object.entries(aliasesPesquisaDisciplinas).forEach(([alias, target]) => {
      const normalizedAlias = normalizeStr(alias);
      if (normalizedAlias && norm.includes(normalizedAlias)) {
        norm = norm.replace(normalizedAlias, normalizeStr(target));
      }
    });
  }
  return norm;
}

function levenshteinDistance(a, b) {
  a = String(a || ''); b = String(b || '');
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
  const q = normalizeStr(query);
  const t = normalizeStr(candidate);
  if (!q || !t) return 0;

  if (t === q) return 1200;
  if (t.startsWith(q)) return 1050 - Math.min(120, t.length - q.length);
  if (t.includes(q)) return 920 - Math.min(120, t.indexOf(q) * 4);

  const maxWindow = Math.min(t.length, Math.max(q.length + 4, q.length * 2));
  let best = 0;
  for (let i = 0; i <= Math.max(0, t.length - 1); i++) {
    const window = t.slice(i, i + maxWindow);
    const dist = levenshteinDistance(q, window);
    const similarity = 1 - (dist / Math.max(q.length, window.length, 1));
    best = Math.max(best, similarity);
  }

  const subseq = subsequenceScore(q, t);
  return Math.max(best * 760, subseq * 620);
}

function parseSearchIntent(rawQuery) {
  const raw = String(rawQuery || '').trim();
  let text = raw;
  const normalized = normalizeStr(raw);
  const filters = { periodo: null, creditos: null, horas: null, status: null, condicionada: false, semPre: false };

  let match = normalized.match(/(?:^|[^0-9])(\d{1,2})(?:o|º|°)?periodo/);
  if (!match) match = normalized.match(/periodo(?:o|º|°)?(\d{1,2})/);
  if (match) {
    filters.periodo = Number(match[1]);
    text = text.replace(new RegExp(`\\b${match[1]}(?:\\s*(?:º|°|o))?\\s*per[ií]odo\\b`, 'i'), ' ');
    text = text.replace(new RegExp(`per[ií]odo\\s*${match[1]}\\b`, 'i'), ' ');
  } else if (filters.creditos === null && filters.horas === null) {
    const trailingNumber = normalized.match(/(\d{1,2})$/);
    if (trailingNumber && Number(trailingNumber[1]) >= 1 && Number(trailingNumber[1]) <= 10) {
      filters.periodo = Number(trailingNumber[1]);
      text = text.replace(new RegExp(`\\b${trailingNumber[1]}\\s*$`), ' ');
    }
  }

  match = normalized.match(/(\d+(?:[.,]\d+)?)cr(?:ed(?:ito)?s?)/);
  if (!match) match = normalized.match(/(\d+(?:[.,]\d+)?)creditos?/);
  if (match) {
    filters.creditos = Number(String(match[1]).replace(',', '.'));
    text = text.replace(new RegExp(`${match[1].replace('.', '[.,]')}\\s*(?:cr(?:é|e)?d(?:ito)?s?|créditos?)`, 'i'), ' ');
  }

  match = normalized.match(/(\d+)h(?:oras)?/);
  if (!match) match = normalized.match(/(\d+)horas?/);
  if (match) {
    filters.horas = Number(match[1]);
    text = text.replace(new RegExp(`${match[1]}\\s*(?:h|horas?)`, 'i'), ' ');
  }

  const statusTerms = [
    { re: /(?:disponiveis?|livres?)/, value: 'disponivel' },
    { re: /(?:bloqueadas?|trancadas?|indisponiveis?)/, value: 'bloqueada' }
  ];
  for (const term of statusTerms) {
    if (term.re.test(normalized)) {
      filters.status = term.value;
      text = text.replace(new RegExp(term.re.source, 'i'), ' ');
      break;
    }
  }

  if (/(?:sem\s*pre|sem\s*pr[eé]-?requisito|sempr[eé]requisito)/i.test(raw)) {
    filters.semPre = true;
    text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)/i, ' ');
  }

  if (/(?:escolha\s*condicionada|condicionadas?)/i.test(raw)) {
    filters.condicionada = true;
    text = text.replace(/escolha\s*condicionada|condicionadas?/gi, ' ');
  }

  text = text.replace(/[|,;]+/g, ' ').trim();
  return { raw, text, normalizedText: expandSearchAliases(text), filters };
}

function isDisciplineAvailable(mat, concluidas) {
  return checkReqs(mat.pre, concluidas);
}

function rankDisciplineSearch(query) {
  if (!query || typeof disciplinas === 'undefined') return [];
  const intent = parseSearchIntent(query);
  const q = intent.normalizedText;
  const concluidas = getConcludedCodes();

  return disciplinas
    .map(mat => {
      const periodNumber = parseInt(String(mat.periodo).match(/\d+/)?.[0] || '', 10);
      const available = isDisciplineAvailable(mat, concluidas);
      const hasPre = Boolean(preRequisitosPorCodigo.get(mat.codigo)?.length);
      const isCond = periodIsCond(mat.periodo);

      if (intent.filters.periodo !== null && periodNumber !== intent.filters.periodo) return null;
      if (intent.filters.creditos !== null && Number(creditsOf(mat)) !== intent.filters.creditos) return null;
      if (intent.filters.horas !== null && Number(hoursOf(mat)) !== intent.filters.horas) return null;
      if (intent.filters.status === 'disponivel' && (concluidas.includes(mat.codigo) || !available)) return null;
      if (intent.filters.status === 'bloqueada' && (concluidas.includes(mat.codigo) || available)) return null;
      if (intent.filters.semPre && hasPre) return null;
      if (intent.filters.condicionada && !isCond) return null;

      if (!q) return { mat, score: 700, available, hasPre, intent };

      const candidates = [formatName(mat), mat.codigo, displayPeriod(mat), `${mat.periodo} periodo`, buildSearchIndex(mat)];
      const score = Math.max(
        ...candidates.map(candidate => scoreSearchText(q, candidate)),
        scoreSearchText(intent.text, formatName(mat)),
        scoreSearchText(intent.text, mat.codigo)
      );

      return { mat, score, available, hasPre, intent };
    })
    .filter(Boolean)
    .filter(item => item.score >= (q.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'));
}

function filterMainSearch(query) {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  const clearBtn = document.getElementById('clear-search-button');

  if (!input || !suggestions || !results || typeof disciplinas === 'undefined') return;

  const raw = String(query ?? '').trim();
  clearBtn?.classList.toggle('hidden', !raw);
  input.removeAttribute('aria-activedescendant');
  window.__searchActiveIndex = -1;

  const cards = Array.from(document.querySelectorAll('.subject-card'));
  const accordions = Array.from(document.querySelectorAll('#accordions-container > details'));

  if (!raw) {
    cards.forEach(card => { card.hidden = false; });
    accordions.forEach(details => { details.hidden = false; });
    suggestions.classList.add('hidden');
    suggestions.innerHTML = '';
    results.textContent = '';
    return;
  }

  const ranked = rankDisciplineSearch(raw);
  const visibleRanked = ranked.slice(0, Math.max(12, Math.min(24, ranked.length)));
  const matchCodes = new Set(visibleRanked.map(item => item.mat.codigo));

  cards.forEach(card => { card.hidden = !matchCodes.has(card.dataset.codigo); });
  accordions.forEach(details => {
    const hasVisibleCard = Array.from(details.querySelectorAll('.subject-card')).some(card => !card.hidden);
    details.hidden = !hasVisibleCard;
    if (hasVisibleCard) details.open = true; // Abre se tiver matches
  });

  const intent = parseSearchIntent(raw);
  const filterOnly = !intent.normalizedText && (
    intent.filters.periodo !== null || intent.filters.creditos !== null ||
    intent.filters.horas !== null || intent.filters.status ||
    intent.filters.semPre || intent.filters.condicionada
  );
  results.textContent = `${ranked.length} ${ranked.length === 1 ? 'resultado' : 'resultados'}${filterOnly ? ' com esse filtro' : ''}`;

  if (!ranked.length) {
    suggestions.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-gray-400">
        <svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <p class="text-sm font-medium">Nenhuma disciplina encontrada.</p>
      </div>`;
    suggestions.classList.remove('hidden');
    return;
  }

  suggestions.innerHTML = ranked.slice(0, 6).map((item, index) => {
    const mat = item.mat;
    const badge = index === 0 && intent.normalizedText ? '<span class="ml-2 text-[0.6rem] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">Mais próxima</span>' : '';
    const status = intent.filters.status ? (item.available ? 'Disponível agora' : 'Bloqueada agora') : '';
    return `
      <button id="search-option-${index}" type="button" class="w-full text-left p-3 border-b border-gray-100 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-gray-800 transition" data-search-code="${escapeHTML(mat.codigo)}" role="option" aria-selected="false">
        <div class="flex flex-col">
          <div class="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center">${escapeHTML(formatName(mat))} ${badge}</div>
          <div class="text-[0.65rem] text-gray-500 font-medium">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))}${status ? ` • ${status}` : ''}</div>
        </div>
      </button>
    `;
  }).join('');
  suggestions.classList.remove('hidden');
}

function jumpToSubject(codigo) {
  const card = document.querySelector(`.subject-card[data-codigo="${CSS.escape(codigo)}"]`);
  if (!card) return;

  const details = card.closest('details');
  if (details) {
    details.hidden = false;
    details.open = true;
  }

  document.querySelectorAll('#accordions-container > details').forEach(d => {
    if (d !== details) d.hidden = true;
  });
  document.querySelectorAll('.subject-card').forEach(c => {
    c.hidden = c !== card;
  });

  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  if (input) input.value = getDisciplinaByCode(codigo)?.nome || codigo;
  if (suggestions) suggestions.classList.add('hidden');
  if (results) results.textContent = '1 resultado';

  // Highlight temporário para facilitar que o usuário encontre
  card.classList.add('ring-2', 'ring-yellowTheme-500', 'bg-yellow-50/50', 'dark:bg-yellow-900/10');
  setTimeout(() => card.classList.remove('ring-2', 'ring-yellowTheme-500', 'bg-yellow-50/50', 'dark:bg-yellow-900/10'), 1500);

  requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function clearMainSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  filterMainSearch('');
  input?.focus();
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

  // Debounce na busca principal também
  input.addEventListener('input', debounce(e => filterMainSearch(e.target.value), 250));

  input.addEventListener('keydown', e => {
    const options = Array.from(suggestions.querySelectorAll('[data-search-code]'));
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
        option.classList.toggle('bg-gray-100', active);
        option.classList.toggle('dark:bg-gray-800', active);
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
      if (option) jumpToSubject(option.dataset.searchCode);
    }
  });

  clearButton?.addEventListener('click', clearMainSearch);
  searchButton?.addEventListener('click', () => input.focus());

  suggestions.addEventListener('pointerdown', e => {
    const button = e.target.closest('[data-search-code]');
    if (button) button.classList.add('search-suggestion-pressed');
  });

  suggestions.addEventListener('click', e => {
    const button = e.target.closest('[data-search-code]');
    if (button) jumpToSubject(button.dataset.searchCode);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target) && e.target !== searchButton) {
      suggestions.classList.add('hidden');
    }
  });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  renderContatos();
  initContatosSearch();
  renderAccordions();
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
  initMainSearch();
  initSettings();
});
