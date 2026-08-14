
(function () {
  function assert(name, condition, details = '') {
    const pass = Boolean(condition);
    const log = pass ? console.log : console.error;
    log(`[Teste] ${pass ? 'OK' : 'FALHA'} — ${name}${details ? ` — ${details}` : ''}`);
    return { name, pass, details };
  }

  function run() {
    if (typeof window.extractCodes !== 'function') return;

    const results = [];
    results.push(assert('extractCodes encontra códigos em lista separada', JSON.stringify(window.extractCodes('BQM101; IQG114')) === JSON.stringify(['BQM101', 'IQG114'])));
    results.push(assert('periodIsCond reconhece Escolha Condicionada', window.periodIsCond('Escolha Condicionada') === true));
    results.push(assert('normalizePeriodTerm reconhece 10º Período', window.normalizePeriodTerm('10º Período') === '10'));
    results.push(assert('normalizePeriodTerm reconhece 10 período', window.normalizePeriodTerm('10 período') === '10'));
    results.push(assert('normalizePeriodTerm reconhece 10', window.normalizePeriodTerm('10') === '10'));
    results.push(assert('alias PCQ VII usa produtos farmacêuticos', window.expandSearchAliases('pcq vii').includes('produtosfarmaceuticosvii')));
    results.push(assert('expandSearchAliases transforma CIF', window.expandSearchAliases('cif ii').includes('cuidadointegradoemfarmaciaii')));

    const bqm103 = window.disciplinas.find(d => d.codigo === 'BQM103');
    const ffw352 = window.disciplinas.find(d => d.codigo === 'FFW352');
    const ffm009 = window.disciplinas.find(d => d.codigo === 'FFM009');

    results.push(assert('pré-requisito bloqueia BQM103 sem BQM101', window.isApta(bqm103, []) === false));
    results.push(assert('pré-requisito libera BQM103 com BQM101', window.isApta(bqm103, ['BQM101']) === true));
    results.push(assert('correquisito bloqueia FFW352 sem FFW351', window.isApta(ffw352, ['FFW242', 'FFW243']) === false));
    results.push(assert('correquisito libera FFW352 com FFW351 junto', window.isApta(ffw352, ['FFW242', 'FFW243', 'FFW351']) === true));
    results.push(assert('pré + correquisito libera FFM009 só com as duas disciplinas juntas', window.isApta(ffm009, ['FFW471', 'FFW482']) === true));
    results.push(assert('pré + correquisito bloqueia FFM009 faltando o correquisito', window.isApta(ffm009, ['FFW471']) === false));
    results.push(assert('total de obrigatórias foi calculado', Number.isInteger(window.totalObrig) && window.totalObrig > 0));
    results.push(assert('total de escolhas condicionadas foi calculado', Number.isInteger(window.totalCond) && window.totalCond > 0));

    window.__gradeFarmaTests__ = results;
    console.info(`[Teste] Total: ${results.filter(r => r.pass).length}/${results.length} aprovados.`);
  }

  window.addEventListener('DOMContentLoaded', () => setTimeout(run, 0));
})();
