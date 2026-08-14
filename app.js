// Combina as duas listas importadas globalmente
const disciplinas = [...disciplinasObrigatorias, ...disciplinasCondicionadas];

const STORAGE_KEYS = { checked: 'farma_checked_v4', theme: 'theme' };
const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;

let totalObrig = disciplinasObrigatorias.length;
let totalCond = disciplinasCondicionadas.length;

const html = document.documentElement;

// Lógica Visual Escuro/Claro (Ícones)
function updateThemeUI() {
  const isDark = html.classList.contains('dark');
  const thumb = document.getElementById('theme-toggle-thumb');
  if (thumb) thumb.style.transform = isDark ? 'translateX(1.25rem)' : 'translateX(0)';

  document.getElementById('settings-theme-label').textContent = isDark ? 'Modo escuro' :
'Modo claro';
  document.getElementById('settings-theme-icon-sun').classList.toggle('hidden', isDark);
  document.getElementById('settings-theme-icon-moon').classList.toggle('hidden', !isDark);
}

function toggleThemeFromSettings() {
  const isDark = !html.classList.contains('dark');
  isDark ? html.classList.add('dark') : html.classList.remove('dark');
  html.classList.remove(isDark ? 'light' : 'dark');
  localStorage.theme = isDark ? 'dark' : 'light';
  updateThemeUI();
}

if (localStorage.theme === 'dark' || (!('theme' in localStorage) &&
window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark');
}
updateThemeUI();

// Utilidades
const normalizeStr = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,
'').toLowerCase();
function getConcludedCodes() { return
Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb =>
cb.value); }
function creditsOf(mat) { return mat.cred || 4; }
function hoursOf(mat) { return mat.ch || creditsOf(mat) * 15; }
function extractCodes(str) { return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}/g) || []) : []; }
function periodIsCond(periodo) { return periodo === PERIODO_COND; }
function isApta(m, concluidas) {
  const pR = extractCodes(m.pre);
  const cR = extractCodes(m.co);
  if (!pR.every(r => concluidas.includes(r))) return false;
  return cR.every(r => concluidas.includes(r));
}

// ----------------------------------------------------
// PESQUISA E ATALHOS
// ----------------------------------------------------
function expandSearchAliases(rawText) {
  let r = String(rawText || '').toLowerCase();
  const replacements = [
    [/\borgexp\b/g, 'quimica organica experimental'],
    [/\bf1\b/g, 'farmacocinetica e farmacodinamica'],
    [/\bexp\b/g, 'experimental'],
    [/\bbqm\s*(1|i)\b/g, 'bioquimica i']
    // adicione mais aliases aqui se necessário
  ];
  for (const [pattern, replacement] of replacements) {
    r = r.replace(pattern, replacement);
  }
  return normalizeStr(r);
}

function renderSearchSuggestions(rawValue) {
 const box = document.getElementById('search-suggestions');
 const raw = String(rawValue || '').trim();
 if (!raw) {
   box.classList.add('hidden');
   return;
 }

 const query = expandSearchAliases(raw);
 const matches = disciplinas.filter(m => normalizeStr(m.nome).includes(query) ||
normalizeStr(m.codigo).includes(query)).slice(0, 5);

 if (!matches.length) {
   box.classList.add('hidden');
   return;
 }

 box.innerHTML = matches.map(m => `   <div class="search-suggestion" onclick="useSearchSuggestion('${m.nome}')">    <div class="font-bold text-sm">${m.nome}</div>    <div class="text-xs opacity-80">${m.codigo}</div>   </div>     `).join('');
    box.classList.remove('hidden');
}

function useSearchSuggestion(nome) {
  const input = document.getElementById('search-input');
  input.value = nome;
  document.getElementById('search-suggestions').classList.add('hidden');
  document.getElementById('clear-search').classList.remove('hidden');
  filterSubjects(nome);
}

// Comportamento da barra principal
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');

searchInput.addEventListener('input', e => {
  const val = e.target.value;
  clearSearchBtn.classList.toggle('hidden', val.length === 0);
  renderSearchSuggestions(val);
  filterSubjects(val);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  document.getElementById('search-suggestions').classList.add('hidden');
  filterSubjects('');
});

function filterSubjects(raw) {
 const normalized = expandSearchAliases(raw);
 let count = 0;
 document.querySelectorAll('.subject-card').forEach(card => {
   const visible = normalized === '' || card.dataset.search.includes(normalized);
   card.style.display = visible ? 'flex' : 'none';
   if(visible) count++;
 });

    // Abre o accordion se estiver buscando algo específico
    if(normalized.length > 2) {
      document.querySelectorAll('details[data-periodo]').forEach(d => d.open = true);
    }
}

// ----------------------------------------------------
// DASHBOARD // ----------------------------------------------------
function updateDashboard() {
    let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, condCred = 0;

    document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
     const m = disciplinas.find(d => d.codigo === c.value);
     if (!m) return;
     tCred += creditsOf(m);
     tHr += hoursOf(m);

      if (periodIsCond(m.periodo)) {
        dCond++;
        condCred += creditsOf(m);
      } else {
        dObrig++;
      }
    });

    document.getElementById('count-total-feitas').textContent = dObrig;
    document.getElementById('count-total').textContent = totalObrig;

    const percent = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
    document.getElementById('percent-total').textContent = percent + '%';
    document.getElementById('percent-obrig').textContent = percent + '%';
    document.getElementById('bar-obrig').style.width = percent + '%';

    const percentCond = Math.min(100, (condCred / META_COND_CRED) * 100);
    document.getElementById('bar-cond').style.width = percentCond + '%';
    document.getElementById('text-cond-progress').textContent = `${condCred} créd.`;
}

// ----------------------------------------------------
// PLANEJADOR DE GRADE
// ----------------------------------------------------
function renderPlanejadorList(lista) {
  const container = document.getElementById('lista-planejador');
  if(!lista.length) {
    container.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhuma disciplina encontrada.</p>';
    return;
  }
  container.innerHTML = lista.map(m => `     <div class="p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-lg flex flex-col mb-2">       <span class="font-bold text-sm text-yellowTheme-700 dark:text-yellowTheme-300">${m.nome}</span>       <span class="text-xs text-gray-500 dark:text-gray-400">${m.codigo} • ${m.periodo}º Período • Tranca: ${disciplinasObrigatorias.filter(d => d.pre.includes(m.codigo)).length} matéria(s)</span>     </div>     `).join('');
}

function abrirPlanejador() {
  const concluidas = getConcludedCodes();
  // Mostra as matérias OBRIGATÓRIAS que posso puxar agora (aptas e não feitas)
  const disponiveis = disciplinasObrigatorias.filter(m => isApta(m, concluidas) &&
!concluidas.includes(m.codigo));

    document.getElementById('input-planejador').value = '';
    document.getElementById('clear-planejador').classList.add('hidden');
    renderPlanejadorList(disponiveis);
    openModal('modal-planejador');
}

const planInput = document.getElementById('input-planejador');
const clearPlanBtn = document.getElementById('clear-planejador');

planInput.addEventListener('input', e => {
 const val = e.target.value.trim();
 clearPlanBtn.classList.toggle('hidden', val.length === 0);

  if(val.length > 2) {
    const query = expandSearchAliases(val);
    const subj = disciplinasObrigatorias.find(d => normalizeStr(d.nome).includes(query) ||
normalizeStr(d.codigo).includes(query));
    if(subj) {
      // Puxa tudo que essa matéria tranca, ordenada por período
      const tranca = disciplinasObrigatorias.filter(m => m.pre.includes(subj.codigo)).sort((a,b) => a.periodo - b.periodo);
      renderPlanejadorList(tranca);
    } else {
      renderPlanejadorList([]); // não achou a matéria procurada
    }
  } else if (val.length === 0) {
    abrirPlanejador(); // volta pro estado default
  }
});

clearPlanBtn.addEventListener('click', () => {
  planInput.value = '';
  clearPlanBtn.classList.add('hidden');
  abrirPlanejador();
});

// ----------------------------------------------------
// PDF
// ----------------------------------------------------
function compartilharGradePDF() {
 const concluidas = getConcludedCodes();
 let txt = "Minha Grade de Farmácia - UFRJ\n\nDisciplinas Concluídas:\n";
 concluidas.forEach(cod => {
   const m = disciplinas.find(d => d.codigo === cod);
   if(m) txt += `- ${m.nome} (${m.periodo})\n`;
 });

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'minha_grade_farmacia.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  alert("O backup da sua grade foi baixado como texto (para garantir compatibilidade em todos os aparelhos).");
}

// ----------------------------------------------------
// INICIALIZAÇÃO DA INTERFACE
// ----------------------------------------------------
function buildSections() {
  const periodosMap = {};
  disciplinas.forEach(d => {
    if (!periodosMap[d.periodo]) periodosMap[d.periodo] = [];
    periodosMap[d.periodo].push(d);
  });

 const periodosKeys = Object.keys(periodosMap).sort((a, b) => {
   if (a === PERIODO_COND) return 1; if (b === PERIODO_COND) return -1;
   return parseInt(a) - parseInt(b);
 });

 const container = document.getElementById('accordions-container');
 container.innerHTML = '';

 periodosKeys.forEach(periodo => {
   const titulo = periodo === PERIODO_COND ? periodo : `${periodo}º Período`;
   const materiasHtml = periodosMap[periodo].map(m => `      <label id="card-${m.codigo}" data-search="${normalizeStr(m.nome + ' ' + m.codigo)}" class="subject-card status-default flex items-center p-4 mb-2 rounded-lg cursor-pointer">       <input type="checkbox" class="h-5 w-5 mr-4" value="${m.codigo}" onchange="atualizarGeral()">       <div class="flex-1 min-w-0">         <div class="font-bold text-sm truncate">${m.nome}</div>              <div class="text-xs opacity-80">${m.codigo} • ${creditsOf(m)} créd.</div>            </div>           </label>`).join('');

    container.innerHTML += `       <details class="mb-4 bg-white dark:bg-darkCard rounded-xl shadow-sm border border-yellowTheme-200 dark:border-darkBorder" data-periodo="${periodo}">        <summary class="p-5 font-bold hover:bg-yellow-50 dark:hover:bg-gray-800 transition">${titulo}</summary>        <div class="p-5 border-t border-yellowTheme-100 dark:border-darkBorder">${materiasHtml}</div>       </details>`;
  });
}

function atualizarGeral() {
 const codes = getConcludedCodes();
 localStorage.setItem(STORAGE_KEYS.checked, JSON.stringify(codes));

    disciplinas.forEach(m => {
      const c = document.getElementById(`card-${m.codigo}`);
      if (!c) return;
      c.className = 'subject-card flex items-center p-4 mb-2 rounded-lg cursor-pointer ';
      if(codes.includes(m.codigo)) c.classList.add('status-passed');
      else if(isApta(m, codes)) c.classList.add('status-eligible');
      else c.classList.add('status-blocked');
    });
    updateDashboard();
}

function confirmarLimparSelecao() {
  if (confirm('Tem certeza que deseja desmarcar todas as disciplinas?')) {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    atualizarGeral();
  }
}

// Modais globais
function openModal(id) {
  const el = document.getElementById(id);
  if(el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if(el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

// Init
buildSections();
const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.checked) || '[]');
document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked =
stored.includes(cb.value));
atualizarGeral();
