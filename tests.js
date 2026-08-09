(function () {
  function assert(name, condition) {
    if (!condition) throw new Error(`FALHOU: ${name}`);
    console.info(`✓ ${name}`);
  }

  function runGradeFarmaTests() {
    const byCode = code => disciplinas.find(d => d.codigo === code);

    // Pré-requisito simples.
    assert('BQM103 exige BQM101', isApta(byCode('BQM103'), ['BQM101']) === true);
    assert('BQM103 bloqueia sem BQM101', isApta(byCode('BQM103'), []) === false);

    // Correquisito: as duas disciplinas precisam estar cursadas juntas.
    assert('FFW243 bloqueia sem FFW242', isApta(byCode('FFW243'), ['BMF310', 'IQO230']) === false);
    assert('FFW243 libera com FFW242 junto', isApta(byCode('FFW243'), ['BMF310', 'IQO230', 'FFW242']) === true);
    assert('FFW243 bloqueia se apenas o correquisito estiver presente', isApta(byCode('FFW243'), ['FFW242']) === false);

    // Pré + correquisito.
    assert('FFW352 bloqueia sem FFW351', isApta(byCode('FFW352'), ['FFW242', 'FFW243']) === false);
    assert('FFW352 libera com todos os requisitos', isApta(byCode('FFW352'), ['FFW242', 'FFW243', 'FFW351']) === true);

    console.info('[Grade Farma] Testes de lógica concluídos.');
    return true;
  }

  window.runGradeFarmaTests = runGradeFarmaTests;
  try {
    runGradeFarmaTests();
  } catch (error) {
    console.error('[Grade Farma] Testes falharam:', error);
  }
})();
