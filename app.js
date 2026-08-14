// Dados principais são carregados pelos arquivos dados_obrigatorias.js e dados_condicionadas.js.
const cifAjustes = {
  "FFW361":" (Agentes infecciosos)",
  "FFW362":" (Imunologia)",
  "FFW471":" (Cardio / Renal)",
  "FFW472":" (Endócrino)",
  "FFW481":" (Neurologia)",
  "FFW591":" (Parasitologia)",
  "FFW502":" (Oncologia)"
};

const disciplinas = [...disciplinasObrigatorias, ...disciplinasCondicionadas];

const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  notasCR: 'farma_notasCR_v4',
  theme: 'theme'
};
const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

const TOTAL_OBRIG_CRED = disciplinas
  .filter(d => !periodIsCond(d.periodo))
  .reduce((sum, d) => sum + creditsOf(d), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;

let totalObrig = 0;
let totalCond = 0;
disciplinas.forEach(d => {
  if (periodIsCond(d.periodo)) totalCond++;
  else totalObrig++;
});

const html = document.documentElement;
const settingsThemeLabel = document.getElementById('settings-theme-label');
const settingsThemeSun = document.getElementById('settings-theme-icon-sun');
const settingsThemeMoon = document.getElementById('settings-theme-icon-moon');

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
  localStorage.setItem(key, JSON.stringify(value));
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
  return normalizeStr([formatName(mat), mat.codigo, displayPeriod(mat), `${mat.periodo} periodo`].join(' '));
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
  return Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

let saveStatusTimer = null;

function showSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.classList.remove('opacity-0');
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => el.classList.add('opacity-0'), 1600);
}

function persistCheckedState() {
  saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  showSaveStatus();
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
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return "<span class='text-gray-500 font-normal'>Nenhum</span>";
  const incompleteColor = html.classList.contains('dark') ? '#d9bb7d' : '#ef4444';
  const completedColor = html.classList.contains('dark') ? '#4ade80' : '#16a34a';

  return extractCodes(reqStr).map(c => {
    const m = disciplinas.find(d => d.codigo === c);
    let label = m ? formatName(m) : c;
    if (m && !periodIsCond(m.periodo)) {
      label += ` (${displayPeriod(m)})`;
    }
    const color = concluidas.includes(c) ? completedColor : incompleteColor;
    return `<span style="color:${color}" class="font-bold block mb-1">${label}</span>`;
  }).join('');
}

function applyCardStatus(cardEl, status) {
  cardEl.className = 'subject-card flex items-center p-4 mb-2 rounded-lg cursor-pointer hover:bg-yellow-50 dark:hover:bg-gray-800 transition-colors';
  if (status === 'passed') {
    cardEl.classList.add('status-passed');
  } else if (status === 'eligible') {
    cardEl.classList.add('status-eligible');
  } else if (status === 'blocked') {
    cardEl.classList.add('status-blocked');
  } else {
    cardEl.classList.add('status-default');
  }
}

function setTheme(isDark, animate = true) {
  if (isDark) {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
  localStorage.theme = isDark ? 'dark' : 'light';
  updateThemeUI(animate);
}

function updateThemeUI(animate = false) {
  const isDark = html.classList.contains('dark');
  const thumb = document.getElementById('theme-toggle-thumb');
  
  if (thumb) {
    thumb.style.transform = isDark ? 'translateX(1.25rem)' : 'translateX(0)';
  }

  if (settingsThemeLabel) settingsThemeLabel.textContent = isDark ? 'Modo escuro' : 'Modo claro';
  settingsThemeSun?.classList.toggle('hidden', isDark);
  settingsThemeMoon?.classList.toggle('hidden', !isDark);
}

function toggleThemeFromSettings() {
  setTheme(!html.classList.contains('dark'), true);
}

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark');
  html.classList.remove('light');
} else {
  html.classList.remove('dark');
  html.classList.add('light');
}
updateThemeUI();

let notasCR = loadJSON(STORAGE_KEYS.notasCR, {});
let timerLongPress = null;

function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) closeModal(o.id);
  });
});

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
    openModal('modal-details');
  }, 600);
}

function cancelLongPress() {
  clearTimeout(timerLongPress);
}

function marcarTudo(p) {
  if (p === PERIODO_COND) {
    const ok = confirm('Tem certeza que deseja marcar todas as disciplinas de Escolha Condicionada? Isso pode alterar bastante seus créditos e horas.');
    if (!ok) return;
  }
  document.querySelectorAll(`input[data-periodo="${p}"]`).forEach(cb => cb.checked = true);
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function limparTudo(p) {
  document.querySelectorAll(`input[data-periodo="${p}"]`).forEach(cb => cb.checked = false);
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(getConcludedCodes());
}

function getSelectedCondStats() {
  let condCred = 0;
  let condHoras = 0;
  let condCount = 0;

  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
    const m = disciplinas.find(d => d.codigo === c.value);
    if (!m) return;
    if (periodIsCond(m.periodo)) {
      condCount++;
      condCred += creditsOf(m);
      condHoras += hoursOf(m);
    }
  });

  return { condCred, condHoras, condCount };
}

function runDataIntegrityChecks() {
  const seen = new Set();
  const duplicateCodes = [];
  const missingReferences = [];
  const selfCorequisites = [];

  disciplinas.forEach(m => {
    if (seen.has(m.codigo)) duplicateCodes.push(m.codigo);
    seen.add(m.codigo);
    extractCodes(`${m.pre};${m.co}`).forEach(code => {
      if (!disciplinas.some(d => d.codigo === code)) missingReferences.push(`${m.codigo} -> ${code}`);
    });
    if (extractCodes(m.co).includes(m.codigo)) selfCorequisites.push(m.codigo);
  });

  const issues = [];
  if (duplicateCodes.length) issues.push(`códigos duplicados: ${duplicateCodes.join(', ')}`);
  if (missingReferences.length) issues.push(`referências inexistentes: ${missingReferences.join(', ')}`);
  if (selfCorequisites.length) issues.push(`correquisitos iguais à própria disciplina: ${selfCorequisites.join(', ')}`);

  if (issues.length) {
    console.warn('[Grade Farma] Revisão dos dados encontrou pontos para conferir:', issues);
  } else {
    console.info('[Grade Farma] Revisão dos dados: nenhuma inconsistência estrutural encontrada.');
  }
  return { duplicateCodes, missingReferences, selfCorequisites };
}

function updateProgressSummary(feitas, obrigCredFeitos, condCred, condHoras) {
  const condProgress = Math.min(
    1,
    META_COND_CRED ? condCred / META_COND_CRED : 0,
    META_COND_HORAS ? condHoras / META_COND_HORAS : 0
  );
  const creditosEquivalentes = obrigCredFeitos + (META_COND_CRED * condProgress);
  const percent = TOTAL_GRAD_CRED_EQUIV
    ? Math.min(100, Math.round((creditosEquivalentes / TOTAL_GRAD_CRED_EQUIV) * 100))
    : 0;

  document.getElementById('count-total-feitas').textContent = feitas;
  document.getElementById('count-total').textContent = disciplinas.length;
  document.getElementById('percent-total').textContent = `${percent}%`;
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0;

  document.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
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

  const totalObrigAtual = totalObrig;
  const totalCondAtual = totalCond;

  document.getElementById('count-obrig-feitas').textContent = dObrig;
  document.getElementById('count-obrig-faltam').textContent = Math.max(0, totalObrigAtual - dObrig);

  const pObrig = totalObrigAtual ? Math.round((dObrig / totalObrigAtual) * 100) : 0;
  document.getElementById('percent-obrig').textContent = pObrig + '%';
  document.getElementById('bar-obrig').style.width = Math.min(100, pObrig) + '%';

  document.getElementById('count-cond-feitas').textContent = dCond;
  document.getElementById('count-cond-faltam').textContent = Math.max(0, totalCondAtual - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  document.getElementById('text-cond-progress').textContent = `${condCred} créd. • ${condHoras}h`;

  const pCondCred = META_COND_CRED ? (condCred / META_COND_CRED) * 100 : 0;
  const pCondHoras = META_COND_HORAS ? (condHoras / META_COND_HORAS) * 100 : 0;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  document.getElementById('bar-cond').style.width = pCond + '%';

  if (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) {
    document.getElementById('text-cond-meta').classList.add('hidden');
    document.getElementById('icon-cond-done').classList.remove('hidden');
  } else {
    document.getElementById('text-cond-meta').classList.remove('hidden');
    document.getElementById('icon-cond-done').classList.add('hidden');
  }

  updateProgressSummary(dObrig + dCond, obrigCredFeitos, condCred, condHoras);

  document.getElementById('total-creditos').textContent = tCred;
  document.getElementById('total-horas').textContent = tHr;
}

function pdfSafe(text) {
  const replacements = {
    '•': '-', '✓': 'X', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...',
  };

  return String(text ?? '')
    .replace(/[•✓–—“”‘’…]/g, ch => replacements[ch] || '-')
    .replace(/\u0000/g, '');
}

function pdfEscape(text) {
  return pdfSafe(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfLatin1Bytes(text) {
  const safe = pdfSafe(text);
  const bytes = new Uint8Array(safe.length);
  for (let i = 0; i < safe.length; i++) {
    const code = safe.charCodeAt(i);
    bytes[i] = code < 256 ? code : 63;
  }
  return bytes;
}

function pdfRgb(hex, fill = true) {
  const h = String(hex).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${fill ? 'rg' : 'RG'}`;
}

function pdfRect(x, y, w, h, options = {}) {
  const fill = options.fill;
  const stroke = options.stroke ?? '#d1d5db';
  const sw = options.sw ?? 0.8;
  const cmds = [];
  if (fill) cmds.push(pdfRgb(fill, true));
  if (stroke) cmds.push(pdfRgb(stroke, false), `${sw} w`);
  cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
  cmds.push(fill ? 'B' : 'S');
  return cmds.join('\n');
}

function pdfLine(x1, y1, x2, y2, color = '#d1d5db', width = 0.8) {
  return `${pdfRgb(color, false)}\n${width} w\n${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`;
}

function pdfText(x, y, text, size = 10, options = {}) {
  const font = options.bold ? 'F2' : 'F1';
  const align = options.align || 'left';
  const safe = pdfSafe(text);
  let tx = x;
  const estimated = safe.length * size * 0.48;
  if (align === 'center') tx = x - estimated / 2;
  if (align === 'right') tx = x - estimated;
  return `BT /${font} ${size.toFixed(2)} Tf ${tx.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(safe)}) Tj ET`;
}

function pdfFit(text, maxChars) {
  const safe = pdfSafe(text);
  if (safe.length <= maxChars) return safe;
  return `${safe.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function computeShareSummary() {
  const concluded = new Set(getConcludedCodes());
  let totalCredits = 0;
  let totalHours = 0;
  let obrigCredits = 0;
  const { condCred, condHoras } = getSelectedCondStats();

  disciplinas.forEach(m => {
    if (!concluded.has(m.codigo)) return;
    const credits = creditsOf(m);
    totalCredits += credits;
    totalHours += hoursOf(m);
    if (!periodIsCond(m.periodo)) obrigCredits += credits;
  });

  const condProgress = Math.min(
    1,
    META_COND_CRED ? condCred / META_COND_CRED : 0,
    META_COND_HORAS ? condHoras / META_COND_HORAS : 0
  );

  const equivalentCredits = obrigCredits + (META_COND_CRED * condProgress);
  const percent = TOTAL_GRAD_CRED_EQUIV
    ? Math.min(100, Math.round((equivalentCredits / TOTAL_GRAD_CRED_EQUIV) * 100))
    : 0;

  return { totalCredits, totalHours, obrigCredits, condCred, condHoras, percent, condProgress };
}

function buildGradePdfPages() {
  const summary = computeShareSummary();
  const selected = new Set(getConcludedCodes());
  const periodOrder = Array.from({ length: 10 }, (_, i) => String(i + 1)).concat([PERIODO_COND]);
  const groups = periodOrder.map(periodo => ({
    periodo,
    materias: disciplinas.filter(m => String(m.periodo) === String(periodo) && selected.has(m.codigo))
  }));

  const W = 595.28;
  const H = 841.89;
  const margin = 28;
  const leftW = 108;
  const rightW = W - margin * 2 - leftW;
  const pageBottom = 34;
  const pageTop = 34;
  const headerH = 120;
  const groupRowH = 28;
  const pages = [];
  let cmds = [];
  let y = H - pageTop;

  const addPageBase = () => {
    cmds.push(pdfRgb('#ffffff', true), `0 0 ${W.toFixed(2)} ${H.toFixed(2)} re f`);
    cmds.push(pdfText(margin, y, 'Grade Curricular da Farmacia UFRJ', 20, { bold: true }));
    cmds.push(pdfText(margin, y - 22, 'Resumo de disciplinas concluidas para compartilhar', 10.5));

    cmds.push(pdfRect(margin, y - 54, 160, 38, { fill: '#fffaf0', stroke: '#e7d4a5', sw: 0.8 }));
    cmds.push(pdfText(margin + 10, y - 31, `${summary.percent}% concluido`, 14, { bold: true }));

    cmds.push(pdfRect(margin + 170, y - 54, 170, 38, { fill: '#f8fbff', stroke: '#c8d9f4', sw: 0.8 }));
    cmds.push(pdfText(margin + 180, y - 31, `${summary.totalCredits} cred.`, 13, { bold: true }));
    cmds.push(pdfText(margin + 180, y - 42, `${summary.totalHours} h`, 8.6));

    cmds.push(pdfRect(margin + 350, y - 54, W - margin * 2 - 350, 38, { fill: '#f7fafc', stroke: '#d1d5db', sw: 0.8 }));
    cmds.push(pdfText(margin + 360, y - 31, `Escolha Cond.: ${summary.condCred} cred. / ${summary.condHoras} h`, 10.5, { bold: true }));
    cmds.push(pdfText(margin + 360, y - 42, `Meta: 12 cred. e 180 h`, 8.4));

    y -= headerH;
    cmds.push(pdfRect(margin, y, W - margin * 2, 22, { fill: '#f8fafc', stroke: '#cbd5e1', sw: 0.8 }));
    cmds.push(pdfText(margin + 8, y + 8, 'PERIODO', 8.8, { bold: true }));
    cmds.push(pdfText(margin + leftW + 8, y + 8, 'DISCIPLINAS CONCLUIDAS', 8.8, { bold: true }));
    y -= 22;
  };

  const finishPage = () => {
    cmds.push(pdfText(W / 2, pageBottom - 8, 'Calculadora de Grade - Farmacia UFRJ', 7.5, { align: 'center' }));
    pages.push(cmds.join('\n'));
  };

  const newPage = () => {
    cmds = [];
    y = H - pageTop;
    addPageBase();
  };

  newPage();

  for (const group of groups) {
    const rows = group.materias.length ? group.materias : [null];
    const groupH = rows.length * groupRowH;
    if (y - groupH < pageBottom + 10) {
      finishPage();
      newPage();
    }

    const groupTop = y;
    const groupBottom = y - groupH;
    cmds.push(pdfRect(margin, groupBottom, leftW, groupH, { fill: '#fffdf8', stroke: '#e5e7eb', sw: 0.7 }));
    cmds.push(pdfRect(margin + leftW, groupBottom, rightW, groupH, { fill: '#ffffff', stroke: '#e5e7eb', sw: 0.7 }));

    const label = group.periodo === PERIODO_COND ? 'Escolha Cond.' : `${group.periodo}º Periodo`;
    cmds.push(pdfText(margin + 10, groupTop - 16, label, 9.3, { bold: true }));

    let rowTop = groupTop;
    rows.forEach((m, index) => {
      const rowBottom = rowTop - groupRowH;
      if (index > 0) {
        cmds.push(pdfLine(margin + leftW, rowTop, W - margin, rowTop, '#edf2f7', 0.6));
      }

      if (m) {
        const boxX = margin + leftW + 8;
        const boxY = rowBottom + 8.5;
        cmds.push(pdfRect(boxX, boxY, 11, 11, { fill: '#16a34a', stroke: '#166534', sw: 0.7 }));
        cmds.push(pdfText(boxX + 5.5, boxY + 2.1, 'X', 6.7, { bold: true, align: 'center' }));

        const name = pdfFit(formatName(m), 66);
        const meta = `${m.codigo} - ${creditsOf(m)} cred. - ${hoursOf(m)} h`;
        cmds.push(pdfText(boxX + 17, rowTop - 11.3, name, 8.9, { bold: true }));
        cmds.push(pdfText(boxX + 17, rowTop - 20.8, meta, 7.4));
      } else {
        cmds.push(pdfText(margin + leftW + 12, rowTop - 16, 'Nenhuma disciplina concluida', 8.2));
      }

      rowTop = rowBottom;
    });

    y = groupBottom;
  }

  finishPage();
  return pages;
}

function makePdfBlob(pages) {
  const objects = [];
  const addObject = body => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject(null);
  const pagesId = addObject(null);
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pageIds = [];
  const contentIds = [];

  for (const page of pages) {
    const contentId = addObject(`<< /Length ${pdfLatin1Bytes(page).length} >>\nstream\n${page}\nendstream`);
    const pageId = addObject(null);
    contentIds.push(contentId);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  pageIds.forEach((pageId, idx) => {
    objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[idx]} 0 R >>`;
  });

  const header = '%PDF-1.4\n%âãÏÓ\n';
  const parts = [pdfLatin1Bytes(header)];
  const offsets = [0];
  let offset = parts[0].length;

  objects.forEach((obj, index) => {
    const chunk = `${index + 1} 0 obj\n${obj}\nendobj\n`;
    offsets.push(offset);
    const bytes = pdfLatin1Bytes(chunk);
    parts.push(bytes);
    offset += bytes.length;
  });

  const xrefOffset = offset;
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let i = 1; i < offsets.length; i++) {
    xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  const xrefBytes = pdfLatin1Bytes(xref.join(''));

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0) + xrefBytes.length;
  const output = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    output.set(part, pos);
    pos += part.length;
  }
  output.set(xrefBytes, pos);

  return new Blob([output], { type: 'application/pdf' });
}

async function compartilharGradePDF() {
  const settingsModal = document.getElementById('modal-settings');
  if (settingsModal?.classList.contains('active')) closeModal('modal-settings');

  const button = document.querySelector('.share-grade-button');
  const original = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.classList.add('opacity-70', 'cursor-not-allowed');
    button.innerHTML = '<span class="w-full text-center py-2 text-sm font-bold text-gray-500">Gerando PDF...</span>';
  }

  try {
    const pages = buildGradePdfPages();
    const blob = makePdfBlob(pages);
    const file = new File([blob], 'minha-grade-farmacia-ufrj.pdf', { type: 'application/pdf' });

    if (navigator.share) {
      await navigator.share({
        title: 'Minha grade - Farmácia UFRJ',
        text: 'Minha trajetória acadêmica na Farmácia UFRJ.',
        files: [file]
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      alert('Seu navegador não oferece compartilhamento direto. O PDF foi baixado no dispositivo.');
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('Erro ao gerar/compartilhar PDF:', err);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('opacity-70', 'cursor-not-allowed');
      button.innerHTML = original;
    }
  }
}

function abrirPeriodo(periodo) {
  document.querySelectorAll('details[data-periodo]').forEach(d => {
    d.open = String(d.dataset.periodo) === String(periodo);
  });
}

function normalizePeriodTerm(raw) {
  const trimmed = String(raw || '').trim().toLowerCase();
  if (/^(?:0?[1-9]|10)$/.test(trimmed)) return trimmed.replace(/^0/, '');
  return null;
}

function levenshteinDistance(a, b) {
  const aa = String(a || ''), bb = String(b || '');
  if (aa === bb) return 0;
  if (!aa.length) return bb.length;
  if (!bb.length) return aa.length;
  let prev = Array.from({ length: bb.length + 1 }, (_, i) => i);
  for (let i = 0; i < aa.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < bb.length; j++) {
      const cost = aa[i] === bb[j] ? 0 : 1;
      curr.push(Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost));
    }
    prev = curr;
  }
  return prev[bb.length];
}

function searchSimilarity(query, mat) {
  const q = expandSearchAliases(query);
  if (!q) return 0;

  const name = normalizeStr(formatName(mat));
  const code = normalizeStr(mat.codigo);
  const period = normalizeStr(displayPeriod(mat));
  const haystacks = [name, code, period];
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);

  let score = 0;
  if (name === q) score = Math.max(score, 1200);
  if (code === q) score = Math.max(score, 1200);
  if (name.startsWith(q)) score = Math.max(score, 1000 - Math.min(200, name.length - q.length));
  if (code.startsWith(q)) score = Math.max(score, 980 - Math.min(200, code.length - q.length));
  if (haystacks.some(v => v.includes(q))) score = Math.max(score, 850);

  const rawWords = String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  rawWords.forEach(token => {
    const compact = normalizeStr(token);
    if (!compact) return;
    words.forEach(word => {
      if (word.startsWith(compact)) score = Math.max(score, 800);
      const dist = levenshteinDistance(compact, word);
      const sim = 1 - dist / Math.max(compact.length, word.length, 1);
      if (sim >= .45) score = Math.max(score, 450 + sim * 300);
    });
  });

  const compactQ = normalizeStr(query);
  if (compactQ) {
    const bestWord = words.reduce((best, word) => Math.max(best, 1 - levenshteinDistance(compactQ, word) / Math.max(compactQ.length, word.length, 1)), 0);
    score = Math.max(score, bestWord * 600);
  }
  return score;
}

function getSearchSuggestions(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return [];

  return disciplinas
    .map(mat => ({ mat, score: searchSimilarity(raw, mat) }))
    .filter(item => item.score >= 260)
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'))
    .slice(0, 6)
    .map(item => item.mat);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[char]));
}

function renderSearchSuggestions(rawValue) {
  const box = document.getElementById('search-suggestions');
  if (!box) return;
  const raw = String(rawValue || '').trim();
  if (!raw) {
    box.innerHTML = '';
    box.classList.add('hidden');
    document.getElementById('search-wrapper')?.classList.remove('search-floating');
    return;
  }

  const suggestions = getSearchSuggestions(raw);
  if (!suggestions.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    document.getElementById('search-wrapper')?.classList.remove('search-floating');
    return;
  }

  const wrapper = document.getElementById('search-wrapper');
  wrapper?.classList.toggle('search-floating', suggestions.length > 1);
  box.innerHTML = suggestions.map(m => `
    <div class="search-suggestion" role="option" aria-label="${escapeHtml(formatName(m))}">
      <button class="search-suggestion-icon" type="button" title="Ir para ${escapeHtml(formatName(m))}" aria-label="Ir para ${escapeHtml(formatName(m))}" onclick="goToSearchResult('${m.codigo}', event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
      </button>
      <button class="search-suggestion-main" type="button" onclick="useSearchSuggestion('${m.codigo}', event)">
        <div class="search-suggestion-name">${escapeHtml(formatName(m))}</div>
        <div class="search-suggestion-meta">${escapeHtml(m.codigo)} • ${escapeHtml(displayPeriod(m))}</div>
      </button>
      <button class="search-suggestion-arrow" type="button" title="Usar esta sugestão" aria-label="Usar esta sugestão" onclick="useSearchSuggestion('${m.codigo}', event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"><path d="M19 19L5 5"></path><path d="M5 5h14"></path><path d="M5 5v14"></path></svg>
      </button>
    </div>
  `).join('');
  box.classList.remove('hidden');
}

function goToSearchResult(codigo, event) {
  event?.preventDefault();
  event?.stopPropagation();
  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m) return;

  const details = document.querySelector(`details[data-periodo="${CSS.escape(m.periodo)}"]`);
  if (details) details.open = true;
  const card = document.getElementById(`card-${codigo}`);
  if (!card) return;

  document.querySelectorAll('.search-highlight').forEach(el => el.classList.remove('search-highlight'));
  card.style.display = 'flex';
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('search-highlight');
  document.getElementById('search-suggestions')?.classList.add('hidden');
  document.getElementById('search-wrapper')?.classList.remove('search-floating');
  setTimeout(() => card.classList.remove('search-highlight'), 1200);
}

function useSearchSuggestion(codigo, event) {
  event?.preventDefault();
  event?.stopPropagation();
  const m = disciplinas.find(d => d.codigo === codigo);
  if (!m) return;
  const input = document.getElementById('search-input');
  input.value = formatName(m);
  renderSearchSuggestions(input.value);
  filterSubjects(input.value);
  input.focus();
}

function performSearch() {
  const input = document.getElementById('search-input');
  const suggestions = getSearchSuggestions(input.value);
  if (!suggestions.length) {
    filterSubjects(input.value);
    return;
  }
  goToSearchResult(suggestions[0].codigo, { preventDefault(){}, stopPropagation(){} });
}

function filterSubjects(rawValue) {
  const raw = String(rawValue || '').trim();
  const normalized = expandSearchAliases(raw);
  const periodMatch = normalizePeriodTerm(raw);
  if (periodMatch) abrirPeriodo(periodMatch);

  let visibleCount = 0;
  document.querySelectorAll('.subject-card').forEach(card => {
    const visible = normalized === '' || card.dataset.search.includes(normalized) || card.dataset.periodoSearch.includes(normalized);
    card.style.display = visible ? 'flex' : 'none';
    if (visible) visibleCount++;
  });

  const resultEl = document.getElementById('search-results');
  if (resultEl) {
    if (!raw) resultEl.textContent = '';
    else if (visibleCount === 0) resultEl.textContent = 'Nenhuma disciplina encontrada.';
    else resultEl.textContent = `${visibleCount} ${visibleCount === 1 ? 'disciplina encontrada' : 'disciplinas encontradas'}`;
  }
  renderSearchSuggestions(raw);
}

function salvarCR(cod, val, tipo) {
  if (!notasCR[cod]) notasCR[cod] = { nota: '', cred: 4 };
  notasCR[cod][tipo] = val !== '' ? parseFloat(val) : '';
  saveJSON(STORAGE_KEYS.notasCR, notasCR);
  updateDashboard();
}

function carregarModalCR() {
  const c = document.getElementById('cr-inputs');
  c.innerHTML = '';
  document.getElementById('cr-result').classList.add('hidden');

  const ch = document.querySelectorAll('input[type="checkbox"]:checked');
  if (!ch.length) {
    c.innerHTML = `<p class="text-center text-gray-500 font-bold mt-6">Nenhuma matéria marcada como concluída.</p>`;
    return;
  }

  ch.forEach(x => {
    const m = disciplinas.find(d => d.codigo === x.value);
    if (!m) return;
    const s = notasCR[x.value] || { nota: '', cred: creditsOf(m) };
    c.innerHTML += `
      <div class="flex justify-between items-center bg-yellow-50 dark:bg-darkBg p-3 rounded border border-yellowTheme-200 dark:border-darkBorder gap-2">
        <span class="text-sm font-bold truncate flex-1 text-yellowTheme-800 dark:text-yellowTheme-300 pr-2">${formatName(m)}</span>
        <input type="number" min="0" max="10" step="0.1" class="w-16 p-1 mr-2 border rounded text-center dark:bg-darkCard dark:text-white border-yellowTheme-300 focus:outline-none" value="${s.nota}" onchange="salvarCR('${x.value}',this.value,'nota')" placeholder="Nota">
        <input type="number" min="1" max="20" step="1" class="w-14 p-1 border rounded text-center dark:bg-darkCard dark:text-white border-yellowTheme-300 focus:outline-none" value="${s.cred}" onchange="salvarCR('${x.value}',this.value,'cred')" placeholder="Créd.">
      </div>`;
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
  const r = document.getElementById('cr-result');
  r.classList.remove('hidden');
  r.innerText = div === 0 ? 'Insira as notas corretamente.' : `Seu CR Calculado é: ${(tP / div).toFixed(2)}`;
}

function isApta(m, concluidas) {
  const pR = extractCodes(m.pre);
  const cR = extractCodes(m.co);

  if (!pR.every(r => concluidas.includes(r))) return false;
  return cR.every(r => concluidas.includes(r));
}

function applySelectedVisualization(concluidas) {
  disciplinas.forEach(m => {
    const c = document.getElementById(`card-${m.codigo}`);
    if (!c) return;
    applyCardStatus(c, concluidas.includes(m.codigo) ? 'passed' : (isApta(m, concluidas) ? 'eligible' : 'blocked'));
  });
}

function autoOpenPeriodoFromSearch(value) {
  const periodMatch = normalizePeriodTerm(value);
  if (!periodMatch) return;
  document.querySelectorAll('details[data-periodo]').forEach(d => {
    d.open = d.dataset.periodo === periodMatch;
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
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return na - nb;
  });

  const container = document.getElementById('accordions-container');
  container.innerHTML = '';

  periodosKeys.forEach((periodo, index) => {
    const titulo = periodo === PERIODO_COND ? periodo : `${periodo}º Período`;
    const periodSearch = normalizeStr(periodo === PERIODO_COND ? PERIODO_COND : `${periodo} período`);
    const iconHtml = periodo === PERIODO_COND
      ? `<svg onclick="event.preventDefault(); openModal('modal-cond-info');" class="w-5 h-5 ml-2 inline-block text-yellowTheme-600 dark:text-yellowTheme-400 hover:scale-125 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>`
      : '';

    const div = document.createElement('div');
    div.className = 'mb-4 bg-white dark:bg-darkCard rounded-xl shadow-sm border border-yellowTheme-200 dark:border-darkBorder overflow-hidden';

    const materiasHtml = periodosMap[periodo].map(m => {
      return `
        <label id="card-${m.codigo}"
               data-periodo="${periodo}"
               data-periodo-search="${periodSearch}"
               data-search="${buildSearchIndex(m)}"
               class="subject-card status-default flex items-center p-4 mb-2 rounded-lg cursor-pointer hover:bg-yellow-50 dark:hover:bg-gray-800"
               onmousedown="startLongPress('${m.codigo}')"
               onmouseup="cancelLongPress()"
               onmouseleave="cancelLongPress()"
               ontouchstart="startLongPress('${m.codigo}')"
               ontouchend="cancelLongPress()">
          <input type="checkbox"
                 class="form-checkbox h-5 w-5 text-yellowTheme-600 rounded mr-4 focus:ring-yellowTheme-500"
                 value="${m.codigo}"
                 data-periodo="${periodo}"
                 onchange="persistCheckedState(); updateDashboard(); applySelectedVisualization(getConcludedCodes());">
          <div class="flex-1 min-w-0">
            <div class="subject-name text-yellowTheme-800 dark:text-yellowTheme-300 leading-tight mb-1 truncate">${formatName(m)}</div>
            <div class="subject-meta text-yellowTheme-600/90 dark:text-yellowTheme-400/90 truncate"><span class="font-extrabold">${m.codigo}</span> • ${creditsOf(m)} créd. • ${hoursOf(m)} Horas.</div>
          </div>
        </label>`;
    }).join('');

    div.innerHTML = `
      <details class="group" data-periodo="${periodo}" ${index === 0 ? 'open' : ''}>
        <summary class="flex justify-between items-center font-bold cursor-pointer list-none p-5 text-lg bg-yellow-50/50 dark:bg-darkBg hover:bg-yellow-100 dark:hover:bg-gray-800 transition-colors">
          <span class="flex items-center">${titulo} ${iconHtml}</span>
          <span class="accordion-chevron">
            <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </summary>
        <div class="accordion-content p-5 border-t border-yellowTheme-100 dark:border-darkBorder">
          <div class="flex gap-2 mb-4">
            <button onclick="marcarTudo('${periodo}')" class="flex-1 bg-yellowTheme-100 dark:bg-yellowTheme-900/40 text-yellowTheme-700 dark:text-yellowTheme-300 py-2 rounded-lg text-sm font-bold hover:bg-yellowTheme-200 dark:hover:bg-yellowTheme-800/60 transition">Marcar Tudo</button>
            <button onclick="limparTudo('${periodo}')" class="flex-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 py-2 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-800/60 transition">Limpar Tudo</button>
          </div>
          ${materiasHtml}
        </div>
      </details>`;
    container.appendChild(div);
  });
}

document.getElementById('search-input').addEventListener('input', e => {
  autoOpenPeriodoFromSearch(e.target.value);
  filterSubjects(e.target.value);
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

document.getElementById('search-button').addEventListener('click', performSearch);

document.addEventListener('click', e => {
  const wrapper = document.getElementById('search-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('search-suggestions')?.classList.add('hidden');
  }
});

buildSections();
restoreCheckedState();
updateDashboard();
applySelectedVisualization(getConcludedCodes());
filterSubjects(document.getElementById('search-input').value);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => closeModal(modal.id));
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      if (registration.waiting) showUpdateToast(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(worker);
        });
      });
    } catch (err) {
      console.error('Falha ao registrar Service Worker:', err);
    }
  });
}

function showUpdateToast(worker) {
  const toast = document.getElementById('update-toast');
  const button = document.getElementById('update-now');
  if (!toast || !button) return;
  toast.classList.remove('hidden');
  button.onclick = () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
}

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  window.location.reload();
});

runDataIntegrityChecks();


// ----------------------------------------------------
// PLANEJADOR DE GRADE (preservado da versão atual)
// ----------------------------------------------------
function renderPlanejadorList(lista) {
  const container = document.getElementById('lista-planejador');
  if (!container) return;

  if (!lista.length) {
    container.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhuma disciplina encontrada.</p>';
    return;
  }

  container.innerHTML = lista.map(m => `
    <div class="p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-lg flex flex-col mb-2">
      <span class="font-bold text-sm text-yellowTheme-700 dark:text-yellowTheme-300">${escapeHtml(m.nome)}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(m.codigo)} • ${escapeHtml(String(m.periodo))}º Período • Tranca: ${disciplinasObrigatorias.filter(d => d.pre.includes(m.codigo)).length} matéria(s)</span>
    </div>
  `).join('');
}

function abrirPlanejador() {
  const concluidas = getConcludedCodes();
  const disponiveis = disciplinasObrigatorias.filter(m =>
    isApta(m, concluidas) && !concluidas.includes(m.codigo)
  );

  const input = document.getElementById('input-planejador');
  const clearBtn = document.getElementById('clear-planejador');

  if (input) input.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');

  renderPlanejadorList(disponiveis);
  openModal('modal-planejador');
}

function initPlanejador() {
  const planInput = document.getElementById('input-planejador');
  const clearPlanBtn = document.getElementById('clear-planejador');
  if (!planInput || !clearPlanBtn) return;

  planInput.addEventListener('input', e => {
    const val = e.target.value.trim();
    clearPlanBtn.classList.toggle('hidden', val.length === 0);

    if (val.length > 2) {
      const query = expandSearchAliases(val);
      const subj = disciplinasObrigatorias.find(d =>
        normalizeStr(formatName(d)).includes(query) ||
        normalizeStr(d.codigo).includes(query)
      );

      if (subj) {
        const tranca = disciplinasObrigatorias
          .filter(m => m.pre.includes(subj.codigo))
          .sort((a, b) => Number(a.periodo) - Number(b.periodo));
        renderPlanejadorList(tranca);
      } else {
        renderPlanejadorList([]);
      }
    } else if (val.length === 0) {
      abrirPlanejador();
    }
  });

  clearPlanBtn.addEventListener('click', () => {
    planInput.value = '';
    clearPlanBtn.classList.add('hidden');
    abrirPlanejador();
  });
}

initPlanejador();

// ----------------------------------------------------
// LIMPAR BUSCA (X) — preservado da versão atual
// ----------------------------------------------------
function initSearchClearButton() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  if (!input || !clearBtn) return;

  const sync = () => {
    clearBtn.classList.toggle('hidden', input.value.length === 0);
  };

  input.addEventListener('input', sync);
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    document.getElementById('search-suggestions')?.classList.add('hidden');
    document.getElementById('search-wrapper')?.classList.remove('search-floating');
    filterSubjects('');
    input.focus();
  });

  sync();
}

initSearchClearButton();
