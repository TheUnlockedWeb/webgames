"use strict";

/* ============================================================
   POKÉDEX — app.js

   Main application controller.

   FEATURES
   ------------------------------------------------------------
   - Dynamically discovers every Pokémon species from PokéAPI
   - Does NOT hard-code a maximum National Pokédex number
   - Species -> varieties -> forms architecture
   - Search by Pokémon name or National Pokédex number
   - Normal / Shiny views
   - Legendary / Mythical / Ultra Beast categories
   - Mega Evolution discovery
   - Gigantamax discovery
   - Pokémon details
   - Types
   - Abilities
   - Base stats
   - Height / weight
   - Pokédex descriptions
   - Evolution chains
   - Branching evolutions
   - Pokémon varieties
   - Cosmetic forms
   - Game appearances
   - Pokémon cries
   - Light / dark mode
   - Modern / pixel sprites
   - Animated sprite support where available
   - Local caching
   - Error handling
   - Sprite fallbacks

   Data source:
   https://pokeapi.co/api/v2/
   ============================================================ */


/* ============================================================
   01. CONFIGURATION
   ============================================================ */

const CONFIG = {
    API_BASE: "https://pokeapi.co/api/v2/",

    PAGE_SIZE: 60,

    REQUEST_BATCH_SIZE: 12,

    REQUEST_DELAY: 35,

    SETTINGS_KEY: "complete-pokedex-settings-v1",

    CACHE_VERSION: 1,

    MAX_MEMORY_CACHE_ITEMS: 1000,

    DEFAULT_SETTINGS: {
        theme: "light",
        spriteStyle: "normal",
        animations: false,
        autoCry: true,
        cryVolume: 80
    }
};


/* ============================================================
   02. APPLICATION STATE
   ============================================================ */

const state = {
    speciesList: [],

    filteredSpecies: [],

    selectedFilters: new Set(),

    searchQuery: "",

    visibleCount: CONFIG.PAGE_SIZE,

    selectedPokemon: null,

    selectedSpecies: null,

    selectedVariety: null,

    currentDetailPanel: "info",

    loading: false,

    initialized: false,

    settings: loadSettings(),

    caches: {
        pokemon: new Map(),
        species: new Map(),
        forms: new Map(),
        evolutionChains: new Map(),
        versions: new Map(),
        versionGroups: new Map()
    },

    categoryIndexes: {
        legendary: null,
        mythical: null,
        mega: null,
        gmax: null
    }
};


/* ============================================================
   03. DOM REFERENCES
   ============================================================ */

const DOM = {
    dexView: document.querySelector("#dexView"),
    detailView: document.querySelector("#detailView"),
    settingsView: document.querySelector("#settingsView"),

    homeButton: document.querySelector("#homeButton"),
    settingsButton: document.querySelector("#settingsButton"),
    settingsBack: document.querySelector("#settingsBack"),
    backButton: document.querySelector("#backButton"),

    searchInput: document.querySelector("#searchInput"),
    clearSearch: document.querySelector("#clearSearch"),

    pokemonGrid: document.querySelector("#pokemonGrid"),

    status: document.querySelector("#status"),
    resultCount: document.querySelector("#resultCount"),

    loadMore: document.querySelector("#loadMore"),

    themeSetting: document.querySelector("#themeSetting"),
    spriteSetting: document.querySelector("#spriteSetting"),
    animationSetting: document.querySelector("#animationSetting"),
    autoCrySetting: document.querySelector("#autoCrySetting"),
    cryVolumeSetting: document.querySelector("#cryVolumeSetting"),

    loadingOverlay: document.querySelector("#loadingOverlay"),
    loadingMessage: document.querySelector("#loadingMessage"),

    toastContainer: document.querySelector("#toastContainer"),

    pokemonCryPlayer: document.querySelector("#pokemonCryPlayer"),

    detailContent: document.querySelector("#detailContent")
};


/* ============================================================
   04. GENERAL HELPERS
   ============================================================ */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}


function extractIdFromUrl(url) {
    if (!url) {
        return null;
    }

    const match = String(url).match(/\/(\d+)\/?$/);

    return match
        ? Number(match[1])
        : null;
}


function padDexNumber(number) {
    if (
        number === null ||
        number === undefined ||
        Number.isNaN(Number(number))
    ) {
        return "????";
    }

    return String(number).padStart(4, "0");
}


function normalizeSearch(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "")
        .replace(/[.'’:%]/g, "")
        .replace(/♀/g, "-f")
        .replace(/♂/g, "-m")
        .replace(/\s+/g, "-");
}


function prettyName(value) {
    if (!value) {
        return "";
    }

    const specialNames = {
        "nidoran-f": "Nidoran♀",
        "nidoran-m": "Nidoran♂",
        "mr-mime": "Mr. Mime",
        "mime-jr": "Mime Jr.",
        "mr-rime": "Mr. Rime",
        "type-null": "Type: Null",
        "farfetchd": "Farfetch'd",
        "sirfetchd": "Sirfetch'd",
        "flabebe": "Flabébé",
        "jangmo-o": "Jangmo-o",
        "hakamo-o": "Hakamo-o",
        "kommo-o": "Kommo-o",
        "porygon-z": "Porygon-Z",
        "ho-oh": "Ho-Oh",
        "wo-chien": "Wo-Chien",
        "chien-pao": "Chien-Pao",
        "ting-lu": "Ting-Lu",
        "chi-yu": "Chi-Yu"
    };

    if (specialNames[value]) {
        return specialNames[value];
    }

    return String(value)
        .split("-")
        .map(word => {
            if (!word) {
                return "";
            }

            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        })
        .join(" ");
}


function cleanFlavorText(text) {
    return String(text ?? "")
        .replace(/[\n\r\f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function getEnglishName(names, fallback) {
    const english = names?.find(
        item => item.language?.name === "en"
    );

    return english?.name || prettyName(fallback);
}


function getEnglishGenus(species) {
    const english = species?.genera?.find(
        item => item.language?.name === "en"
    );

    return english?.genus || "";
}


function getEnglishFlavorText(species) {
    if (!species?.flavor_text_entries?.length) {
        return "";
    }

    const englishEntries =
        species.flavor_text_entries.filter(
            item => item.language?.name === "en"
        );

    if (!englishEntries.length) {
        return "";
    }

    return cleanFlavorText(
        englishEntries[
            englishEntries.length - 1
        ].flavor_text
    );
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function uniqueBy(array, keyFunction) {
    const seen = new Set();

    return array.filter(item => {
        const key = keyFunction(item);

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;
    });
}


/* ============================================================
   05. SETTINGS
   ============================================================ */

function loadSettings() {
    try {
        const stored =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.SETTINGS_KEY
                ) || "{}"
            );

        return {
            ...CONFIG.DEFAULT_SETTINGS,
            ...stored
        };
    }
    catch {
        return {
            ...CONFIG.DEFAULT_SETTINGS
        };
    }
}


function saveSettings() {
    localStorage.setItem(
        CONFIG.SETTINGS_KEY,
        JSON.stringify(state.settings)
    );
}


function applySettings() {
    document.body.classList.toggle(
        "dark",
        state.settings.theme === "dark"
    );

    document.body.classList.toggle(
        "pixelated",
        state.settings.spriteStyle === "pixel"
    );

    if (DOM.themeSetting) {
        DOM.themeSetting.value =
            state.settings.theme;
    }

    if (DOM.spriteSetting) {
        DOM.spriteSetting.value =
            state.settings.spriteStyle;
    }

    if (DOM.animationSetting) {
        DOM.animationSetting.checked =
            Boolean(state.settings.animations);
    }

    if (DOM.autoCrySetting) {
        DOM.autoCrySetting.checked =
            Boolean(state.settings.autoCry);
    }

    if (DOM.cryVolumeSetting) {
        DOM.cryVolumeSetting.value =
            state.settings.cryVolume;
    }

    if (DOM.pokemonCryPlayer) {
        DOM.pokemonCryPlayer.volume =
            clamp(
                Number(state.settings.cryVolume) / 100,
                0,
                1
            );
    }
}


/* ============================================================
   06. API CLIENT + CACHE
   ============================================================ */

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `PokéAPI request failed (${response.status})`
        );
    }

    return response.json();
}


async function api(endpoint) {
    const url = endpoint.startsWith("http")
        ? endpoint
        : `${CONFIG.API_BASE}${endpoint}`;

    return fetchJson(url);
}


async function cachedApi(cache, key, endpoint) {
    if (cache.has(key)) {
        return cache.get(key);
    }

    const promise = api(endpoint);

    cache.set(key, promise);

    try {
        const result = await promise;

        cache.set(key, result);

        trimCache(cache);

        return result;
    }
    catch (error) {
        cache.delete(key);

        throw error;
    }
}


function trimCache(cache) {
    if (
        cache.size <=
        CONFIG.MAX_MEMORY_CACHE_ITEMS
    ) {
        return;
    }

    const firstKey =
        cache.keys().next().value;

    cache.delete(firstKey);
}


function getPokemon(nameOrId) {
    const key =
        String(nameOrId).toLowerCase();

    return cachedApi(
        state.caches.pokemon,
        key,
        `pokemon/${encodeURIComponent(nameOrId)}`
    );
}


function getSpecies(nameOrId) {
    const key =
        String(nameOrId).toLowerCase();

    return cachedApi(
        state.caches.species,
        key,
        `pokemon-species/${encodeURIComponent(nameOrId)}`
    );
}


function getPokemonForm(nameOrId) {
    const key =
        String(nameOrId).toLowerCase();

    return cachedApi(
        state.caches.forms,
        key,
        `pokemon-form/${encodeURIComponent(nameOrId)}`
    );
}


function getEvolutionChain(url) {
    return cachedApi(
        state.caches.evolutionChains,
        url,
        url
    );
}


function getVersion(url) {
    return cachedApi(
        state.caches.versions,
        url,
        url
    );
}


function getVersionGroup(url) {
    return cachedApi(
        state.caches.versionGroups,
        url,
        url
    );
}


/* ============================================================
   07. VIEW MANAGEMENT
   ============================================================ */

function showView(viewName) {
    const views = {
        dex: DOM.dexView,
        detail: DOM.detailView,
        settings: DOM.settingsView
    };

    Object.values(views).forEach(view => {
        view?.classList.remove("active");
    });

    views[viewName]?.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   08. LOADING + TOASTS
   ============================================================ */

function showLoading(message = "Loading Pokémon...") {
    if (!DOM.loadingOverlay) {
        return;
    }

    DOM.loadingMessage.textContent = message;

    DOM.loadingOverlay.classList.remove("hidden");

    DOM.loadingOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add("no-scroll");
}


function hideLoading() {
    if (!DOM.loadingOverlay) {
        return;
    }

    DOM.loadingOverlay.classList.add("hidden");

    DOM.loadingOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove("no-scroll");
}


function showToast(message, type = "") {
    if (!DOM.toastContainer) {
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`.trim();

    toast.textContent = message;

    DOM.toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 4200);
}


/* ============================================================
   09. INITIAL SPECIES CATALOGUE

   IMPORTANT:
   We ask PokéAPI how many species exist instead of
   hard-coding 1025 or any other maximum.
   ============================================================ */

async function loadSpeciesCatalogue() {
    DOM.status.textContent =
        "Discovering Pokémon species...";

    const initial =
        await api("pokemon-species?limit=1");

    const total =
        Number(initial.count) || 0;

    if (!total) {
        throw new Error(
            "PokéAPI returned no Pokémon species."
        );
    }

    const response =
        await api(
            `pokemon-species?limit=${total}&offset=0`
        );

    state.speciesList =
        response.results
            .map(resource => ({
                name: resource.name,

                id:
                    extractIdFromUrl(
                        resource.url
                    ),

                url: resource.url
            }))
            .filter(item => item.id !== null)
            .sort((a, b) => a.id - b.id);

    state.filteredSpecies =
        [...state.speciesList];
}


/* ============================================================
   10. DEFAULT POKÉMON FOR A SPECIES
   ============================================================ */

async function getDefaultPokemonForSpecies(
    speciesReference
) {
    const species =
        await getSpecies(
            speciesReference.name ||
            speciesReference.id
        );

    const defaultVariety =
        species.varieties?.find(
            variety => variety.is_default
        ) ||
        species.varieties?.[0];

    if (!defaultVariety) {
        throw new Error(
            `No Pokémon variety found for ${species.name}`
        );
    }

    const pokemon =
        await getPokemon(
            defaultVariety.pokemon.name
        );

    return {
        species,
        pokemon,
        variety: defaultVariety
    };
}


/* ============================================================
   11. SPRITES
   ============================================================ */

function firstValid(...values) {
    return values.find(
        value =>
            typeof value === "string" &&
            value.length > 0
    ) || "";
}


function getStaticSprite(
    pokemon,
    shiny = false
) {
    if (!pokemon?.sprites) {
        return "";
    }

    if (
        state.settings.spriteStyle === "pixel"
    ) {
        return firstValid(
            shiny
                ? pokemon.sprites.front_shiny
                : pokemon.sprites.front_default,

            shiny
                ? pokemon.sprites.other
                    ?.home
                    ?.front_shiny
                : pokemon.sprites.other
                    ?.home
                    ?.front_default
        );
    }

    return firstValid(
        shiny
            ? pokemon.sprites.other
                ?.["official-artwork"]
                ?.front_shiny
            : pokemon.sprites.other
                ?.["official-artwork"]
                ?.front_default,

        shiny
            ? pokemon.sprites.other
                ?.home
                ?.front_shiny
            : pokemon.sprites.other
                ?.home
                ?.front_default,

        shiny
            ? pokemon.sprites.front_shiny
            : pokemon.sprites.front_default
    );
}


function getAnimatedSprite(
    pokemon,
    shiny = false
) {
    if (!state.settings.animations) {
        return "";
    }

    /*
        Pixel mode deliberately prefers the older
        Generation V animated pixel sprites.

        Modern mode prefers Showdown sprites.
    */
    if (state.settings.spriteStyle === "pixel") {
        return firstValid(
            shiny
                ? pokemon.sprites?.versions
                    ?.["generation-v"]
                    ?.["black-white"]
                    ?.animated
                    ?.front_shiny
                : pokemon.sprites?.versions
                    ?.["generation-v"]
                    ?.["black-white"]
                    ?.animated
                    ?.front_default
        );
    }

    return firstValid(
        shiny
            ? pokemon.sprites?.other
                ?.showdown
                ?.front_shiny
            : pokemon.sprites?.other
                ?.showdown
                ?.front_default,

        shiny
            ? pokemon.sprites?.versions
                ?.["generation-v"]
                ?.["black-white"]
                ?.animated
                ?.front_shiny
            : pokemon.sprites?.versions
                ?.["generation-v"]
                ?.["black-white"]
                ?.animated
                ?.front_default
    );
}


function getSprite(
    pokemon,
    shiny = false
) {
    /*
        Pixel mode is kept completely separate from
        the modern artwork path so switching the setting
        causes an obvious visual change.
    */
    if (state.settings.spriteStyle === "pixel") {
        return (
            getAnimatedSprite(pokemon, shiny) ||
            firstValid(
                shiny
                    ? pokemon.sprites?.front_shiny
                    : pokemon.sprites?.front_default,

                shiny
                    ? pokemon.sprites?.versions
                        ?.["generation-v"]
                        ?.["black-white"]
                        ?.front_shiny
                    : pokemon.sprites?.versions
                        ?.["generation-v"]
                        ?.["black-white"]
                        ?.front_default
            )
        );
    }

    return (
        getAnimatedSprite(pokemon, shiny) ||
        getStaticSprite(pokemon, shiny)
    );
}


/* ============================================================
   12. TYPE HELPERS
   ============================================================ */

function typeBadges(types = []) {
    return types
        .sort((a, b) => a.slot - b.slot)
        .map(typeData => {
            const type =
                typeData.type.name;

            return `
                <span
                    class="type-badge type-${escapeHtml(type)}"
                >
                    ${escapeHtml(prettyName(type))}
                </span>
            `;
        })
        .join("");
}


function primaryType(pokemon) {
    return (
        pokemon?.types?.find(
            type => type.slot === 1
        )?.type?.name ||
        pokemon?.types?.[0]?.type?.name ||
        "normal"
    );
}


/* ============================================================
   13. CATEGORY HELPERS
   ============================================================ */

function isUltraBeast(species) {
    /*
       PokéAPI currently exposes legendary/mythical booleans
       directly, but not a dedicated Ultra Beast boolean.

       Ultra Beasts are therefore represented as a semantic
       species set here.

       Keeping this in one place means it can later be replaced
       by another data source without touching the UI.
    */

    const ultraBeasts = new Set([
        "nihilego",
        "buzzwole",
        "pheromosa",
        "xurkitree",
        "celesteela",
        "kartana",
        "guzzlord",
        "poipole",
        "naganadel",
        "stakataka",
        "blacephalon"
    ]);

    return ultraBeasts.has(species.name);
}


function getSpeciesBadges(species) {
    const badges = [];

    if (species.is_legendary) {
        badges.push(`
            <span class="form-badge legendary">
                Legendary
            </span>
        `);
    }

    if (species.is_mythical) {
        badges.push(`
            <span class="form-badge mythical">
                Mythical
            </span>
        `);
    }

    if (isUltraBeast(species)) {
        badges.push(`
            <span class="form-badge ultra-beast">
                Ultra Beast
            </span>
        `);
    }

    return badges.join("");
}


/* ============================================================
   14. CARD LOADING
   ============================================================ */

function renderSkeletonCards(count = 18) {
    DOM.pokemonGrid.innerHTML =
        Array.from(
            { length: count },
            () => `<div class="skeleton"></div>`
        ).join("");
}


async function buildPokemonCard(
    speciesReference,
    options = {}
) {
    const {
        shiny = false
    } = options;

    try {
      const {
          species,
          pokemon,
          specialForm
      } =
          await getPokemonForGridCard(
              speciesReference
          );

        const sprite =
            getSprite(pokemon, shiny);

        const type =
            primaryType(pokemon);

        return `
            <article
                class="pokemon-card"
                style="--card-accent: var(--type-${escapeHtml(type)})"
            >

                <div class="card-number">
                    #${padDexNumber(species.id)}
                </div>

                <button
                    class="card-main"
                    type="button"
                    data-open-pokemon="${escapeHtml(pokemon.name)}"
                    aria-label="Open ${escapeHtml(getEnglishName(species.names, species.name))}"
                >

                    <div class="card-sprite-wrap">

                        ${
                            sprite
                                ? `
                                    <img
                                        class="card-sprite"
                                        src="${escapeHtml(sprite)}"
                                        alt="${shiny ? "Shiny " : ""}${escapeHtml(getEnglishName(species.names, species.name))}"
                                        loading="lazy"
                                    >
                                `
                                : ""
                        }

                    </div>

                    <div class="card-name">
                        ${escapeHtml(
                            getEnglishName(
                                species.names,
                                species.name
                            )
                        )}
                    </div>

                    <div class="type-row">
                        ${typeBadges(pokemon.types)}
                    </div>

                    <div class="form-badges">
                        ${
                            shiny
                                ? `
                                    <span class="form-badge shiny">
                                        Shiny
                                    </span>
                                `
                                : ""
                        }

                        ${getSpeciesBadges(species)}
                    </div>

                </button>

            </article>
        `;
    }
    catch (error) {
        console.warn(
            "Unable to build Pokémon card:",
            speciesReference,
            error
        );

        return "";
    }
}


/* ============================================================
   15. FILTERING
   ============================================================ */

function matchesSearch(reference) {
    const query =
        normalizeSearch(state.searchQuery);

    if (!query) {
        return true;
    }

    const name =
        normalizeSearch(reference.name);

    const pretty =
        normalizeSearch(
            prettyName(reference.name)
        );

    return (
        name.includes(query) ||
        pretty.includes(query) ||
        String(reference.id) === query
    );
}


async function buildLegendaryIndex() {
    if (
        state.categoryIndexes.legendary &&
        state.categoryIndexes.mythical
    ) {
        return;
    }

    const legendary = new Set();
    const mythical = new Set();

    showLoading(
        "Building Legendary and Mythical indexes..."
    );

    try {
        for (
            let index = 0;
            index < state.speciesList.length;
            index += CONFIG.REQUEST_BATCH_SIZE
        ) {
            const batch =
                state.speciesList.slice(
                    index,
                    index +
                    CONFIG.REQUEST_BATCH_SIZE
                );

            const speciesBatch =
                await Promise.all(
                    batch.map(item =>
                        getSpecies(item.name)
                            .catch(() => null)
                    )
                );

            speciesBatch.forEach(species => {
                if (!species) {
                    return;
                }

                if (species.is_legendary) {
                    legendary.add(
                        species.name
                    );
                }

                if (species.is_mythical) {
                    mythical.add(
                        species.name
                    );
                }
            });

            await sleep(
                CONFIG.REQUEST_DELAY
            );
        }

        state.categoryIndexes.legendary =
            legendary;

        state.categoryIndexes.mythical =
            mythical;
    }
    finally {
        hideLoading();
    }
}


/* ============================================================
   16. MEGA / GMAX INDEXING

   We inspect varieties/forms instead of assuming every form
   follows a fixed naming convention.
   ============================================================ */

async function buildSpecialFormIndexes() {
    if (
        state.categoryIndexes.mega &&
        state.categoryIndexes.gmax
    ) {
        return;
    }

    const mega = new Map();
    const gmax = new Map();

    showLoading(
        "Discovering Mega and Gigantamax forms..."
    );

    try {
        const formListInitial =
            await api("pokemon-form?limit=1");

        const totalForms =
            Number(formListInitial.count);

        const formList =
            await api(
                `pokemon-form?limit=${totalForms}&offset=0`
            );

        for (
            let index = 0;
            index < formList.results.length;
            index += CONFIG.REQUEST_BATCH_SIZE
        ) {
            const batch =
                formList.results.slice(
                    index,
                    index +
                    CONFIG.REQUEST_BATCH_SIZE
                );

            const forms =
                await Promise.all(
                    batch.map(resource =>
                        getPokemonForm(
                            resource.name
                        ).catch(() => null)
                    )
                );

            for (const form of forms) {
                if (!form) {
                    continue;
                }

                const triggerNames =
                    (form.trigger_conditions || [])
                        .map(condition =>
                            condition.trigger
                        );

                const megaForm =
                    form.is_mega === true;

                const gmaxForm =
                    triggerNames.includes(
                        "gigantamax-factor"
                    ) ||
                    form.form_name === "gmax" ||
                    form.name.endsWith("-gmax");

                if (!megaForm && !gmaxForm) {
                    continue;
                }

                try {
                    const pokemon =
                        await getPokemon(
                            form.pokemon.name
                        );

                    const speciesName =
                        pokemon.species.name;

                    if (megaForm) {
                        if (!mega.has(speciesName)) {
                            mega.set(
                                speciesName,
                                []
                            );
                        }

                        mega.get(speciesName)
                            .push({
                                form,
                                pokemon
                            });
                    }

                    if (gmaxForm) {
                        if (!gmax.has(speciesName)) {
                            gmax.set(
                                speciesName,
                                []
                            );
                        }

                        gmax.get(speciesName)
                            .push({
                                form,
                                pokemon
                            });
                    }
                }
                catch {
                    /* Ignore one broken form */
                }
            }

            await sleep(
                CONFIG.REQUEST_DELAY
            );
        }

        state.categoryIndexes.mega = mega;
        state.categoryIndexes.gmax = gmax;
    }
    finally {
        hideLoading();
    }
}


/* ============================================================
   17. APPLY FILTER
   ============================================================ */

async function applyFilter() {
    const filters =
        state.selectedFilters;

    let list =
        state.speciesList.filter(
            matchesSearch
        );

    /*
        Shiny is a display modifier rather than a
        species category, so it does not remove Pokémon.
    */
    const categoryFilters =
        [...filters].filter(
            filter => filter !== "shiny"
        );

    if (
        categoryFilters.includes("legendary") ||
        categoryFilters.includes("mythical")
    ) {
        await buildLegendaryIndex();
    }

    if (
        categoryFilters.includes("mega") ||
        categoryFilters.includes("gmax")
    ) {
        await buildSpecialFormIndexes();
    }

    /*
        Multiple categories use AND/intersection logic.

        Example:
        Legendary + Mega
        = Pokémon that are BOTH Legendary AND have Mega forms.

        Legendary + Mythical
        = nothing, so "No Pokemon Found" is displayed.
    */
    for (const filter of categoryFilters) {
        switch (filter) {
            case "legendary":
                list = list.filter(item =>
                    state.categoryIndexes
                        .legendary
                        .has(item.name)
                );
                break;

            case "mythical":
                list = list.filter(item =>
                    state.categoryIndexes
                        .mythical
                        .has(item.name)
                );
                break;

            case "ultra-beast":
                list = list.filter(item =>
                    isUltraBeast(item)
                );
                break;

            case "mega":
                list = list.filter(item =>
                    state.categoryIndexes
                        .mega
                        .has(item.name)
                );
                break;

            case "gmax":
                list = list.filter(item =>
                    state.categoryIndexes
                        .gmax
                        .has(item.name)
                );
                break;
        }
    }

    state.filteredSpecies = list;

    state.visibleCount =
        Math.max(
            CONFIG.PAGE_SIZE,
            Math.min(
                state.visibleCount,
                Math.max(
                    CONFIG.PAGE_SIZE,
                    list.length
                )
            )
        );

    await renderPokemonGrid();
}


/* ============================================================
   18. RENDER MAIN GRID
   ============================================================ */

async function renderPokemonGrid() {
    if (state.loading) {
        return;
    }

    state.loading = true;

    const list =
        state.filteredSpecies;

    const visible =
        list.slice(
            0,
            state.visibleCount
        );

    if (!visible.length) {
        DOM.pokemonGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-inner">
                    <h2>No Pokémon found</h2>

                    <p>
                        Try a different Pokémon name,
                        Pokédex number or category.
                    </p>
                </div>
            </div>
        `;

        DOM.resultCount.textContent =
            "0 Pokémon";

        DOM.loadMore.classList.add(
            "hidden"
        );

        state.loading = false;

        return;
    }

    renderSkeletonCards(
        Math.min(visible.length, 18)
    );

    const shiny =
        state.currentFilter === "shiny";

    const cards = [];

    for (
        let index = 0;
        index < visible.length;
        index += CONFIG.REQUEST_BATCH_SIZE
    ) {
        const batch =
            visible.slice(
                index,
                index +
                CONFIG.REQUEST_BATCH_SIZE
            );

        const html =
            await Promise.all(
                batch.map(item =>
                    buildPokemonCard(
                        item,
                        { shiny }
                    )
                )
            );

        cards.push(...html);

        await sleep(
            CONFIG.REQUEST_DELAY
        );
    }

    DOM.pokemonGrid.innerHTML =
        cards.join("");

    const filterLabel =
        state.currentFilter === "all"
            ? "National Pokédex"
            : prettyName(
                state.currentFilter
            );

    DOM.status.textContent =
        filterLabel;

    DOM.resultCount.textContent =
        `${list.length.toLocaleString()} ${
            list.length === 1
                ? "Pokémon"
                : "Pokémon"
        }`;

    DOM.loadMore.classList.toggle(
        "hidden",
        visible.length >= list.length
    );

    state.loading = false;
}


/* ============================================================
   19. SEARCH
   ============================================================ */

let searchTimer = null;


function handleSearchInput() {
    state.searchQuery =
        DOM.searchInput.value;

    DOM.clearSearch.classList.toggle(
        "visible",
        Boolean(state.searchQuery)
    );

    state.visibleCount =
        CONFIG.PAGE_SIZE;

    clearTimeout(searchTimer);

    searchTimer =
        window.setTimeout(
            () => applyFilter(),
            220
        );
}


function clearSearch() {
    DOM.searchInput.value = "";

    state.searchQuery = "";

    DOM.clearSearch.classList.remove(
        "visible"
    );

    state.visibleCount =
        CONFIG.PAGE_SIZE;

    applyFilter();

    DOM.searchInput.focus();
}


/* ============================================================
   20. CRIES
   ============================================================ */

function stopCry() {
    if (!DOM.pokemonCryPlayer) {
        return;
    }

    DOM.pokemonCryPlayer.pause();

    DOM.pokemonCryPlayer.currentTime = 0;
}


async function playCry(pokemon = state.selectedPokemon) {
    if (!pokemon) {
        return;
    }

    const cry =
        pokemon.cries?.latest ||
        pokemon.cries?.legacy;

    if (!cry) {
        showToast(
            "No cry is available for this Pokémon.",
            "warning"
        );

        return;
    }

    stopCry();

    DOM.pokemonCryPlayer.src = cry;

    DOM.pokemonCryPlayer.volume =
        clamp(
            Number(
                state.settings.cryVolume
            ) / 100,
            0,
            1
        );

    try {
        await DOM.pokemonCryPlayer.play();
    }
    catch {
        /*
           Browsers may block autoplay.
           The Play Cry button still works.
        */
    }
}


/* ============================================================
   21. OPEN POKÉMON
   ============================================================ */

async function openPokemon(
    pokemonNameOrId,
    options = {}
) {
    const {
        autoPlayCry =
            state.settings.autoCry
    } = options;

    showView("detail");

    DOM.detailContent.innerHTML = `
        <div class="detail-shell">
            <div class="inline-loading">
                <div>
                    <div class="inline-spinner"></div>

                    Loading Pokémon...
                </div>
            </div>
        </div>
    `;

    try {
        const pokemon =
            await getPokemon(
                pokemonNameOrId
            );

        const species =
            await getSpecies(
                pokemon.species.name
            );

        state.selectedPokemon =
            pokemon;

        state.selectedSpecies =
            species;

        state.selectedVariety =
            pokemon.name;

        state.currentDetailPanel =
            "info";

        renderPokemonDetail(
            pokemon,
            species
        );

        if (autoPlayCry) {
            playCry(pokemon);
        }
    }
    catch (error) {
        console.error(error);

        DOM.detailContent.innerHTML = `
            <div class="error-state">

                <div class="error-state-inner">

                    <h2>
                        Couldn't load this Pokémon
                    </h2>

                    <p>
                        PokéAPI did not return all of the
                        information needed for this page.
                    </p>

                </div>

            </div>
        `;
    }
}


/* ============================================================
   22. DETAIL HEADER
   ============================================================ */

function renderPokemonDetail(
    pokemon,
    species
) {
    const sprite =
        getSprite(pokemon, false);

    const speciesName =
        getEnglishName(
            species.names,
            species.name
        );

    const varietyName =
        pokemon.name !== species.name
            ? prettyName(pokemon.name)
            : "";

    const genus =
        getEnglishGenus(species);

    const description =
        getEnglishFlavorText(species);

    DOM.detailContent.innerHTML = `
        <article class="detail-shell">

            <div class="detail-hero">

                <div class="detail-art">

                    ${
                        sprite
                            ? `
                                <img
                                    class="detail-sprite"
                                    src="${escapeHtml(sprite)}"
                                    alt="${escapeHtml(speciesName)}"
                                >
                            `
                            : ""
                    }

                </div>


                <div>

                    <div class="detail-number">
                        National Pokédex
                        #${padDexNumber(species.id)}
                    </div>

                    <h1 class="detail-title">
                        ${escapeHtml(speciesName)}
                    </h1>

                    ${
                        varietyName
                            ? `
                                <div class="detail-form-name">
                                    ${escapeHtml(varietyName)}
                                </div>
                            `
                            : ""
                    }

                    <div class="type-row detail-type-row">
                        ${typeBadges(pokemon.types)}
                    </div>

                    <div class="form-badges detail-form-badges">
                        ${getSpeciesBadges(species)}
                    </div>

                    ${
                        genus
                            ? `
                                <p class="detail-description">
                                    <strong>
                                        ${escapeHtml(genus)}
                                    </strong>
                                </p>
                            `
                            : ""
                    }

                    ${
                        description
                            ? `
                                <p class="detail-description">
                                    ${escapeHtml(description)}
                                </p>
                            `
                            : ""
                    }

                    <div class="detail-actions">

                        <button
                            class="action-button primary"
                            type="button"
                            data-action="play-cry"
                        >
                            🔊 Play Cry
                        </button>

                    </div>

                </div>

            </div>


            <nav
                class="detail-tabs"
                aria-label="Pokémon information"
            >

                ${detailTabButton(
                    "info",
                    "Info",
                    true
                )}

                ${detailTabButton(
                    "stats",
                    "Stats"
                )}

                ${detailTabButton(
                    "evolution",
                    "Evolution"
                )}

                ${detailTabButton(
                    "forms",
                    "Forms"
                )}

                ${detailTabButton(
                    "shiny",
                    "Shiny"
                )}

                ${detailTabButton(
                    "games",
                    "Games"
                )}

            </nav>


            <div
                id="detailPanel"
                class="detail-panel"
            ></div>

        </article>
    `;

    renderDetailPanel("info");
}


function detailTabButton(
    panel,
    label,
    active = false
) {
    return `
        <button
            class="detail-tab ${active ? "active" : ""}"
            type="button"
            data-detail-panel="${panel}"
        >
            ${escapeHtml(label)}
        </button>
    `;
}


/* ============================================================
   23. DETAIL PANEL ROUTER
   ============================================================ */

async function renderDetailPanel(panelName) {
    state.currentDetailPanel =
        panelName;

    const panel =
        document.querySelector(
            "#detailPanel"
        );

    if (!panel) {
        return;
    }

    document
        .querySelectorAll(
            "[data-detail-panel]"
        )
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.detailPanel ===
                    panelName
            );
        });

    panel.innerHTML = `
        <div class="inline-loading">
            <div>
                <div class="inline-spinner"></div>
                Loading...
            </div>
        </div>
    `;

    try {
        switch (panelName) {
            case "stats":
                renderStatsPanel(panel);
                break;

            case "evolution":
                await renderEvolutionPanel(
                    panel
                );
                break;

            case "forms":
                await renderFormsPanel(
                    panel
                );
                break;

            case "shiny":
                renderShinyPanel(panel);
                break;

            case "games":
                await renderGamesPanel(
                    panel
                );
                break;

            case "info":
            default:
                renderInfoPanel(panel);
                break;
        }
    }
    catch (error) {
        console.error(error);

        panel.innerHTML = `
            <div class="error-state">
                <div class="error-state-inner">
                    <h2>
                        Unable to load this section
                    </h2>

                    <p>
                        Some data could not be retrieved.
                    </p>
                </div>
            </div>
        `;
    }
}


/* ============================================================
   24. INFO PANEL
   ============================================================ */

function renderInfoPanel(panel) {
    const pokemon =
        state.selectedPokemon;

    const species =
        state.selectedSpecies;

    const abilities =
        pokemon.abilities
            ?.sort(
                (a, b) =>
                    a.slot - b.slot
            )
            .map(ability => {
                const hidden =
                    ability.is_hidden
                        ? " (Hidden)"
                        : "";

                return (
                    prettyName(
                        ability.ability.name
                    ) +
                    hidden
                );
            })
            .join(", ") || "Unknown";

    const eggGroups =
        species.egg_groups
            ?.map(group =>
                prettyName(group.name)
            )
            .join(", ") || "Unknown";

    const generation =
        prettyName(
            species.generation?.name ||
            "unknown"
        );

    const growthRate =
        prettyName(
            species.growth_rate?.name ||
            "unknown"
        );

    const gender =
        getGenderText(species);

    const description =
        getEnglishFlavorText(species);

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Pokédex Information</h2>

            ${
                description
                    ? `
                        <div class="description-card">
                            <p>
                                ${escapeHtml(description)}
                            </p>
                        </div>
                    `
                    : ""
            }

            <div class="info-grid">

                ${infoItem(
                    "Height",
                    `${(pokemon.height / 10).toFixed(1)} m`
                )}

                ${infoItem(
                    "Weight",
                    `${(pokemon.weight / 10).toFixed(1)} kg`
                )}

                ${infoItem(
                    "Abilities",
                    abilities
                )}

                ${infoItem(
                    "Generation",
                    generation
                )}

                ${infoItem(
                    "Growth Rate",
                    growthRate
                )}

                ${infoItem(
                    "Capture Rate",
                    species.capture_rate ??
                    "Unknown"
                )}

                ${infoItem(
                    "Base Happiness",
                    species.base_happiness ??
                    "Unknown"
                )}

                ${infoItem(
                    "Egg Groups",
                    eggGroups
                )}

                ${infoItem(
                    "Gender",
                    gender
                )}

                ${infoItem(
                    "Base Experience",
                    pokemon.base_experience ??
                    "Unknown"
                )}

            </div>

        </section>
    `;
}


function infoItem(label, value) {
    return `
        <div class="info-item">

            <small>
                ${escapeHtml(label)}
            </small>

            <strong>
                ${escapeHtml(value)}
            </strong>

        </div>
    `;
}


function getGenderText(species) {
    const rate =
        species.gender_rate;

    if (rate === -1) {
        return "Genderless";
    }

    if (
        rate === null ||
        rate === undefined
    ) {
        return "Unknown";
    }

    const female =
        (rate / 8) * 100;

    const male =
        100 - female;

    if (female === 0) {
        return "100% Male";
    }

    if (male === 0) {
        return "100% Female";
    }

    return (
        `${male.toFixed(1)}% Male / ` +
        `${female.toFixed(1)}% Female`
    );
}


/* ============================================================
   25. STATS PANEL
   ============================================================ */

function renderStatsPanel(panel) {
    const pokemon =
        state.selectedPokemon;

    const statNames = {
        hp: "HP",
        attack: "Attack",
        defense: "Defense",
        "special-attack": "Sp. Atk",
        "special-defense": "Sp. Def",
        speed: "Speed"
    };

    const stats =
        pokemon.stats || [];

    const total =
        stats.reduce(
            (sum, stat) =>
                sum + stat.base_stat,
            0
        );

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Base Stats</h2>

            <div class="stats-list">

                ${stats
                    .map(stat => {
                        const name =
                            stat.stat.name;

                        const value =
                            stat.base_stat;

                        const percentage =
                            clamp(
                                (value / 255) * 100,
                                0,
                                100
                            );

                        return `
                            <div class="stat-row">

                                <div class="stat-name">
                                    ${
                                        statNames[name] ||
                                        prettyName(name)
                                    }
                                </div>

                                <div class="stat-value">
                                    ${value}
                                </div>

                                <div class="stat-track">

                                    <div
                                        class="stat-fill"
                                        style="
                                            --stat-percent:
                                            ${percentage}%;
                                        "
                                    ></div>

                                </div>

                            </div>
                        `;
                    })
                    .join("")}

            </div>

            <div class="stat-total">
                Base Stat Total:
                <strong>${total}</strong>
            </div>

        </section>
    `;
}


/* ============================================================
   26. EVOLUTION PANEL
   ============================================================ */

async function renderEvolutionPanel(panel) {
    const species =
        state.selectedSpecies;

    if (!species.evolution_chain?.url) {
        panel.innerHTML = `
            <p class="muted">
                No evolution-chain data is available.
            </p>
        `;

        return;
    }

    const evolution =
        await getEvolutionChain(
            species.evolution_chain.url
        );

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Evolution Line</h2>

            <div class="evolution-tree">
                ${
                    await renderEvolutionNode(
                        evolution.chain
                    )
                }
            </div>

        </section>
    `;
}


async function renderEvolutionNode(
    node,
    depth = 0
) {
    const speciesName =
        node.species.name;

    let species;

    try {
        species =
            await getSpecies(
                speciesName
            );
    }
    catch {
        species = null;
    }

    let pokemon = null;

    if (species) {
        const defaultVariety =
            species.varieties?.find(
                variety =>
                    variety.is_default
            ) ||
            species.varieties?.[0];

        if (defaultVariety) {
            try {
                pokemon =
                    await getPokemon(
                        defaultVariety
                            .pokemon
                            .name
                    );
            }
            catch {
                pokemon = null;
            }
        }
    }

    const sprite =
        pokemon
            ? getSprite(pokemon)
            : "";

    const children =
        node.evolves_to || [];

    const currentNode = `
        <button
            class="evo-node"
            type="button"
            data-open-pokemon="${escapeHtml(
                pokemon?.name ||
                speciesName
            )}"
        >

            ${
                sprite
                    ? `
                        <img
                            class="evo-img"
                            src="${escapeHtml(sprite)}"
                            alt="${escapeHtml(prettyName(speciesName))}"
                            loading="lazy"
                        >
                    `
                    : ""
            }

            <div class="evo-name">
                ${escapeHtml(
                    getEnglishName(
                        species?.names,
                        speciesName
                    )
                )}
            </div>

            ${
                species?.id
                    ? `
                        <div class="evo-number">
                            #${padDexNumber(species.id)}
                        </div>
                    `
                    : ""
            }

        </button>
    `;

    if (!children.length) {
        return `
            <div class="evolution-branch">
                ${currentNode}
            </div>
        `;
    }

    const childHtml = [];

    for (const child of children) {
        const requirements =
            formatEvolutionRequirements(
                child.evolution_details
            );

        childHtml.push(`
            <div class="evolution-branch">

                ${currentNode}

                <div>
                    <div class="evo-arrow">
                        →
                    </div>

                    ${
                        requirements
                            ? `
                                <div class="evolution-requirement">
                                    ${escapeHtml(requirements)}
                                </div>
                            `
                            : ""
                    }
                </div>

                ${
                    await renderEvolutionNode(
                        child,
                        depth + 1
                    )
                }

            </div>
        `);
    }

    return childHtml.join("");
}


/* ============================================================
   27. EVOLUTION REQUIREMENTS
   ============================================================ */

function formatEvolutionRequirements(
    details = []
) {
    if (!details.length) {
        return "";
    }

    const detail =
        details[0];

    const requirements = [];

    if (detail.min_level) {
        requirements.push(
            `Level ${detail.min_level}`
        );
    }

    if (detail.item?.name) {
        requirements.push(
            `Use ${prettyName(detail.item.name)}`
        );
    }

    if (detail.held_item?.name) {
        requirements.push(
            `Hold ${prettyName(detail.held_item.name)}`
        );
    }

    if (detail.trigger?.name === "trade") {
        requirements.push("Trade");
    }

    if (detail.min_happiness) {
        requirements.push(
            `Happiness ${detail.min_happiness}+`
        );
    }

    if (detail.min_affection) {
        requirements.push(
            `Affection ${detail.min_affection}+`
        );
    }

    if (detail.time_of_day) {
        requirements.push(
            prettyName(detail.time_of_day)
        );
    }

    if (detail.known_move?.name) {
        requirements.push(
            `Know ${prettyName(detail.known_move.name)}`
        );
    }

    if (detail.known_move_type?.name) {
        requirements.push(
            `Know ${prettyName(detail.known_move_type.name)} move`
        );
    }

    if (detail.location?.name) {
        requirements.push(
            `At ${prettyName(detail.location.name)}`
        );
    }

    if (detail.gender === 1) {
        requirements.push("Female");
    }

    if (detail.gender === 2) {
        requirements.push("Male");
    }

    if (detail.needs_overworld_rain) {
        requirements.push("While raining");
    }

    if (detail.turn_upside_down) {
        requirements.push(
            "Turn system upside down"
        );
    }

    if (detail.relative_physical_stats === 1) {
        requirements.push(
            "Attack > Defense"
        );
    }

    if (detail.relative_physical_stats === -1) {
        requirements.push(
            "Attack < Defense"
        );
    }

    if (detail.relative_physical_stats === 0) {
        requirements.push(
            "Attack = Defense"
        );
    }

    return requirements.join(" • ");
}


/* ============================================================
   28. FORMS + VARIETIES
   ============================================================ */

async function renderFormsPanel(panel) {
    const species =
        state.selectedSpecies;

    const varieties =
        species.varieties || [];

    const varietyCards = [];

    for (const variety of varieties) {
        try {
            const pokemon =
                await getPokemon(
                    variety.pokemon.name
                );

            const sprite =
                getSprite(pokemon);

            varietyCards.push(`
                <button
                    class="form-card ${
                        pokemon.name ===
                        state.selectedPokemon.name
                            ? "active"
                            : ""
                    }"
                    type="button"
                    data-open-pokemon="${escapeHtml(pokemon.name)}"
                >

                    ${
                        sprite
                            ? `
                                <img
                                    class="form-image"
                                    src="${escapeHtml(sprite)}"
                                    alt="${escapeHtml(prettyName(pokemon.name))}"
                                    loading="lazy"
                                >
                            `
                            : ""
                    }

                    <div class="form-name">
                        ${escapeHtml(
                            prettyName(
                                pokemon.name
                            )
                        )}
                    </div>

                    <div class="form-description">
                        ${
                            variety.is_default
                                ? "Default variety"
                                : "Alternate variety"
                        }
                    </div>

                </button>
            `);
        }
        catch {
            /* Skip unavailable variety */
        }
    }

    const cosmeticForms =
        await loadFormsForSelectedPokemon();

    panel.innerHTML = `
        <section class="detail-section">

            <h2>
                Pokémon Varieties
            </h2>

            <p class="muted">
                Varieties can have different stats,
                types, abilities or other gameplay data.
            </p>

            <div class="forms-grid">
                ${varietyCards.join("")}
            </div>

        </section>


        ${
            cosmeticForms.length
                ? `
                    <section class="detail-section">

                        <h2>
                            Forms
                        </h2>

                        <p class="muted">
                            Additional forms associated with
                            this Pokémon variety.
                        </p>

                        <div class="forms-grid">

                            ${cosmeticForms
                                .map(
                                    renderCosmeticFormCard
                                )
                                .join("")}

                        </div>

                    </section>
                `
                : ""
        }
    `;
}


async function loadFormsForSelectedPokemon() {
    const pokemon =
        state.selectedPokemon;

    const forms = [];

    for (const formReference of pokemon.forms || []) {
        try {
            forms.push(
                await getPokemonForm(
                    formReference.name
                )
            );
        }
        catch {
            /* Skip broken form */
        }
    }

    return forms.sort(
        (a, b) =>
            a.form_order - b.form_order
    );
}


function renderCosmeticFormCard(form) {
    const sprite =
        firstValid(
            form.sprites?.front_default
        );

    const englishName =
        getEnglishName(
            form.names,
            form.name
        );

    const badges = [];

    if (form.is_mega) {
        badges.push(`
            <span class="form-badge mega">
                Mega
            </span>
        `);
    }

    const gmax =
        form.form_name === "gmax" ||
        form.name.endsWith("-gmax") ||
        (form.trigger_conditions || [])
            .some(
                condition =>
                    condition.trigger ===
                    "gigantamax-factor"
            );

    if (gmax) {
        badges.push(`
            <span class="form-badge gmax">
                Gmax
            </span>
        `);
    }

    return `
        <div class="form-card">

            ${
                sprite
                    ? `
                        <img
                            class="form-image"
                            src="${escapeHtml(sprite)}"
                            alt="${escapeHtml(englishName)}"
                            loading="lazy"
                        >
                    `
                    : ""
            }

            <div class="form-name">
                ${escapeHtml(englishName)}
            </div>

            <div class="form-badges">
                ${badges.join("")}
            </div>

        </div>
    `;
}


/* ============================================================
   29. SHINY PANEL
   ============================================================ */

function renderShinyPanel(panel) {
    const pokemon =
        state.selectedPokemon;

    const normal =
        getSprite(pokemon, false);

    const shiny =
        getSprite(pokemon, true);

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Normal & Shiny</h2>

            <div class="gallery">

                ${spriteGalleryCard(
                    normal,
                    "Normal",
                    prettyName(pokemon.name)
                )}

                ${spriteGalleryCard(
                    shiny,
                    "Shiny",
                    `Shiny ${prettyName(pokemon.name)}`
                )}

            </div>

            ${
                !shiny
                    ? `
                        <div class="data-note">
                            PokéAPI does not currently provide
                            a shiny sprite for this particular
                            Pokémon/form.
                        </div>
                    `
                    : ""
            }

        </section>
    `;
}


function spriteGalleryCard(
    sprite,
    label,
    alt
) {
    return `
        <div class="gallery-card">

            ${
                sprite
                    ? `
                        <img
                            src="${escapeHtml(sprite)}"
                            alt="${escapeHtml(alt)}"
                        >
                    `
                    : `
                        <div class="inline-loading">
                            No sprite available
                        </div>
                    `
            }

            <strong>
                ${escapeHtml(label)}
            </strong>

        </div>
    `;
}


/* ============================================================
   30. GAMES PANEL

   Pokémon.game_indices gives game versions associated with
   this Pokémon variety.

   We then resolve each Version so its Version Group can be
   used to organise the games more cleanly.
   ============================================================ */

async function renderGamesPanel(panel) {
    const pokemon =
        state.selectedPokemon;

    const indices =
        pokemon.game_indices || [];

    if (!indices.length) {
        panel.innerHTML = `
            <section class="detail-section">

                <h2>Game Appearances</h2>

                <div class="empty-state">

                    <div class="empty-state-inner">

                        <h2>
                            No game-version data
                        </h2>

                        <p>
                            PokéAPI does not currently list
                            game-index information for this
                            Pokémon variety.
                        </p>

                    </div>

                </div>

            </section>
        `;

        return;
    }

    const versions = [];

    for (
        let index = 0;
        index < indices.length;
        index += CONFIG.REQUEST_BATCH_SIZE
    ) {
        const batch =
            indices.slice(
                index,
                index +
                CONFIG.REQUEST_BATCH_SIZE
            );

        const resolved =
            await Promise.all(
                batch.map(
                    async gameIndex => {
                        try {
                            const version =
                                await getVersion(
                                    gameIndex.version.url
                                );

                            return {
                                gameIndex:
                                    gameIndex.game_index,

                                version
                            };
                        }
                        catch {
                            return {
                                gameIndex:
                                    gameIndex.game_index,

                                version: {
                                    name:
                                        gameIndex
                                            .version
                                            .name,

                                    version_group:
                                        null
                                }
                            };
                        }
                    }
                )
            );

        versions.push(...resolved);
    }

    const grouped =
        await groupVersionsByGeneration(
            versions
        );

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Game Appearances</h2>

            <p class="games-intro">
                These are the game versions associated with
                <strong>
                    ${escapeHtml(
                        prettyName(pokemon.name)
                    )}
                </strong>
                in PokéAPI's game-index data.
            </p>

            <div class="game-generations">

                ${grouped
                    .map(
                        renderGameGeneration
                    )
                    .join("")}

            </div>

            <div class="data-note">
                This section reflects the game-version data
                available from PokéAPI for the selected
                Pokémon variety. Different forms or varieties
                can therefore show different results.
            </div>

        </section>
    `;
}


/* ============================================================
   31. GROUP GAMES BY GENERATION
   ============================================================ */

async function groupVersionsByGeneration(
    versionEntries
) {
    const groups = new Map();

    for (const entry of versionEntries) {
        const version =
            entry.version;

        let generationName =
            "unknown-generation";

        let versionGroupName =
            version.version_group?.name ||
            "other";

        if (version.version_group?.url) {
            try {
                const versionGroup =
                    await getVersionGroup(
                        version.version_group.url
                    );

                generationName =
                    versionGroup
                        .generation
                        ?.name ||
                    generationName;

                versionGroupName =
                    versionGroup.name;
            }
            catch {
                /* Keep fallback */
            }
        }

        if (!groups.has(generationName)) {
            groups.set(
                generationName,
                new Map()
            );
        }

        const versionGroups =
            groups.get(generationName);

        if (
            !versionGroups.has(
                versionGroupName
            )
        ) {
            versionGroups.set(
                versionGroupName,
                []
            );
        }

        versionGroups
            .get(versionGroupName)
            .push(entry);
    }

    return Array.from(
        groups.entries()
    )
        .map(
            ([generation, versionGroups]) => ({
                generation,

                versionGroups:
                    Array.from(
                        versionGroups.entries()
                    )
                        .map(
                            ([name, versions]) => ({
                                name,
                                versions:
                                    uniqueBy(
                                        versions,
                                        item =>
                                            item.version.name
                                    )
                            })
                        )
            })
        )
        .sort(
            (a, b) =>
                generationNumber(
                    a.generation
                ) -
                generationNumber(
                    b.generation
                )
        );
}


function generationNumber(name) {
    const romanMap = {
        i: 1,
        ii: 2,
        iii: 3,
        iv: 4,
        v: 5,
        vi: 6,
        vii: 7,
        viii: 8,
        ix: 9,
        x: 10,
        xi: 11,
        xii: 12
    };

    const roman =
        String(name)
            .replace(
                "generation-",
                ""
            )
            .toLowerCase();

    return romanMap[roman] || 999;
}


function renderGameGeneration(group) {
    const count =
        group.versionGroups.reduce(
            (total, versionGroup) =>
                total +
                versionGroup.versions.length,
            0
        );

    return `
        <section class="game-generation">

            <div class="game-generation-header">

                <h3 class="game-generation-title">
                    ${escapeHtml(
                        prettyName(
                            group.generation
                        )
                    )}
                </h3>

                <span class="game-generation-count">
                    ${count}
                    ${
                        count === 1
                            ? "game"
                            : "games"
                    }
                </span>

            </div>

            ${group.versionGroups
                .map(versionGroup => `
                    <div class="game-version-group">

                        <h3>
                            ${escapeHtml(
                                prettyName(
                                    versionGroup.name
                                )
                            )}
                        </h3>

                        <div class="game-list">

                            ${versionGroup.versions
                                .map(entry => `
                                    <span class="game-badge">
                                        ${escapeHtml(
                                            getEnglishName(
                                                entry.version.names,
                                                entry.version.name
                                            )
                                        )}
                                    </span>
                                `)
                                .join("")}

                        </div>

                    </div>
                `)
                .join("")}

        </section>
    `;
}


/* ============================================================
   32. MAIN FILTER BUTTONS
   ============================================================ */

async function handleFilterClick(button) {
    const filter = button.dataset.filter;

    if (!filter) {
        return;
    }

    const allButton =
        document.querySelector(
            '.tab[data-filter="all"]'
        );

    /*
        ALL is exclusive.

        Clicking it clears every other filter.
    */
    if (filter === "all") {
        state.selectedFilters.clear();

        document
            .querySelectorAll(".tab")
            .forEach(tab => {
                tab.classList.toggle(
                    "active",
                    tab.dataset.filter === "all"
                );
            });
    }
    else {
        /*
            Toggle this individual filter without
            affecting the other selected filters.
        */
        if (state.selectedFilters.has(filter)) {
            state.selectedFilters.delete(filter);
            button.classList.remove("active");
        }
        else {
            state.selectedFilters.add(filter);
            button.classList.add("active");
        }

        /*
            ALL is active only when no filters
            are selected.
        */
        const noFilters =
            state.selectedFilters.size === 0;

        allButton?.classList.toggle(
            "active",
            noFilters
        );
    }

    state.visibleCount =
        CONFIG.PAGE_SIZE;

    await applyFilter();
}


/* ============================================================
   33. LOAD MORE
   ============================================================ */

async function loadMorePokemon() {
    state.visibleCount +=
        CONFIG.PAGE_SIZE;

    await renderPokemonGrid();
}


/* ============================================================
   34. GLOBAL EVENT DELEGATION
   ============================================================ */

document.addEventListener(
    "click",
    async event => {
        const openPokemonButton =
            event.target.closest(
                "[data-open-pokemon]"
            );

        if (openPokemonButton) {
            await openPokemon(
                openPokemonButton
                    .dataset
                    .openPokemon
            );

            return;
        }


        const detailTab =
            event.target.closest(
                "[data-detail-panel]"
            );

        if (detailTab) {
            await renderDetailPanel(
                detailTab.dataset
                    .detailPanel
            );

            return;
        }


        const action =
            event.target.closest(
                "[data-action]"
            );

        if (action) {
            switch (
                action.dataset.action
            ) {
                case "play-cry":
                    await playCry();
                    break;
            }
        }
    }
);


/* ============================================================
   35. NAVIGATION EVENTS
   ============================================================ */

DOM.homeButton?.addEventListener(
    "click",
    () => {
        stopCry();

        showView("dex");
    }
);


DOM.backButton?.addEventListener(
    "click",
    () => {
        stopCry();

        showView("dex");
    }
);


DOM.settingsButton?.addEventListener(
    "click",
    () => {
        showView("settings");
    }
);


DOM.settingsBack?.addEventListener(
    "click",
    () => {
        showView("dex");
    }
);


/* ============================================================
   36. SEARCH EVENTS
   ============================================================ */

DOM.searchInput?.addEventListener(
    "input",
    handleSearchInput
);


DOM.clearSearch?.addEventListener(
    "click",
    clearSearch
);


/* ============================================================
   37. FILTER EVENTS
   ============================================================ */

document
    .querySelectorAll(".tab")
    .forEach(button => {
        button.addEventListener(
            "click",
            () =>
                handleFilterClick(
                    button
                )
        );
    });


DOM.loadMore?.addEventListener(
    "click",
    loadMorePokemon
);


/* ============================================================
   38. SETTINGS EVENTS
   ============================================================ */

DOM.themeSetting?.addEventListener(
    "change",
    event => {
        state.settings.theme =
            event.target.value;

        saveSettings();

        applySettings();
    }
);


DOM.spriteSetting?.addEventListener(
    "change",
    async event => {
        state.settings.spriteStyle =
            event.target.value;

        saveSettings();

        applySettings();

        await renderPokemonGrid();

        if (
            DOM.detailView
                ?.classList
                .contains("active") &&
            state.selectedPokemon
        ) {
            renderPokemonDetail(
                state.selectedPokemon,
                state.selectedSpecies
            );
        }
    }
);


DOM.animationSetting?.addEventListener(
    "change",
    async event => {
        state.settings.animations =
            event.target.checked;

        saveSettings();

        applySettings();

        await renderPokemonGrid();

        if (
            DOM.detailView
                ?.classList
                .contains("active") &&
            state.selectedPokemon
        ) {
            renderPokemonDetail(
                state.selectedPokemon,
                state.selectedSpecies
            );
        }
    }
);


DOM.autoCrySetting?.addEventListener(
    "change",
    event => {
        state.settings.autoCry =
            event.target.checked;

        saveSettings();

        applySettings();
    }
);


DOM.cryVolumeSetting?.addEventListener(
    "input",
    event => {
        state.settings.cryVolume =
            Number(event.target.value);

        saveSettings();

        applySettings();
    }
);


/* ============================================================
   39. ERROR HANDLING
   ============================================================ */

window.addEventListener(
    "unhandledrejection",
    event => {
        console.error(
            "Unhandled promise rejection:",
            event.reason
        );
    }
);


/* ============================================================
   40. INITIALIZATION
   ============================================================ */

async function initializeApp() {
    applySettings();

    renderSkeletonCards();

    try {
        await loadSpeciesCatalogue();

        state.filteredSpecies =
            [...state.speciesList];

        state.visibleCount =
            CONFIG.PAGE_SIZE;

        await renderPokemonGrid();

        state.initialized = true;
    }
    catch (error) {
        console.error(
            "Pokédex initialization failed:",
            error
        );

        DOM.status.innerHTML = `
            <span class="status-error">
                Pokédex could not be loaded.
            </span>
        `;

        DOM.pokemonGrid.innerHTML = `
            <div class="error-state">

                <div class="error-state-inner">

                    <h2>
                        Couldn't connect to PokéAPI
                    </h2>

                    <p>
                        Check your internet connection
                        and refresh the page.
                    </p>

                </div>

            </div>
        `;
    }
    finally {
        hideLoading();
    }
}

/* ============================================================
   41. MEGA AND GMAX SPRITES (BUG FIX)
   ============================================================ */

async function getPokemonForGridCard(
    speciesReference
) {
    const wantsMega =
        state.selectedFilters.has("mega");

    const wantsGmax =
        state.selectedFilters.has("gmax");

    /*
        If Mega is selected, use the actual Mega
        Pokémon record rather than the base Pokémon.
    */
    if (wantsMega) {
        await buildSpecialFormIndexes();

        const megaForms =
            state.categoryIndexes.mega
                ?.get(speciesReference.name);

        if (megaForms?.length) {
            return {
                species:
                    await getSpecies(
                        speciesReference.name
                    ),

                pokemon:
                    megaForms[0].pokemon,

                specialForm: "mega"
            };
        }
    }

    /*
        Same for Gigantamax.
    */
    if (wantsGmax) {
        await buildSpecialFormIndexes();

        const gmaxForms =
            state.categoryIndexes.gmax
                ?.get(speciesReference.name);

        if (gmaxForms?.length) {
            return {
                species:
                    await getSpecies(
                        speciesReference.name
                    ),

                pokemon:
                    gmaxForms[0].pokemon,

                specialForm: "gmax"
            };
        }
    }

    const normal =
        await getDefaultPokemonForSpecies(
            speciesReference
        );

    return {
        ...normal,
        specialForm: null
    };
}

/* ============================================================
   START
   ============================================================ */

initializeApp();
