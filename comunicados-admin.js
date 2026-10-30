/* Comunicados — área da equipe (login, escrever, agendar, editar, arquivar, excluir).
 * Carregado só quando alguém toca em "Área da equipe".
 * Segurança de verdade está no banco (RLS + triggers): aqui o app apenas guia a pessoa.
 *  - usa a chave publishable + o token do usuário logado (nunca service_role);
 *  - a senha não é guardada: só o token de sessão e o refresh token;
 *  - quem assina o aviso (origem/autor) é definido pelo banco conforme o papel da conta, não pelo app.
 * Horário: tudo que a pessoa digita é entendido como horário de Brasília (UTC-3, sem horário de verão desde 2019). */
(function () {
  'use strict';
  const C = window.Comunicados;
  if (!C) return;
  const { url: URL_BASE, key: KEY } = C.cfg;
  const SESSION_KEY = 'planejador_staff_v1';
  const COLS = C.cfg.columns.join(',');
  const ORIGEM = { proprietario: 'Administração do planejador', coordenacao: 'Coordenação' };
  const STATUS_LABEL = { rascunho: 'Rascunho', agendado: 'Agendado', publicado: 'Publicado', arquivado: 'Arquivado' };
  const S = { session: null, perfil: null, items: [], editing: null, mode: 'now', busy: false, view: 'login' };

  const $ = id => document.getElementById(id);
  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach(k => { if (k !== null && k !== undefined && k !== false) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return n;
  }

  // ---------- horário de Brasília ----------
  const BRT_OFFSET_MIN = -180;
  function brtToIso(local) { // 'YYYY-MM-DDTHH:mm' em Brasília -> ISO UTC
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local || '')) return null;
    const ms = Date.parse(local + ':00-03:00');
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  function isoToBrt(iso) {
    const ms = Date.parse(iso); if (Number.isNaN(ms)) return '';
    return new Date(ms + BRT_OFFSET_MIN * 60000).toISOString().slice(0, 16);
  }
  function nowBrt() { return isoToBrt(new Date().toISOString()); }

  // ---------- sessão ----------
  function loadSession() { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s && s.access_token && s.refresh_token && s.uid ? s : null; } catch (_) { return null; } }
  function saveSession(s) { S.session = s; try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (_) {} }
  function fromAuth(j) {
    return { access_token: j.access_token, refresh_token: j.refresh_token, uid: j.user && j.user.id, email: (j.user && j.user.email) || '', expires_at: (j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000) };
  }
  async function authCall(grant, body) {
    const res = await fetch(URL_BASE + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await res.json(); } catch (_) {}
    if (!res.ok || !j || !j.access_token) { const e = new Error('auth'); e.status = res.status; throw e; }
    return fromAuth(j);
  }
  async function refresh() {
    if (!S.session) throw new Error('sem sessão');
    saveSession(await authCall('refresh_token', { refresh_token: S.session.refresh_token }));
  }
  async function api(path, opt) {
    opt = opt || {};
    if (!S.session) throw Object.assign(new Error('sem sessão'), { status: 401 });
    if (S.session.expires_at - Date.now() < 60000) { try { await refresh(); } catch (_) { saveSession(null); throw Object.assign(new Error('sessão expirada'), { status: 401 }); } }
    const go = () => fetch(URL_BASE + '/rest/v1/' + path, {
      method: opt.method || 'GET',
      headers: Object.assign({ apikey: KEY, Authorization: 'Bearer ' + S.session.access_token, Accept: 'application/json' }, opt.body ? { 'Content-Type': 'application/json' } : {}, opt.prefer ? { Prefer: opt.prefer } : {}),
      body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store'
    });
    let res = await go();
    if (res.status === 401) { try { await refresh(); res = await go(); } catch (_) { saveSession(null); throw Object.assign(new Error('sessão expirada'), { status: 401 }); } }
    let data = null; try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw Object.assign(new Error((data && data.message) || 'erro'), { status: res.status, code: data && data.code });
    return data;
  }
  function friendly(e) {
    if (!e) return 'Algo deu errado.';
    if (e.status === 401) return 'Sua sessão expirou. Entre de novo.';
    if (e.code === '42501' || e.status === 403) return 'Esta conta não tem permissão para essa ação.';
    if (e.code === '23514') return 'Algum campo não passou na validação do banco: título de 3 a 180 caracteres, mensagem de até 20 mil, link começando com https:// e, se agendado, uma data de publicação.';
    if (e instanceof TypeError || e.name === 'AbortError') return 'Sem conexão com o servidor. Tente de novo.';
    return 'Não foi possível concluir (' + (e.status || 'erro') + ').';
  }

  // ---------- tela ----------
  function root() { return $('com-staff'); }
  function setStatus(msg, kind) { const s = $('staff-msg'); if (!s) return; s.textContent = msg || ''; s.className = 'staff-msg' + (kind ? ' is-' + kind : ''); }
  function toggleBase(hide) {
    document.querySelectorAll('#modal-comunicados .comunicados-bar, #modal-comunicados .comunicados-sub, #comunicados-filters, #comunicados-list, #com-staff-entry').forEach(n => { n.hidden = hide; });
    root().hidden = !hide;
  }
  function close() { toggleBase(false); root().textContent = ''; C.show(); }

  async function open() {
    toggleBase(true);
    S.session = loadSession();
    if (S.session) { draw(h('p', { class: 'staff-loading', text: 'Verificando sua conta…' })); try { await ensureProfile(); return showComposer(); } catch (e) { if (e.status === 401 || e.noRole) { saveSession(null); } else { draw(errorBox(e)); return; } } }
    showLogin();
  }
  function draw(...nodes) {
    const r = root(); r.textContent = '';
    r.appendChild(h('button', { type: 'button', class: 'staff-back', onclick: close }, '‹ Voltar aos comunicados'));
    nodes.forEach(n => r.appendChild(n));
  }
  function errorBox(e) { return h('div', { class: 'staff-card' }, h('p', { class: 'staff-msg is-err', text: friendly(e) }), h('button', { type: 'button', class: 'staff-btn', onclick: open }, 'Tentar de novo')); }

  async function ensureProfile() {
    const rows = await api('perfis?select=nome,papel&id=eq.' + encodeURIComponent(S.session.uid));
    const p = rows && rows[0];
    if (!p || !ORIGEM[p.papel]) { const e = new Error('sem papel'); e.noRole = true; throw e; }
    S.perfil = p;
  }

  function showLogin(msg) {
    S.view = 'login';
    const email = h('input', { id: 'staff-email', type: 'email', autocomplete: 'username', required: true, placeholder: 'seu e-mail', 'aria-label': 'E-mail' });
    const pass = h('input', { id: 'staff-pass', type: 'password', autocomplete: 'current-password', required: true, placeholder: 'senha', 'aria-label': 'Senha' });
    const btn = h('button', { type: 'submit', class: 'staff-send', 'aria-label': 'Entrar' }, 'Entrar');
    const form = h('form', { class: 'staff-card staff-login', novalidate: true, onsubmit: async ev => {
      ev.preventDefault();
      if (!email.value.trim() || !pass.value) { setStatus('Preencha e-mail e senha.', 'err'); return; }
      btn.disabled = true; setStatus('Entrando…');
      try {
        saveSession(await authCall('password', { email: email.value.trim(), password: pass.value }));
        pass.value = '';
        await ensureProfile();
        showComposer();
      } catch (e) {
        pass.value = '';
        if (e.noRole) { saveSession(null); setStatus('Esta conta não tem permissão para publicar comunicados.', 'err'); }
        else if (e.message === 'auth') setStatus(e.status === 400 || e.status === 401 ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar agora. Tente de novo.', 'err');
        else setStatus('Sem conexão com o servidor. Tente de novo.', 'err');
        btn.disabled = false;
      }
    } },
      h('h3', { class: 'staff-h', text: 'Área da equipe' }),
      h('p', { class: 'staff-sub', text: 'Entre com a conta da coordenação ou da equipe do Planejador para publicar avisos.' }),
      email, pass, h('div', { class: 'staff-row' }, h('span', { id: 'staff-msg', class: 'staff-msg', role: 'status' }, msg || ''), btn));
    draw(form);
  }

  // ---------- compositor ----------
  function showComposer() {
    S.view = 'composer'; S.mode = 'now'; S.editing = null;
    const quem = ORIGEM[S.perfil.papel];
    const titulo = h('input', { id: 'staff-titulo', class: 'staff-title-input', type: 'text', maxlength: '180', placeholder: 'Título do aviso', 'aria-label': 'Título' });
    const msg = h('textarea', { id: 'staff-mensagem', class: 'staff-textarea', rows: '4', maxlength: '20000', placeholder: 'Escreva o aviso aqui. Pode digitar o código de uma disciplina (por exemplo BQM101): o site troca pelo nome.', 'aria-label': 'Mensagem' });
    const cat = h('select', { id: 'staff-cat', class: 'staff-pill', 'aria-label': 'Categoria' }, Object.keys(C.CATS).map(k => h('option', { value: k, selected: k === 'avisos' }, C.CATS[k])));
    const prio = h('select', { id: 'staff-prio', class: 'staff-pill', 'aria-label': 'Prioridade' }, [['normal', 'Normal'], ['importante', 'Importante'], ['urgente', 'Urgente']].map(([v, t]) => h('option', { value: v }, t)));
    const fix = h('label', { class: 'staff-pill staff-check' }, h('input', { id: 'staff-fixado', type: 'checkbox' }), 'Fixar no topo');
    const link = h('input', { id: 'staff-link', class: 'staff-pill staff-link', type: 'url', inputmode: 'url', placeholder: 'Link (https://…) opcional', 'aria-label': 'Link', maxlength: '2000' });
    const when = h('input', { id: 'staff-when', class: 'staff-pill', type: 'datetime-local', 'aria-label': 'Data e hora da publicação (Brasília)', min: nowBrt() });
    const whenBox = h('div', { id: 'staff-when-box', class: 'staff-when', hidden: true }, h('span', { class: 'staff-hint', text: 'Publica sozinho neste dia e hora, horário de Brasília (UTC−3).' }), when);
    const valid = h('input', { id: 'staff-validade', class: 'staff-pill', type: 'datetime-local', 'aria-label': 'Some do site em (Brasília)' });
    const mode = h('div', { class: 'staff-seg', role: 'radiogroup', 'aria-label': 'Quando publicar' }, [['now', 'Agora'], ['schedule', 'Agendar'], ['draft', 'Rascunho']].map(([v, t]) =>
      h('button', { type: 'button', role: 'radio', 'data-mode': v, 'aria-checked': v === 'now' ? 'true' : 'false', class: 'staff-seg-btn' + (v === 'now' ? ' is-on' : ''), onclick: () => setMode(v) }, t)));
    const send = h('button', { id: 'staff-send', type: 'submit', class: 'staff-send', 'aria-label': 'Publicar' }, h('span', { id: 'staff-send-label', text: 'Publicar' }));
    const form = h('form', { id: 'staff-form', class: 'staff-card staff-composer', novalidate: true, onsubmit: submit },
      h('div', { class: 'staff-who' }, h('span', { class: 'staff-dot' }), 'Publicando como ', h('strong', { text: quem }), h('button', { type: 'button', class: 'staff-link-btn', onclick: logout }, 'Sair')),
      titulo, msg,
      h('div', { class: 'staff-chips' }, cat, prio, fix),
      h('div', { class: 'staff-chips' }, link),
      h('label', { class: 'staff-field' }, h('span', { text: 'Some do site em (opcional, Brasília)' }), valid),
      mode, whenBox,
      h('div', { class: 'staff-row' }, h('span', { id: 'staff-msg', class: 'staff-msg', role: 'status' }), send));
    const prevHead = h('h4', { class: 'staff-sec', text: 'Como vai aparecer' });
    const prev = h('div', { id: 'staff-preview', class: 'staff-preview', 'aria-live': 'polite' });
    const listHead = h('h4', { class: 'staff-sec', text: 'Avisos cadastrados' });
    const list = h('div', { id: 'staff-list', class: 'staff-list' });
    draw(form, prevHead, prev, listHead, list);
    const grow = () => { msg.style.height = 'auto'; msg.style.height = Math.min(msg.scrollHeight, 360) + 'px'; };
    [titulo, msg, cat, prio, fix.firstChild, link, when, valid].forEach(n => { n.addEventListener('input', () => { if (n === msg) grow(); preview(); }); n.addEventListener('change', preview); });
    preview(); loadList();
  }

  function setMode(m) {
    S.mode = m;
    document.querySelectorAll('.staff-seg-btn').forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    $('staff-when-box').hidden = m !== 'schedule';
    if (m === 'schedule') { $('staff-when').min = nowBrt(); }
    const label = S.editing && S.editing.status === 'publicado' && m === 'now' ? 'Salvar alterações' : { now: 'Publicar', schedule: 'Agendar', draft: 'Salvar rascunho' }[m];
    $('staff-send-label').textContent = label; $('staff-send').setAttribute('aria-label', label);
    preview();
  }

  function readForm() {
    const v = id => $(id).value;
    return { titulo: v('staff-titulo').trim(), mensagem: v('staff-mensagem').trim(), categoria: v('staff-cat'), prioridade: v('staff-prio'), fixado: $('staff-fixado').checked, link_url: v('staff-link').trim(), when: v('staff-when'), validade: v('staff-validade') };
  }
  function validate(f) {
    if (f.titulo.length < 3) return 'O título precisa ter pelo menos 3 caracteres.';
    if (f.titulo.length > 180) return 'O título pode ter no máximo 180 caracteres.';
    if (!f.mensagem) return 'Escreva a mensagem do aviso.';
    if (f.link_url && !/^https:\/\/[^\s]+$/.test(f.link_url)) return 'O link precisa começar com https:// e não ter espaços.';
    let pub = Date.now();
    if (S.mode === 'schedule') {
      const iso = brtToIso(f.when);
      if (!iso) return 'Escolha o dia e a hora da publicação.';
      if (Date.parse(iso) < Date.now() + 60000) return 'A data agendada precisa estar no futuro (horário de Brasília).';
      pub = Date.parse(iso);
    }
    if (f.validade) { const vi = brtToIso(f.validade); if (!vi) return 'Data de validade inválida.'; if (Date.parse(vi) <= pub) return 'A validade precisa ser depois da publicação.'; }
    return null;
  }
  function payload(f) {
    const body = { titulo: f.titulo, mensagem: f.mensagem, categoria: f.categoria, prioridade: f.prioridade, fixado: f.fixado, link_url: f.link_url || null, validade: f.validade ? brtToIso(f.validade) : null };
    if (S.mode === 'schedule') { body.status = 'agendado'; body.publicar_em = brtToIso(f.when); }
    else { body.status = S.mode === 'draft' ? 'rascunho' : 'publicado'; body.publicar_em = null; }
    return body;
  }

  function preview() {
    const box = $('staff-preview'); if (!box) return;
    const f = readForm(); box.textContent = '';
    if (!f.titulo && !f.mensagem) { box.appendChild(h('p', { class: 'staff-hint', text: 'Comece a escrever para ver a prévia.' })); return; }
    const iso = S.mode === 'schedule' ? brtToIso(f.when) : new Date().toISOString();
    const c = C.clean({ id: 'previa', titulo: f.titulo || 'Sem título', mensagem: f.mensagem || '…', categoria: f.categoria, prioridade: f.prioridade, status: 'publicado', fixado: f.fixado, link_url: f.link_url || null, origem: ORIGEM[S.perfil.papel], publicado_em: iso, criado_em: iso });
    if (c) box.appendChild(C.card(c));
  }

  async function submit(ev) {
    ev.preventDefault(); if (S.busy) return;
    const f = readForm(); const err = validate(f);
    if (err) { setStatus(err, 'err'); return; }
    const modeUsed = S.mode;
    S.busy = true; $('staff-send').disabled = true; setStatus('Enviando…');
    try {
      if (S.editing) await api('comunicados?id=eq.' + encodeURIComponent(S.editing.id), { method: 'PATCH', body: payload(f), prefer: 'return=representation' });
      else await api('comunicados', { method: 'POST', body: payload(f), prefer: 'return=representation' });
      const was = S.editing; S.editing = null;
      showComposer();
      setStatus(was ? 'Alterações salvas.' : ({ now: 'Aviso publicado.', schedule: 'Aviso agendado.', draft: 'Rascunho salvo.' })[modeUsed], 'ok');
      C.refresh();
    } catch (e) {
      if (e.status === 401) { saveSession(null); showLogin('Sua sessão expirou. Entre de novo.'); }
      else setStatus(friendly(e), 'err');
    } finally { S.busy = false; const b = $('staff-send'); if (b) b.disabled = false; }
  }

  // ---------- lista ----------
  async function loadList() {
    const list = $('staff-list'); if (!list) return;
    list.textContent = ''; list.appendChild(h('p', { class: 'staff-hint', text: 'Carregando…' }));
    try { S.items = (await api('comunicados?select=' + COLS + '&order=criado_em.desc&limit=100')) || []; }
    catch (e) { if (e.status === 401) { saveSession(null); showLogin('Sua sessão expirou. Entre de novo.'); return; } list.textContent = ''; list.appendChild(h('p', { class: 'staff-msg is-err', text: friendly(e) })); return; }
    list.textContent = '';
    if (!S.items.length) { list.appendChild(h('p', { class: 'staff-hint', text: 'Nenhum aviso cadastrado ainda.' })); return; }
    S.items.forEach(it => list.appendChild(row(it)));
  }
  function statusText(it) {
    if (it.status === 'agendado') return 'Agendado para ' + C.fmt(it.publicar_em);
    if (it.status === 'publicado' && it.validade && Date.parse(it.validade) <= Date.now()) return 'Publicado (vencido)';
    return STATUS_LABEL[it.status] || it.status;
  }
  function row(it) {
    const act = (label, fn, cls) => h('button', { type: 'button', class: 'staff-mini' + (cls ? ' ' + cls : ''), onclick: fn }, label);
    const actions = [act('Editar', () => edit(it))];
    if (it.status === 'rascunho' || it.status === 'agendado') actions.push(act('Publicar agora', () => patch(it, { status: 'publicado', publicar_em: null }, 'Aviso publicado.')));
    if (it.status === 'publicado' || it.status === 'agendado') actions.push(act('Arquivar', () => patch(it, { status: 'arquivado' }, 'Aviso arquivado.')));
    if (it.status === 'arquivado') actions.push(act('Voltar a rascunho', () => patch(it, { status: 'rascunho' }, 'Voltou a rascunho.')));
    let armed = null;
    const del = act('Excluir', () => {
      if (!armed) { armed = true; del.textContent = 'Confirmar exclusão'; del.classList.add('is-danger'); setTimeout(() => { if (armed && del.isConnected) { armed = null; del.textContent = 'Excluir'; del.classList.remove('is-danger'); } }, 4000); return; }
      remove(it);
    }, 'is-del');
    actions.push(del);
    return h('div', { class: 'staff-item', 'data-id': it.id },
      h('div', { class: 'staff-item-top' }, h('span', { class: 'staff-st st-' + it.status, text: statusText(it) }), h('span', { class: 'staff-origin', text: it.origem || '' })),
      h('div', { class: 'staff-item-title', text: it.titulo }), h('div', { class: 'staff-actions' }, actions));
  }
  async function patch(it, body, ok) {
    try { await api('comunicados?id=eq.' + encodeURIComponent(it.id), { method: 'PATCH', body, prefer: 'return=representation' }); setStatus(ok, 'ok'); await loadList(); C.refresh(); }
    catch (e) { if (e.status === 401) { saveSession(null); showLogin('Sua sessão expirou. Entre de novo.'); } else setStatus(friendly(e), 'err'); }
  }
  async function remove(it) {
    try { await api('comunicados?id=eq.' + encodeURIComponent(it.id), { method: 'DELETE', prefer: 'return=minimal' }); setStatus('Aviso excluído. O histórico fica guardado no banco.', 'ok'); await loadList(); C.refresh(); }
    catch (e) { if (e.status === 401) { saveSession(null); showLogin('Sua sessão expirou. Entre de novo.'); } else setStatus(friendly(e), 'err'); }
  }
  function edit(it) {
    S.editing = it;
    $('staff-titulo').value = it.titulo; $('staff-mensagem').value = it.mensagem; $('staff-cat').value = it.categoria; $('staff-prio').value = it.prioridade;
    $('staff-fixado').checked = !!it.fixado; $('staff-link').value = it.link_url || ''; $('staff-validade').value = it.validade ? isoToBrt(it.validade) : '';
    $('staff-when').value = it.publicar_em ? isoToBrt(it.publicar_em) : '';
    setMode(it.status === 'agendado' ? 'schedule' : it.status === 'rascunho' ? 'draft' : 'now');
    const m = $('staff-mensagem'); m.style.height = 'auto'; m.style.height = Math.min(m.scrollHeight, 360) + 'px';
    $('staff-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStatus('Editando “' + it.titulo.slice(0, 60) + '”. Toque em ' + $('staff-send-label').textContent.toLowerCase() + ' para salvar.');
  }

  async function logout() {
    const tok = S.session && S.session.access_token;
    saveSession(null); S.perfil = null;
    if (tok) { try { await fetch(URL_BASE + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + tok } }); } catch (_) {} }
    showLogin('Você saiu da conta.');
  }

  window.ComunicadosAdmin = { open, _brtToIso: brtToIso, _isoToBrt: isoToBrt, _state: S };
})();
