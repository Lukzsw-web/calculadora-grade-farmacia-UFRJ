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
    'vou ficar sera ainda cursando cursei').split(' ');
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

    var tokens = stripIntent(text);
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

  // ---------- intenções ----------
  var lastSubject = null;

  function has(n, re) { return re.test(n); }

  function classify(raw) {
    var n = norm(raw);
    if (!n) return { id: 'empty' };

    // 1) Perguntas que não dependem de uma disciplina específica.
    if (has(n, /^(oi|ola|opa|eae|e ai|salve|hey|hello|bom dia|boa tarde|boa noite)( |$)/) && n.split(' ').length <= 4 && !codesIn(raw).length && !aliasSubject(raw)) return { id: 'greet' };
    if (has(n, /\b(obrigad[oa]|brigad[oa]|valeu|thanks)\b/) && n.split(' ').length <= 4) return { id: 'thanks' };
    var rule = window.FarmaRegras && window.FarmaRegras.match(n);
    if (rule) return { id: 'rule', rule: rule };
    if (has(n, /\b(ajuda|ajudar|o que (voce|vc) (faz|sabe|pode|responde)|como (voce |vc )?(funciona|usa|usar)|comandos|exemplos|help)\b/)) return { id: 'help' };
    if (has(n, /\b(quant[oa]s? (creditos?|horas?|materias?|disciplinas?|obrigatorias?)( ja)? (faltam|falta|restam|resta|fiz|cursei|tenho|completei)|quanto (me )?falta|falta(m)? (pra|para) (eu )?(me )?formar|(meu|o meu) progresso|progresso|como (eu )?(to|estou)|em que ponto|ja cumpri)\b/)) return { id: 'progress' };
    if (has(n, /\b(limite|maximo|minimo|carga minima|carga maxima).*(credito|siga|puxar)|(quantos|qual).*(creditos|credito).*(posso|pode|da pra|permite|aceita|limite)|siga (aceita|permite)\b/)) return { id: 'siga' };
    if (has(n, /\b(proximo periodo|qual (e )?(o )?meu periodo|em que periodo (eu )?(estou|to)|periodo atual)\b/)) return { id: 'nextPeriod' };
    if (has(n, /\b(quais|que|o que) (as )?(materias|disciplinas|obrigatorias|condicionadas)?.*(faltam|falta|restam|ainda falta|falto)( cursar| fazer)?|o que (ainda )?falta cursar|materias que faltam|disciplinas que faltam/) && !codesIn(raw).length && !aliasSubject(raw)) return { id: 'pending' };

    // 2) Período inteiro: "matérias do 3º período".
    var intent = parseSearchIntent(raw);
    if (intent.filters.periodo && !codesIn(raw).length && !aliasSubject(raw)) {
      var restTokens = stripIntent(intent.text || '');
      if (!restTokens.length) return { id: 'period', periodo: intent.filters.periodo };
    }

    // 3) Perguntas sobre uma disciplina.
    var found = findSubjects(intent.filters.periodo ? (intent.text || raw) : raw);
    var hasEntity = found.list.length > 0;

    if (has(n, /\b(co ?requisitos?|correquisitos?|corequisitos?|cursar junto|juntas?|ao mesmo tempo|concomitante)\b/)) return { id: 'coreq', found: found };

    if (has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|e pre ?requisito de (que|quais|quem|o que)|pre ?requisito de (que|quais|quem|o que)|depende[m]? d[oea])\b/) || has(n, /\b(tranca|trava|trancam|travam)\b/)) {
      var onlyDependents = has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|pre ?requisito de (que|quais|quem|o que))\b/);
      return { id: 'locks', onlyDependents: onlyDependents, found: found };
    }
    if (has(n, /\b(pre ?requisitos?|pre req|requisitos?|precisa|precisam|precisa(r|mos)? (de|pra|para|pro)|preciso (de|pra|para|pro)|exige|exigem|o que falta (pra|para|pro)|falta (pra|para|pro)|o que (eu )?(tenho|preciso) (que )?(cursar|fazer|ter) (antes|pra|para))\b/)) return { id: 'prereqs', found: found };

    var listPhrase = has(n, /\b(o que|quais|que|quais sao as?)\b.*\b(posso|da|pode|consigo|esta|estao|tem|tenho)\b.*\b(puxar|pegar|cursar|fazer|disponiv|liberad)/) ||
      has(n, /\b(o que (eu )?(posso|devo|consigo) (puxar|pegar|cursar|fazer)|quais (materias|disciplinas) (posso|da pra|dá pra|estao)|o que (esta|ta|tá) (disponivel|liberado)|o que (eu )?puxo|me sugere|sugestao|o que puxar|disponiveis|puxaveis)\b/);
    var canVerb = has(n, /\b(posso|consigo|da pra|pode|podem|liberad[oa]s?|disponivel|ja da|puxar|pegar|cursar|fazer|matricular|matricula|puxo)\b/);
    if (listPhrase && !hasEntity) return { id: 'available' };
    if (canVerb && hasEntity) return { id: 'canTake', found: found };
    if (canVerb && !hasEntity && has(n, /\b(o que|quais|que materias|que disciplinas)\b/)) return { id: 'available' };
    if (has(n, /\b(condicionadas?|optativas?|eletivas?)\b/) && !hasEntity) return { id: 'cond' };

    if (hasEntity) return { id: 'info', found: found };
    // pronome: "e o que ela tranca?" -> usa a última disciplina citada
    if (lastSubject && has(n, /\b(ela|ele|dela|dele|essa|esse|desta|deste|disso|e (o que|quais|quantos|quanto))\b/)) return { id: 'followup', found: { list: [lastSubject], ambiguous: false } };
    return { id: 'unknown' };
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

  function welcomeHTML() {
    return p('Oi! Eu sou a <strong>FarmacIA</strong>.') +
      p('Não uso inteligência artificial generativa: respondo com os pré-requisitos e o seu progresso que já estão no app. Pergunte, por exemplo:');
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

  function respond(raw) {
    var intent = classify(raw);
    var found = intent.found;
    var m = subjectFrom(found);
    if (m) lastSubject = m;

    switch (intent.id) {
      case 'empty': return null;
      case 'greet': return R(p('Olá! Posso conferir pré-requisitos, co-requisitos, o que uma matéria tranca e quanto falta para você se formar. O que quer saber?'), welcomeChips().slice(0, 3));
      case 'thanks': return R(p('Por nada! Se tiver mais alguma dúvida sobre a grade, é só perguntar.'));
      case 'help': return R(p('Eu respondo sobre a sua grade, usando só os dados do app. Algumas ideias:') +
        p('• “Posso puxar CIF I?”<br>• “O que Química Orgânica I tranca?”<br>• “Pré-requisitos de Toxicologia Geral”<br>• “Co-requisitos de MACF”<br>• “Quantos créditos faltam?”<br>• “Matérias do 4º período”<br>• “O que posso puxar?”<br>• “Como trancar a matrícula?”<br>• “Qual a frequência mínima?”<br>• “Quais os requisitos das bolsas?”<br>• “Quantas horas tem o curso?”'), welcomeChips().slice(0, 3));
      case 'rule': return R(intent.rule.html + p('<small>' + esc('Regras podem mudar: confirme na Secretaria Acadêmica ou com o seu orientador.') + '</small>'), intent.rule.chips);
      case 'progress': return answerProgress();
      case 'siga': return answerSiga();
      case 'nextPeriod': return answerNextPeriod();
      case 'pending': return answerPending();
      case 'available': return answerAvailable(raw);
      case 'period': return answerPeriod(intent.periodo);
      case 'cond': return answerCond();
      case 'followup':
      case 'info': return m ? answerInfo(m) : needSubject(found, 'Sobre');
      case 'canTake': return m ? answerCanTake(m) : needSubject(found, 'Posso puxar');
      case 'locks': return m ? answerLocks(m, intent.onlyDependents) : (lastSubject && !found.list.length ? answerLocks(lastSubject, intent.onlyDependents) : needSubject(found, 'O que tranca'));
      case 'prereqs': return m ? answerPrereqs(m) : (lastSubject && !found.list.length ? answerPrereqs(lastSubject) : needSubject(found, 'Pré-requisitos de'));
      case 'coreq': return m ? answerCoreq(m) : (lastSubject && !found.list.length ? answerCoreq(lastSubject) : needSubject(found, 'Co-requisitos de'));
      default:
        return R(p('Não entendi bem essa pergunta. Eu sei falar de <strong>pré-requisitos</strong>, <strong>co-requisitos</strong>, o que cada matéria <strong>tranca</strong>, o que você <strong>pode puxar</strong> e quanto <strong>falta</strong> para se formar, além de regras da UFRJ (trancamento, frequência, bolsas, prazo, carga horária). Tente citar o nome ou o código da disciplina.'), welcomeChips().slice(0, 4));
    }
  }

  // ---------- interface ----------
  var AVATAR = '<span class="farma-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h13v5.2a6.5 6.5 0 0 1-13 0z"></path><path d="M12 15.2V19M8.2 20.5h7.6"></path><path d="M12 5.4l.95 2.35 2.35.95-2.35.95L12 12l-.95-2.35-2.35-.95 2.35-.95z" fill="currentColor" stroke-width="1"></path></svg></span>';
  var started = false;
  var busy = false;
  var reduceMotion = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

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
    div.innerHTML = AVATAR + '<div class="farma-bubble" data-no-i18n>' + html + '</div>';
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
      busy = false;
    }, delay);
  }

  function reset() {
    var el = messagesEl();
    if (!el) return;
    el.innerHTML = '';
    lastSubject = null;
    busy = false;
    addBot(welcomeHTML());
    setChips(welcomeChips());
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
  window.FarmacIA = { show: show, ask: ask, reset: reset, respond: respond, classify: classify, _norm: norm };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
