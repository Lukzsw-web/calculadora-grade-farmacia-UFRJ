const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  theme: 'theme'
};
const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

const TOTAL_OBRIG_CRED = disciplinas
  .filter(d => !periodIsCond(d.periodo))
  .reduce((sum, d) => sum + creditsOf(d), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;

let totalObrig = disciplinas.filter(d => !periodIsCond(d.periodo)).length;
let totalCond = disciplinas.filter(d => periodIsCond(d.periodo)).length;

const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;

function normalizeStr(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
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
    console.warn('Não foi possível salvar o estado local do aplicativo.', error);
  }
};

function formatName(mat) {
  return mat.nome + (cifAjustes[mat.codigo] || '');
}

function displayPeriod(mat) {
  return mat.periodo === PERIODO_COND ? PERIODO_COND : `${mat.periodo}º Período`;
}

function extractCodes(str) {
  return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}/g) || []) : [];
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

function buildSearchIndex(mat) {
  const normName = normalizeStr(formatName(mat));
  const normCode = normalizeStr(mat.codigo);
  const normPeriod = normalizeStr(displayPeriod(mat));
  const normRaw = normalizeStr(`${mat.periodo} periodo`);

  const aliases = [];
  if (normName.includes('fisicoquimica')) aliases.push('fisqui', 'fq');
  if (normName.includes('bioquimica')) aliases.push('bqm');
  if (normName.includes('cuidadointegrado')) aliases.push('cif');
  if (normName.includes('producaoecontrole')) aliases.push('pcq');
  if (normName.includes('quimicafarmaceutica')) aliases.push('qfm');
  if (normName.includes('organicaexperimental')) aliases.push('orgexp', 'qoe');
  if (normName.includes('farmacocinetica')) aliases.push('f1', 'farmaco');

  return [normName, normCode, normPeriod, normRaw, ...aliases].join(' ');
}

function expandSearchAliases(rawText) {
  let r = String(rawText || '').trim().toLowerCase();

  if (r === 'orgexp') return normalizeStr('Química Orgânica Experimental');
  if (r === 'f1') return normalizeStr('Farmacocinética e Farmacodinâmica');
  if (r === 'exp') return normalizeStr('Experimental');

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
    [/\bpcq\s*(7|vii)\b/g, 'producao e controle de qualidade de farmacia vii'],
    [/\bpcq\b/g, 'producao e controle de qualidade'],

    [/\bbqm\s*(1|i)\b/g, 'bioquimica i'],
    [/\bbqm\s*(2|ii)\b/g, 'bioquimica ii'],
    [/\bbqm\b/g, 'bioquimica'],

    [/\bqfm\s*(1|i)\b/g, 'quimica farmaceutica e medicinal i'],
    [/\bqfm\s*(2|ii)\b/g, 'quimica farmaceutica ii'],
    [/\bqfm\b/g, 'quimica farmaceutica'],

    [/\bfisqui\s*(1|i)\b/g, 'fisico-quimica i'],
    [/\bfisqui\s*(2|ii)\b/g, 'fisico-quimica ii'],
    [/\bfisqui\b/g, 'fisico-quimica']
  ];

  for (const [pattern, replacement] of replacements) {
    r = r.replace(pattern, replacement);
  }

  return normalizeStr(r);
}

function getConcludedCodes() {
  return Array.from(document.querySelectorAll('.subject-card input[type="checkbox"]:checked')).map(cb => cb.value);
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
  cardEl.className = 'subject-card flex items-center p-4 mb-2 rounded-lg cursor-pointer transition-colors no-select';
  if (status === 'passed') cardEl.classList.add('status-passed');
  else if (status === 'eligible') cardEl.classList.add('status-eligible');
  else if (status === 'blocked') cardEl.classList.add('status-blocked');
  else cardEl.classList.add('status-default');
}

function setTheme(isDark) {
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
  localStorage.theme = isDark ? 'dark' : 'light';
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

  document.getElementById('settings-theme-icon-sun')?.classList.toggle('hidden', isDark);
  document.getElementById('settings-theme-icon-moon')?.classList.toggle('hidden', !isDark);
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
  
  if (id === 'modal-planner') {
    document.getElementById('planner-search-input').value = '';
    filterPlannerSearch('');
  }
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

async function copyCodeToClipboard(texto, event) {
  if (event) event.stopPropagation();

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(texto);
    } else {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(ta);
      if (!copied) throw new Error('Falha ao copiar pelo método alternativo.');
    }
    showToast(texto);
  } catch (error) {
    console.warn('Não foi possível copiar o texto.', error);
    const msg = document.getElementById('toast-message');
    if (msg) msg.textContent = 'Não foi possível copiar.';
    const toast = document.getElementById('toast-copy');
    if (toast) {
      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      toast.classList.add('opacity-100', 'translate-y-0');
      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      }, 2500);
    }
  }
}

function showToast(texto) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  
  msgEl.innerHTML = `<span class="text-yellow-600 dark:text-yellow-500 font-black px-1 tracking-wider bg-black/10 dark:bg-black/30 rounded">${texto}</span> copiado com sucesso!`;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 2500);
}

function startLongPress(cod) {
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
    if (copyBtn) {
      copyBtn.onclick = (e) => copyCodeToClipboard(m.codigo, e);
    }

    openModal('modal-details');
  }, 600);
}

function cancelLongPress() {
  clearTimeout(timerLongPress);
  timerLongPress = null;
}

function marcarTudo(p) {
  if (p === PERIODO_COND) {
    if (!confirm('Tem certeza que deseja marcar todas de Escolha Condicionada?')) return;
  }
  document.querySelectorAll(`.subject-card input[data-periodo="${p}"]`).forEach(cb => cb.checked = true);
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function limparTudo(p) {
  document.querySelectorAll(`.subject-card input[data-periodo="${p}"]`).forEach(cb => cb.checked = false);
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

  document.getElementById('count-obrig-feitas-painel').textContent = dObrig;
  document.getElementById('count-obrig-total-painel').textContent = totalObrig;

  document.getElementById('count-obrig-feitas').textContent = dObrig;
  document.getElementById('count-obrig-faltam').textContent = Math.max(0, totalObrig - dObrig);

  const pObrig = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
  document.getElementById('percent-obrig').textContent = pObrig + '%';
  document.getElementById('bar-obrig').style.width = Math.min(100, pObrig) + '%';

  document.getElementById('count-cond-feitas').textContent = dCond;
  document.getElementById('count-cond-faltam').textContent = Math.max(0, totalCond - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  document.getElementById('text-cond-progress').textContent = `${condCred} créd. • ${condHoras}h`;

  const pCondCred = (condCred / META_COND_CRED) * 100;
  const pCondHoras = (condHoras / META_COND_HORAS) * 100;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  document.getElementById('bar-cond').style.width = pCond + '%';

  if (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) {
    document.getElementById('text-cond-meta').classList.add('hidden');
    document.getElementById('icon-cond-exclamation').classList.remove('hidden');
  } else {
    document.getElementById('text-cond-meta').classList.remove('hidden');
    document.getElementById('icon-cond-exclamation').classList.add('hidden');
  }

  const condProgress = Math.min(1, condCred / META_COND_CRED, condHoras / META_COND_HORAS);
  const creditosEquivalentes = obrigCredFeitos + (META_COND_CRED * condProgress);
  const percent = Math.min(100, Math.round((creditosEquivalentes / TOTAL_GRAD_CRED_EQUIV) * 100));
  
  document.getElementById('percent-total').textContent = `${percent}%`;
  document.getElementById('total-creditos').textContent = tCred;
  document.getElementById('total-horas').textContent = tHr;
}

async function compartilharGradePDF() {
  if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
    alert('Não foi possível carregar o gerador de PDF. Verifique sua conexão com a internet e tente novamente.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const concluidas = getConcludedCodes();
  doc.setFontSize(18);
  doc.text("Planejador Acadêmico - Farmácia UFRJ", 14, 20);

  doc.setFontSize(12);
  doc.text(`Disciplinas Concluídas: ${concluidas.length}`, 14, 30);
  
  let y = 40;
  disciplinas.forEach(m => {
    if (concluidas.includes(m.codigo)) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`[X] ${m.codigo} - ${formatName(m)} (${displayPeriod(m)})`, 14, y);
      y += 7;
    }
  });

  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], 'grade-academica.pdf', { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Minha Grade Acadêmica',
        text: 'Confira minhas disciplinas concluídas.'
      });
    } catch (e) {
      doc.save('grade-academica.pdf');
    }
  } else {
    doc.save('grade-academica.pdf');
  }
}

function setupSearchInputs(inputId, clearBtnId, suggestionsId, filterFn) {
  const input = document.getElementById(inputId);
  const clearBtn = document.getElementById(clearBtnId);
  if (!input || !clearBtn) return;

  const searchButton = inputId === 'search-input'
    ? document.getElementById('search-button')
    : document.getElementById('planner-search-button');
  if (searchButton) {
    searchButton.addEventListener('click', () => input.focus());
  }

  input.addEventListener('input', () => {
    if (input.value.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    filterFn(input.value);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    filterFn('');
    document.getElementById(suggestionsId)?.classList.add('hidden');
  });
}

function filterMainSearch(query) {
  const normalized = expandSearchAliases(query);
  
  document.querySelectorAll('.subject-card').forEach(card => {
    const visible = normalized === '' || card.dataset.search.includes(normalized);
    card.style.display = visible ? 'flex' : 'none';
  });

  const suggestionsBox = document.getElementById('search-suggestions');
  if (!query.trim()) {
    suggestionsBox.classList.add('hidden');
    return;
  }

  const matches = disciplinas.filter(m => buildSearchIndex(m).includes(normalized)).slice(0, 5);
  if (matches.length > 0) {
    suggestionsBox.innerHTML = matches.map(m => `
      <div class="search-suggestion" onclick="autoSearchMain('${m.codigo}')">
        <div class="search-suggestion-main">
          <div class="search-suggestion-name">${formatName(m)}</div>
          <div class="search-suggestion-meta">${m.codigo} • ${displayPeriod(m)}</div>
        </div>
      </div>
    `).join('');
    suggestionsBox.classList.remove('hidden');
  } else {
    suggestionsBox.classList.add('hidden');
  }
}

function autoSearchMain(codigo) {
  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m) return;
  
  const input = document.getElementById('search-input');
  input.value = formatName(m);
  document.getElementById('clear-search-button').classList.remove('hidden');
  filterMainSearch(formatName(m));
  document.getElementById('search-suggestions').classList.add('hidden');

  const card = document.getElementById(`card-${codigo}`);
  if (card) {
    const details = card.closest('details');
    if (details) details.open = true;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function filterPlannerSearch(query) {
  renderPlannerList(query);
  
  const normalized = expandSearchAliases(query);
  const suggestionsBox = document.getElementById('planner-search-suggestions');
  
  if (!query.trim()) {
    suggestionsBox.classList.add('hidden');
    return;
  }
  
  const concluidas = getConcludedCodes();
  const matches = disciplinas.filter(m => {
    if (concluidas.includes(m.codigo)) return false;
    return buildSearchIndex(m).includes(normalized);
  }).slice(0, 5);

  if (matches.length > 0) {
    suggestionsBox.innerHTML = matches.map(m => `
      <div class="search-suggestion" onclick="autoSearchPlanner('${m.codigo}')">
        <div class="search-suggestion-main">
          <div class="search-suggestion-name">${formatName(m)}</div>
          <div class="search-suggestion-meta">${m.codigo} • ${displayPeriod(m)}</div>
        </div>
      </div>
    `).join('');
    suggestionsBox.classList.remove('hidden');
  } else {
    suggestionsBox.classList.add('hidden');
  }
}

function autoSearchPlanner(codigo) {
  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m) return;
  const input = document.getElementById('planner-search-input');
  input.value = formatName(m);
  document.getElementById('planner-clear-search-button').classList.remove('hidden');
  filterPlannerSearch(formatName(m));
  document.getElementById('planner-search-suggestions').classList.add('hidden');
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

function showCoreqInfo(event, codigo) {
  event.stopPropagation();
  const m = disciplinas.find(d => d.codigo === codigo);
  if(!m || !m.co) return;

  const coNames = extractCodes(m.co).map(c => {
    const mat = disciplinas.find(d => d.codigo === c);
    const name = mat ? formatName(mat) : c;
    return `<span class="text-amber-600 dark:text-amber-400 font-bold">${name}</span>`;
  }).join(', ');

  document.getElementById('coreq-title').innerText = formatName(m);
  document.getElementById('coreq-desc').innerHTML = `Essa matéria possui ${coNames} como co-requisito, ou seja, devem ser cursadas simultaneamente no mesmo período.`;
  openModal('modal-coreq');
}

function togglePlannerCheck(event, codigo) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  const textDiv = document.getElementById(`planner-text-${codigo}`);
  const cardDiv = document.getElementById(`planner-card-${codigo}`);

  if (isChecked) {
      cardDiv?.classList.add('opacity-50', 'grayscale');
      textDiv?.classList.add('line-through');
      const globalCb = document.querySelector(`.subject-card input[type="checkbox"][value="${codigo}"]`);
      if (globalCb) globalCb.checked = true;
  } else {
      cardDiv?.classList.remove('opacity-50', 'grayscale');
      textDiv?.classList.remove('line-through');
      const globalCb = document.querySelector(`.subject-card input[type="checkbox"][value="${codigo}"]`);
      if (globalCb) globalCb.checked = false;
  }

  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function renderPlannerList(query = '') {
  const container = document.getElementById('planner-list');
  const concluidas = getConcludedCodes();
  const normalized = expandSearchAliases(query);

  const elegiveis = disciplinas.filter(m => {
    const preOK = extractCodes(m.pre).every(c => concluidas.includes(c));
    const coOK = extractCodes(m.co).every(c => concluidas.includes(c));
    const isApta = preOK && coOK;

    if (normalized) {
      return buildSearchIndex(m).includes(normalized);
    } else {
      return isApta && !concluidas.includes(m.codigo);
    }
  });

  if (!elegiveis.length) {
    container.innerHTML = `<p class="text-center text-gray-500 py-6 font-medium">Nenhuma disciplina encontrada.</p>`;
    return;
  }

  const obrigatorias = elegiveis.filter(m => !periodIsCond(m.periodo));
  const condicionadas = elegiveis.filter(m => periodIsCond(m.periodo));

  const renderItems = (items) => items.map(m => {
    const trancadas = getLockedSubjects(m.codigo);
    const isChecked = concluidas.includes(m.codigo);
    
    let coReqHtml = '';
    if (m.co) {
       coReqHtml = `<button type="button" onclick="showCoreqInfo(event, '${m.codigo}')" title="Ver Co-requisito" class="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 font-extrabold text-[11px] bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 transition-transform active:scale-95 shadow-sm ml-1.5 flex-shrink-0">C</button>`;
    }

    return `
      <div id="planner-card-${m.codigo}" class="p-3.5 bg-yellow-50 dark:bg-darkBg border border-yellowTheme-200 dark:border-darkBorder rounded-xl cursor-pointer hover:bg-yellow-100 dark:hover:bg-gray-800 transition no-select ${isChecked ? 'opacity-50 grayscale' : ''}"
           onmousedown="startHoldLocks(event, '${m.codigo}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()"
           ontouchstart="startHoldLocks(event, '${m.codigo}')" ontouchend="cancelLongPress()">
        
        <div class="flex items-start gap-3">
           <div class="pt-0.5" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
             <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="togglePlannerCheck(event, '${m.codigo}')" class="h-5 w-5 rounded border-gray-300 text-yellowTheme-600 focus:ring-yellowTheme-500 cursor-pointer shadow-sm">
           </div>
           
           <div class="flex-1 transition-all ${isChecked ? 'line-through' : ''}" id="planner-text-${m.codigo}">
             <div class="font-bold text-yellowTheme-800 dark:text-yellowTheme-300 flex items-center justify-between">
               <span class="flex items-center flex-wrap gap-1">${formatName(m)} ${coReqHtml}</span>
               <button type="button" onclick="copyCodeToClipboard('${m.codigo}', event)" title="Copiar código" class="p-1 text-gray-400 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md">
                 <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                   <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                 </svg>
               </button>
             </div>
             <div class="text-xs text-yellowTheme-600 dark:text-yellowTheme-400 mt-0.5"><span class="font-bold">${m.codigo}</span> • ${displayPeriod(m)}</div>
             <div class="text-xs font-semibold text-red-500 mt-1">Tranca ${trancadas.length} disciplina(s)</div>
           </div>
        </div>
      </div>`;
  }).join('');

  let finalHTML = '';

  if (obrigatorias.length > 0) {
    finalHTML += `
      <details class="group mb-3" open>
        <summary class="flex justify-between items-center font-bold cursor-pointer list-none p-4 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-darkBorder text-gray-800 dark:text-gray-100">
          Disciplinas Obrigatórias (${obrigatorias.length})
          <span class="accordion-chevron-icon inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300">
            <svg class="w-4 h-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </summary>
        <div class="pt-3 space-y-3 pb-1">
          ${renderItems(obrigatorias)}
        </div>
      </details>
    `;
  }

  if (condicionadas.length > 0) {
    finalHTML += `
      <details class="group mb-3">
        <summary class="flex justify-between items-center font-bold cursor-pointer list-none p-4 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-darkBorder text-gray-800 dark:text-gray-100">
          Escolha Condicionada (${condicionadas.length})
          <span class="accordion-chevron-icon inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300">
            <svg class="w-4 h-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </summary>
        <div class="pt-3 space-y-3 pb-1">
          ${renderItems(condicionadas)}
        </div>
      </details>
    `;
  }

  container.innerHTML = finalHTML;
}

function startHoldLocks(event, codigo) {
  if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
    return;
  }
  
  timerLongPress = setTimeout(() => {
    const m = disciplinas.find(d => d.codigo === codigo);
    if (!m) return;
    const trancadas = getLockedSubjects(codigo);

    document.getElementById('locks-title').innerText = formatName(m);
    const list = document.getElementById('locks-list');
    
    let desc = document.getElementById('locks-desc');
    if(!desc) {
      desc = document.createElement('p');
      desc.id = 'locks-desc';
      desc.className = 'text-xs font-medium text-gray-500 mb-4';
      document.getElementById('locks-title').after(desc);
    }

    if (!trancadas.length) {
      desc.innerText = "";
      list.innerHTML = `<p class="text-gray-500 text-center font-medium">Não tranca nenhuma disciplina.</p>`;
    } else {
      desc.innerText = "Essa matéria tranca as seguintes matérias:";
      list.innerHTML = trancadas.map(t => `
        <div class="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center">
          <span class="font-semibold text-gray-800 dark:text-gray-200 text-xs">${formatName(t)}</span>
          <span class="text-xs font-bold text-yellowTheme-600 dark:text-yellowTheme-400">(${displayPeriod(t)})</span>
        </div>
      `).join('');
    }
    openModal('modal-locks');
  }, 500);
}

function isApta(m, concluidas) {
  const pR = extractCodes(m.pre);
  const cR = extractCodes(m.co);
  return pR.every(r => concluidas.includes(r)) && cR.every(r => concluidas.includes(r));
}

function applySelectedVisualization(concluidas) {
  disciplinas.forEach(m => {
    const c = document.getElementById(`card-${m.codigo}`);
    if (c) applyCardStatus(c, concluidas.includes(m.codigo) ? 'passed' : (isApta(m, concluidas) ? 'eligible' : 'blocked'));
  });
}

function buildSections() {
  const periodosMap = {};
  disciplinas.forEach(d => {
    if (!periodosMap[d.periodo]) periodosMap[d.periodo] = [];
    periodosMap[d.periodo].push(d);
  });

  const periodosKeys = Object.keys(periodosMap).sort((a, b) => {
    if (a === PERIODO_COND) return 1;
    if (b === PERIODO_COND) return -1;
    return parseInt(a, 10) - parseInt(b, 10);
  });

  const container = document.getElementById('accordions-container');
  container.innerHTML = '';

  periodosKeys.forEach((periodo, index) => {
    let tituloRaw = periodo === PERIODO_COND ? periodo : `${periodo}º Período`;
    
    const tituloHtml = periodo === PERIODO_COND
      ? `<span class="flex items-center gap-2">${tituloRaw} <button onclick="event.preventDefault(); openModal('modal-cond-info')" class="text-yellowTheme-600 dark:text-yellowTheme-400 hover:scale-110 transition-transform"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg></button></span>`
      : `<span>${tituloRaw}</span>`;

    const div = document.createElement('div');
    div.className = 'mb-4 bg-white dark:bg-darkCard rounded-xl shadow-sm border border-gray-100 dark:border-darkBorder overflow-hidden';

    const materiasHtml = periodosMap[periodo].map(m => {
      let coreqButtonHtml = '';
      if (m.co) {
        coreqButtonHtml = `<button type="button" onclick="showCoreqInfo(event, '${m.codigo}')" title="Ver Co-requisito" class="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 font-extrabold text-[11px] bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 transition-transform active:scale-95 shadow-sm ml-1.5 flex-shrink-0">C</button>`;
      }

      return `
        <label id="card-${m.codigo}" data-periodo="${periodo}" data-search="${buildSearchIndex(m)}"
               class="subject-card status-default flex items-center p-4 mb-2 rounded-lg cursor-pointer no-select"
               onmousedown="startLongPress('${m.codigo}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()"
               ontouchstart="startLongPress('${m.codigo}')" ontouchend="cancelLongPress()">
          <input type="checkbox" class="form-checkbox h-5 w-5 text-yellowTheme-600 rounded mr-4 focus:ring-yellowTheme-500"
                 value="${m.codigo}" data-periodo="${periodo}"
                 onchange="persistCheckedState(); updateDashboard(); applySelectedVisualization(getConcludedCodes());">
          <div class="flex-1 min-w-0">
            <div class="subject-name text-gray-800 dark:text-gray-100 leading-tight mb-1 flex items-center flex-wrap gap-1">
              <span>${formatName(m)}</span>
              ${coreqButtonHtml}
            </div>
            <div class="subject-meta truncate flex items-center gap-1.5">
              <span class="font-extrabold">${m.codigo}</span>
              <button type="button" onclick="copyCodeToClipboard('${m.codigo}', event)" title="Copiar código" class="p-0.5 text-gray-500 dark:text-gray-300 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors inline-flex items-center bg-black/5 dark:bg-white/5 rounded">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              • ${creditsOf(m)} créd. • ${hoursOf(m)} Horas.
            </div>
          </div>
        </label>
      `;
    }).join('');

    div.innerHTML = `
      <details class="group" data-periodo="${periodo}" ${index === 0 ? 'open' : ''}>
        <summary class="flex justify-between items-center font-bold cursor-pointer list-none p-5 text-lg bg-yellow-50/50 dark:bg-darkBg hover:bg-yellow-100 dark:hover:bg-gray-800 transition-colors">
          ${tituloHtml}
          <span class="accordion-chevron-icon inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </summary>
        <div class="accordion-content p-5 border-t border-yellowTheme-100 dark:border-darkBorder">
          <div class="flex gap-2 mb-4">
            <button onclick="marcarTudo('${periodo}')" class="flex-1 bg-yellowTheme-100 dark:bg-yellowTheme-900/40 text-yellowTheme-700 dark:text-yellowTheme-300 py-2 rounded-lg text-sm font-bold hover:bg-yellowTheme-200 transition">Marcar Tudo</button>
            <button onclick="limparTudo('${periodo}')" class="flex-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 py-2 rounded-lg text-sm font-bold hover:bg-red-200 transition">Limpar Tudo</button>
          </div>
          ${materiasHtml}
        </div>
      </details>`;
    container.appendChild(div);
  });
}

document.addEventListener('click', (e) => {
  const searchWrapper = document.getElementById('search-wrapper');
  const plannerSearchWrapper = document.getElementById('planner-search-wrapper');
  
  if (searchWrapper && !searchWrapper.contains(e.target)) {
    document.getElementById('search-suggestions')?.classList.add('hidden');
  }
  if (plannerSearchWrapper && !plannerSearchWrapper.contains(e.target)) {
    document.getElementById('planner-search-suggestions')?.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  buildSections();
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());

  setupSearchInputs('search-input', 'clear-search-button', 'search-suggestions', filterMainSearch);
  setupSearchInputs('planner-search-input', 'planner-clear-search-button', 'planner-search-suggestions', filterPlannerSearch);
  
  updateThemeUI();
});
