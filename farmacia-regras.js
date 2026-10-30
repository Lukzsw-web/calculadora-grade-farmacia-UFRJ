/* FarmacIA – regras oficiais da UFRJ (Manual Estudantil da UFRJ e PPC de Farmácia).
   Só texto estático conferido nos dois documentos; não depende dos dados de disciplinas.
   Uso: FarmaRegras.match(textoNormalizado) -> { id, html, chips } ou null. */
(function () {
  'use strict';

  var MANUAL = 'Manual Estudantil da UFRJ';
  var PPC = 'PPC de Farmácia';
  function p(s) { return '<p>' + s + '</p>'; }
  function fonte(s) { return '<p class="farma-source">Fonte: ' + s + '</p>'; }
  function ul(items) { return '<p>' + items.map(function (i) { return '• ' + i; }).join('<br>') + '</p>'; }
  var CONFIRME = 'Regras podem mudar: confirme na Secretaria Acadêmica ou com o seu orientador.';

  var T = {
    coordenacao: {
      re: /coordenacao|coordenador|coordenadora|direcao adjunta|diretora adjunta|diretor adjunto|direcao de graduacao|\b(milene|sodero|botelho|raissa|naomi|eline)\b|ana carolina renno|thiago botelho/,
      html: p('<strong>Coordenação do curso de Farmácia</strong> (atendimento presencial no Prédio do CCS, Bloco K, Sala 15):') +
        ul(['<strong>Turno Integral:</strong> não há mais plantão. Procure primeiro o seu <strong>professor orientador</strong>. Se ele não resolver, ele mesmo aciona a coordenação, que marca um encontro presencial se for preciso. E-mail: ffcoordenacao.integral@gmail.com', '<strong>Turno Noturno:</strong> quartas-feiras, das 14h30 às 18h. E-mail: ffcoordenacao.noturno@gmail.com']) +
        p('<strong>Quem é quem</strong>') +
        ul(['Integral: Profª Milene Rangel da Costa (coordenadora) e Profª Ana Carolina Rennó Sodero (substituta)', 'Noturno: Prof. Thiago Botelho Azeredo (coordenador) e Profª Raissa Alves da Conceição (substituta)', 'Direção Adjunta de Graduação: Profª Maria Eline Matheus e Profª Naomi Kato Simas']) +
        fonte('Página da Coordenação de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Secretaria de Graduação', q: 'Como funciona o atendimento da secretaria?' }, { label: 'Professor orientador', q: 'O que faz o professor orientador?' }]
    },
    secretaria: {
      re: /secretaria|registro de diploma|diploma(?! de honra)|processos? sei|\bsei\b|equipe da secretaria/,
      html: p('<strong>Secretaria de Graduação da Faculdade de Farmácia</strong>. A recomendação é priorizar o atendimento online, para evitar deslocamentos desnecessários.') +
        p('<strong>E-mails, conforme a demanda</strong>') +
        ul(['secretariaffufrj@gmail.com: documentação, informações gerais e dúvidas', 'procgradffufrj@gmail.com: abertura e acompanhamento de processos SEI', 'diplomaffufrj@gmail.com: registro de diploma e acompanhamento dos processos']) +
        p('<strong>Atendimento presencial:</strong> de segunda a quinta, das 10h às 20h. Sexta-feira é trabalho interno.') +
        p('<strong>Onde fica:</strong> Av. Carlos Chagas Filho, 373, Prédio do CCS, Bloco K, Sala 13, Cidade Universitária, Rio de Janeiro, CEP 21941-902.') +
        p('<strong>Equipe:</strong> André Gomes, Halana Maia, Jacqueline Abreu, Martinho Neto e Rafael Amaral.') +
        fonte('Página da Secretaria de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Como funciona a inscrição', q: 'Como funciona a inscrição em disciplinas?' }]
    },
    atendimento: {
      re: /atendimento|plantao|horario de funcionamento|ate que horas|esta aberta/,
      html: p('Tenho o atendimento de dois lugares:') +
        ul(['<strong>Secretaria de Graduação</strong> (CCS, Bloco K, Sala 13): segunda a quinta, 10h às 20h; sexta é trabalho interno. Prefira o e-mail secretariaffufrj@gmail.com.', '<strong>Coordenação, turno Noturno</strong> (CCS, Bloco K, Sala 15): quartas, 14h30 às 18h. No <strong>Integral</strong> não há plantão: fale primeiro com o seu professor orientador.']) +
        fonte('Páginas da Coordenação e da Secretaria de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Secretaria', q: 'Como funciona a secretaria?' }]
    },
    situacaoSiga: {
      re: /letra [a-z]\b|codigos? (de )?situacao|situacao (do )?(pedido|protocolo)|significa.*situacao|\binscricao normal\b|lotacao esgotada|falta de requisito|menos de 6 creditos|mais de 32 creditos|previsao pendente|turma desativada|transferido de turma|disciplina ja cursada|inscricao trancada/,
      html: p('No protocolo de pedidos (CRPID) aparece uma letra na coluna “Situação”. A maioria são <strong>avisos</strong>: não significam que o pedido não foi enviado e <strong>não interferem na disputa por vaga</strong>, mas precisam ser resolvidos para o professor poder lançar a sua nota.') +
        ul(['<strong>A, Inscrição normal:</strong> tudo certo.', '<strong>L, Lotação esgotada:</strong> naquele momento já havia gente com mais prioridade que o número de vagas. Não é definitivo: só o CRID decide.', '<strong>F, Falta de requisito:</strong> pré-requisito não cursado (ou ainda não lançado), ou co-requisito que não está no pedido.', '<strong>P, Um terço fora do curso:</strong> limite de disciplinas de fora do seu currículo.', '<strong>M, Horário sobreposto:</strong> duas disciplinas no mesmo horário.', '<strong>O, Menos de 6 créditos</strong> e <strong>H, Mais de 32 créditos:</strong> fora da carga permitida, salvo autorização especial da Unidade.', '<strong>J e K, Matrícula cancelada ou trancada:</strong> procure a secretaria para regularizar.', '<strong>C, Inscrição trancada</strong> (você trancou uma disciplina em que já tinha vaga), <strong>G, Disciplina já cursada</strong>, <strong>D, Transferido de turma</strong> e <strong>Q, Turma desativada</strong>.', '<strong>Previsão pendente:</strong> falta dado na turma (professor ou local); a secretaria resolve.']) +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Pedido não é inscrição', q: 'Qual a diferença entre pedido e inscrição?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    crid: {
      example: "Se você pediu 6 disciplinas e a CRID mostra 5, a sexta não foi alocada: você não está inscrito nela.",
      re: /\bcrid\b|comprovante de inscricao|crpid|cripd|protocolo de (envio|pedido)/,
      html: p('A <strong>CRID</strong> (Confirmação de Registro de Inscrições em Disciplinas) é o <strong>único documento que comprova a sua inscrição</strong>. Se a disciplina consta nela, você está na turma; se não consta, não conseguiu a vaga.') +
        p('Salve a CRID nas datas do calendário acadêmico, e confira se todas as inscrições estão como “inscrição normal”. Inscrição irregular impede o lançamento de notas.') +
        p('Já a <strong>CRPID/CRIPD</strong> é só o protocolo dos pedidos enviados: mostra o que você solicitou, não garante vaga e não serve como comprovante.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da Faculdade de Farmácia.'),
      chips: [{ label: 'Letras de situação', q: 'O que significam as letras de situação do pedido?' }, { label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }]
    },
    pedidoInscricao: {
      example: "Você pede uma turma e o SIGA avisa “inscrição normal”. Dias depois, alguém com mais prioridade pede a mesma turma e o aviso vira “lotação esgotada”. Só a CRID gerada no fim do prazo diz se você ficou com a vaga.",
      re: /pedido (de )?inscricao|pedido e inscricao|pedido nao e inscricao|diferenca entre pedido|como (fazer|faco|funciona|e) (a |o )?(inscricao|pedido)|inscricao em disciplinas?|inscricoes em disciplinas|me inscrever|me inscrevo|periodo de (pedidos|inscricao)|danca das cadeiras|concordancia de pedidos?|siga.*(inscricao|pedido)/,
      html: p('<strong>Pedido não é inscrição.</strong> No período de pedidos, o SIGA só recolhe solicitações; quem ganha a vaga só é definido quando termina o prazo e a <strong>CRID</strong> é gerada.') +
        ul(['Caminho: SIGA > Serviços > Inscrição > Pedido > Pedido de inscrição em disciplinas. Depois de adicionar as turmas, clique em <strong>Enviar</strong>.', 'Os e-mails do SIGA (“inscrição normal”, “lotação esgotada”, “realocado”) mostram só a situação do pedido naquele instante. Eles mudam até o fechamento.', 'Na <strong>concordância</strong>, o coordenador libera (ou não) pedidos de alunos de outros cursos. “Concordado” não é vaga garantida.', 'Se o pedido oscilar numa turma lotada, você pode desistir (X) e pedir outra turma, dentro do prazo.', 'Quem fica o período sem nenhuma inscrição tem a matrícula trancada automaticamente; se repetir no semestre seguinte, vira cancelamento definitivo.']) +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }, { label: 'Trocar de turma', q: 'Como trocar de turma?' }]
    },
    vagas: {
      example: "Dois alunos pedem a mesma turma: leva a vaga primeiro o aluno do curso; se os dois são do curso, quem está no período recomendado da disciplina; depois valem os critérios da coordenação (COA, CRA, turno).",
      re: /criterios? (de )?(classificacao|prioridade|alocacao|desempate)|quem tem prioridade|prioridade (na|nas|em|de) (vaga|vagas|turma|turmas|inscricao)|como (as )?vagas (sao )?(distribuidas|alocadas|escolhidas)|ordem de prioridade|nao consegui (a )?vaga|sem vaga|vagas? ociosas?|vaga garantida|garantia de vaga|outro turno|disciplina de outro periodo|\bcoa\b|\bcra\b.*(vaga|prioridade)/,
      html: p('O SIGA ordena os pedidos assim:') +
        ul(['<strong>1º, localização:</strong> alunos do curso para o qual a turma é oferecida; depois da mesma unidade, do mesmo centro e, por fim, do resto da UFRJ.', '<strong>2º, periodização:</strong> quem está no período recomendado da disciplina. Se ela é eletiva ou você está fora do período, quem tem o período mais alto passa na frente.', '<strong>Depois, critérios que a coordenação define:</strong> COA (créditos acumulados), CRA e turno.', 'Pedidos já <strong>concordados</strong> têm prioridade, e quem garantiu vaga na fase de pedidos não a perde para pedidos da fase de alteração (AID).']) +
        p('Na Faculdade de Farmácia, o aluno tem vaga garantida no seu <strong>turno e período</strong>. Disciplinas de outro turno ou período dependem de vaga. Se não conseguir, procure uma turma menos concorrida ou curse no próximo semestre. Não fique na sala sem a disciplina estar na CRID: a nota não pode ser lançada depois.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Pedido não é inscrição', q: 'Qual a diferença entre pedido e inscrição?' }, { label: 'Trocar de turma', q: 'Como trocar de turma?' }]
    },
    trocaTurma: {
      example: "Você está inscrito na turma A e pede transferência para a B. Se a B não tiver vaga, você fica sem nenhuma das duas.",
      re: /(trocar|mudar|transferir|transferencia) (de |da |a )?turma|\baid\b|alteracao de inscricao|inscricao direta|prazo de alteracao|incluir (e|ou) excluir disciplina|\bcoaa\b|calouro.*(inscricao|disciplina)/,
      html: p('No <strong>prazo de alteração (AID)</strong> você pode incluir e excluir disciplinas e transferir de uma turma para outra. A transferência depende de <strong>vaga na turma de destino</strong>. Se não houver, você <strong>não volta automaticamente</strong> para a turma anterior e fica sem a vaga.') +
        p('A <strong>inscrição direta</strong> é feita <strong>somente</strong> para calouros e alunos em acompanhamento do COAA. Os demais fazem pedidos pelo SIGA.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e página de informações da Secretaria de Graduação da FF.'),
      chips: [{ label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }, { label: 'Horário sobreposto', q: 'E se duas disciplinas tiverem o mesmo horário?' }]
    },
    sobreposicao: {
      example: "Duas disciplinas às segundas, das 8h às 10h: as duas inscrições ficam irregulares e você perde a vaga nas duas.",
      re: /horario sobreposto|sobreposicao|conflito de horario|choque de horario|mesmo horario|duas disciplinas (no|em) (o )?mesm|dois horarios|colid/,
      html: p('Você <strong>não pode</strong> se inscrever em duas disciplinas com horários sobrepostos. Quem faz isso fica <strong>irregular e perde a inscrição nas duas</strong>. No protocolo aparece a letra <strong>M</strong>.') +
        p('Antes de enviar o pedido, confira os horários das turmas no site da Graduação da Faculdade de Farmácia (Integral ou Noturno).') +
        fonte('Página de informações da Secretaria de Graduação da FF e Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Letras de situação', q: 'O que significam as letras de situação do pedido?' }]
    },
    concomitancia: {
      example: "Quem termina o curso neste semestre pode pedir para cursar uma disciplina junto com o seu pré-requisito. Quem ainda tem vários períodos pela frente, não.",
      re: /concomitan|quebra de pre ?requisito|quebrar pre ?requisito|puxar sem (o )?pre ?requisito|sem (ter )?(cumprido|cursado|feito) (o )?pre ?requisito|aluno concluinte|\bconcluinte\b|sem o requisito/,
      html: p('O pedido de <strong>concomitância de disciplinas / quebra de pré-requisito é somente para o aluno concluinte</strong>, isto é, quem tem condições de concluir o curso no semestre corrente. O pedido é analisado pela <strong>coordenação do curso</strong>.') +
        p('Para os demais alunos, a inscrição em disciplina com requisito faltando é irregular. Os concluintes também ficam isentos do limite de créditos por período (mínimo 6 e máximo 32).') +
        fonte('Página de informações da Secretaria de Graduação da FF e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Pré-requisitos', q: 'Qual a diferença entre pré e co-requisito?' }]
    },
    umTerco: {
      example: "Com 6 disciplinas no semestre, no máximo 2 podem ser de fora do seu currículo.",
      re: /um terco|\b1\/3\b|terco (do|dos) (credito|disciplina)|resolucao ceg 0?3|(maximo|limite) (de )?(disciplinas|creditos) (de |em )?(fora|outro)/,
      html: p('Você <strong>não pode cursar mais de 1/3 dos créditos fora do seu curso</strong> no semestre (Resolução CEG 03/75). Se passar, o pedido recebe a letra <strong>P</strong> no protocolo.') +
        p('Além disso, o pedido para disciplinas de outros cursos passa pela concordância da coordenação daquele curso, e a prioridade na vaga é dos alunos do próprio curso.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Disciplina de outro curso', q: 'Posso cursar disciplina de outro curso?' }, { label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }]
    },
    trancAuto: {
      example: "Se você não pedir nenhuma disciplina neste semestre, a matrícula é trancada sozinha; se acontecer de novo no semestre seguinte, ela é cancelada.",
      re: /trancamento automatico|sem (fazer |ter )?(pedido|inscricao|inscricoes)|nao (fiz|fazer|faco|fizer) (a |o )?(inscricao|pedido)|ficar sem inscricao|esqueci (de )?(me )?inscrever/,
      html: p('Quem <strong>não faz pedido de inscrição</strong> e fica o período sem nenhuma disciplina tem a matrícula <strong>trancada automaticamente</strong>. Se a situação se repetir no semestre seguinte, o trancamento automático vira <strong>cancelamento definitivo</strong>, irrevogável (Resolução CEG 03/2008, art. 6º).') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }, { label: 'Cancelamento', q: 'Quando a matrícula é cancelada?' }]
    },
    agf: {
      re: /\bagf\b|alteracao de grau|assistir aula sem (estar )?inscrit|ficar na sala sem|fazer (a )?(disciplina|materia) sem (estar )?inscri|minha nota nao (foi )?lancad|nota nao lancada|nao lancaram (a )?(minha )?nota/,
      html: p('Quem assiste a uma disciplina <strong>sem ela constar na CRID</strong> não consegue ter a nota lançada: a Alteração de Grau e Frequência (AGF) <strong>não pode mais ser usada para “inscrever” alguém</strong>, só para corrigir nota ou frequência de quem já está na pauta.') +
        p('Se você não conseguiu a vaga, procure uma turma menos concorrida ou curse a disciplina no próximo semestre. Também vale lembrar que inscrição irregular impede o lançamento da nota.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ), sobre o Memo Circular 057/2009 da PR1.'),
      chips: [{ label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    orientador: {
      re: /orientador|orientadora|orientacao academica|\bcpo\b|comissao de orientacao|corpo de professores orientadores|meus alunos orientados/,
      html: p('Todo aluno tem um <strong>professor orientador</strong> (Corpo de Professores Orientadores, CPO). Ele ajuda a entender os procedimentos acadêmicos, a montar o <strong>plano de estudos</strong> e a acompanhar o seu desempenho, para evitar retenção, evasão e cancelamento por insuficiência de rendimento (Resolução CEG 10/2004).') +
        ul(['Deve oferecer ao menos <strong>1 hora presencial a cada 15 dias</strong> de atendimento.', 'Analisa o seu boletim/BOA no fim do período e orienta as escolhas, inclusive as disciplinas de escolha condicionada.', 'Pode emitir parecer sobre o seu desempenho e orientar quem recebe auxílio estudantil.', 'No turno Integral, é a <strong>primeira pessoa a procurar</strong> antes da coordenação.']) +
        p('O orientador <strong>não monta o plano por você</strong> e <strong>não garante vaga</strong> em disciplina: o objetivo é estimular a sua autonomia.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)”, Comissão de Orientação e Acompanhamento Acadêmico da Faculdade de Farmácia.'),
      chips: [{ label: 'Plano de estudos', q: 'Como montar o plano de estudos?' }, { label: 'O que é o BOA?', q: 'O que é o BOA?' }]
    },
    planoEstudos: {
      re: /plano de estudos?|dicas? (de|para) (montar|o) (plano|periodo)|reduzir (o )?numero de disciplinas|comecando o curso|dificuldade no inicio|reprovei|reprovacao|fluxograma/,
      html: p('Dicas da cartilha de orientação da Faculdade de Farmácia para montar o plano de estudos:') +
        ul(['Acompanhe o <strong>fluxograma</strong> do curso e lembre que, além das obrigatórias, você precisa de optativas/eletivas, livre escolha e horas de extensão.', 'Com dificuldade no início, <strong>reduza o número de disciplinas</strong> nos primeiros períodos e priorize as básicas e as que são pré-requisito.', 'Disciplinas com muitos créditos pesam mais no CR.', 'Considere pré-requisitos, horários e a concorrência por vaga (represamento).', 'Se está difícil acompanhar uma disciplina, é melhor <strong>trancar dentro do prazo</strong> do calendário do que abandonar.', 'Salve a CRID com as inscrições regulares todo período.']) +
        p('Se quiser, posso sugerir uma grade (“monte meu próximo período”) com base no que você já marcou.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)” da Faculdade de Farmácia/UFRJ.'),
      chips: [{ label: 'Monte meu próximo período', q: 'Monte meu próximo período' }, { label: 'Trancar disciplina', q: 'Como trancar uma disciplina?' }]
    },
    boa: {
      re: /boletim de orientacao|o que (e|eh) (o )?boa\b|\bboa\b (do aluno|serve|significa|tem)|para que serve (o )?boa|\bboletim nao oficial\b/,
      html: p('O <strong>BOA</strong> (Boletim de Orientação Acadêmica) é o documento mais completo sobre a sua vida acadêmica, com 9 páginas:') +
        ul(['Páginas 1 e 2: disciplinas obrigatórias para integralizar.', 'Páginas 3 a 5: disciplinas eletivas.', 'Página 6: estágios complementares e disciplinas de livre escolha.', 'Páginas 7 e 8: resumo da trajetória e dos créditos que faltam para concluir o curso.']) +
        p('No SIGA: Serviços > Boletim/Histórico/CRID. Ele também é usado pelo professor orientador.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)” da Faculdade de Farmácia/UFRJ.'),
      chips: [{ label: 'Professor orientador', q: 'O que faz o professor orientador?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    cafar: {
      re: /cafar|centro academico|\bca\b (da |de )?farmacia|assembleia geral|eleicao(es)? (do |da |de )?(ca|cafar|centro)|representacao estudantil|representante estudantil|jalecos?|aluguel de|emprestimo de livro/,
      html: p('O <strong>CAFar</strong> (Centro Acadêmico de Farmácia da UFRJ) é o órgão máximo representativo dos alunos de graduação da Faculdade de Farmácia. Fica no <strong>Bloco L do CCS</strong> (sede legal: Av. Carlos Chagas Filho, 373).') +
        ul(['Todo aluno de graduação com matrícula ativa pode votar e opinar na <strong>Assembleia Geral</strong>, a instância máxima. Ela precisa ser convocada com pelo menos 7 dias de antecedência.', 'A <strong>Diretoria Executiva</strong> tem presidente, vice, tesoureiro, diretor geral e cinco diretorias: comunicação, infraestrutura, eventos, produtos e políticas estudantis. O mandato é de <strong>1 ano</strong>.', 'As eleições acontecem no <strong>segundo semestre</strong>, com voto direto e secreto, e o voto é facultativo para os estudantes.', 'A diretoria de <strong>infraestrutura</strong> administra o aluguel de jalecos, óculos e calculadoras, o empréstimo de livros e a venda de materiais de laboratório.', 'A de <strong>políticas estudantis</strong> faz a ponte entre alunos e professores e divulga bolsas, editais e estágios. A de <strong>eventos</strong> organiza a Semana da Farmácia.', 'Dois membros representam os alunos na Congregação da Faculdade.']) +
        fonte('Estatuto do CAFar-UFRJ (novembro de 2025).'),
      chips: [{ label: 'Bolsas e monitoria', q: 'Como funcionam as bolsas?' }, { label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    documentos: {
      re: /historico (escolar)?|boletim|carteira (de )?(estudante|estudantil)|declaracao de (matricula|aluno|vinculo)|comprovante de matricula|declaracao (que )?(sou|estou)|portal do aluno|portalaluno/,
      html: p('Onde pedir cada documento, segundo o Manual Estudantil:') +
        ul(['<strong>Histórico escolar oficial</strong>, <strong>boletim escolar</strong>, <strong>BOA</strong> e <strong>carteira de estudante</strong>: Secretaria Acadêmica da Unidade (no seu caso, a Secretaria de Graduação da Faculdade de Farmácia).', '<strong>Histórico não oficial</strong>, <strong>CRID</strong> e <strong>declaração de matrícula ativa</strong>: direto no Portal do Aluno (portalaluno.ufrj.br).']) +
        fonte(MANUAL + ', “Solicitação de Documentos”.'),
      chips: [{ label: 'Secretaria de Graduação', q: 'Como funciona o atendimento da secretaria?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    biblioteca: {
      re: /bibliotec|\bsibi\b|livros? (da )?(ufrj|faculdade)|emprestimo de livros?|acervo|base minerva/,
      html: p('As bibliotecas da UFRJ fazem parte do <strong>SiBI</strong> (Sistema de Bibliotecas e Informações), que gerencia as <strong>45 bibliotecas</strong> da universidade. Pelo site (sibi.ufrj.br) dá para consultar o catálogo e reservar livros online (Base Minerva), além de acessar livros e periódicos eletrônicos.') +
        p('Além disso, o CAFar empresta livros e aluga jalecos, óculos e calculadoras aos alunos da Farmácia.') +
        fonte(MANUAL + ', seção sobre o SiBI, e Estatuto do CAFar.'),
      chips: [{ label: 'Sobre o CAFar', q: 'Como funciona o CAFar?' }]
    },
    mobilidade: {
      re: /mobilidade|intercambio|estudar fora|ciencia sem fronteiras|escala estudantil|\bsmile\b|\bsgri\b|programa internacional|estudar no exterior/,
      html: p('A UFRJ oferece mobilidade internacional por meio de programas como a <strong>Mobilidade Regular</strong>, o <strong>ESCALA-Estudantil AUGM</strong>, o <strong>SMILE/Rede Magalhães</strong> e o <strong>REARI-RJ/Utrecht</strong>, entre outros. Quem cuida dos acordos é a Superintendência de Relações Internacionais (SGRI).') +
        p('Também existe o Programa de Mobilidade Acadêmica entre universidades. Regras e prazos mudam a cada edital: acompanhe os editais e fale com a coordenação do curso.') +
        fonte(MANUAL + ', seções sobre a SGRI e sobre os programas da Pró-Reitoria.'),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    mudancaCurso: {
      re: /mudanca de curso|mudar de curso|trocar de curso|transferencia (de curso|externa|especial|facultativa)|transferir (de )?(universidade|faculdade)|reingresso|mudanca de campus/,
      html: p('Mudança de curso, transferência externa (especial e facultativa), mudança de campus e reingresso são processos da <strong>Divisão de Acesso aos Cursos de Graduação da Pró-Reitoria de Graduação (PR-1)</strong>, que publica os editais e informa os prazos.') +
        p('Para a transferência da UFRJ para outra universidade, quem define as regras é a universidade de destino.') +
        fonte(MANUAL + ', “Divisões da PR1” e “Transferências”. ' + CONFIRME),
      chips: [{ label: 'Outro curso na UFRJ', q: 'Posso cursar disciplina de outro curso?' }]
    },
    calendario: {
      re: /calendario (academico|da ufrj|de atos)|datas (do )?(semestre|periodo)|quando (comecam|terminam|sao) (as )?(aulas|inscricoes|pedidos|trancamento)|inicio das aulas|fim do semestre|prazo (de|do|para) (trancamento|inscricao|pedido|alteracao)/,
      html: p('Não guardo as datas, porque elas mudam a cada semestre. O <strong>calendário acadêmico</strong> (inscrição, alteração, trancamento, início e fim das aulas) é definido pelo CEG e fica no site da Graduação da PR-1 (<strong>graduacao.ufrj.br</strong>) e no site da Graduação da Faculdade de Farmácia (<strong>graduacao.farmacia.ufrj.br</strong>).') +
        p('Vale conferir as datas todo semestre: perder o prazo de pedidos pode deixar a matrícula trancada automaticamente.') +
        fonte('Cartilha da Comissão de Orientação Acadêmica da FF e Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Trancamento automático', q: 'O que acontece se eu não fizer pedido de inscrição?' }]
    },
    semFonte: {
      re: /revisao de (nota|prova|grau)|rever (a )?(nota|prova)|segunda chamada|prova (de )?segunda|prova final|exame final|recuperacao|recurso (da|de|contra) (nota|prova)|nota errada|lista de espera|plano de ensino|criterio de avaliacao|edital de (monitoria|bolsa|selecao)/,
      html: p('Reconheci o assunto, mas <strong>não tenho a regra oficial sobre isso</strong> nos documentos que consulto (Manual Estudantil, PPC, cartilhas e informações da Secretaria). Prefiro não inventar.') +
        ul(['Sobre <strong>notas, provas, segunda chamada e plano de ensino</strong>: fale primeiro com o professor da disciplina e, se precisar, com o departamento ou a coordenação do curso.', 'Sobre <strong>vaga</strong>: no SIGA existem os pedidos, que concorrem pelos critérios de prioridade, e a alteração de inscrição para turmas com vagas ociosas. Não encontrei “lista de espera” nos documentos.', 'Sobre <strong>editais</strong>: acompanhe a divulgação do CAFar, da coordenação e da PR-1.']) +
        p('O que está no Manual sobre <strong>nota mínima e frequência</strong> eu sei explicar.'),
      chips: [{ label: 'Nota mínima e frequência', q: 'Qual a nota mínima e a frequência?' }, { label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    frequencia: {
      example: "Numa disciplina de 60 h, os 75% de presença significam que você pode faltar, no máximo, 15 h (cerca de um quarto das aulas).",
      re: /frequencia|quantas faltas|(limite|maximo) de faltas|posso faltar|\babono\b|reprov\w* por falta/,
      html: p('Para ser aprovado, você precisa de <strong>grau final ≥ 5</strong> <em>e</em> de <strong>frequência mínima de 75%</strong> das aulas. Quem não atinge os 75% é reprovado, mesmo com nota alta.') +
        p('Não existe abono de faltas na graduação, exceto nos casos previstos em lei (reservistas convocados e representantes na CONAES). Para quem não pode ir às aulas por doença, há os <strong>exercícios domiciliares</strong>, mediante atestado e autorização.') +
        fonte(MANUAL + ', “Avaliação de Rendimento” e “Frequência”.'),
      chips: [{ label: 'Exercícios domiciliares', q: 'Como funcionam os exercícios domiciliares?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]
    },
    nota: {
      example: "Grau final 4,9 reprova; 5,0 aprova, desde que a frequência seja de pelo menos 75%.",
      re: /nota minima|media (pra|para) (passar|aprovar)|nota (pra|para) (passar|aprovar)|quanto (preciso |eu preciso )?tirar|grau (minimo|final)|como (sou|e) aprovad/,
      html: p('A nota vai de 0 a 10, arredondada para uma casa decimal. Para ser aprovado e ganhar os créditos da disciplina, o <strong>grau final precisa ser ≥ 5,0</strong> e a frequência ≥ 75%.') +
        p('Quem reprova por média ou por frequência repete a disciplina inteira, e isso pesa no CRA.') + fonte(MANUAL + ', “Graus e Frequência”.'),
      chips: [{ label: 'Frequência mínima', q: 'Qual a frequência mínima?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]
    },
    cr: {
      re: /(como|qual).*(calcul\w*).*(cr|cra|coeficiente)|o que (e|eh) (o )?(cr|cra)\b|coeficiente de rendimento|\bcra\b.*(significa|calcula)|\bcr\b.*(significa|calcula)/,
      html: p('O <strong>CR</strong> (por período) e o <strong>CRA</strong> (acumulado) são a <strong>média ponderada das notas finais</strong>, tendo como peso o número de créditos de cada disciplina.') +
        p('Ele conta para bolsas e estágios. Disciplinas dispensadas (conceito T) não entram no cálculo.') + fonte(MANUAL + ', “Cálculo do Coeficiente de Rendimento”.'),
      chips: [{ label: 'Requisitos de bolsas', q: 'Quais os requisitos das bolsas?' }, { label: 'Dignidade Acadêmica', q: 'O que é Dignidade Acadêmica?' }]
    },
    trancDisc: {
      re: /tranc(ar|o|ei|amento) (uma |a |de |da )?(disciplina|materia|inscricao)|desist\w* d\w* (uma )?(disciplina|materia)|trancamento de (disciplina|inscricao)|largar (a |uma )?(disciplina|materia)/,
      html: p('Você pode desistir de uma inscrição em disciplina <strong>com autorização do professor orientador</strong>, desde que <strong>ainda não tenha passado 1/4 do período letivo</strong>.') +
        p('Atenção: depois de trancar, você não pode ficar com <strong>menos de 6 créditos</strong> inscritos no período.') + fonte(MANUAL + ', “Trancamento de Inscrição”.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }]
    },
    trancMat: {
      re: /tranc(ar|o|ei|amento) (a |o |minha )?(matricula|curso|faculdade)|trancamento de matricula|destranc/,
      html: p('O trancamento de matrícula pode ser pedido na Unidade <strong>a qualquer época, exceto na última metade do período letivo</strong>. Quem autoriza é o Diretor da Unidade, com parecer do orientador ou da COAA.') +
        ul(['A matrícula só pode ficar trancada por <strong>no máximo 4 períodos</strong> (seguidos ou não).', 'Quem entrou por concurso só tem pleno direito ao trancamento depois de cursar, com aprovação, <strong>12 créditos ou 180 horas-aula</strong> na UFRJ.', 'Se não pedir o retorno no prazo, a matrícula é cancelada por abandono.', 'Quem não se inscreve em disciplinas no prazo tem a matrícula <strong>trancada automaticamente</strong>.']) +
        fonte(MANUAL + ', “Trancamento de Matrícula” e “Trancamento Automático”.'),
      chips: [{ label: 'Cancelamento de matrícula', q: 'Quando a matrícula é cancelada?' }, { label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }]
    },
    cancelamento: {
      re: /cancel\w* (de |da |a )?matricula|matricula (e |eh |foi |pode ser |sera )?cancelad|jubil|perder a matricula|ser desligad|desligamento|abandono de curso/,
      html: p('A matrícula pode ser cancelada quando o aluno:') +
        ul(['não se inscreve em disciplinas em um período letivo (abandono);', 'tem <strong>CR abaixo de 3,0 em três períodos regulares consecutivos</strong>;', 'ultrapassa o <strong>prazo máximo</strong> de integralização;', 'reprova <strong>quatro vezes na mesma disciplina</strong>;', 'sofre sanção disciplinar.']) +
        p('Para evitar, mantenha as inscrições em dia e acompanhe o rendimento e o prazo.') + fonte(MANUAL + ', “Cancelamento de Matrícula”.'),
      chips: [{ label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }, { label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }]
    },
    prazoMax: {
      re: /prazo maximo|tempo maximo|quanto tempo (eu )?(tenho|posso)|em quantos periodos|duracao do curso|quantos anos (tem|dura|leva)|prazo (pra|para) (me )?formar|integralizacao/,
      html: p('O prazo máximo é o prazo normal do curso <strong>multiplicado por 1,5</strong>. A Farmácia tem 5 anos (10 períodos) de duração normal, então o limite é de <strong>15 períodos (7 anos e meio)</strong>.') +
        p('Períodos em que a matrícula esteve cancelada por abandono também contam. Pedidos de prorrogação passam pela Coordenação.') +
        fonte(MANUAL + ', “Prazo Máximo para Integralização Curricular” (a conta de 15 períodos é a aplicação da regra aos 10 períodos do ' + PPC + ').'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Cancelamento de matrícula', q: 'Quando a matrícula é cancelada?' }]
    },
    cargaHoraria: {
      re: /carga horaria (total|do curso|da farmacia)|quantas horas (tem|tem o|e o|sao) (o )?curso|horas (totais|do curso)|\b4150\b|\b4\.?150\b/,
      html: p('O curso de Farmácia tem <strong>4.150 horas</strong> no total:') +
        ul(['Disciplinas obrigatórias: <strong>2.610 h</strong>', 'Estágios curriculares: <strong>840 h</strong>', 'Extensão: <strong>415 h</strong>', 'Optativas de escolha condicionada: <strong>180 h</strong>', 'Atividades complementares: <strong>60 h</strong>', 'TCC: <strong>45 h</strong>']) +
        fonte(PPC + ', Tabela 1.'),
      chips: [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'Extensão', q: 'Como funciona a extensão?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    extensao: {
      re: /extensao|\b415\b|horas de extensao/,
      html: p('São <strong>415 horas de extensão</strong>, e a Atividade Curricular de Extensão fica disponível durante <strong>todo o período</strong> do curso, não só no 1º semestre.') +
        p('Valem ações registradas no SIGA de outras Unidades, de outras instituições (que sigam as diretrizes de extensão), de empresas juniores e de ligas acadêmicas com docente tutor. Não pode ser cumprida só com cursos e eventos.') +
        fonte(PPC + ', seção de Extensão.'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    complementares: {
      re: /atividades? complementares?|\bacs?\b (conta|valem|horas)|horas complementares/,
      html: p('Você precisa de <strong>60 horas</strong> de atividades complementares, em <strong>no mínimo duas modalidades diferentes</strong>.') +
        ul(['Contam monitorias, estágios não obrigatórios, iniciação científica, extensão, eventos, cursos, ligas acadêmicas e estudos em áreas afins.', 'Cada atividade dura no mínimo <strong>3 semanas</strong> (20 h semanais), vale no máximo <strong>45 h por modalidade</strong> e pode levar até 2 períodos.', 'Depois do relatório aprovado, a atividade é registrada no SIGA.']) +
        fonte(PPC + ', “Atividades Complementares”.'),
      chips: [{ label: 'Extensão', q: 'Como funciona a extensão?' }, { label: 'Requisitos de bolsas', q: 'Quais os requisitos das bolsas?' }]
    },
    tcc: {
      re: /(regras?|como funciona|o que (e|eh)|quantas horas|orientador|defesa|banca|pre ?requisito).*\btcc\b|\btcc\b.*(regras|orientador|defesa|banca|como funciona|horas|individual)|trabalho de conclusao de curso|monografia/,
      html: p('O <strong>TCC</strong> vale <strong>45 horas</strong> e é obrigatório para a colação de grau. É <strong>individual</strong>, sobre ciências farmacêuticas, com orientador aceito pela Comissão de TCC.') +
        p('Ele é um requisito curricular (FFWK02), oferecido no <strong>9º período</strong> do integral e no 11º do noturno, e exige antes o requisito de Pesquisa e Desenvolvimento / Iniciação Científica (FFWX02). Relatório de IC não vale como TCC, mas a IC pode virar monografia.') +
        fonte(PPC + ', Anexo II (Manual de TCC).'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    dignidade: {
      re: /dignidade academica|cum laude|summa|magna|laude|diploma de honra/,
      html: p('A <strong>Dignidade Acadêmica</strong> vai para quem conclui com <strong>CRA acima de 8 em todos os períodos</strong>, dentro do tempo normal do curso e sem sanção disciplinar.') +
        ul(['<strong>Cum Laude</strong>: CRA ≥ 8,0', '<strong>Magna Cum Laude</strong>: CRA ≥ 9,0', '<strong>Summa Cum Laude</strong>: CRA ≥ 9,5']) +
        p('O pedido é feito na Divisão de Registro de Estudante (DRE), em qualquer época do ano.') + fonte(MANUAL + ', “Dignidade Acadêmica”.'),
      chips: [{ label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }, { label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }]
    },
    bolsas: {
      re: /bolsas?\b|monitoria|pibiac|requisitos? (de|das|pra|para) bolsas?|iniciacao artistica/,
      html: p('Requisitos de algumas bolsas de graduação (os editais anuais podem acrescentar regras):') +
        ul(['<strong>Monitoria</strong>: nota ≥ 7 na disciplina, CRA ≥ 6, sem sanção disciplinar; 8 a 12 h semanais, por até 10 meses.', '<strong>PIBIAC</strong> (artístico-cultural): a partir do 3º período, CRA ≥ 6; 8 a 12 h semanais, de 3 a 12 meses.', '<strong>PAEALIG</strong> (laboratórios de informática): CRA ≥ 6 e sem sanção; 8 a 12 h semanais, por até 12 meses.']) +
        p('Não é permitido acumular bolsas acadêmicas; só com bolsa de natureza assistencial (auxílio ou auxílio manutenção).') + fonte(MANUAL + ', “Bolsa Monitoria”, “PIBIAC” e “PAEALIG”.'),
      chips: [{ label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    outroCurso: {
      re: /(outro|outros) curso|fora do curriculo|disciplinas? (de|do) outro|cursar (em|no) outro|materia de outro/,
      html: p('Dá para cursar disciplinas de outros cursos da UFRJ se houver <strong>vaga, requisitos cumpridos, horário compatível e aceitação do Departamento</strong>.') +
        p('As disciplinas fora do seu currículo não podem passar de <strong>1/3</strong> das disciplinas em que você está inscrito, e os créditos delas não podem superar os créditos das disciplinas do seu currículo. Vale sempre o limite de <strong>6 a 32 créditos</strong> por período.') +
        fonte(MANUAL + ', seção sobre inscrição em disciplinas.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Dispensa de disciplina', q: 'Como pedir dispensa de disciplina?' }]
    },
    dispensa: {
      re: /dispens\w* (de |da |d[ea] )?(disciplina|materia)|dispensa\b|equivalencia|aproveitamento de estudos|aproveit\w* (de )?(disciplina|materia|credito)|cursei em outra (faculdade|instituicao|universidade)|credito transferido/,
      html: p('Você pode pedir dispensa de uma disciplina que <strong>cursou em outra instituição antes de ingressar na UFRJ</strong>, se o conteúdo for equivalente. O pedido vai à Secretaria Acadêmica da Unidade e uma comissão compara programa, carga horária, data e aprovação (Resolução CEG nº 01/2017).') +
        p('A disciplina entra no histórico com o conceito <strong>T</strong> (crédito transferido) e <strong>não entra no CR</strong>.') + fonte(MANUAL + ', “Dispensa de Disciplinas”.'),
      chips: [{ label: 'Cursar em outro curso', q: 'Posso cursar disciplina de outro curso?' }]
    },
    notaI: {
      re: /nota i\b|grau i\b|conceito i\b|incompleto|\bi\b.*(historico|boletim)/,
      html: p('O grau <strong>“I”</strong> (incompleto) pode ser dado pelo professor quando, por motivo justificado, você não conseguiu cumprir todos os atos acadêmicos.') +
        p('Ele precisa ser trocado por uma nota em até <strong>15 dias</strong>. Passado o prazo, a DRE lança <strong>zero</strong> como nota final. Por isso, fale com o professor logo.') + fonte(MANUAL + ', “Cuidado com a nota I”.'),
      chips: [{ label: 'Nota mínima', q: 'Qual a nota mínima para passar?' }]
    },
    domiciliar: {
      re: /exercicios? domiciliares?|regime domiciliar|atestado medico|licenca (medica|maternidade)|estou doente|afastamento/,
      html: p('Quem não pode frequentar as aulas por um tempo pode pedir <strong>exercícios domiciliares</strong>, com atestado médico. Não é abono de faltas: você faz os trabalhos em casa, sob supervisão do professor, dentro do prazo do atestado.') +
        p('A concessão não é automática, e <strong>aulas práticas de laboratório e estágios não entram</strong>. Nesses casos, o indicado é o <strong>trancamento de matrícula</strong>.') + fonte(MANUAL + ', “Tratamentos Excepcionais”.'),
      chips: [{ label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }, { label: 'Frequência mínima', q: 'Qual a frequência mínima?' }]
    },
    credito: {
      example: "Uma disciplina teórica de 4 créditos tem 60 h por semestre (4 × 15). Uma prática de 2 créditos também tem 60 h (2 × 30).",
      re: /\bo que (e|eh|sao) (um |o |os )?creditos?\b|\b(um|1) credito (equivale|vale|e|tem)\b|\bcredito equivale\b|quanto vale (um|1) credito|quantas horas (tem|vale|e) (um|1) credito|como (se )?calcula (o )?credito/,
      html: p('Na UFRJ, <strong>1 crédito equivale a 15 horas de aula teórica ou a 30 horas de aula prática</strong> por semestre. Nas disciplinas mistas, as atividades de extensão e pesquisa contam como horas teóricas.') +
        p('Já nos requisitos curriculares suplementares (RCS), 1 crédito corresponde a algo entre 45 e 90 horas, definido pelo Departamento responsável.') + fonte(MANUAL + ', seção sobre o cálculo do crédito.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }]
    },
    ru: {
      re: /\bru\b|bandej|restaurante universitario|cardapio|onde (comer|almocar)|almoco/,
      html: p('Pelo Manual Estudantil, os restaurantes universitários da UFRJ ficam em:') +
        ul(['<strong>RU Central</strong> (Edson Luís de Lima Souto), ao lado da EEFD, Av. Carlos Chagas Filho, s/n · (21) 3938-6840', '<strong>RU do CT</strong>, Av. Athos da Silveira Ramos, 149, entrada principal do Bloco A', '<strong>RU da Faculdade de Letras</strong>, Av. Horácio Macedo, 2151, Bloco G · (21) 3938-9737', 'Outros: IFCS (Centro), Praia Vermelha e Duque de Caxias']) +
        p('Ainda <strong>não consigo mostrar o cardápio do dia</strong>: o manual não traz isso e eu não acesso a internet.') + fonte(MANUAL + ', “Alimentação”.'),
      chips: []
    }
  };

  var ORDER = ['documentos', 'biblioteca', 'mobilidade', 'mudancaCurso', 'calendario', 'coordenacao', 'secretaria', 'situacaoSiga', 'crid', 'umTerco', 'trancAuto', 'agf', 'concomitancia', 'trocaTurma', 'pedidoInscricao', 'vagas', 'sobreposicao', 'boa', 'cafar', 'planoEstudos', 'credito', 'trancDisc', 'trancMat', 'cancelamento', 'prazoMax', 'cargaHoraria', 'complementares', 'extensao', 'tcc', 'orientador', 'dignidade', 'bolsas', 'outroCurso', 'dispensa', 'notaI', 'domiciliar', 'frequencia', 'nota', 'cr', 'ru', 'semFonte', 'atendimento'];

  function match(n) {
    for (var i = 0; i < ORDER.length; i++) {
      var t = T[ORDER[i]];
      if (t.re.test(n)) return { id: ORDER[i], html: t.html, chips: t.chips, example: t.example || '' };
    }
    return null;
  }

  window.FarmaRegras = { match: match, ids: ORDER.slice() };
})();
