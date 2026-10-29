/* FarmacIA — assistente de perguntas sobre a grade.
 * NÃO usa IA generativa nem rede: interpreta a pergunta com regras simples e responde
 * com a lógica que o app já tem (checkReqs, getPrereqLockedSubjects, rankDisciplineSearch...).
 * Carregado depois de app.js; usa suas funções globais. Todo o texto das respostas é gerado
 * aqui, em português (o contêiner das mensagens tem data-no-i18n). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return escapeHTML(String(v == null ? '' : v)); };

  // ---------- utilidades ----------
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
  function plural(n, one, many) { return n === 1 ? one : many; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function listNames(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }
  function periodLabel(m) { return periodIsCond(m.periodo) ? 'Escolha condicionada' : m.periodo + 'º período'; }
  function statusOf(m) { return getSubjectStatus(m); }
  var STATUS_TEXT = { passed: 'cursada', eligible: 'disponível', blocked: 'bloqueada' };

  function bold(m) { return '<strong>' + esc(formatName(m)) + '</strong>'; }
  function codeTag(m) { return '<span class="subject-code">' + esc(m.codigo) + '</span>'; }

  function rowHTML(m, extra) {
    var st = statusOf(m);
    var meta = codeTag(m) + ' · ' + esc(periodLabel(m)) + ' · ' + esc(creditsOf(m)) + ' créd.' + (extra ? ' · ' + esc(extra) : '');
    return '<button type="button" class="farma-row" data-farma-ask="Sobre ' + esc(m.codigo) + '" data-farma-label="Sobre ' + esc(formatName(m)) + '">' +
      '<span class="farma-dot is-' + st + '" aria-hidden="true"></span>' +
      '<span class="farma-row-main"><strong>' + esc(formatName(m)) + '</strong><small>' + meta + ' · ' + STATUS_TEXT[st] + '</small></span></button>';
  }
  function rowsHTML(list, max) {
    var shown = max ? list.slice(0, max) : list;
    var html = '<div class="farma-rows">' + shown.map(function (m) { return rowHTML(m); }).join('') + '</div>';
    if (max && list.length > max) html += '<p class="farma-note">…e mais ' + (list.length - max) + '.</p>';
    return html;
  }
  function p(html) { return '<p>' + html + '</p>'; }
  function verdict(kind, text) { return '<span class="farma-verdict is-' + kind + '">' + esc(text) + '</span>'; }

  // ---------- requisitos ----------
  // Replica checkReqs, mas devolvendo o que falta. Com "OU", mostra o grupo mais próximo de ser cumprido.
  function missingOf(m) {
    if (!m.pre) return { missing: [], alternatives: false };
    var groups = m.pre.replace(/;/g, ' E ').split(/\s+OU\s+/i).map(function (g) { return g.trim(); }).filter(Boolean);
    var best = null;
    groups.forEach(function (g) {
      var miss = extractCodes(g).filter(function (c) { return !appState.concludedCodes.has(c); });
      if (best === null || miss.length < best.length) best = miss;
    });
    return { missing: (best || []).map(getDisciplinaByCode).filter(Boolean), alternatives: groups.length > 1 };
  }
  function prereqList(m) { return extractCodes(m.pre).map(getDisciplinaByCode).filter(Boolean); }
  function coreqDirect(m) { return extractCodes(m.co).map(getDisciplinaByCode).filter(Boolean); }

  // ---------- reconhecimento da disciplina na pergunta ----------
  var STOP = ('posso puxar pegar cursar fazer consigo consegue da dá pra para pro pode podem ja já ' +
    'tranca trancam trancar trava libera destrava destrancar liberada liberado liberadas liberados ' +
    'pre requisito requisitos prerequisito prerequisitos co correquisito correquisitos ' +
    'qual quais que quem quanto quantos quantas tem tenho tenha creditos credito carga horaria horas hora ' +
    'materia materias disciplina disciplinas me minha meu sobre informacoes informacao info detalhes ' +
    'falta faltam preciso precisa precisar necessario junto com ao mesmo tempo ' +
    'eh e o a os as de do da dos das no na nos nas um uma uns umas em ' +
    'por favor voce vc diga fale explique explica mostra mostre ver quero queria saber ' +
    'esta estao estou to ficou fica seria sao ser periodo proximo atual agora hoje tudo bem ' +
    'oi ola opa eae salve hey hello bom boa dia tarde noite obrigado obrigada valeu ' +
    'condicionada condicionadas optativa optativas eletiva eletivas obrigatoria obrigatorias ' +
    'nao nem pq porque por gostaria poderia mim alguma algum assim entao mas so apenas vou ficar sera ainda cursando cursei juntas juntos ambas ambos tambem codigo tipo carga quantas quantos horas').split(' ');
  var STOP_SET = {};
  STOP.forEach(function (w) { STOP_SET[w] = true; });

  // ---- siglas: CIF I..VII, PCQ I..VII, MACF, QFIIT... (gerado a partir dos nomes + alguns apelidos) ----
  var ROMAN_VAL = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  var aliasMap = null;
  function buildAliases() {
    aliasMap = {};
    disciplinas.forEach(function (d) {
      var m;
      if ((m = /^Cuidado Integrado em Farm[aá]cia ([IVX]+)\b/.exec(d.nome))) aliasMap['cif ' + m[1].toLowerCase()] = d.codigo;
      if ((m = /^Produ[cç][aã]o e Controle de Qualidade (?:de Produtos Farmac[eê]uticos|em Farm[aá]cia) ([IVX]+)\b/.exec(d.nome))) {
        aliasMap['pcq ' + m[1].toLowerCase()] = d.codigo;
        aliasMap['pcqf ' + m[1].toLowerCase()] = d.codigo;
      }
      var par = /\(([A-Za-z ]{2,12})\)/.exec(d.nome);
      if (par) aliasMap[norm(par[1])] = d.codigo;
    });
    [['qfiit', 'FFW352'], ['qfm i', 'FFW242'], ['qfm ii', 'FFW352'], ['tcc', 'FFWK03'], ['libras', 'LEB599']].forEach(function (a) {
      if (getDisciplinaByCode(a[1])) aliasMap[a[0]] = a[1];
    });
  }
  function aliasSubject(text) {
    if (!aliasMap) buildAliases();
    // "cif4" -> "cif 4"; "cif 4" -> "cif iv"
    var n = norm(text).replace(/([a-z])(\d)/g, '$1 $2');
    n = n.replace(/\b(cif|pcqf|pcq|qfm)\s+([1-8])\b/g, function (_, a, d) { return a + ' ' + ROMAN[Number(d)]; });
    var keys = Object.keys(aliasMap).sort(function (x, y) { return y.length - x.length; });
    for (var i = 0; i < keys.length; i += 1) {
      if ((' ' + n + ' ').indexOf(' ' + keys[i] + ' ') >= 0) return getDisciplinaByCode(aliasMap[keys[i]]);
    }
    return null;
  }

  function codesIn(text) {
    var out = [];
    norm(text).split(' ').forEach(function (tok) {
      if (tok.length === 6 || tok.length === 4) {
        var m = getDisciplinaByCode(tok.toUpperCase());
        if (m && out.indexOf(m) < 0) out.push(m);
      }
    });
    return out;
  }

  function stripIntent(text) {
    return norm(text).split(' ').filter(function (t) { return t && !STOP_SET[t] && !/^\d{1,2}$/.test(t); });
  }

  // O ranking da busca é tolerante demais para uma pergunta ("dia" casa com Diabetes). Aqui exigimos
  // que cada palavra da pergunta apareça no nome da disciplina (ou seja um erro de digitação claro).
  function validatesAgainst(mat, tokens, score) {
    var hay = norm(formatName(mat) + ' ' + mat.nome);
    return tokens.every(function (t) {
      if (t.length < 3) return true;
      if (hay.indexOf(t) >= 0) return true;
      return t.length >= 6 && score >= 700;
    });
  }

  var MIN_SCORE = 520;
  function findSubjects(text) {
    var byCode = codesIn(text);
    if (byCode.length) return { list: byCode, ambiguous: false };
    var al = aliasSubject(text);
    if (al) return { list: [al], ambiguous: false };

    var tokens = stripIntent(norm(text).replace(/\b([a-z]{4,}) ([1-8])\b(?! (periodo|semestre|creditos|credito|horas))/g, function (_, w, d) { return w + ' ' + ROMAN[Number(d)]; }));
    if (!tokens.length) return { list: [], ambiguous: false };
    var best = rankDisciplineSearch(tokens.join(' '));
    if (!best.length || best[0].score < MIN_SCORE) return { list: [], ambiguous: false };
    best = best.filter(function (r) { return validatesAgainst(r.mat, tokens, r.score); });
    if (!best.length) return { list: [], ambiguous: false };
    var top = best[0].score;
    var close = best.filter(function (r) { return r.score >= top * 0.93; }).slice(0, 5);
    if (close.length === 1) return { list: [best[0].mat], ambiguous: false };
    return { list: close.map(function (r) { return r.mat; }), ambiguous: true };
  }

  // ---------- tolerância a erros de digitação ----------
  // Abreviações de chat e letras repetidas viram palavras comuns; palavras quase iguais às que o
  // assistente conhece ("poso", "pre-requizito", "trancmento") são corrigidas só para entender a intenção.
  // O reconhecimento de disciplinas continua usando a busca do app, que já é tolerante.
  var ABBR = { oq: 'o que', vc: 'voce', vcs: 'voces', pd: 'pode', pq: 'por que', q: 'que', qq: 'que', tb: 'tambem', tbm: 'tambem',
    qto: 'quanto', qtos: 'quantos', qts: 'quantos', qtas: 'quantas', qdo: 'quando', kd: 'cade', td: 'tudo', msm: 'mesmo',
    pfv: 'por favor', pf: 'por favor', obg: 'obrigado', vlw: 'valeu', blz: 'beleza', flw: 'falou', n: 'nao', ta: 'esta',
    to: 'estou', mt: 'muito', d: 'de', p: 'para', c: 'com', sla: 'sei la', mi: 'me', pra: 'pra', dps: 'depois', hj: 'hoje', cmg: 'comigo',
    oi: 'oi', ola: 'ola', eae: 'eae', bjs: 'beijos', ss: 'sim', sdds: 'saudades', ctz: 'certeza', agr: 'agora', vdd: 'verdade' };
  var VOCAB = ('posso puxar pegar cursar fazer consigo consegue pode podem liberada liberado disponivel disponiveis ' +
    'requisito requisitos prerequisito prerequisitos correquisito correquisitos tranca trancam trancar trancamento destrancar ' +
    'trava libera destrava depende dependem matricula inscricao creditos credito faltam falta restam quantos quantas quanto ' +
    'periodo periodos disciplina disciplinas materia materias obrigatorias obrigatoria condicionadas condicionada optativas eletivas ' +
    'frequencia faltas presenca reprovar reprovado aprovado aprovacao nota bolsa bolsas monitoria extensao complementares atividades ' +
    'carga horaria horario horarios horas prazo maximo maxima minimo minima cancelamento cancelar cancelada dignidade academica calculado calculo coeficiente ' +
    'dispensa dispensar domiciliares atestado cardapio bandejao restaurante ajuda ajudar funciona progresso siga limite ' +
    'informacoes informacao detalhes sobre nome chamar chama chame ola voce pode sabe faz fazer ' +
    'responder funcoes semestre integralizacao formar formatura curso sugestao sugere quais qual quem quando como porque ' +
    'periodo proximo agora hoje tudo bem tranque tranquei trancada abandono jubilamento monografia orientador banca').split(' ');
  var VOCAB_SET = {};
  VOCAB.forEach(function (w) { VOCAB_SET[w] = true; });

  function editDistance(a, b) { // Damerau-Levenshtein (trocas de letras vizinhas contam 1)
    var al = a.length, bl = b.length, i, j, d = [];
    for (i = 0; i <= al; i += 1) { d[i] = [i]; }
    for (j = 0; j <= bl; j += 1) { d[0][j] = j; }
    for (i = 1; i <= al; i += 1) {
      for (j = 1; j <= bl; j += 1) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[al][bl];
  }
  function snapWord(t) {
    if (VOCAB_SET[t] || t.length < 4 || /\d/.test(t)) return t;
    var limit = t.length >= 8 ? 2 : 1, best = null, bestD = 99, tie = false;
    for (var i = 0; i < VOCAB.length; i += 1) {
      var v = VOCAB[i];
      if (v.charAt(0) !== t.charAt(0) || Math.abs(v.length - t.length) > limit) continue;
      var dist = editDistance(t, v);
      if (dist > limit) continue;
      if (dist < bestD) { best = v; bestD = dist; tie = false; } else if (dist === bestD && v !== best) tie = true;
    }
    return best && !tie ? best : t;
  }
  function fuzzyNorm(raw) {
    var out = [];
    norm(raw).replace(/(.)\1{2,}/g, '$1$1').split(' ').forEach(function (t) {
      if (!t) return;
      if (ABBR[t] !== undefined) { out.push(ABBR[t]); return; }
      out.push(snapWord(t));
    });
    return out.join(' ');
  }

  // ---------- intenções ----------
  var lastSubject = null;
  var lastIntentId = null;

  function has(n, re) { return re.test(n); }
  function words(n) { return n ? n.split(' ').length : 0; }

  // Várias disciplinas numa pergunta: "posso puxar CIF I e Farmacocinética juntas?"
  function findMany(text) {
    var parts = String(text).split(/\s*(?:,|;|\be\b|\bcom\b|\bmais\b|\bmas\b|\bou\b)\s*/i).filter(Boolean);
    var out = [];
    parts.forEach(function (part) {
      var f = findSubjects(fuzzyNorm(part));
      if (f.list.length === 1 && out.indexOf(f.list[0]) < 0) out.push(f.list[0]);
    });
    return out;
  }
  function numberIn(n) {
    var m = /\b(\d{1,2})\b/.exec(n);
    return m ? Number(m[1]) : null;
  }

  function classify(raw) {
    var n = fuzzyNorm(raw);
    if (!n) return { id: 'empty' };
    var nw = words(n);
    var entityHint = codesIn(raw).length > 0 || !!aliasSubject(raw);

    // 1) Conversa
    if (!entityHint && has(n, /\bquem (e|eh) (voce|a farmacia)\b/)) return { id: 'who' };
    if (!entityHint && nw <= 5 && has(n, /\b(tudo bem|td bem|como (voce )?(vai|esta|ta|anda)|como foi o dia)\b/)) return { id: 'howare' };
    if (!entityHint && nw <= 5 && has(n, /^(oi+|ola|opa|eae|e ai|salve|hey|hello|ei|fala|bom dia|boa tarde|boa noite|boa madrugada)( |$)/)) return { id: 'greet', part: /bom dia|boa tarde|boa noite/.exec(n) };
    if (nw <= 6 && has(n, /\b(obrigad[oa]|brigad[oa]|valeu|thanks|agradeco|grat[oa])\b/)) return { id: 'thanks' };
    if (nw <= 6 && has(n, /\b(tchau|ate mais|ate logo|ate amanha|falou|fui nessa|xau)\b/)) return { id: 'bye' };
    if (nw <= 3 && has(n, /^(ok|okay|beleza|certo|entendi|entendido|show|legal|massa|top|perfeito|otimo|combinado|sim|nao|talvez|hum|aham|uhum|boa)$/)) return { id: 'ack', word: n };
    if (nw <= 8 && !entityHint && has(n, /\b(inteligente|incrivel|genial|gostei|amei|adorei|mandou bem|parabens|voce e (muito )?(boa|legal|util|top)|ajudou)\b/)) return { id: 'praise' };
    if (nw <= 10 && !entityHint && has(n, /\b(burra|burro|idiota|inutil|lixo|pessima|pessimo|nao entende|nao entendeu|nao serve|nao era isso|errou|resposta errada|que droga|nao ajuda)\b/)) return { id: 'frustrated' };

    // 2) Sobre ela e sobre o usuário
    if (has(n, /\b(qual (e )?(o )?meu nome|sabe (o )?meu nome|como (voce )?me chama|lembra (do )?meu nome|quem sou eu)\b/)) return { id: 'myname' };
    if (has(n, /\b(me chama(r)? (de|por)|me chame (de|por)|pode me chamar|meu nome (e|eh)|(mudar|trocar|alterar) (o )?(meu )?nome|esquecer (o )?(meu )?nome|apagar (o )?(meu )?nome|quero ser chamad[oa])\b/)) return { id: 'setname' };
    if (has(n, /\b(me trat[ae]|trate me|meus pronomes|meu pronome|(mudar|trocar|alterar) (o )?(meu )?(pronome|genero)|no (masculino|feminino|neutro)|sou (homem|mulher|menino|menina|garoto|garota|rapaz|moca|nao binario|nao binaria|nao binarie))\b/)) return { id: 'setpron' };
    if (has(n, /\b(meu periodo (e|eh|atual (e|eh))|estou (no|na|cursando o|cursando) \d|to (no|na) \d|sou do \d+|estou n[oa] \d+)\b/) && numberIn(n)) return { id: 'setperiod', value: numberIn(n) };
    if (!entityHint && has(n, /\b(quem (e|eh) (voce|farmacia)|quem (te )?(criou|fez|desenvolveu|programou)|qual (e )?(o )?seu nome|como (voce )?(se )?chama|o que (e|eh) (voce|a farmacia)|voce (e|eh) (uma )?(ia|robo|bot|humano|gente|pessoa)|(usa|tem) (ia|chatgpt|gpt|inteligencia artificial)|inteligencia artificial|e beta|beta)\b/)) return { id: 'who' };
    // 2b) Regras oficiais da UFRJ / PPC
    var rule = window.FarmaRegras && window.FarmaRegras.match(n);
    if (rule) return { id: 'rule', rule: rule };

    if (has(n, /\bo que voce (pode|sabe|faz|consegue)\b|\bo que (pode|sabe|faz|consegue) (me )?(fazer|ajudar|responder)\b|\bo que (voce )?(pode|sabe) fazer\b|\bcomo (voce )?(pode|consegue) (me )?ajudar\b|\b(suas|quais (sao )?(as )?suas) (funcoes|funcionalidades|habilidades|capacidades)\b|\bpara que (voce )?serve\b|\bpra que (voce )?serve\b|\bo que (da|dá) pra (voce )?fazer\b|^(me )?(ajuda|ajude|help|comandos|exemplos|menu)( por favor)?$|\bpreciso de ajuda\b|\bcomo (voce )?(funciona|usa|usar)\b|\bquais (perguntas|coisas) (posso|da pra)\b/)) return { id: 'about' };

    if (!entityHint && has(n, /\b(email|e mail|contato|contatos|telefone|professor|professora|coordenador|coordenadora|coordenacao|secretaria|chefe)\b/) && !has(n, /\b(regras?|prazo|trancar|bolsa|monitoria)\b/)) return { id: 'contacts' };
    if (!entityHint && has(n, /\b(horario|horarios|sala|salas|resultado|boletim|calendario|feriado|greve|que dia|que horas|clima|tempo|previsao)\b/)) return { id: 'offscope' };

    // 4) Seu progresso e planejamento
    if (has(n, /\b(glossario|o que (e|eh|significa|quer dizer|sao) (um |uma |o |a |os |as )?(pre ?requisitos?|co ?requisitos?|correquisitos?|escolha condicionada|condicionadas?|optativas?|eletivas?|obrigatorias?|crid|siga|rcs|cr|cra))\b/)) return { id: 'glossary', term: n };
    if (!entityHint && has(n, /\b(monte|montar|monta|sugira|sugere|sugestao (de )?(grade|plano)|planeje|planejar|plano ideal|grade ideal|me ajuda a (montar|escolher|planejar)|qual (grade|plano)|organiza (meu|o) (periodo|semestre))\b/)) return { id: 'plan', target: (function () { var t = /\b(\d{2}) creditos?\b/.exec(n); return t ? Number(t[1]) : null; })() };
    if (!entityHint && has(n, /\b(o que mais (destrava|libera|importa|ajuda|tranca)|qual (a )?(mais )?(importante|urgente)|prioridades?|priorizar|por onde (comecar|eu comeco)|qual puxar primeiro|o que puxar primeiro|gargalo|mais importante)\b/)) return { id: 'priority' };
    if (!entityHint && has(n, /\b(sem (pre ?requisitos?|requisitos?)|nao (tem|tenho|possuem) (pre ?requisitos?|requisitos?)|que nao (tem|precisam de|exigem) (pre ?)?requisitos?|livres de requisito)\b/)) return { id: 'free' };
    if (!entityHint && has(n, /\b(o que (eu )?(ja )?(cursei|fiz|completei|conclui)|quais (eu )?(ja )?(cursei|fiz|completei)|minhas (cursadas|concluidas)|ja cursadas|quantas (materias|disciplinas) (eu )?(ja )?(cursei|fiz|completei))\b/)) return { id: 'done' };
    if (has(n, /\b(quant[oa]s? (creditos?|horas?|materias?|disciplinas?|obrigatorias?)( ja)? (faltam|falta|restam|resta|fiz|cursei|tenho|completei)|quanto (me )?falta|falta(m)? (pra|para) (eu )?(me )?formar|(meu|o meu) progresso|progresso|como (eu )?(to|estou)|em que ponto|ja cumpri|quanto (ja )?(cursei|fiz)|falta muito)\b/)) return { id: 'progress' };
    if (has(n, /\b(limite|maximo|minimo|carga minima|carga maxima).*(credito|siga|puxar)|(quantos|qual).*(creditos|credito).*(posso|pode|da pra|permite|aceita|limite)|siga (aceita|permite)\b/)) return { id: 'siga' };
    if (has(n, /\b(proximo periodo|qual (e )?(o )?meu periodo|em que periodo (eu )?(estou|to)|periodo atual)\b/)) return { id: 'nextPeriod' };
    if (has(n, /\b(quais|que|o que) (as )?(materias|disciplinas|obrigatorias|condicionadas)?.*(faltam|falta|restam|ainda falta|falto)( cursar| fazer)?|o que (ainda )?falta cursar|materias que faltam|disciplinas que faltam/) && !entityHint) return { id: 'pending' };

    // 5) Período inteiro: "matérias do 3º período".
    var intent = parseSearchIntent(raw);
    if (intent.filters.periodo && !entityHint) {
      var restTokens = stripIntent(intent.text || '');
      if (!restTokens.length) return { id: has(n, /\b(faltam|falta|pendentes?|restam)\b/) ? 'periodPending' : 'period', periodo: intent.filters.periodo };
    }
    if (!entityHint && has(n, /\b(meu periodo|do meu periodo|no meu periodo)\b/) && userPeriod()) return { id: 'period', periodo: userPeriod() };

    // 6) Perguntas sobre disciplinas
    var found = findSubjects(intent.filters.periodo ? (intent.text || raw) : n);
    var hasEntity = found.list.length > 0;
    var canVerb = has(n, /\b(posso|consigo|da pra|pode|podem|liberad[oa]s?|disponivel|ja da|puxar|pegar|cursar|fazer|matricular|matricula|puxo)\b/);

    if (has(n, /\b(juntas?|juntos|ao mesmo tempo|no mesmo periodo|as duas|os dois|ambas|ambos)\b/) && canVerb) {
      var many = findMany(raw);
      if (many.length >= 2) return { id: 'together', list: many };
    }
    if (hasEntity && !found.ambiguous && has(n, /\b(quantos creditos|creditos d[eao]|quantas horas|carga horaria d[eao]|horas d[eao]|qual (o )?codigo|codigo d[eao]|que periodo|qual periodo|periodo d[eao]|e (uma )?(obrigatoria|eletiva|optativa|condicionada)|tipo d[eao]|vale quantos creditos)\b/) && !has(n, /\b(posso|pode|puxar|tranca|requisito|libera)\b/)) {
      return { id: 'fact', found: found, kind: has(n, /credito/) ? 'credits' : has(n, /\bhoras?\b|carga/) ? 'hours' : has(n, /codigo/) ? 'code' : has(n, /obrigatoria|eletiva|optativa|condicionada|tipo/) ? 'type' : 'period' };
    }
    if (has(n, /\b(co ?requisitos?|correquisitos?|corequisitos?|cursar junto|concomitante)\b/)) return { id: 'coreq', found: found };

    if (has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|e pre ?requisito de (que|quais|quem|o que)|pre ?requisito de (que|quais|quem|o que)|depende[m]? d[oea])\b/) || has(n, /\b(tranca|trava|trancam|travam)\b/)) {
      var onlyDependents = has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|pre ?requisito de (que|quais|quem|o que))\b/);
      return { id: 'locks', onlyDependents: onlyDependents, found: found };
    }
    if (has(n, /\b(pre ?requisitos?|pre req|requisitos?|precisa|precisam|precisa(r|mos)? (de|pra|para|pro)|preciso (de|pra|para|pro)|exige|exigem|o que falta (pra|para|pro)|falta (pra|para|pro)|o que (eu )?(tenho|preciso) (que )?(cursar|fazer|ter) (antes|pra|para))\b/)) return { id: 'prereqs', found: found };

    var listPhrase = has(n, /\b(o que|quais|que|quais sao as?)\b.*\b(posso|da|pode|consigo|esta|estao|tem|tenho)\b.*\b(puxar|pegar|cursar|fazer|disponiv|liberad)/) ||
      has(n, /\b(o que (eu )?(posso|devo|consigo) (puxar|pegar|cursar|fazer)|quais (materias|disciplinas) (posso|da pra|estao)|o que (esta|ta) (disponivel|liberado)|o que (eu )?puxo|me sugere|sugestao|o que puxar|disponiveis|puxaveis)\b/);
    if (listPhrase && !hasEntity) return { id: 'available' };
    if (canVerb && hasEntity) return { id: 'canTake', found: found };
    if (canVerb && !hasEntity && has(n, /\b(o que|quais|que materias|que disciplinas)\b/)) return { id: 'available' };
    if (has(n, /\b(condicionadas?|optativas?|eletivas?)\b/) && !hasEntity) return { id: 'cond' };

    // "e a CIF II?" repete o tipo da pergunta anterior com a nova disciplina
    if (hasEntity && lastIntentId && has(n, /^(e|e a|e o|e as|e os|e sobre|tambem|agora)( |$)/) && ['canTake', 'locks', 'prereqs', 'coreq', 'fact'].indexOf(lastIntentId) >= 0) {
      return { id: lastIntentId, found: found, onlyDependents: false, kind: 'credits' };
    }
    if (hasEntity) return { id: 'info', found: found };
    // pronome: "e o que ela tranca?" -> usa a última disciplina citada
    if (lastSubject && has(n, /\b(ela|ele|dela|dele|essa|esse|desta|deste|disso|e (o que|quais|quantos|quanto))\b/)) return { id: 'followup', found: { list: [lastSubject], ambiguous: false } };
    return { id: 'unknown', n: n };
  }

  // ---------- respostas ----------
  function R(html, chips) { return { html: html, chips: chips || [] }; }
  function subjectChips(m) {
    var code = m.codigo;
    var chips = [
      { label: 'O que ela tranca?', q: 'O que ' + code + ' tranca' },
      { label: 'Pré-requisitos', q: 'Pré-requisitos de ' + code }
    ];
    if (m.co || getCoreqRelatedSubjects(code).length) chips.push({ label: 'Co-requisitos', q: 'Co-requisitos de ' + code });
    return chips;
  }

  function needSubject(found, what) {
    if (found && found.list.length > 1 && found.ambiguous) {
      choice = { what: what, list: found.list.slice(0, 5) };
      return R(p('Encontrei mais de uma disciplina parecida. Qual delas você quer dizer?') + rowsHTML(found.list.slice(0, 5)),
        found.list.slice(0, 4).map(function (m) { return { label: m.codigo, q: what + ' ' + m.codigo }; }));
    }
    return R(p('Sobre qual disciplina? Me diga o nome ou o código (por exemplo, <strong>FFW361</strong>).'));
  }
  function subjectFrom(found) {
    if (found && found.list.length === 1) return found.list[0];
    if (found && found.list.length > 1 && !found.ambiguous) return found.list[0];
    return null;
  }

  function answerCanTake(m) {
    var st = statusOf(m);
    var head = bold(m) + ' (' + codeTag(m) + ', ' + esc(periodLabel(m)) + ')';
    if (st === 'passed') {
      return R(verdict('done', 'Já cursada') + p('Você já marcou ' + head + ' como cursada.') +
        (dependentsHint(m)), subjectChips(m));
    }
    var co = coreqDirect(m);
    var coInfo = '';
    if (co.length) {
      var coNames = co.map(function (c) { return '<strong>' + esc(formatName(c)) + '</strong>'; });
      var coReady = co.every(function (c) { return appState.concludedCodes.has(c.codigo) || checkReqs(c.pre, appState.concludedCodes); });
      coInfo = p('Ela tem co-requisito: precisa ser cursada junto com ' + listNames(coNames) + '. ' +
        (coReady ? 'Os pré-requisitos dessa parceira também estão cumpridos.' : 'Mas a parceira ainda tem pré-requisito pendente, então a dupla ainda não pode ser puxada.'));
    }
    if (st === 'eligible') {
      var pre = prereqList(m);
      return R(verdict('ok', 'Pode puxar') + p('Sim! ' + head + ' está disponível' +
        (pre.length ? ': você já cumpriu ' + listNames(pre.map(function (c) { return esc(formatName(c)); })) + '.' : ' e não tem pré-requisito.')) +
        coInfo + '<p class="farma-note">Carga: ' + esc(creditsOf(m)) + ' créd. · ' + esc(hoursOf(m)) + ' h.</p>', subjectChips(m));
    }
    var info = missingOf(m);
    var rows = info.missing.map(function (c) {
      var s = statusOf(c);
      return rowHTML(c, s === 'eligible' ? 'você já pode puxar' : 'também bloqueada');
    }).join('');
    return R(verdict('no', 'Ainda não') + p('Ainda não dá para puxar ' + head + '. ' +
      (info.alternatives ? 'Faltam, no caminho mais próximo:' : (info.missing.length === 1 ? 'Falta cursar:' : 'Faltam cursar:'))) +
      '<div class="farma-rows">' + rows + '</div>' + coInfo, subjectChips(m));
  }

  function dependentsHint(m) {
    var deps = getPrereqLockedSubjects(m.codigo);
    return deps.length ? p('Concluir ' + bold(m) + ' ajuda a liberar ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + '.') : '';
  }

  function answerLocks(m, onlyDependents) {
    var deps = getPrereqLockedSubjects(m.codigo);
    var html = '';
    if (deps.length) {
      html += p(bold(m) + ' é pré-requisito de ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + ' (ou seja, tranca):') + rowsHTML(deps, 14);
    } else {
      html += p(bold(m) + ' não tranca nenhuma matéria: não é pré-requisito de nada.');
    }
    if (!onlyDependents) {
      var pre = prereqList(m);
      html += pre.length
        ? p('Para cursar ' + bold(m) + ', por outro lado, você precisa de:') + rowsHTML(pre)
        : p('E ela não tem pré-requisito.');
    }
    return R(html, subjectChips(m).filter(function (c) { return !/tranca/.test(c.label); }));
  }

  function answerPrereqs(m) {
    var pre = prereqList(m);
    if (!pre.length) return R(p(bold(m) + ' não tem pré-requisito.' + (m.co ? '' : ' Pode ser puxada a qualquer momento.')), subjectChips(m));
    var rows = pre.map(function (c) {
      var ok = appState.concludedCodes.has(c.codigo);
      return rowHTML(c, ok ? 'cumprido' : 'pendente');
    }).join('');
    var miss = missingOf(m).missing.length;
    return R(p('Pré-requisitos de ' + bold(m) + ':') + '<div class="farma-rows">' + rows + '</div>' +
      p(miss ? 'Ainda ' + plural(miss, 'falta', 'faltam') + ' ' + miss + '.' : 'Todos já estão cumpridos.'), subjectChips(m));
  }

  function answerCoreq(m) {
    var related = getCoreqRelatedSubjects(m.codigo);
    if (!related.length) return R(p(bold(m) + ' não tem co-requisito.'), subjectChips(m));
    return R(p(bold(m) + ' ' + plural(related.length, 'tem co-requisito com', 'tem co-requisito com') + ':') + rowsHTML(related) +
      p('Co-requisito significa que as duas precisam ser cursadas <strong>no mesmo período</strong>. Ao marcar uma no planejamento, o app avisa da outra.'), subjectChips(m));
  }

  function answerInfo(m) {
    var st = statusOf(m);
    var pre = prereqList(m);
    var deps = getPrereqLockedSubjects(m.codigo);
    var html = verdict(st === 'passed' ? 'done' : st === 'eligible' ? 'ok' : 'no', st === 'passed' ? 'Cursada' : st === 'eligible' ? 'Disponível' : 'Bloqueada') +
      p(bold(m) + '<br>' + codeTag(m) + ' · ' + esc(periodLabel(m))) +
      p(esc(creditsOf(m)) + ' ' + plural(creditsOf(m), 'crédito', 'créditos') + ' · ' + esc(hoursOf(m)) + ' h') +
      p(pre.length ? 'Pré-requisitos: ' + listNames(pre.map(function (c) { return esc(c.nome); })) + '.' : 'Sem pré-requisito.');
    if (m.co) html += p('Co-requisito: ' + listNames(coreqDirect(m).map(function (c) { return esc(c.nome); })) + '.');
    html += p(deps.length ? 'Tranca ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + '.' : 'Não tranca nenhuma matéria.');
    return R(html, subjectChips(m));
  }

  function answerProgress() {
    var obrig = disciplinas.filter(function (d) { return !periodIsCond(d.periodo); });
    var doneObrig = obrig.filter(function (d) { return appState.concludedCodes.has(d.codigo); });
    var credTotal = obrig.reduce(function (a, d) { return a + creditsOf(d); }, 0);
    var credDone = doneObrig.reduce(function (a, d) { return a + creditsOf(d); }, 0);
    var cond = getSelectedCondStats();
    var condCredLeft = Math.max(0, META_COND_CRED - cond.condCred);
    var condHorasLeft = Math.max(0, META_COND_HORAS - cond.condHoras);
    var pend = obrig.length - doneObrig.length;
    var pct = credTotal ? Math.round(credDone / credTotal * 100) : 0;
    var html = p('Obrigatórias: você tem <strong>' + doneObrig.length + ' de ' + obrig.length + '</strong> disciplinas (' + pct + '% dos créditos).') +
      p('Faltam <strong>' + (credTotal - credDone) + ' créditos</strong> em ' + pend + ' ' + plural(pend, 'disciplina', 'disciplinas') + ' obrigatórias.');
    if (condCredLeft === 0 && condHorasLeft === 0) {
      html += p('Escolha condicionada: meta de ' + META_COND_CRED + ' créditos / ' + META_COND_HORAS + ' h <strong>cumprida</strong>.');
    } else {
      html += p('Escolha condicionada: você tem ' + cond.condCred + ' créd. e ' + cond.condHoras + ' h; faltam <strong>' + condCredLeft + ' créd.</strong> e <strong>' + condHorasLeft + ' h</strong> (meta: ' + META_COND_CRED + ' créd. / ' + META_COND_HORAS + ' h).');
    }
    html += '<p class="farma-note">Estágios, extensão e atividades complementares não entram nessa conta.</p>';
    return R(html, [{ label: 'Quais obrigatórias faltam?', q: 'Quais obrigatórias faltam' }, { label: 'O que posso puxar?', q: 'O que posso puxar' }]);
  }

  function answerPending() {
    var pend = disciplinas.filter(function (d) { return !periodIsCond(d.periodo) && !appState.concludedCodes.has(d.codigo); });
    if (!pend.length) return R(p('Você não tem nenhuma obrigatória pendente.'));
    var byPeriod = {};
    pend.forEach(function (d) { byPeriod[d.periodo] = (byPeriod[d.periodo] || 0) + 1; });
    var resumo = Object.keys(byPeriod).sort(function (a, b) { return a - b; }).map(function (k) { return k + 'º: ' + byPeriod[k]; }).join(' · ');
    return R(p('Faltam <strong>' + pend.length + '</strong> obrigatórias.') + p('Por período — ' + esc(resumo) + '.') +
      p('As mais próximas de você (já disponíveis):') +
      rowsHTML(pend.filter(function (d) { return statusOf(d) === 'eligible'; }), 8),
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam' }]);
  }

  function answerAvailable(raw) {
    var intent = parseSearchIntent(raw);
    var all = getPlannerAvailableSubjects();
    var cond = /\b(condicionad|optativ|eletiv)/.test(norm(raw));
    var list = all.filter(function (d) { return cond ? periodIsCond(d.periodo) : true; });
    if (intent.filters.periodo) list = list.filter(function (d) { return Number(d.periodo) === intent.filters.periodo; });
    var obrig = list.filter(function (d) { return !periodIsCond(d.periodo); });
    var cd = list.filter(function (d) { return periodIsCond(d.periodo); });
    if (!list.length) return R(p('Não encontrei nenhuma disciplina disponível com esse critério agora.'));
    var html = p('Você pode puxar <strong>' + list.length + '</strong> ' + plural(list.length, 'disciplina', 'disciplinas') +
      (obrig.length && cd.length ? ' (' + obrig.length + ' obrigatórias e ' + cd.length + ' de escolha condicionada)' : '') + '.');
    if (obrig.length) html += p('Obrigatórias:') + rowsHTML(obrig, 8);
    if (cd.length && (cond || !obrig.length)) html += p('Escolha condicionada:') + rowsHTML(cd, 6);
    else if (cd.length) html += '<p class="farma-note">Pergunte "quais condicionadas posso puxar" para ver as ' + cd.length + ' de escolha condicionada.</p>';
    return R(html + '<p class="farma-note">Na aba “O que puxar?” você seleciona e soma créditos.</p>',
      [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }, { label: 'Quais condicionadas posso puxar?', q: 'Quais condicionadas posso puxar' }]);
  }

  function answerPeriod(n) {
    var list = disciplinas.filter(function (d) { return Number(d.periodo) === n; });
    if (!list.length) return R(p('Não encontrei disciplinas do ' + n + 'º período.'));
    var done = list.filter(function (d) { return appState.concludedCodes.has(d.codigo); }).length;
    return R(p('O ' + n + 'º período tem <strong>' + list.length + '</strong> disciplinas; você cursou ' + done + '.') + rowsHTML(list),
      [{ label: 'O que posso puxar?', q: 'O que posso puxar' }]);
  }

  function answerCond() {
    var list = disciplinas.filter(function (d) { return periodIsCond(d.periodo) && statusOf(d) === 'eligible'; });
    return R(p('Das disciplinas de escolha condicionada, <strong>' + list.length + '</strong> ' + plural(list.length, 'está disponível', 'estão disponíveis') + ' para você agora:') + rowsHTML(list, 10),
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam' }]);
  }

  function answerSiga() {
    return R(p('O SIGA aceita de <strong>' + SIGA_MIN_CRED + '</strong> a <strong>' + SIGA_MAX_CRED + '</strong> créditos por período. A aba “O que puxar?” soma o que você seleciona e avisa quando passa dos limites.'),
      [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }]);
  }

  function answerNextPeriod() {
    var n = getNextPlanningPeriod();
    return R(p('Pelo que você marcou, o seu próximo período a completar é o <strong>' + n + 'º</strong> (o primeiro com obrigatória ainda não cursada).'),
      [{ label: 'Ver matérias do ' + n + 'º', q: 'Matérias do ' + n + ' período' }]);
  }

  // ---------- perfil do usuário (compartilhado com as Configurações) ----------
  function UP() { return window.UserProfile || null; }
  function userName() { var u = UP(); return u ? u.name() : ''; }
  function userPeriod() { var u = UP(); var v = u ? Number(u.period()) : 0; return v >= 1 ? v : 0; }
  function userShift() { var u = UP(); return u ? u.shift() : ''; }
  function g(m, f, n, unset) { var u = UP(); return u ? u.gen(m, f, n, unset) : (unset !== undefined ? unset : n); }
  function nameHTML() { return '<strong>' + esc(userName()) + '</strong>'; }
  var SKIP_KEY = 'planejador_farma_skipname_v1';
  function nameSkipped() { try { return localStorage.getItem(SKIP_KEY) === '1'; } catch (e) { return false; } }
  function setSkip(v) { try { if (v) localStorage.setItem(SKIP_KEY, '1'); else localStorage.removeItem(SKIP_KEY); } catch (e) { /* sem armazenamento */ } }
  function needsName() { return !userName() && !nameSkipped(); }

  var awaiting = null;   // 'name' | 'pron' | 'newname' | null
  var pronTries = 0;
  var choice = null;     // desambiguação: { what, list }

  var NAME_STOP = /\b(posso|puxar|quanto|quantos|quantas|qual|quais|como|quando|onde|porque|que|nao|sim|ola|oi|ajuda|obrigado|obrigada|tchau|tranca|requisito|requisitos|creditos|periodo|disciplina|materia|bolsa|frequencia|prazo|carga|cursar|pegar)\b/;
  var NAME_PARTICLES = { da: 1, de: 1, do: 1, dos: 1, das: 1, e: 1 };
  function parseName(raw) {
    var t = String(raw || '').trim().replace(/[?!.,;:]+$/, '');
    var n = norm(t);
    if (/\b(prefiro nao|nao quero|nao vou|sem nome|pular|anonimo|nao precisa|deixa pra la|nao importa)\b/.test(n)) return { skip: true };
    t = t.replace(/^(oi|ol[aá]|opa|e a[ií]|eae|bom dia|boa tarde|boa noite)[,!\s]+/i, '');
    t = t.replace(/^(meu nome (é|e|eh)|me chamo|pode me chamar de|pode me chama de|pode me chamar|me chama de|me chame de|me chama|me chame|quero ser chamad[oa] de|eu sou (o|a)?|sou (o|a)?|aqui (é|e|eh) (o|a)?|nome[:\s]+)\s*/i, '').replace(/^(é|e|eh)\s+/i, '').trim();
    var parts = t.split(/\s+/).filter(Boolean);
    if (!parts.length || parts.length > 3) return null;
    if (NAME_STOP.test(norm(t))) return null;
    var ok = parts.every(function (w) { return /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,19}$/.test(w); });
    if (!ok) return null;
    var name = parts.map(function (w, k) {
      var low = w.toLowerCase();
      return k > 0 && NAME_PARTICLES[low] ? low : low.charAt(0).toUpperCase() + low.slice(1);
    }).join(' ');
    return { name: name };
  }
  function parsePronoun(n) {
    if (/\b(neutro|neutre|elu|nao binari[oae]|tanto faz|qualquer)\b/.test(n)) return 'n';
    if (/\b(ela|feminino|mulher|menina|moca|garota)\b/.test(n)) return 'f';
    if (/\b(ele|masculino|homem|menino|rapaz|garoto)\b/.test(n)) return 'm';
    return null;
  }
  var PRON_LABEL = { m: 'masculino', f: 'feminino', n: 'neutro' };

  // ---------- respostas novas ----------
  function SUGGEST_LIST() {
    return [
      { q: 'Posso puxar Farmacocinética?', k: 'posso puxar cursar disciplina materia liberada disponivel' },
      { q: 'O que Fisiologia Humana tranca?', k: 'tranca libera depende destrava prerequisito' },
      { q: 'Pré-requisitos de Toxicologia Geral', k: 'prerequisito requisito precisa exige' },
      { q: 'Quantos créditos faltam?', k: 'creditos faltam falta progresso formar restam' },
      { q: 'O que posso puxar?', k: 'puxar disponiveis liberadas sugestao agora' },
      { q: 'Monte uma grade para o próximo período', k: 'montar monte grade plano periodo sugestao organizar' },
      { q: 'O que mais destrava?', k: 'destrava prioridade importante primeiro comecar' },
      { q: 'Quantos créditos tem Farmacocinética?', k: 'creditos horas carga codigo vale' },
      { q: 'Como trancar a matrícula?', k: 'trancar trancamento matricula' },
      { q: 'Qual a frequência mínima?', k: 'frequencia faltas presenca aprovacao reprovar' },
      { q: 'Quais os requisitos das bolsas?', k: 'bolsa monitoria pibiac iniciacao cientifica' },
      { q: 'Qual a carga horária total do curso?', k: 'carga horaria horas curso total' },
      { q: 'Qual o prazo máximo para me formar?', k: 'prazo maximo formar anos periodos tempo' },
      { q: 'Como é calculado o CR?', k: 'cr cra coeficiente calculo media nota' },
      { q: 'O que são atividades complementares?', k: 'atividades complementares horas' },
      { q: 'Como funciona a extensão?', k: 'extensao horas projeto' },
      { q: 'Regras do TCC', k: 'tcc monografia trabalho conclusao orientador' },
      { q: 'O que é Dignidade Acadêmica?', k: 'dignidade laude honra diploma' },
      { q: 'Qual o limite de créditos no SIGA?', k: 'limite creditos siga maximo minimo' },
      { q: 'O que você pode fazer?', k: 'ajuda funcoes fazer pode sabe' }
    ];
  }
  function suggestionsFor(n) {
    var toks = n.split(' ').filter(function (t) { return t.length > 2 && !STOP_SET[t]; });
    if (!toks.length) return [];
    return SUGGEST_LIST().map(function (it) {
      var keys = (norm(it.q) + ' ' + it.k).split(' ');
      var hit = 0;
      toks.forEach(function (t) { if (keys.indexOf(t) >= 0) hit += 1; });
      return { it: it, score: hit };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3).map(function (x) { return x.it; });
  }

  function timeGreeting() {
    var h = new Date().getHours();
    return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }
  function exampleChips() {
    return [
      { label: 'O que você pode fazer?', q: 'O que você pode fazer?' },
      { label: 'O que posso puxar?', q: 'O que posso puxar?' },
      { label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' },
      { label: 'Como trancar a matrícula?', q: 'Como trancar a matrícula?' }
    ];
  }
  function cardsHTML() {
    var cards = [
      ['Posso puxar Farmacocinética?', 'Confira pré-requisitos'],
      ['Quantos créditos faltam?', 'Veja o seu progresso'],
      ['Monte uma grade para o próximo período', 'Uma sugestão pronta'],
      ['Como trancar a matrícula?', 'Regras da UFRJ']
    ];
    return '<div class="farma-cards">' + cards.map(function (c) {
      return '<button type="button" class="farma-card" data-farma-ask="' + esc(c[0]) + '"><strong>' + esc(c[0]) + '</strong><small>' + esc(c[1]) + '</small></button>';
    }).join('') + '</div>';
  }

  function answerGreet(intent) {
    var tod = intent.part ? cap(intent.part[0]) : timeGreeting();
    return R(p(tod + (userName() ? ', ' + nameHTML() : '') + '! Em que posso ajudar hoje?'), exampleChips());
  }
  function answerHowAre() {
    return R(p('Tudo bem por aqui' + (userName() ? ', ' + nameHTML() : '') + '! Pronta para ajudar com a sua grade. O que você quer saber?'), exampleChips());
  }
  function answerWho() {
    return R(p('Eu sou a <strong>FarmacIA</strong>, assistente dos alunos de Farmácia aqui dentro do Planejador Acadêmico.') +
      p('Não sou uma IA generativa: não invento respostas. Eu leio a sua pergunta e consulto as regras e os dados do app (grade, pré-requisitos, seu progresso) e dos documentos oficiais da UFRJ.') +
      p('Estou em <strong>beta</strong>: ainda erro e não entendo tudo. Quanto mais claro o pedido, melhor eu respondo.'),
      [{ label: 'O que você pode fazer?', q: 'O que você pode fazer?' }]);
  }
  function answerAbout() {
    function sec(title, items) { return '<p><strong>' + title + '</strong><br>' + items.map(function (i) { return '• ' + i; }).join('<br>') + '</p>'; }
    var html = p((userName() ? nameHTML() + ', a' : 'A') + 'qui está o que eu sei fazer hoje:') +
      sec('Sua grade', ['Dizer se você pode puxar uma matéria (“Posso puxar CIF I?”)', 'Pré-requisitos, co-requisitos e o que cada matéria tranca', 'Créditos, carga horária e período de qualquer disciplina', 'Conferir se duas matérias podem ser puxadas juntas']) +
      sec('Seu planejamento', ['Listar o que você pode puxar agora e o que mais destrava', 'Sugerir uma grade para o próximo período', 'Mostrar quantos créditos e disciplinas faltam e o que você já cursou']) +
      sec('Regras da UFRJ (Manual Estudantil e PPC)', ['Trancamento, cancelamento, frequência, nota mínima, CR e CRA', 'Prazo máximo, carga horária, extensão, atividades complementares e TCC', 'Bolsas, Dignidade Acadêmica, dispensa de disciplina e exercícios domiciliares']) +
      sec('Conversa', ['Entendo abreviações e erros de digitação (“oq vc pd fazer”)', 'Você pode mudar nome, pronome e período quando quiser (“me chama de ...”)']) +
      sec('O que ainda não faço', ['Cardápio do RU, horários de aula, salas ou notas. Estou em beta e não uso IA generativa.']);
    return R(html, [{ label: 'O que posso puxar?', q: 'O que posso puxar?' }, { label: 'Monte uma grade', q: 'Monte uma grade para o próximo período' }, { label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'Como trancar a matrícula?', q: 'Como trancar a matrícula?' }]);
  }
  function answerMyName() {
    if (!userName()) { awaiting = 'name'; return R(p('Ainda não sei o seu nome. <strong>Como posso te chamar?</strong>'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]); }
    var pr = UP() ? UP().pronoun() : '';
    var extra = (pr ? ' Vou me referir a você no ' + PRON_LABEL[pr] + '.' : '') + (userPeriod() ? ' Você está no ' + userPeriod() + 'º período.' : '');
    return R(p('Você é ' + nameHTML() + '.' + extra + ' Dá para mudar isso nas Configurações, em Usuário, ou me dizendo “me chama de ...”.'));
  }
  function answerSetName(raw) {
    var n = norm(raw);
    if (/\b(esquecer|apagar)\b/.test(n)) {
      if (UP()) UP().set({ name: '' });
      setSkip(true); awaiting = null;
      return R(p('Pronto, esqueci o seu nome. Se quiser que eu volte a te chamar por ele, é só dizer “me chama de ...”.'));
    }
    var r = parseName(raw);
    if (r && r.name) {
      if (UP()) UP().set({ name: r.name }); setSkip(false); awaiting = null;
      return R(p('Combinado! De agora em diante vou te chamar de <strong>' + esc(r.name) + '</strong>.'), exampleChips());
    }
    awaiting = 'newname';
    return R(p('Claro! Como você quer ser chamado' + g('', 'a', '(a)', '(a)') + '?'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]);
  }
  function answerSetPron(raw) {
    var v = parsePronoun(norm(raw));
    if (v) {
      if (UP()) UP().set({ pronoun: v }); awaiting = null;
      return R(p('Anotado! Vou me referir a você no <strong>' + PRON_LABEL[v] + '</strong>' + (userName() ? ', ' + nameHTML() : '') + '.'));
    }
    awaiting = 'pron'; pronTries = 0;
    return R(p('Como você prefere que eu me refira a você?'), [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }]);
  }
  function answerSetPeriod(v) {
    if (v < 1 || v > 11) return R(p('Esse período não existe no curso. Me diga um número de 1 a 11.'));
    if (UP()) UP().set({ period: v });
    return R(p('Anotei: você está no <strong>' + v + 'º período</strong>. Pergunte “matérias do meu período” quando quiser.'), [{ label: 'Matérias do meu período', q: 'Matérias do meu período' }]);
  }
  function answerThanks() { return R(p('De nada' + (userName() ? ', ' + nameHTML() : '') + '! Quando precisar, é só chamar.'), exampleChips().slice(0, 2)); }
  function answerBye() { return R(p('Até mais' + (userName() ? ', ' + nameHTML() : '') + '! Bons estudos.')); }
  function answerAck(intent) {
    if (intent.word === 'nao') return R(p('Tudo bem! Se mudar de ideia, é só perguntar.'));
    return R(p('Certo! Quer saber mais alguma coisa?'), exampleChips().slice(0, 3));
  }
  function answerPraise() { return R(p('Que bom ouvir isso' + (userName() ? ', ' + nameHTML() : '') + '! Estou em beta e aprendendo a cada dia. Se tiver outra dúvida, pode mandar.')); }
  function answerFrustrated() {
    return R(p('Poxa, desculpa por isso' + (userName() ? ', ' + nameHTML() : '') + '. Ainda estou em <strong>beta</strong> e posso errar. Tente perguntar de outro jeito, citando o nome ou o código da disciplina, ou escolha um exemplo:'), exampleChips());
  }

  function answerFact(m, kind) {
    var cred = creditsOf(m), hrs = hoursOf(m);
    var html;
    if (kind === 'credits') html = p(bold(m) + ' vale <strong>' + cred + ' ' + plural(cred, 'crédito', 'créditos') + '</strong> (' + esc(hrs) + ' h).');
    else if (kind === 'hours') html = p(bold(m) + ' tem <strong>' + esc(hrs) + ' h</strong> de carga horária (' + cred + ' ' + plural(cred, 'crédito', 'créditos') + ').');
    else if (kind === 'code') html = p('O código de ' + bold(m) + ' é ' + codeTag(m) + '.');
    else if (kind === 'type') html = p(bold(m) + ' é ' + (periodIsCond(m.periodo) ? 'uma disciplina de <strong>escolha condicionada</strong> (eletiva).' : '<strong>obrigatória</strong>, do ' + m.periodo + 'º período.'));
    else html = p(bold(m) + ' é ' + (periodIsCond(m.periodo) ? 'de <strong>escolha condicionada</strong>, sem período fixo.' : 'do <strong>' + m.periodo + 'º período</strong>.'));
    html += '<p class="farma-note">Código ' + esc(m.codigo) + ' · ' + esc(periodLabel(m)) + '. Um crédito equivale a 15 h de aula teórica ou 30 h de prática por semestre.</p>';
    return R(html, subjectChips(m));
  }

  function answerTogether(list) {
    var done = list.filter(function (m) { return statusOf(m) === 'passed'; });
    var todo = list.filter(function (m) { return statusOf(m) !== 'passed'; });
    var blocked = todo.filter(function (m) { return statusOf(m) === 'blocked'; });
    var names = listNames(list.map(function (m) { return '<strong>' + esc(formatName(m)) + '</strong>'; }));
    var credits = todo.reduce(function (a, m) { return a + creditsOf(m); }, 0);
    var html;
    if (!todo.length) return R(verdict('done', 'Já cursadas') + p('Você já cursou ' + names + '.'));
    if (blocked.length) {
      html = verdict('no', 'Ainda não') + p('Não dá para puxar ' + names + ' juntas por enquanto:') +
        blocked.map(function (m) {
          var miss = missingOf(m).missing;
          return p(bold(m) + ' ainda precisa de ' + listNames(miss.map(function (c) { return esc(formatName(c)); })) + '.');
        }).join('');
    } else {
      html = verdict('ok', 'Dá sim') + p('Você pode puxar ' + names + ' no mesmo período: os pré-requisitos de ' + (todo.length > 1 ? 'todas' : 'ela') + ' estão cumpridos.');
    }
    var partners = [];
    todo.forEach(function (m) { coreqDirect(m).forEach(function (c) { if (list.indexOf(c) < 0 && partners.indexOf(c) < 0) partners.push(c); }); });
    if (partners.length) html += p('Atenção: ' + listNames(partners.map(function (c) { return '<strong>' + esc(formatName(c)) + '</strong>'; })) + ' é co-requisito e precisa ser cursada junto.');
    html += '<p class="farma-note">Somam ' + credits + ' ' + plural(credits, 'crédito', 'créditos') + '. O SIGA aceita de ' + SIGA_MIN_CRED + ' a ' + SIGA_MAX_CRED + ' por período. Confira também a oferta e os horários no SIGA.</p>';
    return R(html, [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }]);
  }

  function depCount(m) { return getPrereqLockedSubjects(m.codigo).length; }
  function answerPriority() {
    var pool = getPlannerAvailableSubjects().filter(function (d) { return !periodIsCond(d.periodo); });
    if (!pool.length) return R(p('Não encontrei obrigatórias disponíveis agora. Veja as de escolha condicionada em “Quais condicionadas posso puxar?”.'));
    var ranked = pool.slice().sort(function (a, b) { return depCount(b) - depCount(a) || Number(a.periodo) - Number(b.periodo); }).slice(0, 8);
    var html = p('As obrigatórias disponíveis que mais abrem caminho (quantas matérias dependem de cada uma):') +
      '<div class="farma-rows">' + ranked.map(function (m) { var c = depCount(m); return rowHTML(m, c ? 'destrava ' + c : 'não destrava nada'); }).join('') + '</div>' +
      '<p class="farma-note">Priorizar quem destrava mais ajuda a não travar a sua grade nos próximos períodos.</p>';
    return R(html, [{ label: 'Monte uma grade', q: 'Monte uma grade para o próximo período' }]);
  }

  function answerFree() {
    var list = disciplinas.filter(function (d) { return !d.pre && !appState.concludedCodes.has(d.codigo); });
    var ob = list.filter(function (d) { return !periodIsCond(d.periodo); });
    var cd = list.filter(function (d) { return periodIsCond(d.periodo); });
    var html = p('Disciplinas que você ainda não cursou e que <strong>não têm pré-requisito</strong>: ' + ob.length + ' obrigatórias e ' + cd.length + ' de escolha condicionada.');
    if (ob.length) html += p('Obrigatórias:') + rowsHTML(ob, 8);
    if (cd.length) html += p('Escolha condicionada:') + rowsHTML(cd, 5);
    return R(html);
  }

  function answerDone() {
    var obrig = disciplinas.filter(function (d) { return !periodIsCond(d.periodo); });
    var done = obrig.filter(function (d) { return appState.concludedCodes.has(d.codigo); });
    if (!done.length && !appState.concludedCodes.size) return R(p('Você ainda não marcou nenhuma disciplina como cursada. Marque na tela inicial para eu conseguir ajudar melhor.'));
    var per = {};
    obrig.forEach(function (d) { per[d.periodo] = per[d.periodo] || { t: 0, d: 0 }; per[d.periodo].t += 1; if (appState.concludedCodes.has(d.codigo)) per[d.periodo].d += 1; });
    var lines = Object.keys(per).sort(function (a, b) { return a - b; }).map(function (k) { return k + 'º período: ' + per[k].d + ' de ' + per[k].t; });
    return R(p('Você já cursou <strong>' + done.length + ' de ' + obrig.length + '</strong> obrigatórias.') + '<p>' + lines.map(esc).join('<br>') + '</p>',
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'O que posso puxar?', q: 'O que posso puxar?' }]);
  }

  function answerPeriodPending(n) {
    var list = disciplinas.filter(function (d) { return Number(d.periodo) === n && !appState.concludedCodes.has(d.codigo); });
    if (!list.length) return R(p('Você já cursou tudo do ' + n + 'º período. Parabéns!'));
    return R(p('Do ' + n + 'º período ainda ' + plural(list.length, 'falta', 'faltam') + ' <strong>' + list.length + '</strong>:') + rowsHTML(list));
  }

  // Sugestão de grade: prioriza obrigatórias de períodos mais baixos e que mais destravam, respeitando co-requisitos.
  function answerPlan(target) {
    var goal = target ? Math.max(SIGA_MIN_CRED, Math.min(SIGA_MAX_CRED, target)) : 24;
    var pool = getPlannerAvailableSubjects();
    var avail = {};
    pool.forEach(function (d) { avail[d.codigo] = true; });
    var obrig = pool.filter(function (d) { return !periodIsCond(d.periodo); })
      .sort(function (a, b) { return Number(a.periodo) - Number(b.periodo) || depCount(b) - depCount(a) || creditsOf(b) - creditsOf(a); });
    var cond = getSelectedCondStats();
    var needCond = Math.max(0, META_COND_CRED - cond.condCred) > 0;
    var conds = needCond ? pool.filter(function (d) { return periodIsCond(d.periodo); }).sort(function (a, b) { return creditsOf(b) - creditsOf(a); }) : [];
    var sel = [], chosen = {}, total = 0;
    function tryAdd(m) {
      if (chosen[m.codigo]) return;
      var group = [m];
      var okGroup = true;
      getCoreqRelatedSubjects(m.codigo).forEach(function (c) {
        if (appState.concludedCodes.has(c.codigo)) return;
        if (!avail[c.codigo]) { okGroup = false; return; }
        if (!chosen[c.codigo] && group.indexOf(c) < 0) group.push(c);
      });
      if (!okGroup) return;
      var cr = group.reduce(function (a, d) { return a + creditsOf(d); }, 0);
      if (total + cr > goal) return;
      group.forEach(function (d) { chosen[d.codigo] = true; sel.push(d); });
      total += cr;
    }
    obrig.forEach(tryAdd);
    if (total < goal) conds.forEach(tryAdd);
    if (!sel.length) return R(p('Não consegui montar uma sugestão agora: não há disciplinas disponíveis que caibam em ' + goal + ' créditos.'));
    var html = p('Uma sugestão de <strong>' + total + ' créditos</strong> (meta de ' + goal + ') com o que você já pode puxar:') + rowsHTML(sel) +
      '<p class="farma-note">Escolhi primeiro as obrigatórias dos períodos mais baixos e as que mais destravam, sempre juntando co-requisitos. É só uma sugestão: confira oferta, vagas e horários no SIGA.</p>';
    return R(html, [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }, { label: 'O que mais destrava?', q: 'O que mais destrava?' }]);
  }

  function answerGlossary(n) {
    var html;
    if (/co ?requisito|correquisito/.test(n)) html = p('<strong>Co-requisito</strong> é uma disciplina que precisa ser cursada <strong>no mesmo período</strong> que outra. Ao marcar uma no planejamento, o app avisa da outra.');
    else if (/pre ?requisito/.test(n)) html = p('<strong>Pré-requisito</strong> é uma disciplina que você precisa ter cursado, com aprovação, <strong>antes</strong> de se inscrever em outra. Quando uma matéria é pré-requisito de várias, dizemos que ela “tranca” as demais.');
    else if (/condicionada|optativa|eletiva/.test(n)) html = p('<strong>Escolha condicionada</strong> são as disciplinas eletivas do currículo: você escolhe quais cursar até completar <strong>' + META_COND_CRED + ' créditos e ' + META_COND_HORAS + ' horas</strong>.');
    else if (/obrigatoria/.test(n)) html = p('<strong>Obrigatórias</strong> são as disciplinas que todo aluno precisa cursar, organizadas por período na grade do curso.');
    else if (/crid/.test(n)) html = p('<strong>CRID</strong> é a Confirmação de Registro de Inscrição em Disciplinas: o comprovante das disciplinas em que você está inscrito. Vale emitir depois do prazo de inscrição.');
    else if (/siga/.test(n)) html = p('<strong>SIGA</strong> é o sistema acadêmico da UFRJ, onde você faz os pedidos de inscrição em disciplinas e consulta boletim e histórico.');
    else if (/rcs/.test(n)) html = p('<strong>RCS</strong> é o Requisito Curricular Suplementar: atividade do currículo, como o TCC, que conta créditos, mas não é uma disciplina comum.');
    else html = p('Posso explicar pré-requisito, co-requisito, escolha condicionada, obrigatórias, CRID, SIGA e RCS. Qual deles?');
    return R(html);
  }

  function answerUnknown(n) {
    var sugg = suggestionsFor(n);
    if (sugg.length) {
      return R(p('Não tenho certeza se entendi' + (userName() ? ', ' + nameHTML() : '') + '. Você quis dizer algo como:') + p('Ainda estou em beta. Se não for isso, tente citar o nome ou o código da disciplina.'),
        sugg.map(function (s) { return { label: s.q, q: s.q }; }));
    }
    return R(p('Não consegui entender essa' + (userName() ? ', ' + nameHTML() : '') + '. Ainda estou em <strong>beta</strong> e conheço pré-requisitos, o seu progresso, sugestões de grade e regras da UFRJ. Tente perguntar de outro jeito ou veja o que eu sei fazer:'), exampleChips());
  }

  function welcomeHTML() {
    var hello = userName()
      ? g('Bem-vindo de volta', 'Bem-vinda de volta', 'Bem-vinde de volta', 'Olá de novo') + ', ' + nameHTML() + '!'
      : 'Olá!';
    var html = p(hello) +
      p('Eu sou a <strong>FarmacIA</strong>, assistente dos alunos aqui dentro do Planejador.') +
      p('Ainda estou em <strong>beta</strong>, então posso não entender direito o que você pede. Tenha um pouquinho de paciência comigo, combinado? Se eu errar, tente perguntar de outro jeito.');
    html += needsName() ? p('Para começar: <strong>como posso te chamar?</strong>') : p('O que você quer saber hoje?') + cardsHTML();
    return html;
  }
  function welcomeChips() {
    return [
      { label: 'Posso puxar Farmacocinética?', q: 'Posso puxar Farmacocinética?' },
      { label: 'O que Fisiologia Humana tranca?', q: 'O que Fisiologia Humana tranca?' },
      { label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' },
      { label: 'Co-requisitos de MACF', q: 'Quais os co-requisitos de MACF?' },
      { label: 'O que posso puxar?', q: 'O que posso puxar?' },
      { label: 'Como trancar a matrícula?', q: 'Como trancar a matrícula?' },
      { label: 'Qual a frequência mínima?', q: 'Qual a frequência mínima?' }
    ];
  }

  // ---------- montagem da resposta ----------
  var LEAD_IDS = { progress: 1, pending: 1, available: 1, period: 1, periodPending: 1, cond: 1, siga: 1, nextPeriod: 1, canTake: 1, locks: 1, prereqs: 1, coreq: 1, info: 1, followup: 1, fact: 1, together: 1, plan: 1, priority: 1, free: 1, done: 1, rule: 1, glossary: 1 };
  var LEADS = ['Certo', 'Pronto', 'Olha só', 'Beleza', 'Vamos lá', 'Boa pergunta'];
  var leadIdx = 0;
  function withLead(html) {
    if (!userName()) return html;
    var lead = LEADS[leadIdx % LEADS.length]; leadIdx += 1;
    return html.replace(/^<p>/, '<p>' + lead + ', ' + nameHTML() + '. ');
  }

  function resolveChoice(text) {
    if (!choice) return null;
    var n = norm(text);
    var picked = null, idx = -1;
    var m = /^\s*(\d)\s*$/.exec(n);
    if (m) idx = Number(m[1]) - 1;
    else if (/^(a |o )?primeir/.test(n)) idx = 0;
    else if (/^(a |o )?segund/.test(n)) idx = 1;
    else if (/^(a |o )?terceir/.test(n)) idx = 2;
    else if (/^(a |o )?quart/.test(n)) idx = 3;
    else if (/^(a |o )?ultim/.test(n)) idx = choice.list.length - 1;
    if (idx >= 0 && choice.list[idx]) picked = choice.list[idx];
    if (!picked) {
      var toks = stripIntent(text);
      if (toks.length) {
        var hits = choice.list.filter(function (d) { var hay = norm(d.nome + ' ' + d.codigo); return toks.every(function (t) { return hay.indexOf(t) >= 0; }); });
        if (hits.length === 1) picked = hits[0];
      }
    }
    if (picked) { var what = choice.what; choice = null; return what + ' ' + picked.codigo; }
    choice = null;
    return null;
  }

  function answerIntent(intent, raw) {
    var found = intent.found;
    var m = subjectFrom(found);
    if (m) lastSubject = m;
    switch (intent.id) {
      case 'empty': return null;
      case 'greet': return answerGreet(intent);
      case 'howare': return answerHowAre();
      case 'thanks': return answerThanks();
      case 'bye': return answerBye();
      case 'ack': return answerAck(intent);
      case 'praise': return answerPraise();
      case 'frustrated': return answerFrustrated();
      case 'who': return answerWho();
      case 'contacts': return R(p('Os contatos dos professores, chefes de departamento e da coordenação ficam na aba <strong>Contatos</strong>. Lá você pode pesquisar pelo nome ou pelo e-mail.'), [{ label: 'Abrir Contatos', go: 'modal-contatos' }]);
      case 'offscope': return R(p('Isso eu ainda não sei responder' + (userName() ? ', ' + nameHTML() : '') + '. Eu não tenho horários de aula, salas, notas nem o calendário acadêmico: consulte o SIGA ou a Secretaria. Posso ajudar com a sua grade e com as regras da UFRJ.'), exampleChips());
      case 'about': return answerAbout();
      case 'myname': return answerMyName();
      case 'setname': return answerSetName(raw);
      case 'setpron': return answerSetPron(raw);
      case 'setperiod': return answerSetPeriod(intent.value);
      case 'rule': return R(intent.rule.html + p('<small>' + esc('Regras podem mudar: confirme na Secretaria Acadêmica ou com o seu orientador.') + '</small>'), intent.rule.chips);
      case 'glossary': return answerGlossary(intent.term);
      case 'plan': return answerPlan(intent.target);
      case 'priority': return answerPriority();
      case 'free': return answerFree();
      case 'done': return answerDone();
      case 'progress': return answerProgress();
      case 'siga': return answerSiga();
      case 'nextPeriod': return answerNextPeriod();
      case 'pending': return answerPending();
      case 'available': return answerAvailable(raw);
      case 'period': return answerPeriod(intent.periodo);
      case 'periodPending': return answerPeriodPending(intent.periodo);
      case 'cond': return answerCond();
      case 'together': return answerTogether(intent.list);
      case 'fact': return m ? answerFact(m, intent.kind || 'period') : needSubject(found, 'Quantos créditos tem');
      case 'followup':
      case 'info': return m ? answerInfo(m) : needSubject(found, 'Sobre');
      case 'canTake': return m ? answerCanTake(m) : needSubject(found, 'Posso puxar');
      case 'locks': return m ? answerLocks(m, intent.onlyDependents) : (lastSubject && !found.list.length ? answerLocks(lastSubject, intent.onlyDependents) : needSubject(found, 'O que tranca'));
      case 'prereqs': return m ? answerPrereqs(m) : (lastSubject && !found.list.length ? answerPrereqs(lastSubject) : needSubject(found, 'Pré-requisitos de'));
      case 'coreq': return m ? answerCoreq(m) : (lastSubject && !found.list.length ? answerCoreq(lastSubject) : needSubject(found, 'Co-requisitos de'));
      default: return answerUnknown(intent.n || '');
    }
  }

  function answerText(text) {
    var picked = resolveChoice(text);
    var q = picked || text;
    var intent = classify(q);
    var res = answerIntent(intent, q);
    if (!res) return null;
    if (LEAD_IDS[intent.id]) res.html = withLead(res.html);
    if (intent.id !== 'unknown' && intent.id !== 'empty') lastIntentId = intent.id;
    res.id = intent.id;
    return res;
  }

  function askNamePrompt() { return p('Aliás, <strong>como posso te chamar?</strong>'); }

  function handleAwaiting(text) {
    if (awaiting === 'name' || awaiting === 'newname') {
      var r = parseName(text);
      // Só vale como nome se for uma apresentação explícita ("me chamo Ana") ou algo que não parece pergunta nenhuma.
      if (r && r.name && !/\b(meu nome|me chamo|me chama|me chame|pode me chamar|eu sou|sou o|sou a)\b/.test(norm(text)) && classify(text).id !== 'unknown') r = null;
      if (r && r.skip) {
        setSkip(true); awaiting = null;
        return R(p('Tudo bem! Sigo sem o seu nome por enquanto. Se mudar de ideia, é só dizer “me chama de ...”.') + cardsHTML());
      }
      if (r && r.name) {
        if (UP()) UP().set({ name: r.name });
        setSkip(false);
        awaiting = awaiting === 'newname' ? null : 'pron'; pronTries = 0;
        if (awaiting === null) return R(p('Combinado! De agora em diante vou te chamar de <strong>' + esc(r.name) + '</strong>.'), exampleChips());
        return R(p('Prazer, <strong>' + esc(r.name) + '</strong>! Para eu falar com você do jeito certo: prefere que eu use <strong>ele</strong>, <strong>ela</strong> ou <strong>neutro</strong>?'),
          [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }, { label: 'Pular', q: 'Pular' }]);
      }
      // não é um nome: se for uma pergunta, responde e lembra do nome depois
      var res = answerText(text);
      if (res && res.id !== 'unknown') { res.html += askNamePrompt(); return res; }
      return R(p('Hmm, não entendi isso como um nome. Pode me dizer só como quer ser chamado' + g('', 'a', '(a)', '(a)') + '? Por exemplo: “Maria”.'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]);
    }
    if (awaiting === 'pron') {
      var n = norm(text);
      var v = parsePronoun(n);
      if (/\b(pular|prefiro nao|nao quero|depois|nenhum)\b/.test(n)) {
        awaiting = null;
        return R(p('Sem problemas, ' + nameHTML() + '! Vou usar um tratamento neutro. Dá para mudar nas Configurações, em Usuário.') + cardsHTML());
      }
      if (v) {
        awaiting = null;
        if (UP()) UP().set({ pronoun: v });
        return R(p('Anotado, ' + nameHTML() + '! Vou me referir a você no <strong>' + PRON_LABEL[v] + '</strong>. ' + g('Seja bem-vindo', 'Seja bem-vinda', 'Seja bem-vinde', 'Seja bem-vindo(a)') + '!') + p('O que você quer saber primeiro?') + cardsHTML());
      }
      pronTries += 1;
      if (pronTries >= 2) { awaiting = null; return null; }
      return R(p('Não peguei essa. É só escolher: <strong>ele</strong>, <strong>ela</strong> ou <strong>neutro</strong>.'),
        [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }, { label: 'Pular', q: 'Pular' }]);
    }
    return null;
  }

  function respond(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var res = null;
    if (awaiting) res = handleAwaiting(text);
    if (!res) res = answerText(text);
    return res;
  }

  // ---------- interface ----------
  var AVATAR = '<span class="farma-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h13v5.2a6.5 6.5 0 0 1-13 0z"></path><path d="M12 15.2V19M8.2 20.5h7.6"></path><path d="M12 5.4l.95 2.35 2.35.95-2.35.95L12 12l-.95-2.35-2.35-.95 2.35-.95z" fill="currentColor" stroke-width="1"></path></svg></span>';
  var started = false;
  var busy = false;
  var reduceMotion = function () { return document.documentElement.classList.contains('no-anim') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  function tr(x) { return typeof T === 'function' ? T(x) : x; }

  function messagesEl() { return $('farma-messages'); }
  function scrollDown() {
    var el = messagesEl();
    if (!el) return;
    el.scrollTo ? el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' }) : (el.scrollTop = el.scrollHeight);
  }
  // Resposta longa: mostra o começo dela (não o fim); resposta curta: desce até o fim.
  function scrollToMessage(div) {
    var el = messagesEl();
    if (!el) return;
    var top = Math.max(0, div.offsetTop - 6);
    var tall = div.offsetHeight > el.clientHeight * 0.85;
    var target = tall ? top : el.scrollHeight;
    el.scrollTo ? el.scrollTo({ top: target, behavior: reduceMotion() ? 'auto' : 'smooth' }) : (el.scrollTop = target);
  }
  function addUser(text) {
    var el = messagesEl();
    var div = document.createElement('div');
    div.className = 'farma-msg is-user';
    div.innerHTML = '<div class="farma-bubble" data-no-i18n>' + esc(text) + '</div>';
    el.appendChild(div);
    scrollDown();
  }
  function addBot(html, extraClass) {
    var el = messagesEl();
    var div = document.createElement('div');
    div.className = 'farma-msg is-bot' + (extraClass ? ' ' + extraClass : '');
    var actions = extraClass === 'is-typing' ? '' : '<div class="farma-actions"><button type="button" class="farma-act" data-farma-copy aria-label="' + esc(tr('Copiar resposta')) + '" title="' + esc(tr('Copiar resposta')) + '">' + COPY_ICON + '</button></div>';
    div.innerHTML = AVATAR + '<div class="farma-body"><div class="farma-bubble" data-no-i18n>' + html + '</div>' + actions + '</div>';
    el.appendChild(div);
    if (extraClass === 'is-typing') { scrollDown(); return div; }
    scrollToMessage(div);
    return div;
  }
  function setChips(chips) {
    var box = $('farma-chips');
    if (!box) return;
    box.innerHTML = (chips || []).slice(0, 7).map(function (c) {
      return c.go
        ? '<button type="button" class="farma-chip" data-farma-go="' + esc(c.go) + '">' + esc(c.label) + '</button>'
        : '<button type="button" class="farma-chip" data-farma-ask="' + esc(c.q) + '" data-farma-label="' + esc(c.label) + '">' + esc(c.label) + '</button>';
    }).join('');
  }

  function ask(query, display) {
    var q = String(query || '').trim();
    if (!q || busy) return;
    busy = true;
    addUser(display || q);
    setChips([]);
    var typing = addBot('<span class="farma-typing" aria-label="FarmacIA está digitando"><i></i><i></i><i></i></span>', 'is-typing');
    var delay = reduceMotion() ? 0 : 380;
    window.setTimeout(function () {
      var res;
      try { res = respond(q); } catch (err) {
        console.warn('FarmacIA:', err);
        res = R(p('Tive um problema para responder essa. Tente reformular a pergunta, por favor.'));
      }
      typing.remove();
      if (res) { addBot(res.html); setChips(res.chips); }
      setPlaceholder();
      busy = false;
    }, delay);
  }

  function setPlaceholder() {
    var input = $('farma-input');
    if (!input) return;
    var asking = awaiting === 'name' || awaiting === 'newname';
    input.placeholder = asking ? tr('Digite seu nome...') : tr('Pergunte qualquer coisa sobre a sua grade...');
    input.setAttribute('aria-label', input.placeholder);
  }
  function reset() {
    var el = messagesEl();
    if (!el) return;
    el.innerHTML = '';
    lastSubject = null; lastIntentId = null; choice = null; pronTries = 0;
    awaiting = needsName() ? 'name' : null;
    busy = false;
    addBot(welcomeHTML());
    setChips(needsName() ? [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }] : []);
    setPlaceholder();
  }

  function show() {
    if (!started) { started = true; reset(); }
  }

  // Teclado do iPhone: a página usa a área visível, para o campo não ficar escondido.
  function bindViewport() {
    var vv = window.visualViewport;
    var page = $('modal-farmacia');
    if (!vv || !page) return;
    var adjust = function () {
      if (document.documentElement.classList.contains('farma-typing')) {
        page.style.setProperty('height', vv.height + 'px', 'important');
        page.style.setProperty('top', vv.offsetTop + 'px', 'important');
        page.style.setProperty('bottom', 'auto', 'important');
        scrollDown();
      } else {
        page.style.removeProperty('height');
        page.style.removeProperty('top');
        page.style.removeProperty('bottom');
      }
    };
    vv.addEventListener('resize', adjust);
    vv.addEventListener('scroll', adjust);
    window.__farmaAdjust = adjust;
  }

  function init() {
    var form = $('farma-form');
    var input = $('farma-input');
    var send = $('farma-send');
    if (!form || !input) return;
    var note = $('farma-lang-note');
    if (note && window.I18N && window.I18N.lang !== 'pt') note.hidden = false;

    input.addEventListener('input', function () { send.disabled = !input.value.trim(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      input.value = '';
      send.disabled = true;
      ask(v);
    });
    var root = document.documentElement;
    input.addEventListener('focus', function () { root.classList.add('farma-typing'); if (window.__farmaAdjust) window.__farmaAdjust(); });
    input.addEventListener('blur', function () {
      window.setTimeout(function () {
        if (document.activeElement !== input) { root.classList.remove('farma-typing'); if (window.__farmaAdjust) window.__farmaAdjust(); }
      }, 120);
    });
    $('farma-reset').addEventListener('click', function () { reset(); });
    $('modal-farmacia').querySelector('.farma-screen').addEventListener('click', function (e) {
      var go = e.target.closest('[data-farma-go]');
      if (go) { activateBottomTab(go.dataset.farmaGo); return; }
      var cp = e.target.closest('[data-farma-copy]');
      if (cp) {
        var bubble = cp.closest('.farma-body').querySelector('.farma-bubble');
        var txt = bubble ? bubble.innerText.trim() : '';
        var done = function () { if (typeof showToast === 'function') showToast({ text: tr('Resposta copiada.') }); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
        return;
      }
      var btn = e.target.closest('[data-farma-ask]');
      if (btn) ask(btn.dataset.farmaAsk, btn.dataset.farmaLabel);
    });
    bindViewport();
    // Sai do modo "digitando" ao trocar de aba.
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#bottom-nav')) root.classList.remove('farma-typing');
    }, true);
  }

  // API pública (usada pela navegação e pelos testes).
  window.FarmacIA = { show: show, ask: ask, reset: reset, respond: respond, classify: classify, _norm: norm, _fuzzy: fuzzyNorm, _state: function () { return { awaiting: awaiting }; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
