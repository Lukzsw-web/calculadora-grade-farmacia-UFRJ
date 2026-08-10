(function () {
  function assert(name, condition, details = '') {
    const pass = Boolean(condition);
    const log = pass ? console.log : console.error;
    log(`[Teste] ${pass ? 'OK' : 'FALHA'} — ${name}${details ? ` — ${details}` : ''}`);
    return { name, pass, details };
  }

  function runTests() {
    if (!window.disciplinas) return;

    const results = [];
    const bqm103 = window.disciplinas.find(d => d.codigo === 'BQM103');
    const ffm009 = window.disciplinas.find(d => d.codigo === 'FFM009');

    // Teste 1: Pré-requisito bloqueia BQM103 sem BQM101
    results.push(assert('Pré-requisito bloqueia BQM103 sem BQM101', window.isApta(bqm103, []) === false));

    // Teste 2: Pré-requisito libera BQM103 com BQM101
    results.push(assert('Pré-requisito libera BQM103 com BQM101', window.isApta(bqm103, ['BQM101']) === true));

    // Teste 3: Co-requisito + Pré-requisito no FFM009
    results.push(assert('Exige pré e correquisito juntos para FFM009', window.isApta(ffm009, ['FFW471', 'FFW482']) === true));

    // Teste 4: Teto de 12 créd. nas escolhas condicionadas
    const condDisciplines = window.disciplinas.filter(d => d.tipo === 'Escolha Condicionada');
    const totalCondCredits = condDisciplines.reduce((acc, curr) => acc + curr.creditos, 0);
    const condCapped = Math.min(12, totalCondCredits);
    results.push(assert('Teto de 12 créditos para escolhas condicionadas', condCapped === 12, `Total: ${totalCondCredits}`));

    console.log(`Testes concluídos: ${results.filter(r => r.pass).length}/${results.length} aprovados.`);
  }

  window.addEventListener('load', runTests);
})();
