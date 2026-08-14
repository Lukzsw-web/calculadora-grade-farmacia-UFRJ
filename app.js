const cifAjustes = {"FFW361":" (Agentes infecciosos)","FFW362":" (Imunologia)","FFW471":" (Cardio / Renal)","FFW472":" (Endócrino)","FFW481":" (Neurologia)","FFW591":" (Parasitologia)","FFW502":" (Oncologia)"};
const disciplinas = [...disciplinas_obrigatorias, ...disciplinas_condicionadas];

const STORAGE_KEYS = { checked: 'farma_checked_v5', theme: 'theme' };
const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

let totalObrig = 0, totalCond = 0;
disciplinas.forEach(d => { periodIsCond(d.periodo) ? totalCond++ : totalObrig++; });

const html = document.documentElement;
const normalizeStr = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch { return fb; } };
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
function formatName(mat) { return mat.nome + (cifAjustes[mat.codigo] || ''); }
function displayPeriod(mat) { return mat.periodo === PERIODO_COND ? PERIODO_COND : `${mat.periodo}º Período`; }
function extractCodes(str) { return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}/g) || []) : []; }
function periodIsCond(periodo) { return periodo === PERIODO_COND; }
function creditsOf(mat) { return mat.cred || 4; }
function hoursOf(mat) { return mat.ch || creditsOf(mat) * 15; }

function expandSearchAliases(rawText) {
  let r = String(rawText || '').toLowerCase();
  const replacements = [
    [/\borgexp\b/g, 'organica experimental'],
    [/\bf1\b/g, 'farmacocinetica e farmacodinamica'],
    [/\bexp\b/g, 'experimental'],
    [/\bcif\s*(1|i)\b/g, 'cuidado integrado em farmacia i'],
    [/\bcif\s*(2|ii)\b/g, 'cuidado integrado em farmacia ii'],
    [/\bcif\s*(3|iii)\b/g, 'cuidado integrado em farmacia iii'],
    [/\bcif\b/g, 'cuidado integrado em farmacia'],
    [/\bpcq\s*(1|i)\b/g, 'producao e controle de qualidade de produtos farmaceuticos i'],
    [/\bpcq\b/g, 'producao e controle de qualidade'],
    [/\bbqm\b/g, 'bioquimica'],
    [/\bqfm\b/g, 'quimica farmaceutica']
  ];
  for (const [pattern, rep] of replacements) r = r.replace(pattern, rep);
  return normalizeStr(r);
}

function getConcludedCodes() { return Array.from(document.querySelectorAll('input.grade-checkbox:checked')).map(cb => cb.value); }

function persistCheckedState() {
  saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  document.getElementById('save-status').classList.remove('opacity-0');
  setTimeout(() => document.getElementById('save-status').classList.add('opacity-0'), 1600);
}

function restoreCheckedState() {
  const set = new Set(loadJSON(STORAGE_KEYS.checked, []));
  document.querySelectorAll('input.grade-checkbox').forEach(cb => cb.checked = set.has(cb.value));
}

function applyCardStatus(cardEl, status) {
  cardEl.className = 'subject-card flex items-center p-4 mb-2 rounded-lg cursor-pointer hover:bg-yellow-50 dark:hover:bg-gray-800 transition-colors grade-card';
  if (status === 'passed') cardEl.classList.add('status-passed');
  else if (status === 'eligible') cardEl.classList.add('status-eligible');
  else if (status === 'blocked') cardEl.classList.add('status-blocked');
  else cardEl.classList.add('status-default');
}

function isApta(mat, concluidas) {
  const pre = extractCodes(mat.pre);
  const co = extractCodes(mat.co);
  if (!pre.every(p => concluidas.includes(p))) return false;
  if (!co.every(c => concluidas.includes(c) || co.includes(c))) return false;
  return true;
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0, condCred = 0, condHoras = 0;
  const concluidas = getConcludedCodes();

  concluidas.forEach(c => {
    const m = disciplinas.find(d => d.codigo === c);
    if (!m) return;
    tCred += creditsOf(m);
    tHr += hoursOf(m);
    if (periodIsCond(m.periodo)) {
      dCond++; condCred += creditsOf(m); condHoras += hoursOf(m);
    } else {
      dObrig++; obrigCredFeitos += creditsOf(m);
    }
  });

  document.getElementById('count-obrig-feitas').textContent = dObrig;
  document.getElementById('count-obrig-faltam').textContent = Math.max(0, totalObrig - dObrig);
  document.getElementById('percent-obrig').textContent = totalObrig ? Math.round((dObrig / totalObrig) * 100) + '%' : '0%';
  document.getElementById('bar-obrig').style.width = Math.min(100, (dObrig / totalObrig) * 100) + '%';
  document.getElementById('count-cond-feitas').textContent = dCond;

  const pCond = Math.min(100, Math.min((condCred / META_COND_CRED) * 100, (condHoras / META_COND_HORAS) * 100));
  document.getElementById('bar-cond').style.width = pCond + '%';
  document.getElementById('text-cond-progress').textContent = `${condCred} créd. • ${condHoras}h`;

  document.getElementById('count-total-feitas').textContent = dObrig;
  document.getElementById('count-total').textContent = totalObrig;
  document.getElementById('total-creditos').textContent = tCred;
  document.getElementById('total-horas').textContent = tHr;

  const totalObrigCred = disciplinas_obrigatorias.reduce((acc, d) => acc + creditsOf(d), 0);
  const percentTotal = Math.min(100, Math.round(((obrigCredFeitos + Math.min(condCred, META_COND_CRED)) / (totalObrigCred + META_COND_CRED)) * 100));
  document.getElementById('percent-total').textContent = percentTotal + '%';

  // Atualizar UI dos cards
  document.querySelectorAll('.grade-card').forEach(card => {
    const input = card.querySelector('input');
    const m = disciplinas.find(d => d.codigo === input.value);
    if (input.checked) applyCardStatus(card, 'passed');
    else if (isApta(m, concluidas)) applyCardStatus(card, 'eligible');
    else applyCardStatus(card, 'blocked');
  });
}

// ----------------- RENDERIZAÇÃO DA GRADE PRINCIPAL -----------------
function renderGrade() {
  const container = document.getElementById('accordions-container');
  container.innerHTML = '';
  const periodos = [...new Set(disciplinas.map(d => d.periodo))].sort((a, b) => a === PERIODO_COND ? 1 : b === PERIODO_COND ? -1 : a - b);
  
  periodos.forEach(p => {
    const mats = disciplinas.filter(d => d.periodo === p);
    const details = document.createElement('details');
    details.className = 'mb-4 bg-white dark:bg-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-darkBorder overflow-hidden';
    details.innerHTML = `<summary class="p-4 font-bold text-lg text-yellowTheme-700 dark:text-yellowTheme-400 bg-gray-50 dark:bg-gray-800 flex justify-between items-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
      ${p === PERIODO_COND ? p : p + 'º Período'}
      <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
    </summary><div class="p-4 bg-white dark:bg-darkCard space-y-2"></div>`;
    
    const div = details.querySelector('div');
    mats.forEach(m => {
      const card = document.createElement('label');
      card.id = `card-${m.codigo}`;
      card.innerHTML = `<input type="checkbox" class="grade-checkbox w-5 h-5 mr-4 form-checkbox" value="${m.codigo}" data-periodo="${m.periodo}">
        <div class="flex-1"><div class="subject-name text-gray-800 dark:text-gray-200">${formatName(m)}</div><div class="subject-meta text-gray-500 dark:text-gray-400">${m.codigo} • ${creditsOf(m)} Créd.</div></div>`;
      
      card.querySelector('input').addEventListener('change', () => { persistCheckedState(); updateDashboard(); });
      
      // Long Press
      let timer;
      const start = () => { timer = setTimeout(() => abrirDetalhes(m.codigo), 600); };
      const cancel = () => clearTimeout(timer);
      card.addEventListener('mousedown', start); card.addEventListener('touchstart', start);
      card.addEventListener('mouseup', cancel); card.addEventListener('mouseleave', cancel); card.addEventListener('touchend', cancel);
      
      div.appendChild(card);
    });
    container.appendChild(details);
  });
  
  restoreCheckedState();
  updateDashboard();
}

// ----------------- BUSCA PRINCIPAL AVANÇADA -----------------
const searchInput = document.getElementById('search-input');
const clearSearch = document.getElementById('clear-search');
const suggestions = document.getElementById('search-suggestions');

searchInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  clearSearch.classList.toggle('hidden', val.length === 0);
  
  if (val.length < 2) { suggestions.classList.add('hidden'); return; }
  
  const searchFor = expandSearchAliases(val);
  const found = disciplinas.filter(d => normalizeStr(`${formatName(d)} ${d.codigo} ${d.periodo}`).includes(searchFor)).slice(0, 5);
  
  if (!found.length) { suggestions.classList.add('hidden'); return; }
  
  suggestions.innerHTML = found.map(d => `<button class="search-suggestion w-full" type="button" onclick="pesquisarDireto('${d.codigo}')">
    <div class="search-suggestion-icon bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 font-bold text-xs flex justify-center items-center rounded-full w-8 h-8">${d.codigo.substring(0,3)}</div>
    <div><div class="search-suggestion-name text-gray-800 dark:text-gray-200">${formatName(d)}</div><div class="search-suggestion-meta">${d.codigo} • ${displayPeriod(d)}</div></div>
  </button>`).join('');
  suggestions.classList.remove('hidden');
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch.classList.add('hidden');
  suggestions.classList.add('hidden');
  searchInput.focus();
});

function pesquisarDireto(codigo) {
  suggestions.classList.add('hidden');
  searchInput.value = '';
  clearSearch.classList.add('hidden');
  
  const card = document.getElementById(`card-${codigo}`);
  if (card) {
    card.closest('details').open = true;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('search-highlight');
    setTimeout(() => card.classList.remove('search-highlight'), 1500);
  }
}

// ----------------- MODAIS GERAIS -----------------
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); }));
function confirmarLimparSelecao() {
  if (confirm('Tem certeza que deseja desmarcar todas as disciplinas?')) {
    document.querySelectorAll('input.grade-checkbox').forEach(cb => cb.checked = false);
    persistCheckedState(); updateDashboard();
  }
}

function abrirDetalhes(codigo) {
  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m) return;
  document.getElementById('det-nome').innerText = formatName(m);
  document.getElementById('det-cod').innerText = m.codigo;
  document.getElementById('det-per').innerText = displayPeriod(m);
  document.getElementById('det-cred').innerText = creditsOf(m);
  document.getElementById('det-ch').innerText = `${hoursOf(m)} Horas`;
  
  const concluidas = getConcludedCodes();
  const resReq = (req) => req ? extractCodes(req).map(c => {
    const dm = disciplinas.find(x => x.codigo === c);
    const name = dm ? formatName(dm) : c;
    const color = concluidas.includes(c) ? 'text-green-500' : 'text-red-500';
    return `<span class="${color} font-bold block mb-1">${name}</span>`;
  }).join('') : 'Nenhum';
  
  document.getElementById('det-pre').innerHTML = resReq(m.pre);
  document.getElementById('det-co').innerHTML = resReq(m.co);
  openModal('modal-details');
}

// ----------------- PLANEJADOR DE GRADE & TRANCA -----------------
function getDisciplinasTrancadas(codigo) {
  let trancadas = new Set();
  let fila = [codigo];
  while(fila.length > 0) {
    let atual = fila.shift();
    disciplinas.forEach(d => {
      if (d.pre.includes(atual) || d.co.includes(atual)) {
        if (!trancadas.has(d.codigo)) { trancadas.add(d.codigo); fila.push(d.codigo); }
      }
    });
  }
  return Array.from(trancadas).map(c => disciplinas.find(d => d.codigo === c)).sort((a,b) => (a.periodo==='Escolha Condicionada'?99:parseInt(a.periodo)) - (b.periodo==='Escolha Condicionada'?99:parseInt(b.periodo)));
}

function abrirPlanejador() {
  const concluidas = getConcludedCodes();
  const lista = document.getElementById('lista-planejador');
  const inputSearch = document.getElementById('search-planejador');
  
  // Apenas obrigatórias não concluidas que podem ser puxadas
  const aptas = disciplinas_obrigatorias.filter(d => !concluidas.includes(d.codigo) && isApta(d, concluidas));
  
  const renderList = (filterText = '') => {
    const f = expandSearchAliases(filterText);
    const filtradas = aptas.filter(d => normalizeStr(`${formatName(d)} ${d.codigo}`).includes(f));
    
    lista.innerHTML = filtradas.map(d => {
      const trancadas = getDisciplinasTrancadas(d.codigo);
      return `<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-darkBorder select-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition" oncontextmenu="abrirTrancaDetails('${d.codigo}'); return false;" onmousedown="startTrancaPress('${d.codigo}')" ontouchstart="startTrancaPress('${d.codigo}')" onmouseup="clearTrancaPress()" onmouseleave="clearTrancaPress()" ontouchend="clearTrancaPress()">
        <div class="font-bold text-yellowTheme-700 dark:text-yellowTheme-400">${formatName(d)}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
          <span>${d.codigo} • ${displayPeriod(d)}</span>
          <span class="font-semibold text-red-500 dark:text-red-400">Tranca ${trancadas.length} disciplinas</span>
        </div>
      </div>`;
    }).join('');
  };
  
  inputSearch.value = '';
  inputSearch.oninput = (e) => renderList(e.target.value);
  renderList();
  openModal('modal-planejador');
}

let trancaTimer;
function startTrancaPress(codigo) { trancaTimer = setTimeout(() => abrirTrancaDetails(codigo), 500); }
function clearTrancaPress() { clearTimeout(trancaTimer); }

function abrirTrancaDetails(codigo) {
  clearTrancaPress();
  const m = disciplinas.find(d => d.codigo === codigo);
  const trancadas = getDisciplinasTrancadas(codigo);
  document.getElementById('tranca-nome').innerText = formatName(m);
  
  const htmlList = trancadas.length === 0 
    ? `<p class="text-gray-500 text-sm">Não tranca nenhuma disciplina.</p>` 
    : trancadas.map(t => `<div class="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded border border-red-100 dark:border-red-900/50">${formatName(t)} (${displayPeriod(t)})</div>`).join('');
    
  document.getElementById('tranca-lista').innerHTML = htmlList;
  openModal('modal-tranca-details');
}

// ----------------- TEMA E PDF -----------------
function toggleThemeFromSettings() {
  const isDark = html.classList.contains('dark');
  html.classList.toggle('dark', !isDark);
  html.classList.toggle('light', isDark);
  localStorage.theme = !isDark ? 'dark' : 'light';
  atualizarIconesTema();
}

function atualizarIconesTema() {
  const isDark = html.classList.contains('dark');
  document.getElementById('settings-theme-label').textContent = isDark ? 'Modo escuro' : 'Modo claro';
  document.getElementById('settings-theme-icon-sun').classList.toggle('hidden', isDark);
  document.getElementById('settings-theme-icon-moon').classList.toggle('hidden', !isDark);
  const thumb = document.getElementById('theme-toggle-thumb');
  if(thumb) thumb.style.transform = isDark ? 'translateX(1.25rem)' : 'translateX(0)';
}
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark'); html.classList.remove('light');
}
atualizarIconesTema();

// Fix de Geração de PDF via jsPDF (Mais confiável para web shares de arquivos/pdf originais quebrados)
async function compartilharGradePDF() {
  closeModal('modal-settings');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const dObrig = document.getElementById('count-obrig-feitas').textContent;
  const pct = document.getElementById('percent-total').textContent;
  const concluidas = getConcludedCodes();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Planejamento Acadêmico - Farmácia UFRJ", 15, 20);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Graduação Concluída: ${pct}`, 15, 30);
  doc.text(`Disciplinas Obrigatórias feitas: ${dObrig} de ${totalObrig}`, 15, 38);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Matérias Concluídas:", 15, 50);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let y = 60;
  concluidas.forEach(c => {
    if (y > 280) { doc.addPage(); y = 20; }
    const m = disciplinas.find(d => d.codigo === c);
    doc.text(`- ${formatName(m)} (${m.codigo})`, 15, y);
    y += 7;
  });

  const pdfBlob = doc.output('blob');
  
  if (navigator.share && navigator.canShare) {
    const file = new File([pdfBlob], 'Grade_Farmacia.pdf', { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Minha Grade - Farmácia',
          text: 'Veja meu progresso na graduação de Farmácia!'
        });
        return;
      } catch (e) { console.log('Share cancelado', e); }
    }
  }
  
  // Fallback se não puder compartilhar nativamente
  doc.save('Grade_Farmacia.pdf');
}

window.addEventListener('DOMContentLoaded', renderGrade);
