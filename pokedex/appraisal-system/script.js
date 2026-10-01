// --- 1. Pokemon GO Data & CPM Table (Levels 1 to 50) ---
const cpmTable = {
    1: 0.094, 1.5: 0.135137432, 2: 0.16639787, 2.5: 0.192650919, 3: 0.21573247, 3.5: 0.236572661, 4: 0.25572005, 4.5: 0.273530381, 5: 0.29024988, 5.5: 0.306057377,
    6: 0.3210876, 6.5: 0.335445036, 7: 0.34921268, 7.5: 0.362457751, 8: 0.3752356, 8.5: 0.387592416, 9: 0.39956728, 9.5: 0.411193551, 10: 0.4225, 10.5: 0.432926409,
    11: 0.44310755, 11.5: 0.453059959, 12: 0.4627984, 12.5: 0.472336093, 13: 0.48168495, 13.5: 0.4908558, 14: 0.49985844, 14.5: 0.508701765, 15: 0.51739395, 15.5: 0.525942511,
    16: 0.5343543, 16.5: 0.542635738, 17: 0.5507927, 17.5: 0.558830586, 18: 0.5667545, 18.5: 0.574569133, 19: 0.5822789, 19.5: 0.589887907, 20: 0.5974, 20.5: 0.604823665,
    21: 0.6121573, 21.5: 0.619404122, 22: 0.6265671, 22.5: 0.633649143, 23: 0.64065295, 23.5: 0.647580967, 24: 0.6544331, 24.5: 0.661214806, 25: 0.667934, 25.5: 0.674577537,
    26: 0.6811649, 26.5: 0.687684904, 27: 0.69414365, 27.5: 0.70054287, 28: 0.7068842, 28.5: 0.713164996, 29: 0.7193991, 29.5: 0.725575614, 30: 0.7317, 30.5: 0.734741009,
    31: 0.7377695, 31.5: 0.740785594, 32: 0.74378943, 32.5: 0.746781211, 33: 0.74976104, 33.5: 0.752729087, 34: 0.7556855, 34.5: 0.758630378, 35: 0.76156384, 35.5: 0.764486065,
    36: 0.76739717, 36.5: 0.770297266, 37: 0.7731865, 37.5: 0.776064962, 38: 0.77893275, 38.5: 0.781790055, 39: 0.784637, 39.5: 0.787473608, 40: 0.7903, 40.5: 0.792803968,
    41: 0.7953, 41.5: 0.7978087, 42: 0.8003, 42.5: 0.8028042, 43: 0.8053, 43.5: 0.8078028, 44: 0.8103, 44.5: 0.8128039, 45: 0.8153, 45.5: 0.8177995,
    46: 0.8203, 46.5: 0.8227926, 47: 0.8253, 47.5: 0.8277938, 48: 0.8303, 48.5: 0.8327932, 49: 0.8353, 49.5: 0.8377987, 50: 0.8403
};

let currentPokemonBaseStats = null;
let allPokemonList = []; // Master list for search autocomplete

// --- 2. Initialize Autocomplete List from PokeAPI ---
async function fetchAllPokemon() {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1300');
        const data = await response.json();
        allPokemonList = data.results;
    } catch (error) {
        console.error("Failed to load Pokémon list for autocomplete", error);
    }
}
fetchAllPokemon();

// --- 3. UI Elements ---
const pokemonInput = document.getElementById('pokemon-input');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const spriteImg = document.getElementById('pokemon-sprite');
const loadingMsg = document.getElementById('loading-msg');
const errorMsg = document.getElementById('error-msg');
let typingTimer;

// --- 4. Handling Search Input & Autocomplete Dropdown ---
pokemonInput.addEventListener('input', () => {
    const val = pokemonInput.value.trim().toLowerCase();
    autocompleteDropdown.innerHTML = '';
    
    clearTimeout(typingTimer);
    
    if (val.length >= 2) {
        // Filter master list (top 10 matches)
        const matches = allPokemonList.filter(p => p.name.includes(val)).slice(0, 10);
        
        if (matches.length > 0) {
            autocompleteDropdown.style.display = 'block';
            
            matches.forEach(match => {
                const urlParts = match.url.split('/');
                const id = urlParts[urlParts.length - 2];
                const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
                
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                
                const formattedName = match.name.replace(/-/g, ' ');
                
                item.innerHTML = `
                    <img src="${spriteUrl}" class="autocomplete-sprite" loading="lazy" alt="sprite">
                    <span class="autocomplete-name">${formattedName}</span>
                `;
                
                item.addEventListener('click', () => {
                    pokemonInput.value = formattedName;
                    autocompleteDropdown.style.display = 'none';
                    fetchPokemonData(match.name);
                });
                
                autocompleteDropdown.appendChild(item);
            });
        } else {
            autocompleteDropdown.style.display = 'none';
        }
    } else {
        autocompleteDropdown.style.display = 'none';
        spriteImg.style.display = 'none';
        errorMsg.style.display = 'none';
        currentPokemonBaseStats = null;
    }

    if (val !== '') {
        typingTimer = setTimeout(() => {
            fetchPokemonData(val.replace(/\s+/g, '-'));
        }, 600);
    }
});

// Close dropdown if user clicks outside
document.addEventListener('click', (e) => {
    if (!pokemonInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        autocompleteDropdown.style.display = 'none';
    }
});

// --- 5. Accurate Niantic Stat Conversion ---
async function fetchPokemonData(pokemonName) {
    spriteImg.style.display = 'none';
    errorMsg.style.display = 'none';
    loadingMsg.style.display = 'block';
    currentPokemonBaseStats = null;

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error('Not found');
        
        const data = await response.json();
        const spriteUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        
        spriteImg.src = spriteUrl;
        spriteImg.onload = () => {
            loadingMsg.style.display = 'none';
            spriteImg.style.display = 'block';
        };

        const stats = {};
        data.stats.forEach(stat => {
            stats[stat.stat.name] = stat.base_stat;
        });

        // Official Niantic Main-Series to PoGo Stat Formula:
        const speedMod = 1 + (stats.speed - 75) / 500;
        
        // Attack (7/8 & 1/8 weighting)
        const scaledAtk = Math.round(2 * ((Math.max(stats.attack, stats['special-attack']) * (7/8)) + (Math.min(stats.attack, stats['special-attack']) * (1/8))));
        let baseAtk = Math.round(scaledAtk * speedMod);

        // Defense (5/8 & 3/8 weighting)
        const scaledDef = Math.round(2 * ((Math.max(stats.defense, stats['special-defense']) * (5/8)) + (Math.min(stats.defense, stats['special-defense']) * (3/8))));
        let baseDef = Math.round(scaledDef * speedMod);

        // Stamina
        let baseSta = Math.floor(1.75 * stats.hp + 50);

        // Flat 9% stat nerf to OP/Legendary Pokemon over 4000 unnerfed CP
        const unnerfedMaxCp = Math.floor(((baseAtk + 15) * Math.sqrt(baseDef + 15) * Math.sqrt(baseSta + 15) * Math.pow(0.7903, 2)) / 10);
        if (unnerfedMaxCp > 4000) {
            baseAtk = Math.round(baseAtk * 0.91);
            baseDef = Math.round(baseDef * 0.91);
            baseSta = Math.round(baseSta * 0.91);
        }

        currentPokemonBaseStats = { atk: baseAtk, def: baseDef, sta: baseSta };

    } catch (error) {
        loadingMsg.style.display = 'none';
        errorMsg.style.display = 'block';
    }
}

// --- 6. Handling Sliders ---
const atkSlider = document.getElementById('atk-slider');
const defSlider = document.getElementById('def-slider');
const staSlider = document.getElementById('sta-slider');
const atkVal = document.getElementById('atk-val');
const defVal = document.getElementById('def-val');
const staVal = document.getElementById('sta-val');

function updateSliderValue(slider, label) {
    slider.addEventListener('input', function() {
        label.textContent = this.value;
    });
}
updateSliderValue(atkSlider, atkVal);
updateSliderValue(defSlider, defVal);
updateSliderValue(staSlider, staVal);

// --- 7. Real CP & Level Calculation ---
const calcBtn = document.getElementById('calculate-btn');
const resultsBox = document.getElementById('results-box');
const resultPercentage = document.getElementById('result-percentage');
const resultBreakdown = document.getElementById('result-breakdown');
const resultStats = document.getElementById('result-stats');
const advStatsBox = document.getElementById('advanced-stats-box');
const resultLevel = document.getElementById('result-level');
const resultMaxCp = document.getElementById('result-max-cp');
const cpInput = document.getElementById('cp-input');

calcBtn.addEventListener('click', () => {
    const atkIV = parseInt(atkSlider.value);
    const defIV = parseInt(defSlider.value);
    const staIV = parseInt(staSlider.value);
    
    // Perfection %
    const totalIV = atkIV + defIV + staIV;
    const percentage = ((totalIV / 45) * 100).toFixed(1);
    
    resultPercentage.textContent = `${percentage}%`;
    resultBreakdown.textContent = `Atk: ${atkIV} | Def: ${defIV} | HP: ${staIV}`;
    
    if (currentPokemonBaseStats) {
        const inputCP = parseInt(cpInput.value);
        
        // Calculate Max CP at Level 50 (CPM = 0.8403)
        const maxLevelCpm = cpmTable[50];
        const maxCP = Math.max(10, Math.floor(
            ((currentPokemonBaseStats.atk + atkIV) * 
            Math.sqrt(currentPokemonBaseStats.def + defIV) * 
            Math.sqrt(currentPokemonBaseStats.sta + staIV) * 
            Math.pow(maxLevelCpm, 2)) / 10
        ));
        
        resultMaxCp.textContent = maxCP;

        // Estimate level from user's input CP
        if (inputCP && !isNaN(inputCP)) {
            let estimatedLevel = "Unknown";
            let closestCPDiff = 9999;

            for (const [lvl, cpm] of Object.entries(cpmTable)) {
                const calculatedCP = Math.max(10, Math.floor(
                    ((currentPokemonBaseStats.atk + atkIV) * 
                    Math.sqrt(currentPokemonBaseStats.def + defIV) * 
                    Math.sqrt(currentPokemonBaseStats.sta + staIV) * 
                    Math.pow(cpm, 2)) / 10
                ));
                
                if (calculatedCP === inputCP) {
                    estimatedLevel = lvl;
                    break;
                } else if (Math.abs(calculatedCP - inputCP) < closestCPDiff) {
                    closestCPDiff = Math.abs(calculatedCP - inputCP);
                    estimatedLevel = `~${lvl}`;
                }
            }
            resultLevel.textContent = estimatedLevel;
            resultStats.textContent = `Level estimated from input CP ${inputCP}.`;
        } else {
            resultLevel.textContent = "-";
            resultStats.textContent = `Enter a CP value to estimate its current level!`;
        }

        advStatsBox.style.display = 'block';
    } else {
        advStatsBox.style.display = 'none';
        resultStats.textContent = "Enter a valid Pokémon name to see Advanced Stats like Max CP and Level.";
    }

    // Color rating
    if (percentage == 100) resultPercentage.style.color = "#dc3545"; 
    else if (percentage >= 82) resultPercentage.style.color = "#28a745"; 
    else if (percentage >= 51) resultPercentage.style.color = "#fd7e14"; 
    else resultPercentage.style.color = "#6c757d"; 

    resultsBox.style.display = 'block';
});
