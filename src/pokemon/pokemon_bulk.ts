import { POKEMON_DATA, BaseStats, StatName } from './pokemon_data.js';
import { calculateFinalStats, NATURE_EFFECTS, PokemonBuild, NatureName } from './pokemon_utils.js';

// State variables
let selectedDef: string = 'Aegislash';
let selectedPhys: string = 'Garchomp';
let selectedSpec: string = 'Charizard';

// Optimized additions to defender stats
let defCalculatedAdditions: BaseStats = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };

// Initialize autocomplete options
const suggestionList = document.getElementById('pokemon-suggestions') as HTMLElement;
if (suggestionList) {
  const sortedNames = Object.keys(POKEMON_DATA).sort();
  sortedNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    suggestionList.appendChild(option);
  });
}

// Initialize Nature options
const natures = (Object.keys(NATURE_EFFECTS) as NatureName[]).sort();

function populateNatures(selectElement: HTMLSelectElement | null, defaultNature: string = 'Neutral'): void {
  if (!selectElement) return;
  selectElement.innerHTML = '';

  natures.forEach(nat => {
    const opt = document.createElement('option');
    opt.value = nat;

    // Show description of boosted/reduced stats
    const effects = NATURE_EFFECTS[nat];
    let desc = '';
    const statKeys = Object.keys(effects) as (keyof typeof effects)[];
    const boosted = statKeys.find(k => effects[k] > 1.0);
    const reduced = statKeys.find(k => effects[k] < 1.0);

    if (boosted && reduced) {
      desc = ` (+${boosted.toUpperCase()}, -${reduced.toUpperCase()})`;
    } else {
      desc = ' (Neutral)';
    }

    opt.textContent = nat + desc;
    if (nat === defaultNature) opt.selected = true;
    selectElement.appendChild(opt);
  });
}

const defNatureSelect = document.getElementById('def-nature') as HTMLSelectElement | null;
const physNatureSelect = document.getElementById('phys-nature') as HTMLSelectElement | null;
const specNatureSelect = document.getElementById('spec-nature') as HTMLSelectElement | null;

populateNatures(defNatureSelect, 'Hardy');
populateNatures(physNatureSelect, 'Adamant');
populateNatures(specNatureSelect, 'Modest');

// Formats the type badges
function updateTypeBadges(containerId: string, pokemonName: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const data = POKEMON_DATA[pokemonName];
  if (data && data.types) {
    data.types.forEach(t => {
      const badge = document.createElement('span');
      badge.className = `type-badge type-${t.toLowerCase()}`;
      badge.textContent = t;
      container.appendChild(badge);
    });
  }
}

interface StatMappingItem {
  key: StatName;
  name: string;
}

// Creates row elements for stats table
function createStatsRows(pokemonName: string, containerId: string, isDefender: boolean): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const data = POKEMON_DATA[pokemonName];
  if (!data) return;

  const statMapping: StatMappingItem[] = [
    { key: 'hp', name: 'HP' },
    { key: 'at', name: 'Atk' },
    { key: 'df', name: 'Def' },
    { key: 'sa', name: 'SpA' },
    { key: 'sd', name: 'SpD' },
    { key: 'sp', name: 'Spe' }
  ];

  statMapping.forEach(item => {
    const tr = document.createElement('tr');

    // Stat Name
    const tdName = document.createElement('td');
    tdName.className = 'stat-name';
    tdName.textContent = item.name;
    tr.appendChild(tdName);

    // Base Stat
    const tdBase = document.createElement('td');
    tdBase.className = 'stat-base-val';
    tdBase.textContent = String(data.bs[item.key] || 0);
    tr.appendChild(tdBase);

    // User Points Input
    const tdInput = document.createElement('td');
    tdInput.className = 'stat-input-cell';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'stat-input';
    input.min = '0';
    input.max = '32';

    // Default Attack to 32 for physical attacker, SpA to 32 for special attacker
    let defVal = '0';
    if (!isDefender) {
      if (containerId.includes('phys') && item.key === 'at') {
        defVal = '32';
      } else if (containerId.includes('spec') && item.key === 'sa') {
        defVal = '32';
      }
    }
    input.value = defVal;
    input.dataset.stat = item.key;
    input.dataset.role = isDefender ? 'def' : (containerId.includes('phys') ? 'phys' : 'spec');

    // Keep inputs clean and within bounds
    input.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      let val = parseInt(target.value) || 0;
      if (val < 0) val = 0;
      if (val > 32) val = 32;
      target.value = String(val);

      if (isDefender) {
        // Clear calculated additions when user changes base stats to keep it honest
        resetDefenderCalculated();
      }

      updateAllStats();
    });

    tdInput.appendChild(input);
    tr.appendChild(tdInput);

    // Calculated Points (only for Defender)
    if (isDefender) {
      const tdCalc = document.createElement('td');
      tdCalc.className = 'stat-calc-cell';
      tdCalc.id = `def-calc-${item.key}`;
      tdCalc.textContent = '-';
      tr.appendChild(tdCalc);
    }

    // Final Stat Value
    const tdFinal = document.createElement('td');
    tdFinal.className = 'stat-final-cell';
    tdFinal.id = `${isDefender ? 'def' : (containerId.includes('phys') ? 'phys' : 'spec')}-final-${item.key}`;
    tdFinal.textContent = '0';
    tr.appendChild(tdFinal);

    container.appendChild(tr);
  });
}

// Resets the calculated additions column
function resetDefenderCalculated(): void {
  defCalculatedAdditions = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
  const keys: StatName[] = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
  keys.forEach(k => {
    const el = document.getElementById(`def-calc-${k}`);
    if (el) el.textContent = '-';
  });
  const resultsPanel = document.getElementById('results-panel');
  if (resultsPanel) {
    resultsPanel.style.display = 'none';
  }
}

// Gets the current user set points for a given role ('def', 'phys', 'spec')
function getUserPoints(role: string): BaseStats {
  const inputs = document.querySelectorAll<HTMLInputElement>(`.stat-input[data-role="${role}"]`);
  const pts: BaseStats = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
  inputs.forEach(input => {
    const stat = input.dataset.stat as StatName | undefined;
    if (stat && stat in pts) {
      pts[stat] = parseInt(input.value) || 0;
    }
  });
  return pts;
}

// Updates calculated final values for a given pokemon column
function updateStatsForColumn(
  pokemonName: string,
  role: string,
  natureSelectId: string,
  userPts: BaseStats,
  extraPts: BaseStats | null = null
): void {
  const data = POKEMON_DATA[pokemonName];
  if (!data) return;

  const select = document.getElementById(natureSelectId) as HTMLSelectElement | null;
  const alignment = select ? select.value : 'Neutral';
  const combinedPts: BaseStats = { ...userPts };
  if (extraPts) {
    (Object.keys(combinedPts) as StatName[]).forEach(k => {
      combinedPts[k] += (extraPts[k] || 0);
    });
  }

  const build = new PokemonBuild(combinedPts, alignment);
  const finalStats = calculateFinalStats(pokemonName, build);

  (Object.entries(finalStats) as [StatName, number][]).forEach(([stat, val]) => {
    const cell = document.getElementById(`${role}-final-${stat}`);
    if (cell) cell.textContent = String(val);
  });
}

// Validates defender points and updates total counts
function updateDefenderPointsSummary(): void {
  const userPts = getUserPoints('def');
  const totalUser = Object.values(userPts).reduce((a, b) => a + b, 0);

  const summarySpan = document.getElementById('def-points-total');
  if (!summarySpan) return;
  summarySpan.textContent = `${totalUser} / 66`;

  // Adjust styling based on limit
  if (totalUser > 66) {
    summarySpan.className = 'points-value invalid';
    disableCalculateButtons(true);
  } else if (totalUser === 66) {
    summarySpan.className = 'points-value warning';
    disableCalculateButtons(false);
  } else {
    summarySpan.className = 'points-value valid';
    disableCalculateButtons(false);
  }
}

function disableCalculateButtons(disabled: boolean): void {
  const physBtn = document.getElementById('btn-calc-physical') as HTMLButtonElement | null;
  const specBtn = document.getElementById('btn-calc-special') as HTMLButtonElement | null;
  const mixBtn = document.getElementById('btn-calc-mixed') as HTMLButtonElement | null;
  if (physBtn) physBtn.disabled = disabled;
  if (specBtn) specBtn.disabled = disabled;
  if (mixBtn) mixBtn.disabled = disabled;
}

// Master update function
function updateAllStats(): void {
  if (POKEMON_DATA[selectedDef]) {
    const defUser = getUserPoints('def');
    updateStatsForColumn(selectedDef, 'def', 'def-nature', defUser, defCalculatedAdditions);
    updateDefenderPointsSummary();
  }
  if (POKEMON_DATA[selectedPhys]) {
    const physUser = getUserPoints('phys');
    updateStatsForColumn(selectedPhys, 'phys', 'phys-nature', physUser);
  }
  if (POKEMON_DATA[selectedSpec]) {
    const specUser = getUserPoints('spec');
    updateStatsForColumn(selectedSpec, 'spec', 'spec-nature', specUser);
  }
}

// Pokémon Damage Formula (Level 50)
function calculateDamage(power: number, attack: number, defense: number): number {
  const levelFactor = 22; // Math.floor((2 * 50) / 5) + 2 = 22
  const baseDamage = Math.floor((levelFactor * power * attack) / defense);
  const finalDamage = Math.floor(baseDamage / 50) + 2;
  return finalDamage;
}

// Setup Search/Select Events
function setupSearch(
  inputId: string,
  badgeContainerId: string,
  statsContainerId: string,
  role: string,
  _natureSelectId: string,
  onSelectCallback: (name: string) => void
): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return;

  input.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const name = target.value;
    if (POKEMON_DATA[name]) {
      onSelectCallback(name);
      updateTypeBadges(badgeContainerId, name);
      createStatsRows(name, statsContainerId, role === 'def');
      resetDefenderCalculated();
      updateAllStats();
    }
  });

  // Select text on focus for usability
  input.addEventListener('focus', (e: FocusEvent) => {
    const target = e.target as HTMLInputElement;
    target.select();
  });
}

// Setup nature changes
[defNatureSelect, physNatureSelect, specNatureSelect].forEach(select => {
  if (select) {
    select.addEventListener('change', () => {
      resetDefenderCalculated();
      updateAllStats();
    });
  }
});

// Initialize selections
setupSearch('def-search', 'def-types', 'def-stats-rows', 'def', 'def-nature', (name) => { selectedDef = name; });
setupSearch('phys-search', 'phys-types', 'phys-stats-rows', 'phys', 'phys-nature', (name) => { selectedPhys = name; });
setupSearch('spec-search', 'spec-types', 'spec-stats-rows', 'spec', 'spec-nature', (name) => { selectedSpec = name; });

// Load Default Pokemon Details
const defSearchEl = document.getElementById('def-search') as HTMLInputElement | null;
const physSearchEl = document.getElementById('phys-search') as HTMLInputElement | null;
const specSearchEl = document.getElementById('spec-search') as HTMLInputElement | null;

if (defSearchEl) defSearchEl.value = selectedDef;
if (physSearchEl) physSearchEl.value = selectedPhys;
if (specSearchEl) specSearchEl.value = selectedSpec;

updateTypeBadges('def-types', selectedDef);
updateTypeBadges('phys-types', selectedPhys);
updateTypeBadges('spec-types', selectedSpec);

createStatsRows(selectedDef, 'def-stats-rows', true);
createStatsRows(selectedPhys, 'phys-stats-rows', false);
createStatsRows(selectedSpec, 'spec-stats-rows', false);

updateAllStats();

// ─── SOLVERS & OPTIMIZERS ───────────────────────────────────────────────────

// Physical Bulk Optimizer
const calcPhysBtn = document.getElementById('btn-calc-physical');
if (calcPhysBtn) {
  calcPhysBtn.addEventListener('click', () => {
    const defUser = getUserPoints('def');
    const totalUser = Object.values(defUser).reduce((a, b) => a + b, 0);
    if (totalUser > 66) return;

    const leftovers = 66 - totalUser;
    const maxHPAlloc = 32 - defUser.hp;
    const maxDefAlloc = 32 - defUser.df;
    const pointsToAllocate = Math.min(leftovers, maxHPAlloc + maxDefAlloc);

    // Fetch physical attacker attack final stat
    const physUser = getUserPoints('phys');
    const physNature = (document.getElementById('phys-nature') as HTMLSelectElement).value;
    const physBuild = new PokemonBuild(physUser, physNature);
    const physStats = calculateFinalStats(selectedPhys, physBuild);
    const physAtk = physStats.at;
    const physPowerInput = document.getElementById('phys-power') as HTMLInputElement | null;
    const physPower = parseInt(physPowerInput?.value || '0') || 0;

    const defNature = (document.getElementById('def-nature') as HTMLSelectElement).value;

    let bestHP = 0;
    let bestDef = 0;
    let minFraction = Infinity;
    let bestDmg = 0;
    let bestFinalHP = 0;

    // Iterate over all possible additions
    for (let cHP = 0; cHP <= pointsToAllocate; cHP++) {
      const cDef = pointsToAllocate - cHP;
      if (cHP <= maxHPAlloc && cDef <= maxDefAlloc) {
        const tempPts: BaseStats = { ...defUser };
        tempPts.hp += cHP;
        tempPts.df += cDef;

        const finalStats = calculateFinalStats(selectedDef, new PokemonBuild(tempPts, defNature));
        const currentHP = finalStats.hp;
        const currentDef = finalStats.df;

        const dmg = calculateDamage(physPower, physAtk, currentDef);
        const fraction = dmg / currentHP;

        if (fraction < minFraction) {
          minFraction = fraction;
          bestHP = cHP;
          bestDef = cDef;
          bestDmg = dmg;
          bestFinalHP = currentHP;
        }
      }
    }

    // Save results
    defCalculatedAdditions = { hp: bestHP, at: 0, df: bestDef, sa: 0, sd: 0, sp: 0 };
    displayResults('PHYSICAL', bestHP, bestDef, 0, bestDmg, null, minFraction, bestFinalHP);
  });
}

// Special Bulk Optimizer
const calcSpecBtn = document.getElementById('btn-calc-special');
if (calcSpecBtn) {
  calcSpecBtn.addEventListener('click', () => {
    const defUser = getUserPoints('def');
    const totalUser = Object.values(defUser).reduce((a, b) => a + b, 0);
    if (totalUser > 66) return;

    const leftovers = 66 - totalUser;
    const maxHPAlloc = 32 - defUser.hp;
    const maxSpDAlloc = 32 - defUser.sd;
    const pointsToAllocate = Math.min(leftovers, maxHPAlloc + maxSpDAlloc);

    // Fetch special attacker SpA final stat
    const specUser = getUserPoints('spec');
    const specNature = (document.getElementById('spec-nature') as HTMLSelectElement).value;
    const specBuild = new PokemonBuild(specUser, specNature);
    const specStats = calculateFinalStats(selectedSpec, specBuild);
    const specSpA = specStats.sa;
    const specPowerInput = document.getElementById('spec-power') as HTMLInputElement | null;
    const specPower = parseInt(specPowerInput?.value || '0') || 0;

    const defNature = (document.getElementById('def-nature') as HTMLSelectElement).value;

    let bestHP = 0;
    let bestSpD = 0;
    let minFraction = Infinity;
    let bestDmg = 0;
    let bestFinalHP = 0;

    // Iterate over all possible additions
    for (let cHP = 0; cHP <= pointsToAllocate; cHP++) {
      const cSpD = pointsToAllocate - cHP;
      if (cHP <= maxHPAlloc && cSpD <= maxSpDAlloc) {
        const tempPts: BaseStats = { ...defUser };
        tempPts.hp += cHP;
        tempPts.sd += cSpD;

        const finalStats = calculateFinalStats(selectedDef, new PokemonBuild(tempPts, defNature));
        const currentHP = finalStats.hp;
        const currentSpD = finalStats.sd;

        const dmg = calculateDamage(specPower, specSpA, currentSpD);
        const fraction = dmg / currentHP;

        if (fraction < minFraction) {
          minFraction = fraction;
          bestHP = cHP;
          bestSpD = cSpD;
          bestDmg = dmg;
          bestFinalHP = currentHP;
        }
      }
    }

    // Save results
    defCalculatedAdditions = { hp: bestHP, at: 0, df: 0, sa: 0, sd: bestSpD, sp: 0 };
    displayResults('SPECIAL', bestHP, 0, bestSpD, null, bestDmg, minFraction, bestFinalHP);
  });
}

// Mixed Bulk Optimizer
const calcMixBtn = document.getElementById('btn-calc-mixed');
if (calcMixBtn) {
  calcMixBtn.addEventListener('click', () => {
    const defUser = getUserPoints('def');
    const totalUser = Object.values(defUser).reduce((a, b) => a + b, 0);
    if (totalUser > 66) return;

    const leftovers = 66 - totalUser;
    const maxHPAlloc = 32 - defUser.hp;
    const maxDefAlloc = 32 - defUser.df;
    const maxSpDAlloc = 32 - defUser.sd;
    const pointsToAllocate = Math.min(leftovers, maxHPAlloc + maxDefAlloc + maxSpDAlloc);

    // Attacker Stats
    const physUser = getUserPoints('phys');
    const physNature = (document.getElementById('phys-nature') as HTMLSelectElement).value;
    const physBuild = new PokemonBuild(physUser, physNature);
    const physStats = calculateFinalStats(selectedPhys, physBuild);
    const physAtk = physStats.at;
    const physPowerInput = document.getElementById('phys-power') as HTMLInputElement | null;
    const physPower = parseInt(physPowerInput?.value || '0') || 0;

    const specUser = getUserPoints('spec');
    const specNature = (document.getElementById('spec-nature') as HTMLSelectElement).value;
    const specBuild = new PokemonBuild(specUser, specNature);
    const specStats = calculateFinalStats(selectedSpec, specBuild);
    const specSpA = specStats.sa;
    const specPowerInput = document.getElementById('spec-power') as HTMLInputElement | null;
    const specPower = parseInt(specPowerInput?.value || '0') || 0;

    const defNature = (document.getElementById('def-nature') as HTMLSelectElement).value;

    let bestHP = 0;
    let bestDef = 0;
    let bestSpD = 0;
    let minFraction = Infinity;
    let bestPhysDmg = 0;
    let bestSpecDmg = 0;
    let bestFinalHP = 0;

    // Iterate HP, Def, and SpD allocations
    for (let cHP = 0; cHP <= pointsToAllocate; cHP++) {
      if (cHP > maxHPAlloc) continue;
      for (let cDef = 0; cDef <= pointsToAllocate - cHP; cDef++) {
        if (cDef > maxDefAlloc) continue;
        const cSpD = pointsToAllocate - cHP - cDef;
        if (cSpD > maxSpDAlloc) continue;

        const tempPts: BaseStats = { ...defUser };
        tempPts.hp += cHP;
        tempPts.df += cDef;
        tempPts.sd += cSpD;

        const finalStats = calculateFinalStats(selectedDef, new PokemonBuild(tempPts, defNature));
        const currentHP = finalStats.hp;
        const currentDef = finalStats.df;
        const currentSpD = finalStats.sd;

        const physDmg = calculateDamage(physPower, physAtk, currentDef);
        const specDmg = calculateDamage(specPower, specSpA, currentSpD);
        const fraction = (physDmg + specDmg) / currentHP;

        if (fraction < minFraction) {
          minFraction = fraction;
          bestHP = cHP;
          bestDef = cDef;
          bestSpD = cSpD;
          bestPhysDmg = physDmg;
          bestSpecDmg = specDmg;
          bestFinalHP = currentHP;
        }
      }
    }

    // Save results
    defCalculatedAdditions = { hp: bestHP, at: 0, df: bestDef, sa: 0, sd: bestSpD, sp: 0 };
    displayResults('MIXED', bestHP, bestDef, bestSpD, bestPhysDmg, bestSpecDmg, minFraction, bestFinalHP);
  });
}

// Displays the results of the solver in the UI
function displayResults(
  mode: 'PHYSICAL' | 'SPECIAL' | 'MIXED',
  hpAdd: number,
  defAdd: number,
  spdAdd: number,
  physDmg: number | null,
  specDmg: number | null,
  fraction: number,
  finalHP: number
): void {
  // Update table Calculated Points Column
  const setCalcText = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setCalcText('def-calc-hp', hpAdd > 0 ? `+${hpAdd}` : '0');
  setCalcText('def-calc-at', '0');
  setCalcText('def-calc-df', defAdd > 0 ? `+${defAdd}` : '0');
  setCalcText('def-calc-sa', '0');
  setCalcText('def-calc-sd', spdAdd > 0 ? `+${spdAdd}` : '0');
  setCalcText('def-calc-sp', '0');

  // Light up the calculated stats
  const keys: StatName[] = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
  keys.forEach(k => {
    const el = document.getElementById(`def-calc-${k}`);
    if (el) {
      const val = parseInt(el.textContent || '0') || 0;
      if (val > 0) {
        el.style.color = '#4dff4d';
        el.style.textShadow = '0 0 8px rgba(77, 255, 77, 0.4)';
      } else {
        el.style.color = '#9aa0a6';
        el.style.textShadow = 'none';
      }
    }
  });

  // Update final stats column
  updateAllStats();

  // Populate Results Card
  const panel = document.getElementById('results-panel');
  if (panel) {
    panel.style.display = 'flex';
  }

  const badgeEl = document.getElementById('results-type-badge');
  if (badgeEl) badgeEl.textContent = mode;

  const ptsEl = document.getElementById('res-pts');
  if (ptsEl) ptsEl.textContent = `+${hpAdd} HP / +${defAdd} Def / +${spdAdd} SpD`;

  const fracEl = document.getElementById('res-fraction');
  if (fracEl) fracEl.textContent = `${(fraction * 100).toFixed(2)}%`;

  const physContainer = document.getElementById('res-damage-phys-container');
  const specContainer = document.getElementById('res-damage-spec-container');
  const resDmgPhys = document.getElementById('res-dmg-phys');
  const resDmgSpec = document.getElementById('res-dmg-spec');

  if (mode === 'PHYSICAL') {
    if (physContainer) physContainer.style.display = 'block';
    if (specContainer) specContainer.style.display = 'none';
    if (resDmgPhys) resDmgPhys.textContent = `${physDmg} / ${finalHP} HP`;
  } else if (mode === 'SPECIAL') {
    if (physContainer) physContainer.style.display = 'none';
    if (specContainer) specContainer.style.display = 'block';
    if (resDmgSpec) resDmgSpec.textContent = `${specDmg} / ${finalHP} HP`;
  } else {
    if (physContainer) physContainer.style.display = 'block';
    if (specContainer) specContainer.style.display = 'block';
    if (resDmgPhys) resDmgPhys.textContent = `${physDmg} / ${finalHP} HP`;
    if (resDmgSpec) resDmgSpec.textContent = `${specDmg} / ${finalHP} HP`;
  }

  // Scroll panel into view smoothly
  if (panel) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
