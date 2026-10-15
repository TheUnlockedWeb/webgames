/* ------------------------------------------------------------------
 * picker.js — the "Select Pokémon" modal (one for Looking For, one for
 * For Trade).  Layout: title, search, multi-select filter chips, 7-column
 * tile grid, footer with hint + Done.
 *
 * Tapping a tile adds it to the list immediately; tapping again removes it.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});

  const CHUNK = 154; // tiles rendered per batch (22 rows of 7)
  const CHIPS = [
    ['normal', 'Normal'], ['shiny', '✨ Shiny'], ['costume', 'Costume'], ['form', 'Form'],
    ['mega', 'Mega'], ['dynamax', 'Dynamax'], ['gmax', 'Gigantamax'], ['location', 'Location Card'],
    ['background', 'Background'], ['|'], ['legend', 'Legendaries/Ultra Beasts'], ['selected', 'Selected'],
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Shared tile markup used by the picker, the card and the label editor. */
  TL.tileClass = (d, base) =>
    [base, d.bg ? 'bg-' + d.bg : '', d.type === 'gmax' ? 'is-gmax' : '', d.type === 'dmax' ? 'is-dmax' : '']
      .filter(Boolean).join(' ');

  // Render inner contents of a tile: sprite, badges (shiny, dynamax), hat
  TL.tileInner = (d, lazy) => {
    const img = `<img src="${d.src}" data-fb="${d.fallback}" alt="${esc(d.name)}" draggable="false" decoding="async"${lazy ? ' loading="lazy"' : ''}>`;
    const shiny = d.shiny ? '<i class="bd bd-shiny" aria-hidden="true"></i>' : '';
    // show the dynamax badge ONLY for dmax (not gmax). Allow inline background-image override.
    const dmax = d.type === 'dmax' ? `<i class="bd bd-dmax" aria-hidden="true" style="${d.type === 'dmax' ? `background-image:url('${TL.ASSET_PATHS.dynamax}');` : ''}"></i>` : '';
    const hat = d.hat ? '<i class="bd bd-hat" aria-hidden="true"></i>' : '';
    return img + shiny + dmax + hat;
  };

  /** <img> error handling: try the small sprite once, then give up gracefully. */
  TL.attachImgFallback = (root) => {
    root.addEventListener('error', (ev) => {
      const img = ev.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.fb && img.src !== img.dataset.fb && !img.dataset.tried) {
        img.dataset.tried = '1';
        img.src = img.dataset.fb;
      } else {
        img.style.visibility = 'hidden';
        img.parentElement.classList.add('noimg');
      }
    }, true);
  };

  TL.openPicker = function (listKey) {
    const heading = TL.store.get().headings[listKey];
    const filters = new Set();
    let search = '';
    let results = [];
    let rendered = 0;
    let selected = TL.store.selectedSet(listKey);

    const ov = TL.modal.open({
      cls: 'modal-picker',
      html: `
        <div class="m-head">
          <h2>Select Pokémon — <span class="hl">${esc(heading)}</span></h2>
          <button class="m-x" data-close aria-label="Close">×</button>
        </div>
        <div class="pk-controls">
          <input class="pk-search" type="search" autocomplete="off" spellcheck="false"
                 placeholder="Search name, dex number, or background…" aria-label="Search">
          <div class="pk-chips">${CHIPS.map(([k, label]) =>
            k === '|' ? '<span class="chip-sep"></span>'
              : `<button class="chip" data-f="${k}" aria-pressed="false">${label}${k === 'selected' ? '<b class="chip-n"></b>' : ''}</button>`).join('')}
          </div>
        </div>
        <div class="pk-grid-wrap"><div class="pk-grid" role="list"></div><div class="pk-empty" hidden>No Pokémon match these filters.</div></div>
        <div class="m-foot">
          <span class="hint">Tap a tile to add it — tap again to remove.</span>
          <button class="btn-done" data-close>Done</button>
        </div>`,
    });

    const grid = ov.querySelector('.pk-grid');
    const wrap = ov.querySelector('.pk-grid-wrap');
    const empty = ov.querySelector('.pk-empty');
    const input = ov.querySelector('.pk-search');
    TL.attachImgFallback(grid);

    // add a small re-probe / clear cache control into the modal for debugging
    (function addProbeControls() {
      const controls = ov.querySelector('.pk-controls');
      if (!controls) return;
      const bar = document.createElement('div');
      bar.className = 'pk-probe';
      bar.style.marginTop = '8px';
      bar.innerHTML = `<button class="tb" type="button">Re-probe GO assets</button> <button class="tb tb-danger" type="button">Clear asset cache</button> <span class="pk-probe-status" style="margin-left:8px;color:var(--dim)"></span>`;
      controls.appendChild(bar);
      const btnRe = bar.querySelector('button');
      const btnClear = bar.querySelectorAll('button')[1];
      const status = bar.querySelector('.pk-probe-status');

      btnRe.addEventListener('click', async () => {
        status.textContent = 'Probing assets… (this may take a minute)';
        try {
          const m = await TL.probeAssets({ full: true, force: true });
          status.textContent = `Probed ${Object.keys(m || {}).length} species`; // update
          // re-render visible tiles so backgrounds/icons appear
          refresh();
        } catch (e) {
          status.textContent = 'Probe failed';
          console.error(e);
        }
      });
      btnClear.addEventListener('click', () => {
        try {
          localStorage.removeItem(TL._assetCacheKey || 'tl.assetmap.v1');
          TL.assetMap = {};
          status.textContent = 'Cache cleared';
          refresh();
        } catch (e) { status.textContent = 'Clear failed'; }
      });
    })();

    const updateCount = () => {
      const n = ov.querySelector('.chip-n');
      // show as "(N)" like SELECTED (1)
      n.textContent = selected.size ? ' (' + selected.size + ')' : '';
    };

    function tileHTML(e) {
      const d = TL.describe(e.k);
      const on = selected.has(e.k);
      // if a GO background image exists for this species, use it as inline style
      const bgStyle = d.bgImage ? `style="background-image:url('${d.bgImage}'); background-size:cover; background-position:center;"` : '';
      // ensure that gmax does not get a dynamax badge; dmax gets the configured asset
      return `<button class="${TL.tileClass(d, 'ptile')}${on ? ' is-sel' : ''}" data-k="${e.k}" title="${esc(d.name)}" aria-pressed="${on}" role="listitem" ${bgStyle}>${TL.tileInner(d, true)}<i class="chk"></i></button>`;
    }

    function renderMore() {
      if (rendered >= results.length) return;
      const next = results.slice(rendered, rendered + CHUNK);
      rendered += next.length;
      grid.insertAdjacentHTML('beforeend', next.map(tileHTML).join(''));
    }

    function refresh() {
      const dex = TL.dex;
      if (!dex) return;
      results = TL.filterEntries(dex.entries, { filters, search, selected });
      rendered = 0;
      grid.innerHTML = '';
      wrap.scrollTop = 0;
      empty.hidden = results.length > 0;
      renderMore();
      // make sure a tall viewport is filled
      while (wrap.scrollHeight <= wrap.clientHeight + 40 && rendered < results.length) renderMore();
    }

    /* events */
    wrap.addEventListener('scroll', () => {
      if (wrap.scrollTop + wrap.clientHeight > wrap.scrollHeight - 500) renderMore();
    });

    grid.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.ptile');
      if (!btn) return;
      const k = btn.dataset.k;
      const res = TL.store.toggle(listKey, k); // card behind the modal updates live
      if (res.full) { TL.toast(`A list can hold up to ${TL.store.MAX_ITEMS} Pokémon.`); return; }
      selected = TL.store.selectedSet(listKey);
      btn.classList.toggle('is-sel', res.added);
      btn.setAttribute('aria-pressed', String(res.added));
      // if we are currently viewing only "selected" tiles and the user unselected one,
      // remove it from the grid so it vanishes immediately
      if (!res.added && filters.has('selected')) {
        btn.remove();
      }
      updateCount();
    });

    ov.querySelector('.pk-chips').addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip');
      if (!chip) return;
      const f = chip.dataset.f;
      if (filters.has(f)) filters.delete(f); else filters.add(f);
      chip.classList.toggle('on', filters.has(f));
      chip.setAttribute('aria-pressed', String(filters.has(f)));
      refresh();
    });

    let t = null;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { search = input.value; refresh(); }, 120);
    });

    updateCount();
    if (TL.dex) { refresh(); }
    else {
      empty.hidden = false;
      empty.textContent = 'Loading Pokémon from PokeAPI…';
      TL.loadDex().then(() => { empty.textContent = 'No Pokémon match these filters.'; refresh(); });
    }
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
})();
