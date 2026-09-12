if (typeof disciplinas !== 'undefined') {
  const qf1 = disciplinas.find(d => d.nome.includes('Química Farmacêutica e Medicinal I'));
  if (qf1) {
    if (!qf1.co) qf1.co = 'MACF';
    else if (!qf1.co.includes('MACF')) qf1.co += ', MACF';
  }
}

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
  cardEl.classList.remove('status-default', 'status-passed', 'status-eligible', 'status-blocked');
  cardEl.classList.add(
    status === 'passed' ? 'status-passed'
      : status === 'eligible' ? 'status-eligible'
      : status === 'blocked' ? 'status-blocked'
      : 'status-default'
  );
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
  if (event) event.stopPropagation();
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

function showToastCustom(msg, highlight) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  
  msgEl.innerHTML = `${msg.replace(highlight, `<span class="text-yellow-600 dark:text-yellow-500 font-black px-1 tracking-wider bg-black/10 dark:bg-black/30 rounded">${highlight}</span>`)}`;
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
  if (p === PERIODO_COND && !confirm('Tem certeza que deseja marcar todas de Escolha Condicionada?')) return;
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

// Criação dos Cards com as novas fontes para evitar vazamento visual
function createSubjectCardHTML(mat) {
  const checked = getConcludedCodes().includes(mat.codigo) ? 'checked' : '';
  let coreqBtn = '';
  if (mat.co) {
    coreqBtn = `<button class="coreq-button ml-2" type="button" onclick="openModal('modal-coreq'); event.preventDefault(); event.stopPropagation();" title="Correquisito">C</button>`;
  }
  
  return `
  <label class="subject-card block p-3 rounded-xl cursor-pointer relative mb-2 select-none"
         data-codigo="${mat.codigo}" data-periodo="${mat.periodo}" 
         onmousedown="startLongPress('${mat.codigo}')" 
         onmouseup="cancelLongPress()" 
         onmouseleave="cancelLongPress()"
         ontouchstart="startLongPress('${mat.codigo}')" 
         ontouchend="cancelLongPress()" 
         ontouchcancel="cancelLongPress()">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap">
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${formatName(mat)}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="text-[0.80rem] md:text-sm font-semibold text-yellowTheme-600 dark:text-yellowTheme-400">${mat.codigo}</span>
            <button type="button" class="p-1 text-gray-400 hover:text-yellowTheme-600" onclick="copyCodeToClipboard('${mat.codigo}', event)" title="Copiar">
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
        <input type="checkbox" value="${mat.codigo}" data-periodo="${mat.periodo}" ${checked} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700">
      </div>
    </div>
  </label>`;
}

function showPeriodInfo(periodName, count, event) {
  event.stopPropagation();
  event.preventDefault();
  const title = document.getElementById('period-info-title');
  const desc = document.getElementById('period-info-desc');
  if(title) title.textContent = periodName;
  if(desc) desc.textContent = `Esse período contém ${count} matéria${count > 1 ? 's' : ''}.`;
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
    
    htmlContent += `
    <details class="group bg-gray-50 dark:bg-[#15171b] rounded-2xl border border-gray-200/60 dark:border-darkBorder/60 overflow-hidden">
      <summary class="flex items-center justify-between p-4 md:p-5 cursor-pointer font-bold text-gray-800 dark:text-gray-100 list-none select-none hover:bg-gray-100 dark:hover:bg-[#1a1c22] transition-colors rounded-t-2xl">
        <span class="text-base md:text-lg">${displayP}</span>
        <div class="flex items-center gap-2 md:gap-3">
          <button type="button" class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[0.65rem] md:text-xs font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm" onclick="showPeriodInfo('${displayP}', ${count}, event)">
            ${count} mat
          </button>
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
    cb.addEventListener('change', () => {
      persistCheckedState();
      updateDashboard();
      applySelectedVisualization(getConcludedCodes());
    });
  });
}

function checkReqs(reqsString, concluidas) {
  if (!reqsString) return true;
  const parsed = reqsString.replace(/[A-Z]{3}[A-Z0-9]{3}/g, match => concluidas.includes(match) ? "true" : "false")
                           .replace(/ OU /g, " || ").replace(/ E /g, " && ");
  try {
    return new Function(`return ${parsed}`)();
  } catch (e) {
    return false;
  }
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
      doc.text(`- ${m.nome} (${m.codigo})`, 14, y);
      y += 7;
    }
  });
  
  doc.save('Grade_Farmacia_UFRJ.pdf');
}

// Inicialização Principal
document.addEventListener('DOMContentLoaded', () => {
  renderAccordions();
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
});
