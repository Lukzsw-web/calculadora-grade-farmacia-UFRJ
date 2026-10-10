
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
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar.', error);
    showStorageErrorToast('Não foi possível salvar suas alterações neste dispositivo.');
    return false;
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
  }

  return related;
}

function persistCheckedState() {
  const saved = saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  const el = document.getElementById('save-status');
  if (saved && el) {
    el.classList.remove('opacity-0');
    setTimeout(() => el.classList.add('opacity-0'), 1600);
  }
}

let pendingConfirmationAction = null;

function openConfirmationModal({ title, message, confirmText = 'Confirmar', destructive = false, onConfirm = null }) {
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const confirmBtn = document.getElementById('confirm-ok-btn');
  if (!titleEl || !messageEl || !confirmBtn) return;

  titleEl.textContent = title || 'Confirmar ação';
  messageEl.textContent = message || '';
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.toggle('bg-red-600', destructive);
  confirmBtn.classList.toggle('hover:bg-red-700', destructive);
  confirmBtn.classList.toggle('bg-yellowTheme-500', !destructive);
  confirmBtn.classList.toggle('hover:bg-yellowTheme-600', !destructive);

  pendingConfirmationAction = typeof onConfirm === 'function' ? onConfirm : null;
  confirmBtn.onclick = () => {
    const action = pendingConfirmationAction;
    pendingConfirmationAction = null;
    closeModal('modal-confirm');
    if (action) action();
  };

  openModal('modal-confirm');
}

function closeConfirmationModal() {
  pendingConfirmationAction = null;
  closeModal('modal-confirm');
}

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
  persistCheckedState();
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return "<span class='text-gray-500 font-normal'>Nenhum</span>";
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
  html.style.colorScheme = dark ? 'dark' : 'light';
  syncAccordionTheme(dark);

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Não foi possível salvar o tema.', error);
    }
  }

  const themeMeta = document.getElementById('theme-color-meta');
  if (themeMeta) themeMeta.content = dark ? '#0f1115' : '#ca8a04';
  updateThemeUI();

  // Consolida o novo estado antes de reativar animações/transições.
  void html.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => html.classList.remove('theme-switching'));
  });
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

const bottomTabIds = ['home-page', 'modal-planner', 'modal-contatos', 'modal-settings'];
const bottomTabNavIds = {
  'home-page': 'bottom-nav-home',
  'modal-planner': 'bottom-nav-planner',
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

function setBottomTrackPosition(activeIndex, dragX = 0, transition = false) {
  const width = Math.max(1, window.innerWidth);
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

  try { activePage.setPointerCapture?.(event.pointerId); } catch (_) {}
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
  }

  event.preventDefault();
  bottomSwipeJustDragged = true;
  updateBottomSwipe(dx);
}

document.addEventListener('pointerdown', handleBottomSwipeStart, { passive: true, capture: true });
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

function showStorageErrorToast(message) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4', 'bg-gray-900', 'dark:bg-gray-100');
  toast.classList.add('opacity-100', 'translate-y-0', 'bg-red-600', 'dark:bg-red-500', 'text-white');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0', 'bg-red-600', 'dark:bg-red-500');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4', 'bg-gray-900', 'dark:bg-gray-100');
  }, 3500);
}

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

  toast.classList.add('toast-coreq-mode');
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0', 'toast-coreq-mode');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 3500);
}

function showToastCustom(msg, highlight = '') {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  toast.classList.remove('toast-coreq-mode', 'bg-red-600', 'dark:bg-red-500', 'text-white');
  toast.classList.add('bg-gray-900', 'dark:bg-gray-100');

  if (highlight) {
    const safeMsg = escapeHTML(msg);
    const safeHighlight = escapeHTML(highlight);
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

function marcarTudo(p) {
  const run = () => {
    document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
      if (cb.dataset.periodo !== p) return;
      cb.checked = true;
      appState.concludedCodes.add(cb.value);
      synchronizeCorequisites(cb.value, true, false);
    });
    persistCheckedState();
    updateDashboard();
    applySelectedVisualization(appState.concludedCodes);
  };

  if (p === PERIODO_COND) {
    openConfirmationModal({
      title: 'Marcar todas as condicionadas?',
      message: 'Todas as disciplinas de Escolha Condicionada serão marcadas como cursadas.',
      confirmText: 'Marcar todas',
      onConfirm: run
    });
    return;
  }
  run();
}

function limparTudo(p) {
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    if (cb.dataset.periodo !== p) return;
    cb.checked = false;
    appState.concludedCodes.delete(cb.value);
    synchronizeCorequisites(cb.value, false, false);
  });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
}

function clearAllConcluded() {
  if (!appState.concludedCodes.size) return;

  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  appState.concludedCodes.clear();
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
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
  updateProgressAccessibility('bar-obrig', pObrig, `Progresso das disciplinas obrigatórias: ${pObrig}%`);

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
  updateProgressAccessibility('bar-cond', pCond, `Progresso das disciplinas de Escolha Condicionada: ${Math.round(pCond)}%`);

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
  passed: { label: 'Cursada', classes: 'text-blue-600 dark:text-blue-300', type: 'check' },
  eligible: { label: 'Disponível', classes: 'text-emerald-600 dark:text-emerald-300', type: 'unlocked' },
  blocked: { label: 'Bloqueada', classes: 'text-red-600 dark:text-red-300', type: 'locked' }
};

function subjectStatusIconHTML(status, extraClass = '') {
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  const body = '<rect class="lock-body" x="4" y="11" width="16" height="10" rx="2"></rect>';
  const shackle = '<path class="lock-shackle" d="M8 11V8a4 4 0 018 0v3"></path>';
  const openShackle = '<path class="lock-shackle lock-shackle-open" d="M8 11V8a4 4 0 018 0"></path>';
  const check = '<path d="M5 13l4 4L19 7"></path>';
  const iconMarkup = item.type === 'check' ? check : `${body}${item.type === 'unlocked' ? openShackle : shackle}`;
  return `<span class="subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes} ${extraClass}" data-status="${status}" data-icon-type="${item.type}" title="${item.label}" aria-label="${item.label}">
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</svg>
  </span>`;
}

function updateSubjectStatusIcon(card, status) {
  const icon = card.querySelector('.subject-status-icon');
  if (!icon) return;
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  icon.className = `subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes}`;
  icon.dataset.status = status;
  icon.title = item.label;
  icon.setAttribute('aria-label', item.label);

  const svg = icon.querySelector('svg');
  if (!svg) return;
  const currentType = icon.dataset.iconType || '';
  if (currentType === item.type) return;
  icon.dataset.iconType = item.type;

  const body = '<rect class="lock-body" x="4" y="11" width="16" height="10" rx="2"></rect>';
  const closed = '<path class="lock-shackle" d="M8 11V8a4 4 0 018 0v3"></path>';
  const open = '<path class="lock-shackle lock-shackle-open" d="M8 11V8a4 4 0 018 0"></path>';
  const check = '<path d="M5 13l4 4L19 7"></path>';
  svg.innerHTML = item.type === 'check' ? check : `${body}${item.type === 'unlocked' ? open : closed}`;
}

function createSubjectCardHTML(mat) {
  const checked = appState.concludedCodes.has(mat.codigo) ? 'checked' : '';
  const status = getSubjectStatus(mat);
  const safeCode = escapeHTML(mat.codigo);
  const safeName = escapeHTML(formatName(mat));
  const safePeriodo = escapeHTML(mat.periodo);
  const jsCode = escapeHTML(JSON.stringify(String(mat.codigo)));
  const coreqBtn = mat.co
    ? `<button class="coreq-button" type="button" onclick="showCoreqInfo(event, ${jsCode})" title="Ver co-requisito" aria-label="Ver co-requisito de ${safeName}">C</button>`
    : '';

  return `
  <div class="subject-card block p-3 rounded-xl relative mb-2 select-none"
       data-codigo="${safeCode}" data-periodo="${safePeriodo}"
       onpointerdown="startLongPress(${jsCode}, event)"
       onpointermove="handleLongPressMove(event)"
       onpointerup="cancelLongPress()"
       onpointercancel="cancelLongPress()"
       onpointerleave="cancelLongPress()">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML(status)}
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="text-[0.80rem] md:text-sm font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${safeCode}</span>
            <button type="button" class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600" onclick="copyCodeToClipboard(${jsCode}, event)" title="Copiar código" aria-label="Copiar código ${safeCode}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(creditsOf(mat))} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(hoursOf(mat))}h</span>
        </div>
      </div>
      <div class="flex items-center h-full pt-1">
        <input type="checkbox" value="${safeCode}" data-periodo="${safePeriodo}" ${checked} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="Marcar ${safeName}">
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
    const safeDisplayP = escapeHTML(displayP);
    const periodArg = escapeHTML(JSON.stringify(String(p)));
    
    const infoBtn = isCond ? `
      <button type="button" class="ml-2 text-blue-500 hover:text-blue-700 flex-shrink-0" onclick="showCondInfo(event)" title="Informações" aria-label="Informações sobre Escolha Condicionada">
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
            ${count} Matéria${count > 1 ? 's' : ''}
          </span>
          <svg class="accordion-chevron w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </summary>
      <div class="p-4 pt-2 space-y-2 accordion-content border-t border-gray-100 dark:border-darkBorder/50">
        <div class="flex gap-2 mb-3">
          <button type="button" class="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors" onclick="marcarTudo(${periodArg})">Marcar</button>
          <button type="button" class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onclick="limparTudo(${periodArg})">Limpar</button>
        </div>
        ${list.map(createSubjectCardHTML).join('')}
      </div>
    </details>`;
  });
  
  container.innerHTML = htmlContent;

  // Mantém um índice direto entre código e checkbox.
  // A seleção automática de co-requisitos usa esse mapa para marcar
  // a disciplina relacionada sem depender de buscas no DOM.
  checkboxesPorCodigo.clear();
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    checkboxesPorCodigo.set(cb.value, cb);
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

  setText('planner-period-label', `Próximo período`);
  setText('planner-period-number', `${nextPeriod}º`);
  setText('planner-selected-credits', selectedCredits);
  setText('planner-selected-hours', selectedHours);
  setText('planner-obrig-selected', selectedObrig.length);
  setText('planner-obrig-available', Math.max(0, obrig.length - selectedObrig.length));
  setText('planner-cond-selected', selectedCond.length);
  setText('planner-cond-available', Math.max(0, cond.length - selectedCond.length));

  const warnings = [];
  if (selectedCredits > 32) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-danger"><strong>Limite do SIGA:</strong> você selecionou ${selectedCredits} créditos. O SIGA não permite puxar mais de 32 créditos. Retire alguma disciplina.</div>`);
  } else if (selectedCredits < 6) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-attention"><strong>Carga mínima:</strong> você selecionou ${selectedCredits} créditos. O SIGA não permite puxar menos de 6 créditos. Marque mais alguma disciplina.</div>`);
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

function renderPlanner() {
  const containerObrig = document.getElementById('planner-obrig-container');
  const containerCond = document.getElementById('planner-cond-container');
  if (!containerObrig || !containerCond) return;

  const disponiveis = getPlannerAvailableSubjects();
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));

  if (obrig.length > 0) {
    containerObrig.innerHTML = obrig.map(m => createPlannerCard(m)).join('');
  } else {
    containerObrig.innerHTML = emptyStateHTML('Nenhuma obrigatória disponível para puxar.', 'Quando você concluir os pré-requisitos de uma matéria, ela aparecerá aqui.', 'planner');
  }

  if (cond.length > 0) {
    containerCond.innerHTML = cond.map(m => createPlannerCard(m)).join('');
  } else {
    containerCond.innerHTML = emptyStateHTML('Nenhuma condicionada disponível para puxar.', 'As condicionadas aparecem aqui assim que seus pré-requisitos forem cumpridos.', 'planner');
  }
  
  restorePlannerCheckedState();
  updatePlannerSummary(disponiveis);
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
  const jsCode = escapeHTML(JSON.stringify(String(mat.codigo)));
  const coreqBtn = mat.co
    ? `<button type="button" class="planner-coreq-button" onclick="showCoreqInfo(event, ${jsCode})" title="Ver co-requisito" aria-label="Ver co-requisito de ${safeName}">C</button>`
    : '';

  return `
  <div class="planner-card block p-3 rounded-xl relative mb-2 select-none bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder transition-all duration-200"
         data-codigo="${safeCode}"
         onpointerdown="startPlannerLongPress(${jsCode}, event)"
         onpointermove="handlePlannerLongPressMove(event)"
         onpointerup="cancelPlannerLongPress()"
         onpointercancel="cancelPlannerLongPress()"
         onpointerleave="cancelPlannerLongPress()">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML('eligible')}
          <span class="planner-subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
          <button type="button"
                  onclick="copyCodeToClipboard(${jsCode}, event)"
                  title="Copiar código"
                  aria-label="Copiar código ${safeCode}"
                  class="p-1 text-gray-400 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 0-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-[0.75rem] font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${safeCode}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(creditsOf(mat))} Créd.</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(hoursOf(mat))}h</span>
        </div>
      </div>
      <div class="flex items-center">
        <input type="checkbox" value="${safeCode}" ${appState.plannerCheckedCodes.has(mat.codigo) ? 'checked' : ''} onchange="togglePlannerCard(this)" class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="Selecionar ${safeName} para o planejamento">
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
      titleEl.textContent = `A matéria ${m.nome} não tranca nenhuma matéria!`;
      listEl.innerHTML = '';
    } else if (trancadas.length === 1) {
      titleEl.textContent = `A matéria ${m.nome} tranca a seguinte matéria:`;
      listEl.innerHTML = `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${escapeHTML(formatName(trancadas[0]))} (${escapeHTML(trancadas[0].codigo)})</li>`;
    } else {
      titleEl.textContent = `A matéria ${m.nome} tranca as seguintes matérias:`;
      listEl.innerHTML = trancadas.map(t => `<li class="mt-2 text-sm text-gray-600 dark:text-gray-300">- ${escapeHTML(formatName(t))} (${escapeHTML(t.codigo)})</li>`).join('');
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
      container.innerHTML = emptyStateHTML('Nenhum professor encontrado.', 'Tente outro nome ou parte do e-mail.', 'search');
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
  const safeGrupo = escapeHTML(nomeGrupo);
  const safeChefe = escapeHTML(chefe || '');
  const safeLocal = escapeHTML(local || '');
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
    const val = normalizeStr(input.value);
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
      suggestions.innerHTML = emptyStateHTML('Nenhum professor encontrado.', 'Tente outro nome ou parte do e-mail.', 'search');
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
  const value = normalizeStr([
    formatName(mat),
    mat.codigo,
    displayPeriod(mat),
    `${mat.periodo} periodo`
  ].join(' '));
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
  const q = normalizeStr(query);
  const t = normalizeStr(candidate);
  if (!q || !t) return 0;

  if (t === q) return 1200;
  if (t.startsWith(q)) return 1080 - Math.min(140, t.length - q.length);
  if (t.includes(q)) return 940 - Math.min(140, t.indexOf(q) * 4);

  // Compara também cada palavra. Isso melhora abreviações e pequenos erros
  // (“fisiolgia”, “farmaceutca”) sem deixar a busca permissiva demais.
  const qWords = q.split(/\\s+/).filter(Boolean);
  const tWords = t.split(/\\s+/).filter(Boolean);
  let wordBest = 0;
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
    wordBest += best;
  }
  const wordScore = qWords.length ? (wordBest / qWords.length) * 880 : 0;

  const subseq = subsequenceScore(q, t);
  const compact = q.replace(/\\s+/g, '');
  const compactTarget = t.replace(/\\s+/g, '');
  const compactSubseq = subsequenceScore(compact, compactTarget);

  // Abreviações naturais: “qf” → Química Farmacêutica, “bm” → Bases...
  const acronym = tWords.map(word => word[0]).join('');
  const acronymScore = acronym === compact ? 900 : acronym.startsWith(compact) && compact.length >= 2 ? 760 : 0;

  return Math.max(wordScore, subseq * 590, compactSubseq * 650, acronymScore);
}

function parseSearchIntent(rawQuery) {
  const raw = String(rawQuery || '').trim();
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
  if (match) {
    filters.periodo = Number(match[1]);
    text = text.replace(new RegExp(`\\b${match[1]}(?:\\s*(?:º|°|o))?\\s*per[ií]odo\\b`, 'i'), ' ');
    text = text.replace(new RegExp(`per[ií]odo\\s*${match[1]}\\b`, 'i'), ' ');
  } else if (filters.creditos === null && filters.horas === null) {
    // Um número isolado pode significar o período. Quando há texto junto,
    // preservamos o número para permitir buscas como “bio 2” ou “química 2”.
    const onlyNumber = normalized.match(/^(\d{1,2})$/);
    if (onlyNumber && Number(onlyNumber[1]) >= 1 && Number(onlyNumber[1]) <= 10) {
      filters.periodo = Number(onlyNumber[1]);
      text = '';
    }
  }

  // Créditos: "2 cred", "2 créditos", "2cr".
  match = normalized.match(/(\d+(?:[.,]\d+)?)cr(?:ed(?:ito)?s?)/);
  if (!match) match = normalized.match(/(\d+(?:[.,]\d+)?)creditos?/);
  if (match) {
    filters.creditos = Number(String(match[1]).replace(',', '.'));
    text = text.replace(new RegExp(`${match[1].replace('.', '[.,]')}\\s*(?:cr(?:é|e)?d(?:ito)?s?|créditos?)`, 'i'), ' ');
  }

  // Carga horária: "30h", "30 horas".
  match = normalized.match(/(\d+)h(?:oras)?/);
  if (!match) match = normalized.match(/(\d+)horas?/);
  if (match) {
    filters.horas = Number(match[1]);
    text = text.replace(new RegExp(`${match[1]}\\s*(?:h|horas?)`, 'i'), ' ');
  }

  const statusTerms = [
    { re: /(?:jacursadas?|concluidas?)/, value: 'cursada' },
    { re: /(?:puxaveis?|disponiveis?|livres?)/, value: 'disponivel' },
    { re: /(?:naopuxaveis?|bloqueadas?|trancadas?|indisponiveis?)/, value: 'bloqueada' }
  ];
  for (const term of statusTerms) {
    if (term.re.test(normalized)) {
      filters.status = term.value;
      text = text.replace(/(?:já\s*cursadas?|conclu[ií]das?|pux[aá]veis?|dispon[ií]veis?|livres?|n[aã]o\s*pux[aá]veis?|bloqueadas?|trancadas?|indispon[ií]veis?)/ig, ' ');
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
      const normalizedNameWords = normalizeStr(name).split(/\s+/).filter(Boolean);
      const acronym = normalizedNameWords.map(word => word[0]).join('');
      const compactName = normalizedNameWords.join('');
      const aliasTarget = expandSearchAliases(intent.text);
      const candidates = [
        name,
        mat.codigo,
        displayPeriod(mat),
        `${mat.periodo} periodo`,
        buildSearchIndex(mat),
        acronym,
        compactName,
        aliasTarget
      ];
      const termScores = q.split(/\s+/).filter(Boolean).map(term =>
        Math.max(...candidates.map(candidate => scoreSearchText(term, candidate)))
      );
      const score = Math.max(
        ...candidates.map(candidate => scoreSearchText(q, candidate)),
        scoreSearchText(intent.text, name),
        scoreSearchText(intent.text, mat.codigo),
        termScores.length ? termScores.reduce((sum, value) => sum + value, 0) / termScores.length : 0
      );

      return { mat, score, available, hasPre, status: getSubjectStatus(mat), intent };
    })
    .filter(Boolean)
    .filter(item => item.score >= (q.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'));
}

function searchStatusLabel(status) {
  return status === 'passed' ? 'Já cursada' : status === 'eligible' ? 'Puxável' : 'Não puxável';
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
  return `<button type="button" class="search-filter-chip" data-remove-search-filter="${key}" aria-label="Remover filtro ${escapeHTML(label)}">${escapeHTML(label)}<span aria-hidden="true">×</span></button>`;
}

function renderSearchIntentChips(intent) {
  const chips = [];
  if (intent.filters.periodo !== null) chips.push(searchFilterChipHTML('periodo', `${intent.filters.periodo}º período`));
  if (intent.filters.creditos !== null) chips.push(searchFilterChipHTML('creditos', `${intent.filters.creditos} créditos`));
  if (intent.filters.horas !== null) chips.push(searchFilterChipHTML('horas', `${intent.filters.horas}h`));
  if (intent.filters.status === 'cursada') chips.push(searchFilterChipHTML('status', 'Já cursada'));
  if (intent.filters.status === 'disponivel') chips.push(searchFilterChipHTML('status', 'Puxável'));
  if (intent.filters.status === 'bloqueada') chips.push(searchFilterChipHTML('status', 'Não puxável'));
  if (intent.filters.semPre) chips.push(searchFilterChipHTML('semPre', 'Sem pré-requisito'));
  if (intent.filters.condicionada) chips.push(searchFilterChipHTML('condicionada', 'Escolha condicionada'));
  return chips.length ? `<div class="search-filter-chips" aria-label="Filtros interpretados">${chips.join('')}</div>` : '';
}

function removeSearchFilter(raw, key) {
  let text = String(raw || '');
  if (key === 'periodo') text = text.replace(/\b\d{1,2}(?:\s*(?:º|°|o))?\s*per[ií]odo\b/ig, ' ').replace(/\bper[ií]odo\s*\d{1,2}\b/ig, ' ').replace(/\b\d{1,2}\s*$/, ' ');
  if (key === 'creditos') text = text.replace(/\b\d+(?:[.,]\d+)?\s*(?:cr(?:é|e)?d(?:ito)?s?|créditos?)\b/ig, ' ');
  if (key === 'horas') text = text.replace(/\b\d+\s*(?:h|horas?)\b/ig, ' ');
  if (key === 'status') text = text.replace(/\b(?:já\s*cursadas?|conclu[ií]das?|pux[aá]veis?|dispon[ií]veis?|livres?|n[aã]o\s*pux[aá]veis?|bloqueadas?|trancadas?|indispon[ií]veis?)\b/ig, ' ');
  if (key === 'semPre') text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)\b/ig, ' ');
  if (key === 'condicionada') text = text.replace(/escolha\s*condicionada|condicionadas?/ig, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function renderSearchDiscoveryPanel() {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('planejador-search-history') || '[]'); } catch (_) { recent = []; }
  recent = Array.isArray(recent) ? recent.filter(code => getDisciplinaByCode(code)).slice(0, 5) : [];
  const recentHTML = recent.length ? `
    <section class="search-discovery-section">
      <div class="search-discovery-heading">Pesquisas recentes</div>
      <div class="search-recent-list">${recent.map(code => {
        const mat = getDisciplinaByCode(code);
        return `<button type="button" class="search-recent-item" data-search-code="${escapeHTML(code)}"><span class="search-recent-icon">↗</span><span class="min-w-0"><strong>${escapeHTML(formatName(mat))}</strong><small>${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))}</small></span></button>`;
      }).join('')}</div>
    </section>` : '';
  suggestions.innerHTML = `<div class="search-discovery">${recentHTML}<div class="search-discovery-hint">Digite o nome, código, período, créditos, horas ou um status.</div></div>`;
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
  results.textContent = `${ranked.length} ${ranked.length === 1 ? 'resultado' : 'resultados'}${filterOnly ? ' com esse filtro' : ''}`;

  if (!ranked.length) {
    suggestions.innerHTML = `${renderSearchIntentChips(intent)}${emptyStateHTML('Nenhuma disciplina encontrada.', 'Tente outro nome, código, período, créditos ou um filtro como “disponíveis”.', 'search')}`;
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
          <div class="search-suggestion-meta">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))} • ${escapeHTML(creditsOf(mat))} créditos • ${escapeHTML(hoursOf(mat))}h</div>
        </div>
      </button>`;
  }).join('')}</div>`;
  suggestions.classList.remove('hidden');
}

function jumpToSubject(codigo) {
  try {
    const stored = JSON.parse(localStorage.getItem('planejador-search-history') || '[]');
    const recent = Array.isArray(stored) ? stored : [];
    localStorage.setItem('planejador-search-history', JSON.stringify([codigo, ...recent.filter(c => c !== codigo)].slice(0, 6)));
  } catch (_) {}

  const card = Array.from(document.querySelectorAll('#accordions-container .subject-card'))
    .find(item => item.dataset.codigo === codigo);
  if (!card) return;

  const selectedGroup = card.closest('details');
  document.querySelectorAll('#accordions-container > details').forEach(group => {
    group.hidden = false;
    if (group === selectedGroup) group.open = true;
  });
  document.querySelectorAll('#accordions-container .subject-card').forEach(item => {
    item.hidden = false;
    item.classList.remove('search-focus-target');
  });

  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  if (input) {
    input.value = getDisciplinaByCode(codigo)?.nome || codigo;
    const clearBtn = document.getElementById('clear-search-button');
    clearBtn?.classList.remove('hidden');
    clearBtn?.setAttribute('aria-hidden', 'false');
  }
  if (suggestions) suggestions.classList.add('hidden');
  if (results) results.textContent = 'Disciplina selecionada';

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  requestAnimationFrame(() => {
    const wrapperBottom = document.getElementById('search-wrapper')?.getBoundingClientRect().bottom ?? 0;
    const targetTop = Math.max(0, window.scrollY + card.getBoundingClientRect().top - Math.max(110, Math.min(160, wrapperBottom + 12)));
    window.scrollTo({ top: targetTop, behavior: reduced ? 'auto' : 'smooth' });
    card.classList.remove('search-focus-target');
    void card.offsetWidth;
    card.classList.add('search-focus-target');
    window.setTimeout(() => card.classList.remove('search-focus-target'), 2200);
  });
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
  normalizeBottomTabs(activeBottomTabId, true);
});
