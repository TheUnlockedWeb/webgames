/* ------------------------------------------------------------------
 * pokeapi.js — loads the Pokédex from PokeAPI and generates every
 * "variant" tile that can appear in the Select Pokémon picker.
 *
 *   Names / form list : https://pokeapi.co/api/v2/pokemon?limit=100000
 *   Artwork           : github.com/PokeAPI/sprites (official-artwork,
 *                       normal + shiny)
 *
 * Tile identity is a self-describing "key" string so a saved/shared
 * list can be rebuilt without the Pokédex being loaded:
 *     id | shiny(0/1) | background | type | partyHat(0/1)
 * type: ''(base) 'form' 'mega' 'gmax' 'dmax' 'costume'
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});

  const API = 'https://pokeapi.co/api/v2';
  const SPRITE_BASE =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  const MAX_SPECIES = 1025;
  const CACHE_KEY = 'tl.dex.v2';

  TL.ASSET_PATHS = {
    dynamax: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dynamax-band.png',
    type: 'https://play.pokemonshowdown.com/sprites/types',
    itemBase: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items',
    pogoPokemon: 'https://github.com/PokeMiners/pogo_assets/raw/master/Images/Pokemon',
  };

  /* ---------- backgrounds (pure CSS art, see styles.css) ---------- */
  TL.BACKGROUNDS = [
    { key: 'sky',      name: 'Sky Flight',    kind: 'location' },
    { key: 'park',     name: 'Park',          kind: 'location' },
    { key: 'night',    name: 'Night Sky',     kind: 'background' },
    { key: 'tower',    name: 'Tower Skyline', kind: 'location' },
    { key: 'instinct', name: 'Team Instinct', kind: 'background' },
    { key: 'mystic',   name: 'Team Mystic',   kind: 'background' },
    { key: 'valor',    name: 'Team Valor',    kind: 'background' },
  ];
  const BG = {};
  TL.BACKGROUNDS.forEach((b) => (BG[b.key] = b));
  TL.bgInfo = (k) => BG[k];

  /*
   * Team backgrounds only appear for Pokémon that have them released.
   * This is intentionally a starter map: bigger, more complete data can be
   * plugged in later, and runtime probing is easy to add on top of this.
   */
  TL.BG_RELEASES = new Map([
    [1, ['instinct', 'mystic', 'valor']],
    [4, ['instinct', 'mystic', 'valor']],
    [7, ['instinct', 'mystic', 'valor']],
    [25, ['instinct', 'mystic', 'valor']],
    [26, ['instinct', 'mystic', 'valor']],
    [27, ['instinct', 'mystic', 'valor']],
    [39, ['instinct', 'mystic', 'valor']],
    [52, ['instinct', 'mystic', 'valor']],
    [53, ['instinct', 'mystic', 'valor']],
    [58, ['instinct', 'mystic', 'valor']],
    [59, ['instinct', 'mystic', 'valor']],
    [65, ['instinct', 'mystic', 'valor']],
    [66, ['instinct', 'mystic', 'valor']],
    [75, ['instinct', 'mystic', 'valor']],
    [76, ['instinct', 'mystic', 'valor']],
    [82, ['instinct', 'mystic', 'valor']],
    [83, ['instinct', 'mystic', 'valor']],
    [95, ['instinct', 'mystic', 'valor']],
    [96, ['instinct', 'mystic', 'valor']],
    [104, ['instinct', 'mystic', 'valor']],
    [105, ['instinct', 'mystic', 'valor']],
    [113, ['instinct', 'mystic', 'valor']],
    [114, ['instinct', 'mystic', 'valor']],
    [115, ['instinct', 'mystic', 'valor']],
    [116, ['instinct', 'mystic', 'valor']],
    [117, ['instinct', 'mystic', 'valor']],
    [118, ['instinct', 'mystic', 'valor']],
    [120, ['instinct', 'mystic', 'valor']],
    [121, ['instinct', 'mystic', 'valor']],
    [122, ['instinct', 'mystic', 'valor']],
    [123, ['instinct', 'mystic', 'valor']],
    [124, ['instinct', 'mystic', 'valor']],
    [125, ['instinct', 'mystic', 'valor']],
    [127, ['instinct', 'mystic', 'valor']],
    [133, ['instinct', 'mystic', 'valor']],
    [134, ['instinct', 'mystic', 'valor']],
    [135, ['instinct', 'mystic', 'valor']],
    [144, ['instinct', 'mystic', 'valor']],
    [145, ['instinct', 'mystic', 'valor']],
    [146, ['instinct', 'mystic', 'valor']],
    [150, ['instinct', 'mystic', 'valor']],
    [151, ['instinct', 'mystic', 'valor']],
    [196, ['instinct', 'mystic', 'valor']],
    [197, ['instinct', 'mystic', 'valor']],
    [245, ['instinct', 'mystic', 'valor']],
    [246, ['instinct', 'mystic', 'valor']],
    [247, ['instinct', 'mystic', 'valor']],
    [250, ['instinct', 'mystic', 'valor']],
    [251, ['instinct', 'mystic', 'valor']],
    [306, ['instinct', 'mystic', 'valor']],
    [307, ['instinct', 'mystic', 'valor']],
    [308, ['instinct', 'mystic', 'valor']],
    [309, ['instinct', 'mystic', 'valor']],
    [310, ['instinct', 'mystic', 'valor']],
    [318, ['instinct', 'mystic', 'valor']],
    [319, ['instinct', 'mystic', 'valor']],
    [320, ['instinct', 'mystic', 'valor']],
    [334, ['instinct', 'mystic', 'valor']],
    [336, ['instinct', 'mystic', 'valor']],
    [337, ['instinct', 'mystic', 'valor']],
    [373, ['instinct', 'mystic', 'valor']],
    [374, ['instinct', 'mystic', 'valor']],
    [375, ['instinct', 'mystic', 'valor']],
    [376, ['instinct', 'mystic', 'valor']],
    [377, ['instinct', 'mystic', 'valor']],
    [378, ['instinct', 'mystic', 'valor']],
    [379, ['instinct', 'mystic', 'valor']],
    [380, ['instinct', 'mystic', 'valor']],
    [381, ['instinct', 'mystic', 'valor']],
    [382, ['instinct', 'mystic', 'valor']],
    [383, ['instinct', 'mystic', 'valor']],
    [384, ['instinct', 'mystic', 'valor']],
    [385, ['instinct', 'mystic', 'valor']],
    [386, ['instinct', 'mystic', 'valor']],
    [480, ['instinct', 'mystic', 'valor']],
    [481, ['instinct', 'mystic', 'valor']],
    [482, ['instinct', 'mystic', 'valor']],
    [483, ['instinct', 'mystic', 'valor']],
    [484, ['instinct', 'mystic', 'valor']],
    [485, ['instinct', 'mystic', 'valor']],
    [486, ['instinct', 'mystic', 'valor']],
    [487, ['instinct', 'mystic', 'valor']],
    [488, ['instinct', 'mystic', 'valor']],
    [489, ['instinct', 'mystic', 'valor']],
    [490, ['instinct', 'mystic', 'valor']],
    [491, ['instinct', 'mystic', 'valor']],
    [492, ['instinct', 'mystic', 'valor']],
    [493, ['instinct', 'mystic', 'valor']],
    [494, ['instinct', 'mystic', 'valor']],
    [638, ['instinct', 'mystic', 'valor']],
    [639, ['instinct', 'mystic', 'valor']],
    [640, ['instinct', 'mystic', 'valor']],
    [641, ['instinct', 'mystic', 'valor']],
    [642, ['instinct', 'mystic', 'valor']],
    [643, ['instinct', 'mystic', 'valor']],
    [644, ['instinct', 'mystic', 'valor']],
    [645, ['instinct', 'mystic', 'valor']],
    [646, ['instinct', 'mystic', 'valor']],
    [647, ['instinct', 'mystic', 'valor']],
    [648, ['instinct', 'mystic', 'valor']],
    [649, ['instinct', 'mystic', 'valor']],
  ]);

  TL.backgroundsForSpecies = (id) => {
    const list = new Set(['sky', 'park', 'night', 'tower']);
    const team = TL.BG_RELEASES.get(Number(id)) || [];
    team.forEach((key) => list.add(key));
    return [...list];
  };

  /* ---------- keys ---------- */
  TL.makeKey = (id, shiny, bg, type, hat) =>
    [id, shiny ? 1 : 0, bg || '', type || '', hat ? 1 : 0].join('|');

  TL.parseKey = (k) => {
    const [id, s, bg, t, h] = String(k).split('|');
    return { id: +id, shiny: s === '1', bg: bg || '', type: t || '', hat: h === '1' };
  };

  /* ---------- sprites ---------- */
  TL.spriteUrl = (id, shiny) =>
    `${SPRITE_BASE}/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`;
  TL.fallbackUrl = (id, shiny) => `${SPRITE_BASE}/${shiny ? 'shiny/' : ''}${id}.png`;

  TL.typeIconUrl = function (type) {
    const key = String(type || '').trim().toLowerCase();
    if (!key) return '';
    return `${TL.ASSET_PATHS.type}/${key}.png`;
  };

  /* ---------- names ---------- */
  TL.names = {}; // id -> display name (species + forms)
  TL.baseOf = {}; // id -> base species id

  const SPECIAL = {
    'nidoran-f': 'Nidoran ♀', 'nidoran-m': 'Nidoran ♂', 'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.', 'mr-rime': 'Mr. Rime', 'ho-oh': 'Ho-Oh',
    'porygon-z': 'Porygon-Z', 'type-null': 'Type: Null', farfetchd: "Farfetch'd",
    sirfetchd: "Sirfetch'd", flabebe: 'Flabébé', 'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o', 'kommo-o': 'Kommo-o', 'wo-chien': 'Wo-Chien',
    'chien-pao': 'Chien-Pao', 'ting-lu': 'Ting-Lu', 'chi-yu': 'Chi-Yu',
  };
  const REGION = { alola: 'Alolan', galar: 'Galarian', hisui: 'Hisuian', paldea: 'Paldean' };
  const titleCase = (s) =>
    s.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  const speciesName = (slug) => SPECIAL[slug] || titleCase(slug);

  function formName(baseSlug, suffix) {
    const base = speciesName(baseSlug);
    if (suffix === 'mega') return `Mega ${base}`;
    if (suffix === 'mega-x') return `Mega ${base} X`;
    if (suffix === 'mega-y') return `Mega ${base} Y`;
    if (suffix === 'gmax') return `Gigantamax ${base}`;
    if (suffix === 'primal') return `Primal ${base}`;
    const parts = suffix.split('-');
    if (REGION[parts[0]]) {
      const rest = parts.slice(1).join('-');
      return `${REGION[parts[0]]} ${base}` + (rest ? ` (${titleCase(rest)})` : '');
    }
    return `${base} (${titleCase(suffix)})`;
  }

  function classify(baseSlug, suffix) {
    if (/^mega(-[xy])?$/.test(suffix)) return 'mega';
    if (suffix === 'gmax') return 'gmax';
    if (baseSlug === 'pikachu' && suffix !== 'starter') return 'costume'; // caps, cosplay…
    return 'form';
  }

  /* ---------- legendaries / mythicals / ultra beasts (dex ids) ---------- */
  const LEGENDARY = new Set();
  [
    [144, 146], [150, 151], [243, 251], [377, 386], [480, 494], [638, 649],
    [716, 721], [772, 773], [785, 809], [888, 898], [905, 905], [1001, 1004],
    [1007, 1008], [1014, 1017], [1024, 1025],
  ].forEach(([a, b]) => { for (let i = a; i <= b; i++) LEGENDARY.add(i); });

  /* ---------- fetch ---------- */
  const idFromUrl = (u) => +u.replace(/\/+$/, '').split('/').pop();

  async function fetchList() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.length > 1000) return cached;
    } catch (e) { /* ignore */ }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(`${API}/pokemon?limit=100000`, { signal: ctrl.signal });
      if (!r.ok) throw new Error('PokeAPI ' + r.status);
      const j = await r.json();
      const list = j.results.map((x) => [idFromUrl(x.url), x.name]);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
      return list;
    } finally {
      clearTimeout(timer);
    }
  }

  function offlineList() {
    const list = [];
    for (let i = 1; i <= MAX_SPECIES; i++) list.push([i, 'pokemon-' + i]);
    return list;
  }

  /* ---------- build every tile variant ---------- */
  function makeEntry(id, baseId, shiny, bg, type, hat) {
    const name = TL.names[id] || '#' + id;
    const words = [
      name, '#' + baseId, shiny ? 'shiny' : '', bg ? BG[bg].name : '',
      type === 'dmax' ? 'dynamax max' : '', type === 'gmax' ? 'gigantamax gmax max' : '',
      type === 'mega' ? 'mega' : '', type === 'form' ? 'form' : '',
      type === 'costume' || hat ? 'costume' + (hat ? ' party hat' : '') : '',
    ].join(' ').toLowerCase();
    return {
      k: TL.makeKey(id, shiny, bg, type, hat),
      id, base: baseId, shiny, bg: bg || '', type: type || '', hat: !!hat,
      leg: LEGENDARY.has(baseId), q: words,
    };
  }

  function build(list, offline) {
    TL.names = {};
    TL.baseOf = {};
    const species = list.filter(([id]) => id <= MAX_SPECIES).sort((a, b) => a[0] - b[0]);
    const slugToId = new Map();
    species.forEach(([id, slug]) => {
      slugToId.set(slug, id);
      TL.names[id] = offline ? 'Pokémon #' + id : speciesName(slug);
      TL.baseOf[id] = id;
    });
    const bySpeciesLen = [...slugToId.keys()].sort((a, b) => b.length - a.length);

    const formsOf = new Map(); // baseId -> [{id, type}]
    if (!offline) {
      list
        .filter(([id, slug]) => id >= 10000 && !slug.includes('totem'))
        .sort((a, b) => a[0] - b[0])
        .forEach(([id, slug]) => {
          const baseSlug = bySpeciesLen.find((s) => slug === s || slug.startsWith(s + '-'));
          if (!baseSlug || slug === baseSlug) return;
          const baseId = slugToId.get(baseSlug);
          const suffix = slug.slice(baseSlug.length + 1);
          TL.names[id] = formName(baseSlug, suffix);
          TL.baseOf[id] = baseId;
          if (!formsOf.has(baseId)) formsOf.set(baseId, []);
          formsOf.get(baseId).push({ id, type: classify(baseSlug, suffix) });
        });
    }

    const entries = [];
    species.forEach(([id]) => {
      const availableBackgrounds = TL.backgroundsForSpecies(id);
      [false, true].forEach((shiny) => {
        entries.push(makeEntry(id, id, shiny, '', '', false));
        TL.BACKGROUNDS.forEach((b) => {
          if (!availableBackgrounds.includes(b.key)) return;
          entries.push(makeEntry(id, id, shiny, b.key, '', false));
        });
      });
      // Dynamax (normal + shiny) and party-hat costume (normal + shiny)
      entries.push(makeEntry(id, id, false, '', 'dmax', false));
      entries.push(makeEntry(id, id, true, '', 'dmax', false));
      entries.push(makeEntry(id, id, false, '', 'costume', true));
      entries.push(makeEntry(id, id, true, '', 'costume', true));
      // PokeAPI forms: regional, Mega, Gigantamax, Pikachu costumes…
      (formsOf.get(id) || []).forEach((f) => {
        entries.push(makeEntry(f.id, id, false, '', f.type, false));
        entries.push(makeEntry(f.id, id, true, '', f.type, false));
      });
    });

    const byKey = new Map(entries.map((e) => [e.k, e]));
    return { entries, byKey, offline: !!offline };
  }

  /* ---------- public API ---------- */
  TL.describe = function (k) {
    const p = TL.parseKey(k);
    let name = TL.names[p.id] || '#' + p.id;
    if (p.type === 'dmax') name = 'Dynamax ' + name;
    if (p.hat) name = 'Party Hat ' + name;
    if (p.shiny) name = 'Shiny ' + name;
    if (p.bg && BG[p.bg]) name += ` (${BG[p.bg].name})`;
    return Object.assign(p, {
      k, name, src: TL.spriteUrl(p.id, p.shiny), fallback: TL.fallbackUrl(p.id, p.shiny),
    });
  };

  TL.dex = null;
  TL.dexPromise = null;
  TL.loadDex = function () {
    if (TL.dexPromise) return TL.dexPromise;
    TL.dexPromise = fetchList()
      .then((list) => build(list, false))
      .catch((err) => {
        console.warn('PokeAPI list unavailable, using offline numbering', err);
        return build(offlineList(), true);
      })
      .then((dex) => { TL.dex = dex; return dex; });
    return TL.dexPromise;
  };

  /* ---------- filtering used by the picker ---------- */
  const KIND_TEST = {
    costume:    (e) => e.type === 'costume',
    form:       (e) => e.type === 'form',
    mega:       (e) => e.type === 'mega',
    dynamax:    (e) => e.type === 'dmax',
    gmax:       (e) => e.type === 'gmax',
    location:   (e) => !!e.bg && BG[e.bg].kind === 'location',
    background: (e) => !!e.bg && BG[e.bg].kind === 'background',
  };

  /*
   * Filters can be combined freely:
   *  - Normal / Shiny ........ one group: Normal = non-shiny. Both on = either.
   *  - Costume, Form, Mega, Dynamax, Gigantamax, Location Card, Background
   *    ........................ one group: a tile only has one kind, so these
   *                              combine as "any of the chosen kinds".
   *  - Legendaries/Ultra Beasts and Selected narrow the result (AND).
   *  - Search text narrows further (every word must match).
   */
  TL.filterEntries = function (entries, opts) {
    const f = opts.filters;
    const wantN = f.has('normal'), wantS = f.has('shiny');
    const kinds = Object.keys(KIND_TEST).filter((k) => f.has(k));
    const tokens = (opts.search || '').toLowerCase().split(/\s+/).filter(Boolean);

    return entries.filter((e) => {
      if ((wantN || wantS) && !((wantN && !e.shiny) || (wantS && e.shiny))) return false;
      if (kinds.length && !kinds.some((k) => KIND_TEST[k](e))) return false;
      if (f.has('legend') && !e.leg) return false;
      if (f.has('selected') && !opts.selected.has(e.k)) return false;
      for (const t of tokens) {
        if (/^#?\d+$/.test(t)) { if (e.base !== parseInt(t.replace('#', ''), 10)) return false; }
        else if (!e.q.includes(t)) return false;
      }
      return true;
    });
  };
})();
