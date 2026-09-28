
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

const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;

const normalizeStr = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

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

function periodIsCond(periodo) {
  return periodo === PERIODO_COND;
}

function creditsOf(mat) {
  return mat.cred || 4;
}

function hoursOf(mat) {
  return mat.ch || creditsOf(mat) * 15;
}

function getConcludedCodes() {
  return Array.from(document.querySelectorAll('.subject-card input[type="checkbox"]:checked')).map(cb => cb.value);
}

function getCoreqRelatedCodes(codigo) {
  const related = new Set();
  const queue = [codigo];

  while (queue.length) {
    const current = queue.shift();
    disciplinas.forEach(d => {
      const coCodes = extractCodes(d.co);
      if (d.codigo === current || coCodes.includes(current)) {
        const candidates = d.codigo === current ? coCodes : [d.codigo];
        candidates.forEach(code => {
          if (code !== codigo && !related.has(code)) {
            related.add(code);
            queue.push(code);
          }
        });
      }
    });
  }

  return Array.from(related);
}

function getCheckboxByCode(codigo) {
  return Array.from(document.querySelectorAll('.subject-card input[type="checkbox"]')).find(cb => cb.value === codigo) || null;
}

function setSubjectChecked(codigo, checked, originCodigo = codigo, showAutoToast = false) {
  const cb = getCheckboxByCode(codigo);
  if (!cb) return false;

  const changed = cb.checked !== checked;
  cb.checked = checked;

  if (checked && showAutoToast && codigo !== originCodigo) {
    const autoMat = disciplinas.find(d => d.codigo === codigo);
    const originMat = disciplinas.find(d => d.codigo === originCodigo);
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

function handleSubjectCheckboxChange(cb, options = {}) {
  const codigo = cb.value;
  const related = synchronizeCorequisites(codigo, cb.checked, options.showAutoToast !== false);
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
  return related;
}

function persistCheckedState() {
  saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  const el = document.getElementById('save-status');
  if (el) {
    el.classList.remove('opacity-0');
    setTimeout(() => el.classList.add('opacity-0'), 1600);
  }
}

function confirmarLimparSelecao() {
  const marcadas = getConcludedCodes();
  if (!marcadas.length) return;
  if (!confirm('Tem certeza que deseja desmarcar todas as disciplinas?')) return;
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization([]);
}

function restoreCheckedState() {
  const stored = loadJSON(STORAGE_KEYS.checked, []);
  const set = new Set(stored);
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });

  // Mantém os co-requisitos sincronizados mesmo com uma seleção antiga salva.
  Array.from(set).forEach(codigo => synchronizeCorequisites(codigo, true, false));
  persistCheckedState();
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return "<span class='text-gray-500 font-normal'>Nenhum</span>";
  const incompleteColor = html.classList.contains('dark') ? '#f87171' : '#ef4444';
  const completedColor = html.classList.contains('dark') ? '#34d399' : '#10b981';

  return extractCodes(reqStr).map(c => {
    const m = disciplinas.find(d => d.codigo === c);
    let label = m ? formatName(m) : c;
    if (m && !periodIsCond(m.periodo)) label += ` (${displayPeriod(m)})`;
    const color = concluidas.includes(c) ? completedColor : incompleteColor;
    return `<span style="color:${color}" class="font-bold block mb-1">${label}</span>`;
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
  
  setTimeout(() => {
    document.head.removeChild(css);
  }, 50);
}

function updateThemeUI() {
  const isDark = html.classList.contains('dark');
  const thumb = document.getElementById('theme-toggle-thumb');
  if (thumb) thumb.style.transform = isDark ? 'translateX(1.25rem)' : 'translateX(0)';

  const label = document.getElementById('settings-theme-label');
  if (label) label.textContent = isDark ? 'Modo escuro' : 'Modo claro';

  const sun = document.getElementById('settings-theme-icon-sun');
  const moon = document.getElementById('settings-theme-icon-moon');
  if (sun) sun.classList.toggle('hidden', isDark);
  if (moon) moon.classList.toggle('hidden', !isDark);
}

function toggleThemeFromSettings() {
  setTheme(!html.classList.contains('dark'));
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (!modal.classList.contains('active')) {
    modal.classList.add('active');
    activeModalCount++;
  }
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (modal.classList.contains('active')) {
    modal.classList.remove('active');
    activeModalCount = Math.max(0, activeModalCount - 1);
  }
  if (activeModalCount === 0) {
    document.body.style.overflow = '';
  }
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) closeModal(o.id);
  });
});

async function copyTextToClipboard(text, prefixLabel, event) {
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
    showToastCustom(`${prefixLabel} copiado com sucesso!`, text);
  } catch (error) {
    console.warn('Não foi possível copiar.', error);
  }
}

async function copyCodeToClipboard(codigo, event) {
  await copyTextToClipboard(codigo, "Código", event);
}

function showCoreqInfo(event, codigo) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m || !m.co) return;

  const coNames = extractCodes(m.co).map(c => {
    const mat = disciplinas.find(d => d.codigo === c);
    const name = mat ? formatName(mat) : c;
    const period = mat ? displayPeriod(mat) : '';
    const suffix = period ? ` (${period})` : '';
    return `<span class="coreq-name-highlight">${name}</span><span class="coreq-period-highlight">${suffix}</span>`;
  }).join(', ');

  const titleEl = document.getElementById('coreq-title');
  const descEl = document.getElementById('coreq-desc');

  if (titleEl) titleEl.innerText = formatName(m);
  if (descEl) {
    descEl.innerHTML = `Essa matéria possui ${coNames} como co-requisito, ou seja, devem ser cursadas simultaneamente no mesmo período.`;
  }

  openModal('modal-coreq');
}

function showCoreqAutoToast(autoName, originName) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  const esc = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  msgEl.innerHTML = `A matéria <span class="toast-coreq-name">${esc(autoName)}</span> foi marcada automaticamente por ser correquesito de <span class="toast-coreq-name">${esc(originName)}</span>`;

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 3000);
}

function showToastCustom(msg, highlight = '') {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  if (highlight) {
    const safeMsg = String(msg);
    const safeHighlight = String(highlight);
    msgEl.innerHTML = safeMsg.replace(safeHighlight, `<span class="text-yellow-600 dark:text-yellow-500 font-black px-1 tracking-wider bg-black/10 dark:bg-black/30 rounded">${safeHighlight}</span>`);
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

let longPressPointer = null;
let longPressStartX = 0;
let longPressStartY = 0;

function startLongPress(cod, event) {
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelLongPress();
  longPressPointer = event?.pointerId ?? null;
  longPressStartX = event?.clientX ?? 0;
  longPressStartY = event?.clientY ?? 0;

  timerLongPress = setTimeout(() => {
    const m = disciplinas.find(d => d.codigo === cod);
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

function handleSubjectCardClick(event) {
  if (event && event.target && event.target.closest && (event.target.closest('button') || event.target.closest('input'))) {
    return;
  }
  if (suppressNextSubjectCardClick) {
      event.preventDefault();
    event.stopPropagation();
  }
}

function marcarTudo(p) {
  if (p === PERIODO_COND && !confirm('Tem certeza que deseja marcar todas de Escolha Condicionada?')) return;
  document.querySelectorAll(`.subject-card input[data-periodo="${p}"]`).forEach(cb => { cb.checked = true; synchronizeCorequisites(cb.value, true, false); });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function limparTudo(p) {
  document.querySelectorAll(`.subject-card input[data-periodo="${p}"]`).forEach(cb => { cb.checked = false; synchronizeCorequisites(cb.value, false, false); });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function getSelectedCondStats() {
  let condCred = 0, condHoras = 0, condCount = 0;
  document.querySelectorAll('.subject-card input[type="checkbox"]:checked').forEach(c => {
    const m = disciplinas.find(d => d.codigo === c.value);
    if (m && periodIsCond(m.periodo)) {
      condCount++;
      condCred += creditsOf(m);
      condHoras += hoursOf(m);
    }
  });
  return { condCred, condHoras, condCount };
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0;
  document.querySelectorAll('.subject-card input[type="checkbox"]:checked').forEach(c => {
    const m = disciplinas.find(d => d.codigo === c.value);
    if (!m) return;
    const baseCred = creditsOf(m);
    const baseHor = hoursOf(m);

    if (periodIsCond(c.dataset.periodo)) dCond++;
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

  const countCondFeitas = document.getElementById('count-cond-feitas');
  if(countCondFeitas) countCondFeitas.textContent = dCond;
  const countCondFaltam = document.getElementById('count-cond-faltam');
  if(countCondFaltam) countCondFaltam.textContent = Math.max(0, totalCond - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  const condProgressText = document.getElementById('text-cond-progress');
  if(condProgressText) condProgressText.textContent = `${condCred} créd. • ${condHoras}h`;

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
  
  const percentTotal = document.getElementById('percent-total');
  if(percentTotal) percentTotal.textContent = `${percent}%`;
  
  const tCreditosNode = document.getElementById('total-creditos');
  if(tCreditosNode) tCreditosNode.textContent = tCred;
  
  const tHorasNode = document.getElementById('total-horas');
  if(tHorasNode) tHorasNode.textContent = tHr;
}

function createSubjectCardHTML(mat) {
  const checked = getConcludedCodes().includes(mat.codigo) ? 'checked' : '';
  let coreqBtn = '';
  if (mat.co) {
    coreqBtn = `<button class="coreq-button" type="button" onclick="showCoreqInfo(event, '${mat.codigo}')" title="Ver co-requisito" aria-label="Ver co-requisito">C</button>`;
  }

  return `
  <div class="subject-card block p-3 rounded-xl relative mb-2 select-none"
       data-codigo="${mat.codigo}" data-periodo="${mat.periodo}"
       onpointerdown="startLongPress('${mat.codigo}', event)"
       onpointermove="handleLongPressMove(event)"
       onpointerup="cancelLongPress()"
       onpointercancel="cancelLongPress()"
       onpointerleave="cancelLongPress()">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${formatName(mat)}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="text-[0.80rem] md:text-sm font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${mat.codigo}</span>
            <button type="button" class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600" onclick="copyCodeToClipboard('${mat.codigo}', event)" title="Copiar código" aria-label="Copiar código">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${creditsOf(mat)} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${hoursOf(mat)}h</span>
        </div>
      </div>
      <div class="flex items-center h-full pt-1">
        <input type="checkbox" value="${mat.codigo}" data-periodo="${mat.periodo}" ${checked} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="Marcar ${formatName(mat)}">
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
      <button type="button" class="ml-2 text-blue-500 hover:text-blue-700 flex-shrink-0" onclick="showCondInfo(event)" title="Informações">
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
          <button type="button" class="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors" onclick="marcarTudo('${p}')">Marcar</button>
          <button type="button" class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onclick="limparTudo('${p}')">Limpar</button>
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
  return disciplinas.filter(m => {
    const preList = extractCodes(m.pre);
    const coList = extractCodes(m.co);
    return preList.includes(codigo) || coList.includes(codigo);
  }).sort((a, b) => {
    const pa = parseInt(a.periodo, 10) || 99;
    const pb = parseInt(b.periodo, 10) || 99;
    return pa - pb;
  });
}

function isApta(m, concluidas) {
  if (!m) return false;
  return checkReqs(m.pre, concluidas) && checkReqs(m.co, concluidas);
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
    const m = disciplinas.find(d => d.codigo === cod);
    if (!m) return;
    
    if (concluidas.includes(cod)) {
      applyCardStatus(card, 'passed');
    } else {
      applyCardStatus(card, checkReqs(m.pre, concluidas) ? 'eligible' : 'blocked');
    }
  });
}

// ----------------------------------------------------
// PLANEJAR GRADE LOGIC
// ----------------------------------------------------
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

  if (obrig.length > 0) {
    containerObrig.innerHTML = obrig.map(m => createPlannerCard(m)).join('');
  } else {
    containerObrig.innerHTML = '<p class="text-gray-500 text-sm italic py-2">Nenhuma obrigatória disponível para puxar.</p>';
  }

  if (cond.length > 0) {
    containerCond.innerHTML = cond.map(m => createPlannerCard(m)).join('');
  } else {
    containerCond.innerHTML = '<p class="text-gray-500 text-sm italic py-2">Nenhuma condicionada disponível para puxar.</p>';
  }
  
  restorePlannerCheckedState();
}

function createPlannerCard(mat) {
  const coreqBtn = mat.co
    ? `<button type="button" class="planner-coreq-button" onclick="showCoreqInfo(event, '${mat.codigo}')" title="Ver co-requisito" aria-label="Ver co-requisito">C</button>`
    : '';

  return `
  <div class="planner-card block p-3 rounded-xl relative mb-2 select-none bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder transition-all duration-200"
         data-codigo="${mat.codigo}"
         onpointerdown="startPlannerLongPress('${mat.codigo}', event)"
         onpointermove="handlePlannerLongPressMove(event)"
         onpointerup="cancelPlannerLongPress()"
         onpointercancel="cancelPlannerLongPress()"
         onpointerleave="cancelPlannerLongPress()">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          <span class="planner-subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${formatName(mat)}</span>
          ${coreqBtn}
          <button type="button"
                  onclick="copyCodeToClipboard('${mat.codigo}', event)"
                  title="Copiar código"
                  aria-label="Copiar código"
                  class="p-1 text-gray-400 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 0-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-[0.75rem] font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${mat.codigo}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${creditsOf(mat)} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${hoursOf(mat)}h</span>
        </div>
      </div>
      <div class="flex items-center">
        <input type="checkbox" value="${mat.codigo}" onchange="togglePlannerCard(this)" class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700">
      </div>
    </div>
  </div>`;
}

function togglePlannerCard(checkbox) {
  const card = checkbox.closest('.planner-card');
  if (checkbox.checked) {
    card.classList.add('line-through', 'opacity-50');
  } else {
    card.classList.remove('line-through', 'opacity-50');
  }
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
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelPlannerLongPress();
  plannerLongPressPointer = event?.pointerId ?? null;
  plannerLongPressStartX = event?.clientX ?? 0;
  plannerLongPressStartY = event?.clientY ?? 0;

  timerPlannerLongPress = setTimeout(() => {
    const m = disciplinas.find(d => d.codigo === cod);
    if (!m) return;
    const trancadas = getLockedSubjects(cod);
    const titleEl = document.getElementById('planner-det-title');
    const listEl = document.getElementById('planner-det-list');
    if (!titleEl || !listEl) return;
    if (trancadas.length === 0) {
      titleEl.textContent = `A matéria ${m.nome} não tranca nenhuma matéria!`;
      listEl.innerHTML = '';
    } else if (trancadas.length === 1) {
      titleEl.textContent = `A matéria ${m.nome} tranca a seguinte matéria:`;
      listEl.innerHTML = `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${trancadas[0].nome} (${trancadas[0].codigo})</li>`;
    } else {
      titleEl.textContent = `A matéria ${m.nome} tranca as seguintes matérias:`;
      listEl.innerHTML = trancadas.map(t => `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${t.nome} (${t.codigo})</li>`).join('');
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
      container.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum professor encontrado.</p>';
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

function buildContatoCard(nomeGrupo, chefe, local, professores) {
  return `
    <div class="bg-gray-50 dark:bg-[#15171b] p-4 rounded-xl border border-gray-100 dark:border-darkBorder">
      <h4 class="font-bold text-lg text-yellowTheme-600 dark:text-yellowTheme-400 ${chefe ? 'mb-1' : 'mb-2'}">${nomeGrupo}</h4>
      ${chefe ? `<p class="text-sm font-semibold ${local ? 'mb-1' : 'mb-3'}">${chefe}</p>` : ''}
      ${local ? `<p class="text-xs text-gray-500 mb-3">${local}</p>` : ''}
      <ul class="text-xs space-y-2 text-left flex-wrap">
        ${professores.map(p => `
          <li><b>${p.nome}</b> - <a href="mailto:${p.email}" class="text-blue-500 hover:underline">${p.email}</a>${p.extras && p.extras.length ? ` | ${p.extras.join(' | ')}` : ''}${p.cargo ? ` ${p.cargo}` : ''}</li>
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
  
  input.addEventListener('input', (e) => {
      const val = normalizeStr(e.target.value);
      if(!val) {
          suggestions.classList.add('hidden');
          renderContatos(); 
          return;
      }
      
      let allProfs = [];
      contatosImportantes.forEach(g => {
          g.professores.forEach(p => {
              allProfs.push({ ...p, grupo: g.nome });
          });
      });
      
      const matched = allProfs
          .map(p => ({ p, score: Math.max(scoreSearchText(val, p.nome), scoreSearchText(val, p.email)) }))
          .filter(item => item.score >= (val.length <= 2 ? 430 : 300))
          .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
          .map(item => item.p);
      
      if (matched.length > 0) {
          suggestions.innerHTML = matched.slice(0, 5).map(p => `
              <div class="p-3 border-b border-gray-100 dark:border-darkBorder cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1c22]" onclick="selectContatoSearch('${p.nome}')">
                  <p class="font-bold text-sm text-gray-800 dark:text-gray-100">${p.nome}</p>
                  <p class="text-[0.65rem] text-gray-500">${p.email}</p>
              </div>
          `).join('');
          suggestions.classList.remove('hidden');
      } else {
          suggestions.innerHTML = '<div class="p-3 text-sm text-gray-500">Nenhum professor encontrado.</div>';
          suggestions.classList.remove('hidden');
      }
      
      renderContatosFiltered(matched);
  });
  
  document.addEventListener('click', (e) => {
      if(!input.contains(e.target) && !suggestions.contains(e.target)) {
          suggestions.classList.add('hidden');
      }
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
// MAIN SEARCH LOGIC
// ----------------------------------------------------
function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function buildSearchIndex(mat) {
  return normalizeStr([formatName(mat), mat.codigo, displayPeriod(mat), `${mat.periodo} periodo`].join(' '));
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
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
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
  for (let i = 0; i <= t.length - 1; i++) {
    const window = t.slice(i, i + maxWindow);
    const dist = levenshteinDistance(q, window);
    const similarity = 1 - (dist / Math.max(q.length, window.length, 1));
    best = Math.max(best, similarity);
  }

  const subseq = subsequenceScore(q, t);
  return Math.max(best * 760, subseq * 620);
}

function rankDisciplineSearch(query) {
  const raw = String(query || '').trim();
  if (!raw || typeof disciplinas === 'undefined') return [];
  const normalizedAliasQuery = expandSearchAliases(raw);
  return disciplinas
    .map(mat => {
      const candidates = [
        formatName(mat),
        mat.codigo,
        displayPeriod(mat),
        `${mat.periodo} periodo`,
        buildSearchIndex(mat)
      ];
      const score = Math.max(
        ...candidates.map(candidate => scoreSearchText(normalizedAliasQuery, candidate)),
        scoreSearchText(raw, formatName(mat)),
        scoreSearchText(raw, mat.codigo)
      );
      return { mat, score };
    })
    .filter(item => item.score >= (normalizedAliasQuery.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'));
}

function getSearchText(mat) {
  return buildSearchIndex(mat);
}

function filterMainSearch(query) {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  const clearBtn = document.getElementById('clear-search-button');

  if (!input || !suggestions || !results || typeof disciplinas === 'undefined') return;

  const raw = String(query ?? '').trim();
  clearBtn?.classList.toggle('hidden', !raw);

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

  cards.forEach(card => {
    card.hidden = !matchCodes.has(card.dataset.codigo);
  });

  accordions.forEach(details => {
    const hasVisibleCard = Array.from(details.querySelectorAll('.subject-card')).some(card => !card.hidden);
    details.hidden = !hasVisibleCard;
    if (hasVisibleCard) details.open = true;
  });

  results.textContent = `${ranked.length} ${ranked.length === 1 ? 'resultado' : 'resultados'}`;

  if (!ranked.length) {
    suggestions.innerHTML = '<div class="p-3 text-sm text-gray-500 dark:text-gray-400">Nenhuma disciplina encontrada.</div>';
    suggestions.classList.remove('hidden');
    return;
  }

  suggestions.innerHTML = ranked.slice(0, 6).map((item, index) => {
    const mat = item.mat;
    const badge = index === 0 ? '<span class="search-closest-badge">Mais próxima</span>' : '';
    return `
      <button type="button" class="search-suggestion text-left" data-search-code="${escapeHTML(mat.codigo)}" role="option">
        <div class="search-suggestion-main">
          <div class="search-suggestion-name">${escapeHTML(formatName(mat))} ${badge}</div>
          <div class="search-suggestion-meta">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))}</div>
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
  if (input) input.value = disciplinas.find(d => d.codigo === codigo)?.nome || codigo;
  if (suggestions) suggestions.classList.add('hidden');
  if (results) results.textContent = '1 resultado';

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

  input.addEventListener('input', e => filterMainSearch(e.target.value));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      clearMainSearch();
      suggestions.classList.add('hidden');
    }
  });

  clearButton?.addEventListener('click', clearMainSearch);
  searchButton?.addEventListener('click', () => input.focus());

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

// ----------------------------------------------------
// SETTINGS MODAL SUPPORT
// ----------------------------------------------------
function initSettings() {
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const storedTheme = localStorage.getItem('theme');

  // Sem preferência manual, a página acompanha o tema do navegador/SO.
  if (storedTheme === 'dark' || storedTheme === 'light') {
    setTheme(storedTheme === 'dark');
  } else {
    setTheme(Boolean(media?.matches), false);
  }

  // Se o usuário estiver usando o tema automático (sem escolha manual),
  // acompanha alterações posteriores do tema do navegador.
  media?.addEventListener?.('change', event => {
    if (!localStorage.getItem('theme')) setTheme(event.matches, false);
  });
}

// ----------------------------------------------------
// CORE INIT
// ----------------------------------------------------
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
