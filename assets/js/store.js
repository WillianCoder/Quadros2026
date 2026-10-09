/*
 * Onde os pedidos ficam guardados (global `Store`).
 *
 * Modo 'firebase': SITE_CONFIG.firebase preenchido → Firestore (plano gratuito).
 *   O cliente entra de forma anônima (sem cadastro) e vira o "dono" do pedido.
 *   O administrador entra com e-mail/senha ou Google (e-mail = SITE_CONFIG.adminEmail, confirmado).
 * Modo 'local': sem Firebase → tudo no IndexedDB deste navegador (para testar e demonstrar).
 *
 * Coleções: pedidos/{id} e pedidos/{id}/foto/0 — regras em firestore.rules.
 * A montagem vai como texto JSON (configJson) porque o Firestore não guarda lista dentro de lista.
 */
(function () {
  'use strict';
  const U = window.U;
  const CFG = (window.SITE_CONFIG || {}).firebase;
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const MEUS = 'qd:meus-pedidos';
  const STATUS = ['novo', 'confirmado', 'producao', 'enviado', 'entregue', 'cancelado'];

  const Store = { modo: CFG && CFG.apiKey && CFG.projectId ? 'firebase' : 'local', STATUS };
  const agora = () => Date.now();
  function erro(msg, code) { const e = new Error(msg); e.code = code; return e; }

  /* ---------- Modo local (IndexedDB) ---------- */
  let dbLocal = null;
  function idb() {
    if (dbLocal) return dbLocal;
    dbLocal = new Promise((ok, falha) => {
      const r = indexedDB.open('quadros-led', 1);
      r.onupgradeneeded = () => { ['pedidos', 'fotos'].forEach((n) => r.result.createObjectStore(n)); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => falha(erro('Não foi possível guardar neste navegador.', 'sem-armazenamento'));
    });
    return dbLocal;
  }
  async function op(store, modo, fn) {
    const db = await idb();
    return new Promise((ok, falha) => {
      const tx = db.transaction(store, modo);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => falha(tx.error);
    });
  }
  const L = {
    get: (s, k) => op(s, 'readonly', (o) => o.get(k)),
    put: (s, k, v) => op(s, 'readwrite', (o) => o.put(v, k)),
    del: (s, k) => op(s, 'readwrite', (o) => o.delete(k)),
    todos: (s) => op(s, 'readonly', (o) => o.getAll())
  };

  /* ---------- Modo Firebase ---------- */
  let fb = null;
  async function firebase() {
    if (fb) return fb;
    const [app, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    const a = app.initializeApp(CFG);
    const au = auth.getAuth(a);
    au.languageCode = 'pt-BR';
    fb = { auth, fs, au, db: fs.getFirestore(a) };
    await new Promise((ok) => { const s = auth.onAuthStateChanged(au, () => { s(); ok(); }); });
    return fb;
  }
  async function garantirLogin() {
    const f = await firebase();
    if (!f.au.currentUser) await f.auth.signInAnonymously(f.au);
    return f.au.currentUser;
  }
  const ref = (...c) => fb.fs.doc(fb.db, ...c);

  function montarPedido(id, d) {
    const cfg = d.config;
    const q = window.Quadro.obter(cfg.q) || {};
    return {
      id, status: 'novo', quadro: U.limitar(q.nome || cfg.q, 80), valor: Math.max(0, Number(d.valor) || 0),
      configJson: JSON.stringify(cfg), resumo: U.limitar(d.resumo, 3000),
      cliente: { nome: U.limitar(d.cliente.nome, 80), whatsapp: U.somenteNumeros(d.cliente.whatsapp).slice(0, 15), cidade: U.limitar(d.cliente.cidade, 80) },
      temFoto: !!d.foto, nota: '', criadoEm: agora(), atualizadoEm: agora()
    };
  }
  function lembrar(id) {
    const l = U.ls.get(MEUS, []).filter((x) => x !== id);
    l.unshift(id); U.ls.set(MEUS, l.slice(0, 30));
  }

  /* ---------- API do cliente ---------- */
  // dados: { config, valor, resumo, cliente: { nome, whatsapp, cidade }, foto: dataURL|null } → { id }
  Store.enviarPedido = async function (dados) {
    const id = U.uid(8);
    const foto = dados.foto ? U.fotoSegura(dados.foto) : '';
    const ped = montarPedido(id, Object.assign({}, dados, { foto }));
    if (Store.modo === 'local') {
      await L.put('pedidos', id, ped);
      if (foto) await L.put('fotos', id, foto);
      lembrar(id);
      return { id };
    }
    try {
      const user = await garantirLogin();
      await fb.fs.setDoc(ref('pedidos', id), Object.assign(ped, { dono: user.uid }));
      if (foto) await fb.fs.setDoc(ref('pedidos', id, 'foto', '0'), { src: foto });
    } catch (e) {
      console.error(e);
      throw erro('Não conseguimos registrar o pedido agora. Você ainda pode mandar pelo WhatsApp.', e.code || 'rede');
    }
    lembrar(id);
    return { id };
  };

  /* ---------- Administrador ---------- */
  Store.iniciar = async function () { if (Store.modo === 'firebase') await firebase(); };
  Store.entrarAdmin = async function (email, senha) {
    if (Store.modo === 'local') return;
    const f = await firebase();
    try { await f.auth.signInWithEmailAndPassword(f.au, email, senha); }
    catch (e) { throw erro('E-mail ou senha incorretos.', e.code); }
  };
  Store.entrarGoogle = async function () {
    if (Store.modo === 'local') return;
    const f = await firebase();
    await f.auth.signInWithPopup(f.au, new f.auth.GoogleAuthProvider());
  };
  Store.sair = async function () { if (fb) await fb.auth.signOut(fb.au); };
  Store.admin = function () {
    if (Store.modo === 'local') return { email: 'modo de teste (este navegador)' };
    const u = fb && fb.au.currentUser;
    const adm = String((window.SITE_CONFIG || {}).adminEmail || '').toLowerCase();
    return u && u.email && adm && u.email.toLowerCase() === adm && u.emailVerified ? { email: u.email } : null;
  };
  Store.pedidos = async function () {
    let l = [];
    if (Store.modo === 'local') l = (await L.todos('pedidos')) || [];
    else {
      const F = fb.fs;
      const q = await F.getDocs(F.query(F.collection(fb.db, 'pedidos'), F.orderBy('criadoEm', 'desc'), F.limit(300)));
      q.forEach((d) => l.push(d.data()));
    }
    return l.map((p) => {
      let config = null;
      try { config = JSON.parse(p.configJson || 'null'); } catch (e) { /* ignora */ }
      return Object.assign({}, p, { config });
    }).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  };
  Store.foto = async function (id) {
    if (Store.modo === 'local') return U.fotoSegura(await L.get('fotos', id));
    const s = await fb.fs.getDoc(ref('pedidos', id, 'foto', '0'));
    return s.exists() ? U.fotoSegura(s.data().src) : '';
  };
  Store.atualizar = async function (id, campos) {
    const extra = { atualizadoEm: agora() };
    if (campos.status != null) {
      if (!STATUS.includes(campos.status)) throw erro('Situação inválida.', 'status');
      extra.status = campos.status;
    }
    if (campos.nota != null) extra.nota = U.limitar(campos.nota, 1000);
    if (Store.modo === 'local') {
      const p = await L.get('pedidos', id);
      if (p) await L.put('pedidos', id, Object.assign(p, extra));
      return;
    }
    await fb.fs.updateDoc(ref('pedidos', id), extra);
  };
  Store.excluir = async function (id) {
    if (Store.modo === 'local') { await L.del('pedidos', id); await L.del('fotos', id); return; }
    const b = fb.fs.writeBatch(fb.db);
    b.delete(ref('pedidos', id, 'foto', '0'));
    b.delete(ref('pedidos', id));
    await b.commit();
  };

  window.Store = Store;
})();
