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
    frequencia: {
      re: /frequencia|quantas faltas|(limite|maximo) de faltas|posso faltar|abono de faltas|reprov\w* por falta/,
      html: p('Para ser aprovado, você precisa de <strong>grau final ≥ 5</strong> <em>e</em> de <strong>frequência mínima de 75%</strong> das aulas. Quem não atinge os 75% é reprovado, mesmo com nota alta.') +
        p('Não existe abono de faltas na graduação, exceto nos casos previstos em lei (reservistas convocados e representantes na CONAES). Para quem não pode ir às aulas por doença, há os <strong>exercícios domiciliares</strong>, mediante atestado e autorização.') +
        fonte(MANUAL + ', “Avaliação de Rendimento” e “Frequência”.'),
      chips: [{ label: 'Exercícios domiciliares', q: 'Como funcionam os exercícios domiciliares?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]
    },
    nota: {
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
      re: /dispens\w* (de |da |d[ea] )?(disciplina|materia)|dispensa\b|aproveit\w* (de )?(disciplina|materia|credito)|cursei em outra (faculdade|instituicao|universidade)|credito transferido/,
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

  var ORDER = ['credito', 'trancDisc', 'trancMat', 'cancelamento', 'prazoMax', 'cargaHoraria', 'complementares', 'extensao', 'tcc', 'dignidade', 'bolsas', 'outroCurso', 'dispensa', 'notaI', 'domiciliar', 'frequencia', 'nota', 'cr', 'ru'];

  function match(n) {
    for (var i = 0; i < ORDER.length; i++) {
      var t = T[ORDER[i]];
      if (t.re.test(n)) return { id: ORDER[i], html: t.html, chips: t.chips };
    }
    return null;
  }

  window.FarmaRegras = { match: match, ids: ORDER.slice() };
})();
