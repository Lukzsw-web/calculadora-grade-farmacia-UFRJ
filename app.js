"use strict";

/**
 * ==========================================
 * 1. CONFIGURAÇÕES E ESTADO GLOBAL
 * ==========================================
 */
const STORAGE_KEYS = {
    checked: 'farma_checked_v4',
    plannerChecked: 'planner_checked_v1',
    theme: 'theme'
};

const PERIODO_COND = 'Escolha Condicionada';
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

// Cálculos de carga e progresso
const TOTAL_OBRIG_CRED = disciplinas
    .filter(d => d.periodo !== PERIODO_COND)
    .reduce((sum, d) => sum + (parseInt(d.cred) || 0), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;
const totalObrig = disciplinas.filter(d => d.periodo !== PERIODO_COND).length;

// Estado SSoT (Single Source of Truth)
const state = {
    checked: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.checked) || '[]')),
    plannerChecked: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.plannerChecked) || '[]'))
};

// Dicionários para buscas O(1) e performance
const discMap = new Map();
const dependentesMap = new Map();

disciplinas.forEach(d => {
    discMap.set(d.codigo, d);
    if (d.pre) {
        d.pre.split(';').forEach(p => {
            const req = p.trim();
            if (!dependentesMap.has(req)) dependentesMap.set(req, []);
            dependentesMap.get(req).push(d.codigo);
        });
    }
});

// Cache DOM principal
const DOM = {
    accordions: document.getElementById('accordions-container'),
    plannerList: document.getElementById('planner-list'),
    searchInput: document.getElementById('search-input'),
    searchSuggestions: document.getElementById('search-suggestions'),
    clearSearchBtn: document.getElementById('clear-search-button')
};

/**
 * ==========================================
 * 2. LÓGICA DE NEGÓCIO E UI
 * ==========================================
 */

// Retorna se o aluno tem os pré-requisitos marcados
function checkPrereqs(codigo) {
    const d = discMap.get(codigo);
    if (!d || !d.pre) return true;
    return d.pre.split(';').every(p => state.checked.has(p.trim()));
}

// Determina o status lógico da disciplina
function getSubjectStatus(codigo) {
    if (state.checked.has(codigo)) return 'passed';
    if (checkPrereqs(codigo)) return 'eligible';
    return 'blocked';
}

// Desmarca recursivamente todas as disciplinas que dependiam da matéria desmarcada
function uncheckDependents(codigo) {
    const deps = dependentesMap.get(codigo);
    if (deps) {
        deps.forEach(dep => {
            if (state.checked.has(dep)) {
                state.checked.delete(dep);
                uncheckDependents(dep); // Recursão segura
            }
        });
    }
}

// Atualiza barras de progresso, cores e estatísticas 
function updateAllUI() {
    let credObrig = 0, chObrig = 0, totalObrigFeitas = 0;
    let credCond = 0, chCond = 0;

    // Atualiza classes dos cards no DOM
    document.querySelectorAll('.subject-card').forEach(card => {
        const codigo = card.dataset.codigo;
        const d = discMap.get(codigo);
        const status = getSubjectStatus(codigo);
        const isChecked = state.checked.has(codigo);

        // Atualização visual
        card.className = `subject-card p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative overflow-hidden group select-none status-${status}`;
        
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = isChecked;
            checkbox.disabled = status === 'blocked';
        }

        // Estatísticas
        if (isChecked && d) {
            if (d.periodo === PERIODO_COND) {
                credCond += parseInt(d.cred) || 0;
                chCond += parseInt(d.ch) || 0;
            } else {
                credObrig += parseInt(d.cred) || 0;
                chObrig += parseInt(d.ch) || 0;
                totalObrigFeitas++;
            }
        }
    });

    // Atualizando o Header e Painel
    document.getElementById('total-creditos').textContent = credObrig + credCond;
    document.getElementById('total-horas').textContent = chObrig + chCond;
    
    document.getElementById('count-obrig-feitas-painel').textContent = totalObrigFeitas;
    document.getElementById('count-obrig-total-painel').textContent = totalObrig;

    const percentTotal = Math.min(100, Math.round(((credObrig + credCond) / TOTAL_GRAD_CRED_EQUIV) * 100));
    document.getElementById('percent-total').textContent = `${percentTotal}%`;

    // Barra Obrigatórias
    const percObrig = Math.min(100, Math.round((totalObrigFeitas / totalObrig) * 100));
    document.getElementById('bar-obrig').style.width = `${percObrig}%`;
    document.getElementById('percent-obrig').textContent = `${percObrig}%`;
    document.getElementById('count-obrig-feitas').textContent = totalObrigFeitas;
    document.getElementById('count-obrig-faltam').textContent = totalObrig - totalObrigFeitas;

    // Barra Condicionadas
    const percCond = Math.min(100, Math.round((credCond / META_COND_CRED) * 100));
    document.getElementById('bar-cond').style.width = `${percCond}%`;
    document.getElementById('text-cond-progress').textContent = `${credCond} créd. • ${chCond}h`;

    if (credCond >= META_COND_CRED && chCond >= META_COND_HORAS) {
        document.getElementById('icon-cond-exclamation').classList.remove('hidden');
    } else {
        document.getElementById('icon-cond-exclamation').classList.add('hidden');
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEYS.checked, JSON.stringify([...state.checked]));
    localStorage.setItem(STORAGE_KEYS.plannerChecked, JSON.stringify([...state.plannerChecked]));
    showSaveToast();
}

/**
 * ==========================================
 * 3. RENDERIZAÇÃO DOM E COMPONENTES
 * ==========================================
 */

function createSubjectCardHTML(d, context = 'main') {
    const ajuste = disciplinaAjustes[d.codigo] || '';
    const temCoreq = !!d.co;
    const isPlanner = context === 'planner';
    
    return `
    <label class="subject-card w-full text-left" data-codigo="${d.codigo}">
        <div class="flex-shrink-0 relative flex items-center justify-center">
            <input type="checkbox" value="${d.codigo}" class="peer sr-only">
            <div class="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-green-500 peer-checked:border-green-500 flex items-center justify-center transition-all bg-white dark:bg-darkCard">
                <svg class="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center py-1">
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="subject-name text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
                    ${d.nome} <span class="text-xs opacity-70">${ajuste}</span>
                    ${temCoreq ? `<button type="button" class="coreq-button ml-1" data-codigo="${d.codigo}" aria-label="Ver correquisito">C</button>` : ''}
                </span>
            </div>
            <div class="flex items-center gap-2 mt-1 text-[0.7rem] font-bold text-gray-400">
                <span class="uppercase tracking-wider font-extrabold text-yellowTheme-600 dark:text-yellowTheme-500">${d.codigo}</span>
                <span>•</span><span>${d.cred} CR</span><span>•</span><span>${d.ch}H</span>
            </div>
        </div>
    </label>`;
}

function buildAccordions() {
    DOM.accordions.innerHTML = '';
    
    const periods = {};
    disciplinas.forEach(d => {
        if (!periods[d.periodo]) periods[d.periodo] = [];
        periods[d.periodo].push(d);
    });

    const sortedPeriods = Object.keys(periods).sort((a, b) => {
        if (a === PERIODO_COND) return 1;
        if (b === PERIODO_COND) return -1;
        return parseInt(a) - parseInt(b);
    });

    const fragment = document.createDocumentFragment();

    sortedPeriods.forEach(p => {
        const title = p === PERIODO_COND ? 'Escolha Condicionada' : `${p}º Período`;
        const divWrap = document.createElement('div');
        divWrap.innerHTML = `
            <details class="group">
                <summary class="flex justify-between items-center cursor-pointer select-none">
                    <span class="font-black text-gray-800 dark:text-gray-100">${title}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">${periods[p].length} mat.</span>
                        <svg class="accordion-chevron w-5 h-5 text-gray-400 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </summary>
                <div class="accordion-content px-4 pb-4 space-y-2">
                    ${periods[p].map(d => createSubjectCardHTML(d, 'main')).join('')}
                </div>
            </details>
        `;
        fragment.appendChild(divWrap);
    });
    
    DOM.accordions.appendChild(fragment);
}

function buildPlanner() {
    // Exibe apenas as 'eligible' (prontas pra cursar) e que não foram feitas
    const prontas = disciplinas.filter(d => getSubjectStatus(d.codigo) === 'eligible' && !state.checked.has(d.codigo));
    
    if (prontas.length === 0) {
        DOM.plannerList.innerHTML = `<div class="text-center p-6 text-gray-500 font-medium text-sm">Nenhuma disciplina liberada para puxar no momento.</div>`;
        return;
    }

    DOM.plannerList.innerHTML = prontas.map(d => createSubjectCardHTML(d, 'planner')).join('');
    
    // Restaura visualmente estado das checkbox do planner
    DOM.plannerList.querySelectorAll('.subject-card').forEach(card => {
        const checkbox = card.querySelector('input');
        if (state.plannerChecked.has(card.dataset.codigo)) {
            checkbox.checked = true;
        }
    });
}

/**
 * ==========================================
 * 4. EVENT DELEGATION & LISTENERS
 * ==========================================
 */

function handleGlobalClicks(e) {
    // Tratamento Botão Correquisito (C)
    const btnC = e.target.closest('.coreq-button');
    if (btnC) {
        e.preventDefault();
        openCoreqModal(btnC.dataset.codigo);
        return;
    }
}

// Interações no Grid Principal
DOM.accordions.addEventListener('click', handleGlobalClicks);
DOM.accordions.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
        const cod = e.target.value;
        if (e.target.checked) {
            state.checked.add(cod);
        } else {
            state.checked.delete(cod);
            uncheckDependents(cod); // Fix: Cascata lógica
        }
        saveState();
        updateAllUI();
    }
});

// Interações no Planner
DOM.plannerList.addEventListener('click', handleGlobalClicks);
DOM.plannerList.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
        if (e.target.checked) state.plannerChecked.add(e.target.value);
        else state.plannerChecked.delete(e.target.value);
        saveState();
    }
});

// Setup Long Press & Click Direito (Para ver quem tranca)
function setupLongPress(element) {
    let timer;
    element.addEventListener('touchstart', e => {
        const card = e.target.closest('.subject-card');
        if (!card || e.target.closest('.coreq-button') || e.target.type === 'checkbox') return;
        timer = setTimeout(() => openLocksModal(card.dataset.codigo), 600);
    }, { passive: true });
    
    element.addEventListener('touchend', () => clearTimeout(timer));
    element.addEventListener('touchmove', () => clearTimeout(timer), { passive: true });
    
    element.addEventListener('contextmenu', e => {
        const card = e.target.closest('.subject-card');
        if (card && !e.target.closest('.coreq-button') && e.target.type !== 'checkbox') {
            e.preventDefault();
            openLocksModal(card.dataset.codigo);
        }
    });
}
setupLongPress(DOM.accordions);
setupLongPress(DOM.plannerList);

/**
 * ==========================================
 * 5. MODAIS E UTILITÁRIOS 
 * ==========================================
 */

window.openModal = (id) => {
    const m = document.getElementById(id);
    if(m) {
        if(id === 'modal-planner') buildPlanner();
        m.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = (id) => {
    const m = document.getElementById(id);
    if(m) {
        m.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Fecha modal clicando fora ou com ESC
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
});

window.confirmarLimparSelecao = () => {
    if (confirm("Tem certeza que deseja apagar todo o seu progresso?")) {
        state.checked.clear();
        state.plannerChecked.clear();
        saveState();
        updateAllUI();
    }
};

// Funções dos Modais Informativos (Coreq e Locks)
function openCoreqModal(codigo) {
    const d = discMap.get(codigo);
    document.getElementById('coreq-title').textContent = `Correquisito: ${codigo}`;
    
    if (d && d.co) {
        const names = d.co.split(';').map(c => {
            const req = discMap.get(c.trim());
            return req ? `${c.trim()} - ${req.nome}` : c.trim();
        }).join('<br>');
        document.getElementById('coreq-desc').innerHTML = `Você também deve estar inscrito em:<br><br><strong class="text-blue-500">${names}</strong>`;
    }
    openModal('modal-coreq');
}

function openLocksModal(codigo) {
    const deps = dependentesMap.get(codigo) || [];
    document.getElementById('locks-title').textContent = codigo;
    document.getElementById('locks-desc').textContent = deps.length > 0 
        ? 'Esta disciplina tranca as seguintes matérias:' 
        : 'Esta disciplina não tranca nenhuma outra matéria.';
        
    document.getElementById('locks-list').innerHTML = deps.map(depCod => {
        const dep = discMap.get(depCod);
        return `<div class="bg-gray-50 dark:bg-[#15171b] border border-gray-100 dark:border-darkBorder p-3 rounded-xl mb-2">
            <span class="font-bold text-gray-800 dark:text-gray-100 block">${depCod}</span>
            <span class="text-xs text-gray-500">${dep.nome}</span>
        </div>`;
    }).join('');
    
    openModal('modal-locks');
}

// Toasts e Copy Clipboard
let toastTimeout;
function showSaveToast(msg = "Salvo") {
    const status = document.getElementById('save-status');
    if (!status) return;
    status.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ${msg}`;
    status.classList.remove('opacity-0', 'scale-95');
    status.classList.add('opacity-100', 'scale-100');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        status.classList.add('opacity-0', 'scale-95');
        status.classList.remove('opacity-100', 'scale-100');
    }, 2000);
}

window.copyTextToClipboard = (text, name, event) => {
    navigator.clipboard.writeText(text).then(() => {
        const t = document.getElementById('toast-copy');
        document.getElementById('toast-message').textContent = `${name} copiado!`;
        t.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4'), 2500);
    });
};

/**
 * ==========================================
 * 6. SISTEMA DE BUSCA (Debounced)
 * ==========================================
 */

function setupSearch(inputEl, clearBtnEl, listEl) {
    let debounceTimer;
    
    const handleInput = (e) => {
        clearTimeout(debounceTimer);
        const term = e.target.value.toLowerCase().trim();
        
        if (!term) {
            clearBtnEl.classList.add('hidden');
            listEl.classList.add('hidden');
            return;
        }
        
        clearBtnEl.classList.remove('hidden');
        
        debounceTimer = setTimeout(() => {
            const matches = disciplinas.filter(d => 
                d.nome.toLowerCase().includes(term) || 
                d.codigo.toLowerCase().includes(term)
            ).slice(0, 10);
            
            if (matches.length > 0) {
                listEl.innerHTML = matches.map(d => `
                    <div class="search-suggestion" onclick="openLocksModal('${d.codigo}')">
                        <div class="search-suggestion-main flex flex-col justify-center">
                            <span class="search-suggestion-name text-gray-800 dark:text-gray-100">${d.nome}</span>
                            <span class="search-suggestion-meta">${d.codigo} • ${d.periodo === PERIODO_COND ? 'Eletiva' : d.periodo + 'º Per.'}</span>
                        </div>
                    </div>
                `).join('');
                listEl.classList.remove('hidden');
            } else {
                listEl.innerHTML = `<div class="p-4 text-sm text-gray-500 font-medium text-center">Nenhum resultado.</div>`;
                listEl.classList.remove('hidden');
            }
        }, 200);
    };

    inputEl.addEventListener('input', handleInput);
    clearBtnEl.addEventListener('click', () => {
        inputEl.value = '';
        inputEl.dispatchEvent(new Event('input'));
        inputEl.focus();
    });
}
setupSearch(DOM.searchInput, DOM.clearSearchBtn, DOM.searchSuggestions);
setupSearch(document.getElementById('planner-search-input'), document.getElementById('planner-clear-search-button'), document.getElementById('planner-search-suggestions'));


/**
 * ==========================================
 * 7. TEMA & PDF (Integração)
 * ==========================================
 */

window.updateThemeUI = () => {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('settings-theme-icon-sun')?.classList.toggle('hidden', isDark);
    document.getElementById('settings-theme-icon-moon')?.classList.toggle('hidden', !isDark);
    if(document.getElementById('settings-theme-label')) document.getElementById('settings-theme-label').textContent = isDark ? 'Modo escuro' : 'Modo claro';
    if(document.getElementById('theme-toggle-thumb')) document.getElementById('theme-toggle-thumb').style.transform = isDark ? 'translateX(1.5rem)' : 'translateX(0)';
};

window.toggleThemeFromSettings = () => {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !isDark);
    document.documentElement.classList.toggle('light', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeUI();
};

window.compartilharGradePDF = () => {
    if (!window.jspdf) return alert("Erro: O gerador de PDF não foi carregado.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Planejamento Acadêmico - Farmácia", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const feitasObrig = [...state.checked].filter(c => discMap.has(c) && discMap.get(c).periodo !== PERIODO_COND).length;
    doc.text(`Disciplinas Obrigatórias: ${feitasObrig} de ${totalObrig}`, 20, 40);
    doc.text(`Progresso Geral (Estimado): ${document.getElementById('percent-total').textContent}`, 20, 50);
    
    doc.save("Meu_Progresso_Farmacia.pdf");
    showSaveToast("PDF Baixado!");
};

/**
 * ==========================================
 * INICIALIZAÇÃO
 * ==========================================
 */
function init() {
    buildAccordions();
    updateAllUI();
    updateThemeUI();
}

// Dispara inicialização
init();
