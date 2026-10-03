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

    PAGE_SIZE: 18,

    REQUEST_BATCH_SIZE: 6,

    REQUEST_DELAY: 10,

    CARD_LOADING_WARNING_MS: 7000,

    CARD_LOADING_CONCURRENCY: 6,

    SETTINGS_KEY: "complete-pokedex-settings-v1",

    CACHE_VERSION: 1,

    MAX_MEMORY_CACHE_ITEMS: 1000,

    DEFAULT_SETTINGS: {
        theme: "dark",
        spriteStyle: "normal",
        animations: false,
        autoCry: true,
        cryVolume: 80,
        language: "en"
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

    searchSort: "number",
   
    visibleCount: CONFIG.PAGE_SIZE,

    selectedPokemon: null,

    selectedSpecies: null,

    selectedVariety: null,

    currentDetailPanel: "info",

    loading: false,

    gridLoading: {
    token: 0,
    total: 0,
    completed: 0,
    startedAt: 0,
    warningTimer: null
    },

    initialized: false,

    settingsDirty: false,

    settings: loadSettings(),

    selectedShiny: false,

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
        gmax: null,
        costumes: null
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
    searchSuggestions: document.querySelector("#searchSuggestions"),
    searchSortSetting: document.querySelector("#searchSortSetting"),

    pokemonGrid: document.querySelector("#pokemonGrid"),

    status: document.querySelector("#status"),
    resultCount: document.querySelector("#resultCount"),

    infiniteScrollSentinel: document.querySelector("#infiniteScrollSentinel"),

    themeSetting: document.querySelector("#themeSetting"),
    saveSettingsButton: document.querySelector("#saveSettingsButton"),
    saveSettingsBar: document.querySelector("#saveSettingsBar"),
    unsavedSettingsMessage: document.querySelector("#unsavedSettingsMessage"),
    languageSetting: document.querySelector("#languageSetting"),
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


function getLocalizedName(names, fallback) {
    const language =
        state.settings.language || "en";

    const localized =
        names?.find(
            item =>
                item.language?.name === language
        );

    const english =
        names?.find(
            item =>
                item.language?.name === "en"
        );

    return (
        localized?.name ||
        english?.name ||
        prettyName(fallback)
    );
}

const UI_TRANSLATIONS = {
    en: {
        pokedex: "Pokédex",
        nationalPokedex: "NATIONAL POKÉDEX",
        heroTitle: "Gotta catch them all.",
        heroCopy:
            "Explore Pokémon, forms, evolutions, shiny Pokémon, Mega Evolutions, Gigantamax forms, games and more.",
        searchPlaceholder:
            "Search Pokémon or Pokédex number...",
        all: "All",
        shiny: "Shiny",
        mega: "Mega",
        gmax: "Gmax",
        costumes: "Costumes",
        legendary: "Legendary",
        mythical: "Mythical",
        ultraBeast: "Ultra Beast",
        settings: "Settings",
        appearance: "Appearance",
        theme: "Theme",
        language: "Language",
        spriteStyle: "Sprite Style",
        animatedSprites: "Animated Sprites",
        audio: "Audio",
        display: "Display",
        saveSettings: "Save Settings",
        unsaved: "You have unsaved changes",
        unsavedWarning:
            "Wait! You have unsaved changes",
        settingsSaved: "Settings saved.",
        back: "Back",
        noPokemonFound: "No Pokemon Found"
    },

    fr: {
        pokedex: "Pokédex",
        nationalPokedex: "POKÉDEX NATIONAL",
        heroTitle: "Attrapez-les tous !",
        heroCopy:
            "Explorez les Pokémon, leurs formes, évolutions, Pokémon chromatiques, Méga-Évolutions, formes Gigamax, jeux et plus encore.",
        searchPlaceholder:
            "Rechercher un Pokémon ou un numéro...",
        all: "Tous",
        shiny: "Chromatique",
        mega: "Méga",
        gmax: "Gigamax",
        costumes: "Costumes",
        legendary: "Légendaire",
        mythical: "Fabuleux",
        ultraBeast: "Ultra-Chimère",
        settings: "Paramètres",
        appearance: "Apparence",
        theme: "Thème",
        language: "Langue",
        spriteStyle: "Style des sprites",
        animatedSprites: "Sprites animés",
        audio: "Audio",
        display: "Affichage",
        saveSettings: "Enregistrer",
        unsaved: "Vous avez des modifications non enregistrées",
        unsavedWarning:
            "Attendez ! Vous avez des modifications non enregistrées",
        settingsSaved: "Paramètres enregistrés.",
        back: "Retour",
        noPokemonFound: "Aucun Pokémon trouvé"
    }
};


function t(key) {
    const language =
        state.settings.language || "en";

    return (
        UI_TRANSLATIONS[language]?.[key] ??
        UI_TRANSLATIONS.en[key] ??
        key
    );
}


function applyInterfaceLanguage() {
    document.documentElement.lang =
        state.settings.language || "en";

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {
            const key =
                element.dataset.i18n;

            element.textContent =
                t(key);
        });

    document
        .querySelectorAll(
            "[data-i18n-placeholder]"
        )
        .forEach(element => {
            element.placeholder =
                t(
                    element.dataset
                        .i18nPlaceholder
                );
        });
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

      if (DOM.languageSetting) {
       DOM.languageSetting.value =
           state.settings.language;
   }
}

function readSettingsFromControls() {
    return {
        ...state.settings,

        theme:
            DOM.themeSetting?.value ??
            state.settings.theme,

        language:
            DOM.languageSetting?.value ??
            state.settings.language,

        spriteStyle:
            DOM.spriteSetting?.value ??
            state.settings.spriteStyle,

        animations:
            DOM.animationSetting?.checked ??
            state.settings.animations,

        autoCry:
            DOM.autoCrySetting?.checked ??
            state.settings.autoCry,

        cryVolume:
            Number(
                DOM.cryVolumeSetting?.value ??
                state.settings.cryVolume
            )
    };
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

    const targetView = views[viewName];

    if (!targetView) {
        console.error(
            `Unknown or missing view: ${viewName}`
        );
        return;
    }

    Object.values(views).forEach(view => {
        view?.classList.remove("active");
    });

    targetView.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "auto"
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
    const reference =
        speciesReference.name ||
        speciesReference.id;

    const [
        species,
        pokemon
    ] = await Promise.all([
        getSpecies(reference),
        getPokemon(reference)
    ]);

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

    /*
        The direct Pokémon request normally resolves to
        the default variety. If it doesn't, fall back to
        the exact default variety from the species record.
    */
    const defaultPokemon =
        pokemon.name ===
        defaultVariety.pokemon.name
            ? pokemon
            : await getPokemon(
                defaultVariety.pokemon.name
            );

    return {
        species,
        pokemon: defaultPokemon,
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
    if (!species) {
        return "";
    }

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
   COSTUME POKÉMON (Pokémon GO)
   ============================================================ */

const COSTUME_KEYWORDS = [
    "cap",
    "hat",
    "costume",
    "rock-star",
    "belle",
    "pop-star",
    "phd",
    "libre",
    "cosplay",
    "original-cap",
    "partner-cap",
    "hoenn-cap",
    "sinnoh-cap",
    "unova-cap",
    "kalos-cap",
    "alola-cap"
];

function isCostumeForm(formName) {
    const name = String(formName).toLowerCase();

    return COSTUME_KEYWORDS.some(keyword =>
        name.includes(keyword)
    );
}

async function buildCostumeIndex() {
    if (state.categoryIndexes.costumes) {
        return;
    }

    const costumes = new Set();

    showLoading("Discovering costume forms...");

    try {
        const formListInitial =
            await api("pokemon-form?limit=1");

        const totalForms =
            Number(formListInitial.count) || 0;

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
                    index + CONFIG.REQUEST_BATCH_SIZE
                );

            const forms =
                await Promise.all(
                    batch.map(resource =>
                        getPokemonForm(resource.name)
                            .catch(() => null)
                    )
                );

            for (const form of forms) {
                if (!form) {
                    continue;
                }

                if (!isCostumeForm(form.name)) {
                    continue;
                }

                try {
                    const pokemon =
                        await getPokemon(
                            form.pokemon.name
                        );

                    costumes.add(
                        pokemon.species.name
                    );
                }
                catch {
                    // ignore broken form
                }
            }

            await sleep(CONFIG.REQUEST_DELAY);
        }

        state.categoryIndexes.costumes = costumes;
    }
    finally {
        hideLoading();
    }
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
   const shiny =
       state.selectedFilters.has("shiny");

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
                    aria-label="Open ${escapeHtml(getLocalizedName(species.names, species.name))}"
                >

                    <div class="card-sprite-wrap">

                        ${
                            sprite
                                ? `
                                    <img
                                        class="card-sprite"
                                        src="${escapeHtml(sprite)}"
                                        alt="${shiny ? "Shiny " : ""}${escapeHtml(getLocalizedName(species.names, species.name))}"
                                        loading="lazy"
                                    >
                                `
                                : ""
                        }

                    </div>

                    <div class="card-name">
                        ${escapeHtml(
                            getLocalizedName(
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
                        
                        ${
                            specialForm === "mega"
                                ? `
                                    <span class="form-badge mega">
                                        Mega
                                    </span>
                                `
                                : ""
                        }
                        
                        ${
                            specialForm === "gmax"
                                ? `
                                    <span class="form-badge gmax">
                                        Gmax
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
const SEARCH_CATEGORIES = {
    kanto: "region-kanto",
    johto: "region-johto",
    hoenn: "region-hoenn",
    sinnoh: "region-sinnoh",
    unova: "region-unova",
    kalos: "region-kalos",
    alola: "region-alola",
    galar: "region-galar",
    paldea: "region-paldea",

    legendary: "legendary",
    legendaries: "legendary",

    mythical: "mythical",
    mythicals: "mythical",

    "ultra-beast": "ultra-beast",
    "ultra-beasts": "ultra-beast",
    "ultra beast": "ultra-beast",
    "ultra beasts": "ultra-beast",

    mega: "mega",
    megas: "mega",

    gmax: "gmax",
    gigantamax: "gmax",

    costume: "costumes",
    costumes: "costumes",

    shiny: "shiny"
};


function getSearchCategory(query) {
    const normalized =
        String(query)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-");

    return (
        SEARCH_CATEGORIES[normalized] ||
        SEARCH_CATEGORIES[
            String(query)
                .toLowerCase()
                .trim()
        ] ||
        null
    );
}

function matchesSearch(reference) {
    const query =
        normalizeSearch(
            state.searchQuery
        );

    if (!query) {
        return true;
    }

    /*
        Category / region searches are handled separately
        by applyFilter().
    */
    const searchCategory =
        getSearchCategory(query);

    if (searchCategory) {
        return true;
    }

    const name =
        normalizeSearch(
            reference.name
        );

    const pretty =
        normalizeSearch(
            prettyName(
                reference.name
            )
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

                     const eternamaxForm =
                         form.name === "eternatus-eternamax" ||
                         form.form_name === "eternamax";
                     
                     
                     const gmaxForm =
                         triggerNames.includes(
                             "gigantamax-factor"
                         ) ||
                         form.form_name === "gmax" ||
                         form.name.endsWith("-gmax") ||
                         eternamaxForm;

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
   const REGION_DEX_RANGES = {
       kanto: [1, 151],
       johto: [152, 251],
       hoenn: [252, 386],
       sinnoh: [387, 493],
       unova: [494, 649],
       kalos: [650, 721],
       alola: [722, 809],
       galar: [810, 905],
       paldea: [906, Infinity]
   };
   
   
   function applySearchSort(list) {
       let result = [...list];
   
       const mode =
           state.searchSort || "number";
   
       if (mode === "az") {
           return result.sort(
               (a, b) =>
                   prettyName(a.name)
                       .localeCompare(
                           prettyName(b.name)
                       )
           );
       }
   
       if (mode === "za") {
           return result.sort(
               (a, b) =>
                   prettyName(b.name)
                       .localeCompare(
                           prettyName(a.name)
                       )
           );
       }
   
       if (mode.startsWith("region-")) {
           const region =
               mode.replace("region-", "");
   
           const range =
               REGION_DEX_RANGES[region];
   
           if (range) {
               const [minimum, maximum] =
                   range;
   
               result = result.filter(
                   pokemon =>
                       pokemon.id >= minimum &&
                       pokemon.id <= maximum
               );
           }
       }
   
       return result.sort(
           (a, b) => a.id - b.id
       );
   }

async function applyFilter() {
    const filters =
        state.selectedFilters;

    let list =
        state.speciesList.filter(
            matchesSearch
        );
   
   const searchCategory =
    getSearchCategory(
        normalizeSearch(
            state.searchQuery
        )
    );

   if (searchCategory?.startsWith("region-")) {
    const region =
        searchCategory.replace(
            "region-",
            ""
        );

    const range =
        REGION_DEX_RANGES[region];

    if (range) {
        const [
            minimum,
            maximum
        ] = range;

        list =
            list.filter(
                pokemon =>
                    pokemon.id >= minimum &&
                    pokemon.id <= maximum
            );
    }
}
   if (searchCategory?.startsWith("region-")) {
    const region =
        searchCategory.replace(
            "region-",
            ""
        );

    const range =
        REGION_DEX_RANGES[region];

    if (range) {
        const [
            minimum,
            maximum
        ] = range;

        list =
            list.filter(
                pokemon =>
                    pokemon.id >= minimum &&
                    pokemon.id <= maximum
            );
    }
}

    /*
        Shiny is a display modifier rather than a
        species category, so it does not remove Pokémon.
    */
    const categoryFilters =
        [...filters].filter(
            filter => filter !== "shiny"
        );
   const effectiveSearchCategory =
    searchCategory &&
    !searchCategory.startsWith("region-")
        ? searchCategory
        : null;

const effectiveCategoryFilters =
    [
        ...categoryFilters,
        ...(effectiveSearchCategory
            ? [effectiveSearchCategory]
            : [])
    ];

    if (
        effectiveCategoryFilters.includes("legendary") ||
        effectiveCategoryFilters.includes("mythical")
    ) {
        await buildLegendaryIndex();
    }

    if (
        categoryFilters.includes("mega") ||
        categoryFilters.includes("gmax")
    ) {
        await buildSpecialFormIndexes();
    }
    if (
       categoryFilters.includes("costumes")
    ) {
        await buildCostumeIndex();
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

            case "costumes":
                list = list.filter(item =>
                    state.categoryIndexes
                        .costumes
                        .has(item.name)
                );
                break;
        }
    }

   list = applySearchSort(list);
   state.filteredSpecies = list;

   state.visibleCount =
       Math.min(
           Math.max(
               state.visibleCount,
               CONFIG.PAGE_SIZE
           ),
           Math.max(
               list.length,
               CONFIG.PAGE_SIZE
           )
       );

    await renderPokemonGrid();
}


/* ============================================================
   18. RENDER MAIN GRID
   ============================================================ */

async function renderPokemonGrid() {
    if (!DOM.pokemonGrid) {
        return;
    }

    const total =
        state.filteredSpecies.length;

    if (total === 0) {
        state.gridLoading.token += 1;

        if (
            state.gridLoading.warningTimer
        ) {
            clearTimeout(
                state.gridLoading.warningTimer
            );

            state.gridLoading.warningTimer =
                null;
        }

        DOM.pokemonGrid.innerHTML = `
            <div class="empty-state">
                <h2>No Pokemon Found</h2>
                <p>
                    Try removing one of the selected filters
                    or changing your search.
                </p>
            </div>
        `;

        if (DOM.status) {
            DOM.status.textContent =
                "No Pokemon Found";
        }

        if (DOM.resultCount) {
            DOM.resultCount.textContent =
                "0 Pokémon";
        }

        DOM.pokemonGrid.dataset.renderKey =
            "";

        DOM.pokemonGrid.dataset.renderedCount =
            "0";

        return;
    }

    const shiny =
        state.selectedFilters.has("shiny");

    const renderKey = [
        state.searchQuery,
        state.searchSort,
        ...[...state.selectedFilters].sort()
    ].join("|");

    const previousKey =
        DOM.pokemonGrid.dataset.renderKey || "";

    let renderedCount =
        Number(
            DOM.pokemonGrid.dataset.renderedCount || 0
        );

    const visibleSpecies =
        state.filteredSpecies.slice(
            0,
            Math.min(
                state.visibleCount,
                total
            )
        );

    /*
        A completely new search/filter/sort state.
    */
    if (previousKey !== renderKey) {
        state.gridLoading.token += 1;

        if (
            state.gridLoading.warningTimer
        ) {
            clearTimeout(
                state.gridLoading.warningTimer
            );

            state.gridLoading.warningTimer =
                null;
        }

        renderedCount = 0;

        DOM.pokemonGrid.innerHTML = "";

        DOM.pokemonGrid.dataset.renderKey =
            renderKey;

        DOM.pokemonGrid.dataset.renderedCount =
            "0";

        /*
            Create one skeleton slot for every Pokémon
            we're about to load.
        */
        DOM.pokemonGrid.innerHTML =
            visibleSpecies
                .map(
                    (_, index) =>
                        `
                            <div
                                class="skeleton"
                                data-grid-slot="${index}"
                            ></div>
                        `
                )
                .join("");
    }
    else {
        /*
            Infinite scroll added more Pokémon.

            Add skeleton slots only for the new cards.
        */
        const existingSlots =
            DOM.pokemonGrid.querySelectorAll(
                "[data-grid-slot]"
            ).length;

        if (
            visibleSpecies.length >
            existingSlots
        ) {
            const newSlots =
                visibleSpecies
                    .slice(existingSlots)
                    .map(
                        (_, offset) =>
                            `
                                <div
                                    class="skeleton"
                                    data-grid-slot="${
                                        existingSlots +
                                        offset
                                    }"
                                ></div>
                            `
                    )
                    .join("");

            DOM.pokemonGrid.insertAdjacentHTML(
                "beforeend",
                newSlots
            );
        }
    }

    if (
        renderedCount >=
        visibleSpecies.length
    ) {
        updateGridStatus();
        return;
    }

    const renderToken =
        ++state.gridLoading.token;

    state.gridLoading.total =
        visibleSpecies.length;

    state.gridLoading.completed =
        renderedCount;

    state.gridLoading.startedAt =
        performance.now();

    /*
        Tell the user we're loading the first page.
    */
    if (DOM.status) {
        DOM.status.textContent =
            `Loading Pokémon... 0 / ${visibleSpecies.length}`;
    }

    /*
        After seven seconds, show an estimated time.

        We use the actual completion rate when at least
        one Pokémon has finished. If absolutely nothing
        has completed, we give a conservative fallback
        rather than pretending we know the network speed.
    */
    state.gridLoading.warningTimer =
        window.setTimeout(
            () => {
                if (
                    renderToken !==
                    state.gridLoading.token
                ) {
                    return;
                }

                if (
                    state.gridLoading.completed >=
                    state.gridLoading.total
                ) {
                    return;
                }

                const elapsedSeconds =
                    Math.max(
                        (
                            performance.now() -
                            state.gridLoading.startedAt
                        ) / 1000,
                        0.1
                    );

                let estimatedSeconds;

                if (
                    state.gridLoading.completed > 0
                ) {
                    const cardsPerSecond =
                        state.gridLoading.completed /
                        elapsedSeconds;

                    estimatedSeconds =
                        Math.ceil(
                            (
                                state.gridLoading.total -
                                state.gridLoading.completed
                            ) /
                            cardsPerSecond
                        );
                }
                else {
                    estimatedSeconds = 15;
                }

                const estimate =
                    Math.max(
                        1,
                        estimatedSeconds
                    );

                if (DOM.status) {
                    DOM.status.textContent =
                        `Still loading Pokémon... ` +
                        `${state.gridLoading.completed} / ` +
                        `${state.gridLoading.total}` +
                        ` • Approximate time: ` +
                        `about ${estimate} seconds`;
                }
            },
            CONFIG.CARD_LOADING_WARNING_MS
        );

    /*
        Load cards progressively.

        We intentionally keep the number of simultaneous
        card requests controlled.
    */
    let nextIndex =
        renderedCount;

    async function worker() {
        while (
            nextIndex <
            visibleSpecies.length
        ) {
            const index =
                nextIndex++;

            const speciesReference =
                visibleSpecies[index];

            try {
                const html =
                    await buildPokemonCard(
                        speciesReference,
                        {
                            shiny
                        }
                    );

                /*
                    Ignore results from an old search/filter
                    operation.
                */
                if (
                    renderToken !==
                    state.gridLoading.token
                ) {
                    return;
                }

                const slot =
                    DOM.pokemonGrid.querySelector(
                        `[data-grid-slot="${index}"]`
                    );

                if (slot) {
                    if (html) {
                        slot.outerHTML =
                            html;
                    }
                    else {
                        slot.outerHTML = `
                            <div
                                class="error-state"
                                data-grid-slot="${index}"
                            >
                                <div
                                    class="error-state-inner"
                                >
                                    <strong>
                                        Couldn't load this Pokémon
                                    </strong>
                                </div>
                            </div>
                        `;
                    }
                }
            }
            catch (error) {
                console.warn(
                    "Progressive card loading failed:",
                    speciesReference,
                    error
                );

                const slot =
                    DOM.pokemonGrid.querySelector(
                        `[data-grid-slot="${index}"]`
                    );

                if (slot) {
                    slot.outerHTML = `
                        <div
                            class="error-state"
                            data-grid-slot="${index}"
                        >
                            <div
                                class="error-state-inner"
                            >
                                <strong>
                                    Couldn't load this Pokémon
                                </strong>
                            </div>
                        </div>
                    `;
                }
            }
            finally {
                if (
                    renderToken !==
                    state.gridLoading.token
                ) {
                    return;
                }

                state.gridLoading.completed +=
                    1;

                DOM.pokemonGrid.dataset.renderedCount =
                    String(
                        Math.max(
                            Number(
                                DOM.pokemonGrid
                                    .dataset
                                    .renderedCount ||
                                0
                            ),
                            index + 1
                        )
                    );

                if (DOM.status) {
                    DOM.status.textContent =
                        `Loading Pokémon... ` +
                        `${state.gridLoading.completed} / ` +
                        `${state.gridLoading.total}`;
                }

                if (
                    state.gridLoading.completed >=
                    state.gridLoading.total
                ) {
                    if (
                        state.gridLoading.warningTimer
                    ) {
                        clearTimeout(
                            state.gridLoading.warningTimer
                        );

                        state.gridLoading.warningTimer =
                            null;
                    }

                    updateGridStatus();
                }
            }
        }
    }

    const workers =
        Array.from(
            {
                length:
                    Math.min(
                        CONFIG.CARD_LOADING_CONCURRENCY,
                        visibleSpecies.length -
                            renderedCount
                    )
            },
            () => worker()
        );

    await Promise.all(workers);
}
function updateGridStatus() {
    const total =
        state.filteredSpecies.length;

    const selected =
        [...state.selectedFilters];

    let filterLabel =
        "National Pokédex";

    if (selected.length > 0) {
        filterLabel =
            selected
                .map(filter => {
                    if (
                        filter ===
                        "ultra-beast"
                    ) {
                        return "Ultra Beasts";
                    }

                    return prettyName(filter);
                })
                .join(" + ");
    }

    if (DOM.status) {
        if (state.searchQuery) {
            DOM.status.textContent =
                `${filterLabel} • Search: "${state.searchQuery}"`;
        }
        else {
            DOM.status.textContent =
                filterLabel;
        }
    }

    if (DOM.resultCount) {
        DOM.resultCount.textContent =
            `${total} Pokémon`;
    }
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


async function playCry2025(pokemon = state.selectedPokemon) {
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

let volumePreviewTimer = null;

const activeCryPlayers = new Set();

function stopCry() {
    activeCryPlayers.forEach(audio => {
        try {
            audio.pause();
            audio.currentTime = 0;
        }
        catch {
            // Ignore already-destroyed audio objects.
        }
    });

    activeCryPlayers.clear();

    if (DOM.pokemonCryPlayer) {
        DOM.pokemonCryPlayer.pause();
        DOM.pokemonCryPlayer.currentTime = 0;
    }
}


function playOverlappingCry(
    pokemon
) {
    if (!pokemon) {
        return null;
    }

    const cry =
        pokemon.cries?.latest ||
        pokemon.cries?.legacy;

    if (!cry) {
        return null;
    }

    const audio =
        new Audio(cry);

    audio.preload = "auto";

    audio.volume =
        clamp(
            Number(
                state.settings.cryVolume
            ) / 100,
            0,
            1
        );

    const cleanup = () => {
        activeCryPlayers.delete(audio);
    };

    audio.addEventListener(
        "ended",
        cleanup,
        { once: true }
    );

    audio.addEventListener(
        "error",
        cleanup,
        { once: true }
    );

    activeCryPlayers.add(audio);

    audio.play()
        .catch(() => {
            cleanup();
        });

    return audio;
}


async function playCry2025(
    pokemon = state.selectedPokemon
) {
    if (!pokemon) {
        return;
    }

    const audio =
        playOverlappingCry(pokemon);

    if (!audio) {
        showToast(
            "No cry is available for this Pokémon.",
            "warning"
        );
    }
}


async function playPikachuIconicCry() {
    if (!DOM.pokemonCryPlayer) {
        return;
    }

    try {
        const pikachu =
            await getPokemon("pikachu");

        const cry =
            pikachu.cries?.latest ||
            pikachu.cries?.legacy;

        if (!cry) {
            return;
        }

        DOM.pokemonCryPlayer.pause();
        DOM.pokemonCryPlayer.currentTime = 0;

        DOM.pokemonCryPlayer.src =
            cry;

        DOM.pokemonCryPlayer.volume =
            clamp(
                Number(
                    state.settings.cryVolume
                ) / 100,
                0,
                1
            );

        await DOM.pokemonCryPlayer.play();
    }
    catch (error) {
        console.warn(
            "Could not preview Pikachu cry:",
            error
        );
    }
}


function previewCryVolume() {
    clearTimeout(
        volumePreviewTimer
    );

    volumePreviewTimer =
        window.setTimeout(
            () => {
                playPikachuIconicCry();
            },
            120
        );
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
              state.settings.autoCry,
      
          shiny = false
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

        state.selectedShiny =
            Boolean(shiny);

        state.currentDetailPanel =
            "info";

        await buildCostumeIndex();

        renderPokemonDetail(
            pokemon,
            species
        );

        if (autoPlayCry) {
            playCry2025(pokemon);
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
    getSprite(
        pokemon,
        state.selectedShiny
    );

    const speciesName =
        getLocalizedName(
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

                  ${
                      pokemon.name === "pikachu"
                          ? `
                              <button
                                  class="action-button primary"
                                  type="button"
                                  data-action="play-pikachu-iconic"
                              >
                                  🔊 Play Cry
                              </button>
                  
                              <button
                                  class="action-button"
                                  type="button"
                                  data-action="play-cry-2025"
                              >
                                  🔊 Play 2025 Cry
                              </button>
                          `
                          : `
                              <button
                                  class="action-button primary"
                                  type="button"
                                  data-action="play-cry-2025"
                              >
                                  🔊 Play Cry
                              </button>
                          `
                  }

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

                ${
                   state.categoryIndexes.costumes?.has(species.name)
                       ? detailTabButton(
                           "costumes",
                           "Costumes"
                       )
                          : ""
                 }

                ${detailTabButton(
                    "games",
                    "Game Appearances"
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

            case "costumes":
                await renderCostumesPanel(panel);
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
                    getLocalizedName(
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
        getLocalizedName(
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

async function renderCostumesPanel(panel) {
    const pokemon =
        state.selectedPokemon;

    const costumes =
        await getCostumesForPokemon(pokemon);

    if (!costumes.length) {
        panel.innerHTML = `
            <section class="detail-section">

                <h2>Costumes</h2>

                <p class="muted">
                    This Pokémon has no costume forms
                    available in PokéAPI.
                </p>

            </section>
        `;

        return;
    }

    const costumeCards = [];

    for (const costume of costumes) {
        try {
            const costumePokemon =
                await getPokemon(
                    costume.pokemon.name
                );

            const normalSprite =
                getSprite(
                    costumePokemon,
                    false
                );

            const shinySprite =
                getSprite(
                    costumePokemon,
                    true
                );

            const costumeName =
                getLocalizedName(
                    costume.names,
                    costume.name
                );

            costumeCards.push(`
                <section class="costume-card">

                    ${
                        normalSprite
                            ? `
                                <img
                                    class="form-image"
                                    src="${escapeHtml(normalSprite)}"
                                    alt="${escapeHtml(costumeName)}"
                                    loading="lazy"
                                >
                            `
                            : ""
                    }

                    <h3 class="form-name">
                        ${escapeHtml(costumeName)}
                    </h3>

                    <p class="form-description">
                        Costume Pokémon
                    </p>

                    <div class="gallery">

                        ${spriteGalleryCard(
                            normalSprite,
                            "Normal",
                            costumeName,
                            costumePokemon.name,
                            false
                        )}

                        ${spriteGalleryCard(
                            shinySprite,
                            "Shiny",
                            `Shiny ${costumeName}`,
                            costumePokemon.name,
                            true
                        )}

                    </div>

                </section>
            `);
        }
        catch {
            /* Skip unavailable costume */
        }
    }

    panel.innerHTML = `
        <section class="detail-section">

            <h2>Costumes</h2>

            <p class="muted">
                Costume variants associated with this Pokémon.
                Costume Pokémon can also be shiny.
            </p>

            <div class="forms-grid">
                ${costumeCards.join("")}
            </div>

        </section>
    `;
}


function spriteGalleryCard(
    sprite,
    label,
    alt,
    pokemonName = "",
    shiny = false
) {
    const imageContent = sprite
        ? `
            <img
                src="${escapeHtml(sprite)}"
                alt="${escapeHtml(alt)}"
                loading="lazy"
            >
        `
        : `
            <div class="inline-loading">
                No sprite available
            </div>
        `;

    const content = `
        ${imageContent}

        <strong>
            ${escapeHtml(label)}
        </strong>
    `;

    /*
        If no Pokémon name was supplied, this remains
        a normal non-clickable gallery card.
    */
    if (!pokemonName) {
        return `
            <div class="gallery-card">
                ${content}
            </div>
        `;
    }

    /*
        Otherwise the gallery card becomes a button.

        data-open-shiny is picked up by the click handler
        we fixed in the previous step.
    */
    return `
        <button
            class="gallery-card"
            type="button"
            data-open-pokemon="${escapeHtml(pokemonName)}"
            data-open-shiny="${shiny ? "true" : "false"}"
        >
            ${content}
        </button>
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
                                            getLocalizedName(
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
   =========================================================== */

/* Old code has been deleted, due to new loading systems

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
                 .openPokemon,
             {
                 shiny:
                     openPokemonButton
                         .dataset
                         .openShiny === "true"
             }
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
                case "play-pikachu-iconic":
                    await playPikachuIconicCry();
                    break;
            
                case "play-cry-2025":
                    await playCry2025();
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
          if (
       DOM.settingsView?.classList.contains("active") &&
       warnUnsavedSettings()
   ) {
       return;
   }
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

window.addEventListener(
    "beforeunload",
    event => {
        if (!state.settingsDirty) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    }
);

DOM.settingsBack?.addEventListener(
    "click",
    () => {
        if (warnUnsavedSettings()) {
            return;
        }

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

DOM.searchSortSetting?.addEventListener(
    "change",
    async event => {
        state.searchSort =
            event.target.value;

        state.visibleCount =
            CONFIG.PAGE_SIZE;

        await applyFilter();
    }
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

/* ============================================================
   INFINITE SCROLL
   ============================================================ */

let infiniteScrollLoading = false;
let infiniteScrollReady = true;


async function loadNextPokemonPage() {
    if (
        infiniteScrollLoading ||
        !infiniteScrollReady
    ) {
        return;
    }

    const total =
        state.filteredSpecies.length;

    if (
        state.visibleCount >= total
    ) {
        return;
    }

    infiniteScrollLoading = true;
    infiniteScrollReady = false;

    try {
        state.visibleCount =
            Math.min(
                state.visibleCount +
                    CONFIG.PAGE_SIZE,
                total
            );

        await renderPokemonGrid();
    }
    catch (error) {
        console.error(
            "Infinite scroll failed:",
            error
        );
    }
    finally {
        infiniteScrollLoading = false;

        /*
            Don't allow another load during the
            same intersection/render cycle.
        */
        window.setTimeout(
            () => {
                infiniteScrollReady = true;
            },
            500
        );
    }
}


const infiniteScrollObserver =
    new IntersectionObserver(
        entries => {
            const entry =
                entries[0];

            if (!entry) {
                return;
            }

            if (!entry.isIntersecting) {
                infiniteScrollReady = true;
                return;
            }

            if (
                DOM.dexView
                    ?.classList
                    .contains("active")
            ) {
                loadNextPokemonPage();
            }
        },
        {
            root: null,

            /*
                Don't start loading another 60 Pokémon
                when the user is still 700px away.
            */
            rootMargin: "100px 0px",

            threshold: 0.01
        }
    );


if (DOM.infiniteScrollSentinel) {
    infiniteScrollObserver.observe(
        DOM.infiniteScrollSentinel
    );
}

/* ============================================================
   38. SETTINGS EVENTS
   ============================================================ */

function markSettingsDirty() {
    state.settingsDirty = true;

    DOM.saveSettingsBar?.classList.add(
        "visible"
    );

    DOM.saveSettingsBar?.setAttribute(
        "aria-hidden",
        "false"
    );
}


function clearSettingsDirty() {
    state.settingsDirty = false;

    DOM.saveSettingsBar?.classList.remove(
        "visible",
        "warning"
    );

    DOM.saveSettingsBar?.setAttribute(
        "aria-hidden",
        "true"
    );

    if (DOM.unsavedSettingsMessage) {
        DOM.unsavedSettingsMessage.textContent =
            "You have unsaved changes";
    }
}


function warnUnsavedSettings() {
    if (!state.settingsDirty) {
        return false;
    }

    if (DOM.unsavedSettingsMessage) {
        DOM.unsavedSettingsMessage.textContent =
            "Wait! You have unsaved changes";
    }

    DOM.saveSettingsBar?.classList.remove(
        "warning"
    );

    /*
        Force the browser to restart the animation.
    */
    void DOM.saveSettingsBar?.offsetWidth;

    DOM.saveSettingsBar?.classList.add(
        "warning",
        "visible"
    );

    window.setTimeout(() => {
        DOM.saveSettingsBar?.classList.remove(
            "warning"
        );
    }, 500);

    return true;
}


DOM.themeSetting?.addEventListener(
    "change",
    markSettingsDirty
);


DOM.spriteSetting?.addEventListener(
    "change",
    markSettingsDirty
);


DOM.animationSetting?.addEventListener(
    "change",
    markSettingsDirty
);


DOM.autoCrySetting?.addEventListener(
    "change",
    markSettingsDirty
);


DOM.languageSetting?.addEventListener(
    "change",
    markSettingsDirty
);


DOM.cryVolumeSetting?.addEventListener(
    "input",
    event => {
        markSettingsDirty();

        const temporaryVolume =
            clamp(
                Number(event.target.value) / 100,
                0,
                1
            );

        if (DOM.pokemonCryPlayer) {
            DOM.pokemonCryPlayer.volume =
                temporaryVolume;
        }

        clearTimeout(volumePreviewTimer);

        volumePreviewTimer =
            window.setTimeout(
                async () => {
                    try {
                        const pikachu =
                            await getPokemon(
                                "pikachu"
                            );

                        const cry =
                            pikachu.cries?.latest ||
                            pikachu.cries?.legacy;

                        if (!cry) {
                            return;
                        }

                        stopCry();

                        DOM.pokemonCryPlayer.src =
                            cry;

                        DOM.pokemonCryPlayer.volume =
                            temporaryVolume;

                        await DOM.pokemonCryPlayer.play();
                    }
                    catch (error) {
                        console.warn(
                            "Could not preview cry volume:",
                            error
                        );
                    }
                },
                180
            );
    }
);


DOM.saveSettingsButton?.addEventListener(
    "click",
    async () => {
        state.settings =
            readSettingsFromControls();

        saveSettings();

        applySettings();

        applyInterfaceLanguage();

        clearSettingsDirty();

        state.visibleCount =
            CONFIG.PAGE_SIZE;

        await applyFilter();

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

        showToast(
            t("settingsSaved")
        );
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

    applyInterfaceLanguage();

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
