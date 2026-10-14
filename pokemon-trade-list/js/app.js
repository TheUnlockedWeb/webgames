/* ------------------------------------------------------------------
 * app.js — the page itself: trade-list card, toolbar, dialogs, themes.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const store = TL.store;

  const SITE_TAG = 'Pokémon GO Trade List Generator'; // footer line printed on the exported image
  const LIST_KEYS = ['looking', 'trade'];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- inline SVGs ---------- */
  const SVG = {
    pball: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.2" fill="#fff" stroke="#2b2f3a" stroke-width="2.6"/><path d="M1.8 16a14.2 14.2 0 0 1 28.4 0z" fill="#ee3b3b" stroke="#2b2f3a" stroke-width="2.6" stroke-linejoin="round"/><path d="M1.8 16h28.4" stroke="#2b2f3a" stroke-width="2.6"/><circle cx="16" cy="16" r="4.6" fill="#fff" stroke="#2b2f3a" stroke-width="2.6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    trinket: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffe3b0" stroke="#a86a2c" stroke-width="1.5"/><path d="M12 5l2 4.5 5 .5-3.8 3.3 1.2 5-4.4-2.5-4.4 2.5 1.2-5L5 10l5-.5z" fill="#ff8fb3" stroke="#d95f8a" stroke-width=".8" stroke-linejoin="round"/></svg>',
    avatar(canFly) {
      const badge = canFly
        ? '<circle cx="49" cy="47" r="10" fill="#22b866" stroke="#fff" stroke-width="2"/><path d="M44 47l3.6 3.6L54 43.5" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<circle cx="49" cy="47" r="10" fill="#e53935" stroke="#fff" stroke-width="2"/><path d="M45 43l8 8M53 43l-8 8" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>';
      return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="3" width="58" height="58" rx="14" fill="#cfe8ff" stroke="${canFly ? '#22b866' : '#e85d5d'}" stroke-width="3"/><path d="M32 10c-9 0-15 6.5-15 14.5C17 36 32 52 32 52s15-16 15-27.5C47 16.5 41 10 32 10z" fill="#2f7be0"/><circle cx="32" cy="24" r="6" fill="#fff"/>${badge}</svg>`;
    },
  };

  const THEME_ICONS = {
    normal: '#a8a77a', fire: '#f08030', water: '#6890f0', grass: '#78c850', electric: '#f8d030',
    psychic: '#f85888', dark: '#705848', steel: '#b8b8d0', poison: '#a040a0',
  };

  /* ================================================================
   *  Trade-list card
   * ================================================================ */
  const card = $('#card');

  function buildCard() {
    const sect = (key) => `
      <section class="sect" data-list="${key}">
        <div class="sect-head">
          <span class="pball">${SVG.pball}</span>
          <h3 class="sect-title editable" data-edit="${key}" title="Click to rename"></h3>
          <span class="trk" hidden><b>+</b>${SVG.trinket}</span>
          <div class="sect-actions no-export">
            <button class="ic" data-act="labels" data-list="${key}" title="Edit labels" aria-label="Edit labels">T</button>
            <button class="ic" data-act="pick" data-list="${key}" title="Add / remove Pokémon" aria-label="Add or remove Pokémon">${SVG.pencil}</button>
          </div>
        </div>
        <div class="panel">
          <div class="grid"></div>
          <button class="empty no-export" data-act="pick" data-list="${key}">Nothing here yet — tap to add Pokémon</button>
        </div>
      </section>`;

    card.innerHTML = `
      <div class="card-head">
        <div class="avatar-wrap"><div class="avatar"></div><div class="avatar-cap"></div></div>
        <h2 class="card-title editable" data-edit="title" title="Click to rename"></h2>
      </div>
      ${LIST_KEYS.map(sect).join('')}
      <div class="note-bar" hidden>${SVG.note}<span></span></div>
      <div class="watermark">${esc(SITE_TAG)}</div>`;

    TL.attachImgFallback(card);
    $$('.editable', card).forEach(wireEditable);
  }

  /** Click-to-edit text (title + both section headings). Enter/blur saves, Esc cancels. */
  function wireEditable(el) {
    const key = el.dataset.edit;
    const max = key === 'title' ? 30 : 24;
    const current = () => (key === 'title' ? store.get().title : store.get().headings[key]);
    const dflt = () => (key === 'title' ? TL.DEFAULTS.title : TL.DEFAULTS.headings[key]);
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('role', 'textbox');

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.textContent = current(); el.blur(); }
    });
    el.addEventListener('beforeinput', (e) => {
      if (!e.inputType.startsWith('insert')) return;
      const sel = window.getSelection();
      const replacing = sel && !sel.isCollapsed;
      if (!replacing && el.textContent.length >= max) e.preventDefault();
    });
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData.getData('text') || '').replace(/\s+/g, ' ');
      const room = max - el.textContent.length + String(window.getSelection()).length;
      document.execCommand('insertText', false, text.slice(0, Math.max(0, room)));
    });
    el.addEventListener('focus', () => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    });
    el.addEventListener('blur', () => {
      const v = el.textContent.replace(/\s+/g, ' ').trim().slice(0, max) || dflt();
      el.textContent = v;
      if (v !== current()) {
        if (key === 'title') store.patch({ title: v }); else store.setHeading(key, v);
      }
      window.getSelection().removeAllRanges();
    });
  }

  function makeCell(it) {
    const d = TL.describe(it.k);
    const el = document.createElement('figure');
    el.className = 'cell';
    el.dataset.k = it.k;
    el.innerHTML = `<div class="${TL.tileClass(d, 'tile')}">${TL.tileInner(d, false)}</div><figcaption class="lbl"></figcaption>`;
    return el;
  }

  /** Keyed reconcile so toggling a Pokémon doesn't reload every image. */
  function reconcile(grid, items) {
    const existing = new Map();
    [...grid.children].forEach((c) => existing.set(c.dataset.k, c));
    items.forEach((it, i) => {
      let el = existing.get(it.k);
      if (el) existing.delete(it.k); else el = makeCell(it);
      const lbl = el.lastElementChild;
      if (lbl.textContent !== it.label) lbl.textContent = it.label;
      const at = grid.children[i];
      if (at !== el) grid.insertBefore(el, at || null);
    });
    existing.forEach((el) => el.remove());
  }

  function renderCard() {
    const s = store.get();
    card.className = 'card theme-' + s.theme;

    const setText = (el, text) => {
      if (document.activeElement !== el && el.textContent !== text) el.textContent = text;
    };
    setText($('.card-title', card), s.title);

    $('.avatar', card).innerHTML = SVG.avatar(s.canFly);
    const cap = $('.avatar-cap', card);
    cap.textContent = s.canFly ? 'CAN FLY' : "CAN'T FLY";
    cap.classList.toggle('yes', s.canFly);

    LIST_KEYS.forEach((key) => {
      const sec = $(`.sect[data-list="${key}"]`, card);
      setText($('.sect-title', sec), s.headings[key]);
      $('.trk', sec).hidden = !s.trinket[key];
      reconcile($('.grid', sec), s.lists[key]);
      $('.empty', sec).hidden = s.lists[key].length > 0;
      sec.classList.toggle('is-empty', s.lists[key].length === 0);
    });

    const nb = $('.note-bar', card);
    nb.hidden = !s.note;
    $('span', nb).textContent = s.note;
  }

  /* ================================================================
   *  Toolbar + theme chooser state
   * ================================================================ */
  function renderChrome() {
    const s = store.get();
    $('#fly').checked = s.canFly;
    $('#btn-note-label').textContent = s.note ? 'Edit Note' : 'Note';
    $('#btn-note').classList.toggle('active', !!s.note);
    $('#btn-trinket').classList.toggle('active', s.trinket.looking || s.trinket.trade);
    $$('.theme-btn').forEach((b) => b.classList.toggle('on', b.dataset.theme === s.theme));
  }

  function buildThemes() {
    $('#theme-list').innerHTML = TL.THEMES.map((t) =>
      `<button class="theme-btn" data-theme="${t}"><span class="ticon" style="--c:${THEME_ICONS[t]}"></span>${t[0].toUpperCase() + t.slice(1)}</button>`).join('');
    $('#theme-list').addEventListener('click', (e) => {
      const b = e.target.closest('.theme-btn');
      if (b) store.patch({ theme: b.dataset.theme });
    });
  }

  /* ================================================================
   *  Dialogs
   * ================================================================ */

  /* ----- Clear all ----- */
  function openClear() {
    const ov = TL.modal.open({
      cls: 'modal-sm',
      html: `
        <h2 class="m-title">Clear All Pokemon</h2>
        <p class="m-text">Are you sure you want to clear all selected Pokemon?</p>
        <div class="m-actions"><button class="btn-ghost" data-close>Cancel</button><button class="btn-danger" id="do-clear">Clear All</button></div>`,
    });
    $('#do-clear', ov).addEventListener('click', () => {
      store.clearPokemon();
      ov.close();
      TL.toast('Cleared');
    });
  }

  /* ----- Trinket ----- */
  function openTrinket() {
    const s = store.get();
    const row = (key) => `
      <label class="trow">
        <span class="trow-ico">${SVG.trinket}</span>
        <span class="trow-txt"><b>${esc(s.headings[key])}</b><small>Show trinket beside ${esc(s.headings[key])}</small></span>
        <span class="switch"><input type="checkbox" data-t="${key}" ${s.trinket[key] ? 'checked' : ''}><i></i></span>
      </label>`;
    const ov = TL.modal.open({
      cls: 'modal-sm',
      html: `
        <h2 class="m-title">Trinket</h2>
        <p class="m-text">Show a trinket icon next to a section title on your list.</p>
        <div class="trows">${LIST_KEYS.map(row).join('')}</div>
        <p class="m-fine">Not saved — this resets when you reload or load a saved list.</p>
        <div class="m-actions"><button class="btn-primary" data-close>Done</button></div>`,
    });
    ov.addEventListener('change', (e) => {
      const t = e.target.dataset.t;
      if (t) store.setTrinket(t, e.target.checked); // live preview on the card
    });
  }

  /* ----- Note ----- */
  function openNote() {
    const MAX = 200;
    const ov = TL.modal.open({
      cls: 'modal-sm',
      html: `
        <h2 class="m-title">Note</h2>
        <p class="m-text">Add a short note to your list — trinket requests, trade terms, anything important.</p>
        <textarea class="note-ta" maxlength="${MAX}" rows="4" spellcheck="true"></textarea>
        <div class="note-meta"><span>Shown at the bottom of your list image</span><span class="note-left"></span></div>
        <div class="m-actions">
          <button class="btn-link-danger" id="note-remove">Remove</button><span class="grow"></span>
          <button class="btn-ghost" data-close>Cancel</button><button class="btn-primary" id="note-save">Save</button>
        </div>`,
    });
    const ta = $('.note-ta', ov);
    const left = $('.note-left', ov);
    ta.value = store.get().note;
    const upd = () => { left.textContent = MAX - ta.value.length; };
    ta.addEventListener('input', upd);
    upd();
    $('#note-remove', ov).hidden = !store.get().note;
    $('#note-remove', ov).addEventListener('click', () => { store.patch({ note: '' }); ov.close(); });
    $('#note-save', ov).addEventListener('click', () => { store.patch({ note: ta.value.trim() }); ov.close(); });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 40);
  }

  /* ----- Edit labels ----- */
  function openLabels(listKey) {
    const s = store.get();
    const items = s.lists[listKey];
    const cells = items.map((it) => {
      const d = TL.describe(it.k);
      return `<div class="lbl-cell" data-k="${it.k}">
        <div class="${TL.tileClass(d, 'tile')} lbl-tile" title="${esc(d.name)}">${TL.tileInner(d, true)}</div>
        <input type="text" maxlength="10" placeholder="+ LABEL" value="${esc(it.label)}" aria-label="Label for ${esc(d.name)}" spellcheck="false" autocomplete="off">
      </div>`;
    }).join('');

    const ov = TL.modal.open({
      cls: 'modal-labels',
      html: `
        <div class="m-head"><h2>Edit Labels — ${esc(s.headings[listKey])}</h2><button class="m-x" data-close aria-label="Close">×</button></div>
        <p class="m-text sm">Tap a Pokémon to set a label (max 10 chars). Empty text removes the label.</p>
        ${items.length ? `<div class="lbl-grid">${cells}</div>` : '<p class="m-text center">Add some Pokémon to this list first.</p>'}`,
    });
    TL.attachImgFallback(ov);
    ov.addEventListener('click', (e) => {
      const t = e.target.closest('.lbl-tile');
      if (t) t.parentElement.querySelector('input').focus();
    });
    ov.addEventListener('input', (e) => {
      if (e.target.tagName !== 'INPUT') return;
      const k = e.target.closest('.lbl-cell').dataset.k;
      e.target.value = e.target.value.toUpperCase();
      store.setLabel(listKey, k, e.target.value.trim()); // live on the card
    });
  }

  /* ----- Saved lists ----- */
  function openSaved() {
    const ov = TL.modal.open({
      cls: 'modal-saved',
      html: `
        <div class="m-head"><h2>Saved Lists</h2><button class="m-x" data-close aria-label="Close">×</button></div>
        <div class="saved-body">
          <label class="m-label" for="save-name">Save Current List</label>
          <div class="save-row"><input id="save-name" class="text-in" maxlength="40" placeholder="List name…" autocomplete="off"><button class="btn-primary" id="save-go">Save</button></div>
          <div class="saved-list"></div>
        </div>`,
    });
    const listEl = $('.saved-list', ov);
    const nameIn = $('#save-name', ov);

    function renderSaved() {
      const all = TL.saved.all();
      if (!all.length) { listEl.innerHTML = '<p class="m-text center dim">No saved lists yet.</p>'; return; }
      listEl.innerHTML = '<div class="m-label">Your Lists</div>' + all.map((x) => {
        const l = x.state.lists || {};
        const when = new Date(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        return `<div class="saved-row" data-id="${x.id}">
          <div class="saved-info"><b>${esc(x.name)}</b><small>${(l.looking || []).length} looking · ${(l.trade || []).length} trade · ${when}</small></div>
          <button class="btn-small" data-do="load">Load</button>
          <button class="btn-small danger" data-do="del">Delete</button>
        </div>`;
      }).join('');
    }

    function save() {
      const name = nameIn.value.replace(/\s+/g, ' ').trim();
      if (!name) { nameIn.focus(); TL.toast('Give your list a name first.'); return; }
      const r = TL.saved.save(name);
      if (!r.ok) { TL.toast('Could not save — browser storage is full or blocked.'); return; }
      nameIn.value = '';
      TL.toast(r.overwritten ? `Updated “${name}”` : `Saved “${name}”`);
      renderSaved();
    }
    $('#save-go', ov).addEventListener('click', save);
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-do]');
      if (!btn) return;
      const id = btn.closest('.saved-row').dataset.id;
      if (btn.dataset.do === 'load') {
        if (TL.saved.load(id)) { ov.close(); TL.toast('List loaded'); }
      } else if (btn.dataset.armed) {
        TL.saved.remove(id);
        renderSaved();
      } else {
        btn.dataset.armed = '1';
        btn.textContent = 'Sure?';
        setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Delete'; } }, 3000);
      }
    });
    renderSaved();
    setTimeout(() => nameIn.focus(), 40);
  }

  /* ----- Share ----- */
  function openShare() {
    const url = TL.share.url();
    const canNative = !!navigator.share;
    const ov = TL.modal.open({
      cls: 'modal-sm',
      html: `
        <h2 class="m-title">Share</h2>
        <p class="m-text">Anyone with this link can open a copy of your list.</p>
        <input class="text-in link-in" readonly value="${esc(url)}" aria-label="Share link">
        <div class="m-actions">
          <button class="btn-ghost" data-close>Close</button>
          ${canNative ? '<button class="btn-ghost" id="share-native">Share…</button>' : ''}
          <button class="btn-primary" id="share-copy">Copy Link</button>
        </div>`,
    });
    const inp = $('.link-in', ov);
    inp.addEventListener('focus', () => inp.select());
    $('#share-copy', ov).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); }
      catch (e) { inp.select(); document.execCommand('copy'); }
      TL.toast('Link copied');
    });
    if (canNative) {
      $('#share-native', ov).addEventListener('click', () => {
        navigator.share({ title: store.get().title, url }).catch(() => {});
      });
    }
  }

  /* ----- Download PNG ----- */
  async function downloadPng() {
    const btn = $('#btn-download');
    if (btn.disabled) return;
    if (!window.htmlToImage) { TL.toast('Image exporter failed to load — check your connection.'); return; }
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Exporting…';
    card.classList.add('exporting');
    try {
      await Promise.all($$('img', card).map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const opts = {
        pixelRatio: 2,
        filter: (n) => !(n.classList && n.classList.contains('no-export')),
      };
      let dataUrl;
      try { dataUrl = await window.htmlToImage.toPng(card, opts); }
      catch (e) { dataUrl = await window.htmlToImage.toPng(card, Object.assign({ fontEmbedCSS: '' }, opts)); }
      const a = document.createElement('a');
      const slug = store.get().title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trade-list';
      a.download = slug + '.png';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      TL.toast('Export failed — please try again.');
    } finally {
      card.classList.remove('exporting');
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* ================================================================
   *  Wire everything up
   * ================================================================ */
  function init() {
    buildCard();
    buildThemes();

    $('#btn-clear').addEventListener('click', () => {
      if (!store.total()) { TL.toast('Nothing to clear.'); return; }
      openClear();
    });
    $('#btn-download').addEventListener('click', downloadPng);
    $('#btn-share').addEventListener('click', openShare);
    $('#btn-saved').addEventListener('click', openSaved);
    $('#btn-trinket').addEventListener('click', openTrinket);
    $('#btn-note').addEventListener('click', openNote);
    $('#fly').addEventListener('change', (e) => store.patch({ canFly: e.target.checked }));

    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'pick') TL.openPicker(b.dataset.list);
      if (b.dataset.act === 'labels') openLabels(b.dataset.list);
    });

    store.subscribe(() => { renderCard(); renderChrome(); });

    TL.share.loadFromHash();
    renderCard();
    renderChrome();

    TL.loadDex().then((dex) => {
      if (dex.offline) TL.toast('Could not reach PokeAPI — showing dex numbers instead of names.');
      $$('.cell', card).forEach((c) => { c.querySelector('img').alt = TL.describe(c.dataset.k).name; });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
