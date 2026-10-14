/* ------------------------------------------------------------------
 * state.js — single source of truth for the list being edited,
 * localStorage persistence, saved lists and share-link encoding.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});

  const STATE_KEY = 'tl.state.v1';
  const SAVED_KEY = 'tl.saved.v1';
  const MAX_ITEMS = 300;

  TL.DEFAULTS = {
    title: 'Pokémon Trade List',
    headings: { looking: 'Looking For', trade: 'For Trade' },
  };
  TL.THEMES = ['normal', 'fire', 'water', 'grass', 'electric', 'psychic', 'dark', 'steel', 'poison'];

  const fresh = () => ({
    title: TL.DEFAULTS.title,
    headings: Object.assign({}, TL.DEFAULTS.headings),
    theme: 'grass',
    canFly: false,
    note: '',
    lists: { looking: [], trade: [] },
    trinket: { looking: false, trade: false }, // intentionally not persisted
  });

  /* ---------- sanitising anything that comes from storage / URL ---------- */
  const str = (v, max, fallback) =>
    typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : fallback;

  const cleanItems = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .filter((i) => i && typeof i.k === 'string' && /^\d+\|[01]\|[a-z]*\|[a-z]*\|[01]$/.test(i.k))
      .slice(0, MAX_ITEMS)
      .map((i) => ({ k: i.k, label: str(i.label, 10, '').toUpperCase() }));

  function normalise(raw) {
    const s = fresh();
    if (!raw || typeof raw !== 'object') return s;
    s.title = str(raw.title, 30, s.title);
    s.headings.looking = str(raw.headings && raw.headings.looking, 24, s.headings.looking);
    s.headings.trade = str(raw.headings && raw.headings.trade, 24, s.headings.trade);
    s.theme = TL.THEMES.includes(raw.theme) ? raw.theme : s.theme;
    s.canFly = !!raw.canFly;
    s.note = typeof raw.note === 'string' ? raw.note.slice(0, 200) : '';
    s.lists.looking = cleanItems(raw.lists && raw.lists.looking);
    s.lists.trade = cleanItems(raw.lists && raw.lists.trade);
    return s;
  }

  const persistable = (s) => ({
    title: s.title, headings: s.headings, theme: s.theme, canFly: s.canFly,
    note: s.note, lists: s.lists,
  });

  /* ---------- store ---------- */
  let state = fresh();
  try {
    state = normalise(JSON.parse(localStorage.getItem(STATE_KEY) || 'null'));
  } catch (e) { /* first visit or storage blocked */ }

  const subs = [];
  let saveTimer = null;
  function emit() {
    subs.forEach((fn) => fn(state));
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(persistable(state))); } catch (e) { /* ignore */ }
    }, 150);
  }

  TL.store = {
    get: () => state,
    subscribe: (fn) => { subs.push(fn); },
    patch(p) { Object.assign(state, p); emit(); },
    setHeading(list, text) { state.headings[list] = text; emit(); },
    setTrinket(list, on) { state.trinket[list] = !!on; emit(); },
    has: (list, k) => state.lists[list].some((i) => i.k === k),
    selectedSet: (list) => new Set(state.lists[list].map((i) => i.k)),

    /** Adds the tile if missing, removes it if present. Returns true if added. */
    toggle(list, k) {
      const arr = state.lists[list];
      const idx = arr.findIndex((i) => i.k === k);
      if (idx >= 0) { arr.splice(idx, 1); emit(); return { added: false }; }
      if (arr.length >= MAX_ITEMS) return { added: false, full: true };
      arr.push({ k, label: '' });
      emit();
      return { added: true };
    },
    setLabel(list, k, label) {
      const it = state.lists[list].find((i) => i.k === k);
      if (it) { it.label = label.toUpperCase().slice(0, 10); emit(); }
    },
    clearPokemon() { state.lists.looking = []; state.lists.trade = []; emit(); },
    replace(raw) {
      const keepTrinket = fresh().trinket; // trinket resets when a list is loaded
      state = normalise(raw);
      state.trinket = keepTrinket;
      emit();
    },
    total: () => state.lists.looking.length + state.lists.trade.length,
    MAX_ITEMS,
  };

  /* ---------- saved lists ---------- */
  function readSaved() {
    try {
      const a = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  const writeSaved = (a) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } };

  TL.saved = {
    all: () => readSaved().sort((a, b) => b.date - a.date),
    save(name) {
      const all = readSaved();
      const snap = JSON.parse(JSON.stringify(persistable(state)));
      const existing = all.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (existing) { existing.state = snap; existing.date = Date.now(); existing.name = name; }
      else all.push({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, date: Date.now(), state: snap });
      return { ok: writeSaved(all), overwritten: !!existing };
    },
    load(id) {
      const it = readSaved().find((x) => x.id === id);
      if (it) TL.store.replace(it.state);
      return !!it;
    },
    remove(id) { writeSaved(readSaved().filter((x) => x.id !== id)); },
  };

  /* ---------- share links ---------- */
  const b64 = {
    enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
  };

  TL.share = {
    encode() {
      const s = state;
      const pack = (arr) => arr.map((i) => [i.k, i.label || '']);
      return b64.enc(JSON.stringify({
        v: 1, t: s.title, h: [s.headings.looking, s.headings.trade], th: s.theme,
        f: s.canFly ? 1 : 0, n: s.note, l: pack(s.lists.looking), r: pack(s.lists.trade),
      }));
    },
    url() {
      return location.href.split('#')[0] + '#l=' + TL.share.encode();
    },
    /** Reads #l=… from the address bar. Returns true if a list was loaded. */
    loadFromHash() {
      const m = /^#l=([\w-]+)$/.exec(location.hash);
      if (!m) return false;
      try {
        const o = JSON.parse(b64.dec(m[1]));
        const unpack = (a) => (Array.isArray(a) ? a.map((x) => ({ k: x[0], label: x[1] })) : []);
        TL.store.replace({
          title: o.t, headings: { looking: o.h && o.h[0], trade: o.h && o.h[1] }, theme: o.th,
          canFly: !!o.f, note: o.n, lists: { looking: unpack(o.l), trade: unpack(o.r) },
        });
        history.replaceState(null, '', location.pathname + location.search);
        return true;
      } catch (e) {
        console.warn('Bad share link', e);
        return false;
      }
    },
  };
})();
