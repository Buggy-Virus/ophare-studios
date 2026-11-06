import { POKEMON_DATA } from './pokemon_data.js';
import { calculateFinalStats, PokemonBuild } from './pokemon_utils.js';

interface PokemonSpeedSummary {
  base: number;
  dex: number;
}

interface Breakpoints {
  dnat: number;
  base: number;
  EV: number;
  Nat: number;
  scarf: number;
  Max: number;
}

// Populate base stats mapping dynamically from POKEMON_DATA
const pokemonData: Record<string, PokemonSpeedSummary> = {};
Object.entries(POKEMON_DATA).forEach(([name, data]) => {
  pokemonData[name] = {
    base: data.bs.sp,
    dex: data.num || 0
  };
});

// Speed Stat Calculations utilizing the formula inside PokemonUtils
function calculateBreakpoints(input: string | number): Breakpoints {
  let name = input;
  if (typeof input === 'number') {
    // Lookup name by base speed mapping if passed as number
    const foundName = Object.keys(pokemonData).find(k => pokemonData[k].base === input);
    if (foundName) {
      name = foundName;
    } else {
      // Fallback to manual formula if name mapping fails
      const B = input;
      const dnat = calculateFinalStats({ sp: B }, new PokemonBuild({ sp: 0 }, 'Brave')).sp;
      const base = calculateFinalStats({ sp: B }, new PokemonBuild({ sp: 0 }, 'Neutral')).sp;
      const EV = calculateFinalStats({ sp: B }, new PokemonBuild({ sp: 32 }, 'Neutral')).sp;
      const Nat = calculateFinalStats({ sp: B }, new PokemonBuild({ sp: 32 }, 'Timid')).sp;
      const scarf = Math.floor(EV * 1.5);
      const Max = Math.floor(Nat * 1.5);
      return { dnat, base, EV, Nat, scarf, Max };
    }
  }

  const dnat = calculateFinalStats(name as string, new PokemonBuild({ sp: 0 }, 'Brave')).sp;
  const base = calculateFinalStats(name as string, new PokemonBuild({ sp: 0 }, 'Neutral')).sp;
  const EV = calculateFinalStats(name as string, new PokemonBuild({ sp: 32 }, 'Neutral')).sp;
  const Nat = calculateFinalStats(name as string, new PokemonBuild({ sp: 32 }, 'Timid')).sp;
  const scarf = Math.floor(EV * 1.5);
  const Max = Math.floor(Nat * 1.5);
  return { dnat, base, EV, Nat, scarf, Max };
}

// Format set name keys for visual display
function formatSetKey(setKey: string): string {
  if (setKey === 'reg-m-a') return 'Regulation M-A';
  if (setKey === 'reg-m-b') return 'Regulation M-B';
  if (setKey.startsWith('gen')) {
    return 'Generation ' + setKey.substring(3);
  }
  if (setKey === 'none') return 'None';
  if (setKey === 'temporary') return 'Temporary Set';
  return setKey.charAt(0).toUpperCase() + setKey.slice(1);
}

// State
let currentSet = "reg-m-a";
let visiblePokemon: string[] = [];
const customSets: Record<string, string[]> = {
  'none': []
};

// Populate selectable default sets dynamically from pokemon_data.js
Object.entries(POKEMON_DATA).forEach(([name, data]) => {
  data.sets.forEach(setTag => {
    if (!customSets[setTag]) {
      customSets[setTag] = [];
    }
    customSets[setTag].push(name);
  });
});

// Initialize visible list to default set
visiblePokemon = [...(customSets[currentSet] || [])];

let isEditing = false;
let activeCustomSet: string | null = null;
let editVisiblePokemon: string[] = []; // Pokemon shown in edit mode
let editMinSpeed: number | null = null;
let editMaxSpeed: number | null = null;
let currentSort = "speed_desc"; // Default sort

// UI Elements
const listContainer = document.getElementById('pokemon-list') as HTMLDivElement;
const axisContainer = document.getElementById('speed-axis') as HTMLDivElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const createCustomSetBtn = document.getElementById('create-custom-set') as HTMLButtonElement;
const editCustomSetBtn = document.getElementById('edit-custom-set') as HTMLButtonElement;
const suggestionsList = document.getElementById('pokemon-suggestions') as HTMLElement;
const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

// Custom Dropdown Elements
const dropdownBtn = document.getElementById('dropdown-btn') as HTMLButtonElement;
const dropdownContent = document.getElementById('dropdown-content') as HTMLDivElement;

// Populate suggestions
if (suggestionsList) {
  Object.keys(pokemonData).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    suggestionsList.appendChild(opt);
  });
}

// Custom Dropdown Logic
function populateDropdown(): void {
  if (!dropdownContent) return;
  dropdownContent.innerHTML = '';
  const sets = Object.keys(customSets);

  sets.forEach(setKey => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.onclick = () => selectSet(setKey);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = formatSetKey(setKey);
    item.appendChild(nameSpan);

    const btnDiv = document.createElement('div');
    btnDiv.className = 'dropdown-item-buttons';

    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    plusBtn.onclick = (e) => { e.stopPropagation(); unionSet(setKey); };
    btnDiv.appendChild(plusBtn);

    const minusBtn = document.createElement('button');
    minusBtn.textContent = '-';
    minusBtn.onclick = (e) => { e.stopPropagation(); differenceSet(setKey); };
    btnDiv.appendChild(minusBtn);

    item.appendChild(btnDiv);
    dropdownContent.appendChild(item);
  });
}

function selectSet(setKey: string): void {
  currentSet = setKey;
  isEditing = false;
  if (customSets[setKey]) {
    visiblePokemon = [...customSets[setKey]];
  }
  if (dropdownBtn) {
    dropdownBtn.textContent = `Select Set: ${formatSetKey(setKey)}`;
  }
  if (dropdownContent) {
    dropdownContent.classList.remove('show');
  }
  render();
}

function unionSet(setKey: string): void {
  const setToAdd = customSets[setKey] || [];
  visiblePokemon = [...new Set([...visiblePokemon, ...setToAdd])];
  switchToTemporary();
  render();
}

function differenceSet(setKey: string): void {
  const setToRemove = customSets[setKey] || [];
  visiblePokemon = visiblePokemon.filter(p => !setToRemove.includes(p));
  switchToTemporary();
  render();
}

if (dropdownBtn) {
  dropdownBtn.onclick = () => {
    populateDropdown();
    if (dropdownContent) {
      dropdownContent.classList.toggle('show');
    }
  };
}

// Close dropdown when clicking outside
window.addEventListener('click', (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target || !target.matches('.dropdown-btn')) {
    if (dropdownContent && dropdownContent.classList.contains('show')) {
      dropdownContent.classList.remove('show');
    }
  }
});

function render(): void {
  if (!listContainer || !axisContainer) return;

  // 1. Determine which Pokemon to show
  let pokemonToShow: string[] = [];
  if (isEditing && activeCustomSet) {
    pokemonToShow = editVisiblePokemon;
  } else if (customSets[currentSet]) {
    pokemonToShow = customSets[currentSet];
  } else if (currentSet === 'temporary') {
    pokemonToShow = visiblePokemon;
  }

  // 2. Calculate and Sort
  const calculatedData: Record<string, Breakpoints> = {};
  pokemonToShow.forEach(name => {
    calculatedData[name] = calculateBreakpoints(name);
  });

  // Sorting
  pokemonToShow.sort((a, b) => {
    if (currentSort === 'name_asc') return a.localeCompare(b);
    if (currentSort === 'name_desc') return b.localeCompare(a);

    const speedA = pokemonData[a]?.base ?? 0;
    const speedB = pokemonData[b]?.base ?? 0;
    if (currentSort === 'speed_desc') return speedB - speedA;
    if (currentSort === 'speed_asc') return speedA - speedB;

    const dexA = pokemonData[a]?.dex || 0;
    const dexB = pokemonData[b]?.dex || 0;
    if (currentSort === 'dex_asc') {
      if (dexA !== dexB) return dexA - dexB;
      return speedB - speedA; // Fallback to speed desc
    }
    if (currentSort === 'dex_desc') {
      if (dexA !== dexB) return dexB - dexA;
      return speedB - speedA; // Fallback to speed desc
    }
    return 0;
  });

  // 3. Calculate global min/max to scale axis
  let minSpeed = Infinity;
  let maxSpeed = -Infinity;

  pokemonToShow.forEach(name => {
    const breakpoints = calculatedData[name];
    if (breakpoints && (!isEditing || (isEditing && activeCustomSet && customSets[activeCustomSet]?.includes(name)))) {
      minSpeed = Math.min(minSpeed, breakpoints.dnat);
      maxSpeed = Math.max(maxSpeed, breakpoints.Max);
    }
  });

  if (isEditing && editMinSpeed !== null && editMaxSpeed !== null) {
    minSpeed = editMinSpeed;
    maxSpeed = editMaxSpeed;
  } else if (minSpeed === Infinity) {
    minSpeed = 0;
    maxSpeed = 100;
  }

  const range = maxSpeed - minSpeed;
  const getPct = (val: number) => ((val - minSpeed) / (range || 1)) * 100;

  // 4. Render Axis
  axisContainer.innerHTML = '';
  const allBreakpoints = new Set<number>();
  const axisPokemonSource = (isEditing && activeCustomSet) ? editVisiblePokemon : pokemonToShow;

  axisPokemonSource.forEach(name => {
    if (!isEditing || (isEditing && activeCustomSet && customSets[activeCustomSet]?.includes(name))) {
      const bp = calculatedData[name] || calculateBreakpoints(name);
      if (bp) {
        Object.values(bp).forEach(v => allBreakpoints.add(v));
      }
    }
  });
  const sortedBreakpoints = Array.from(allBreakpoints).sort((a, b) => a - b);

  sortedBreakpoints.forEach(val => {
    const pct = getPct(val);
    if (pct >= 0 && pct <= 100) {
      const point = document.createElement('div');
      point.className = 'axis-point';
      point.style.left = `${pct}%`;
      axisContainer.appendChild(point);
    }
  });

  // 5. Render Rows
  listContainer.innerHTML = '';
  pokemonToShow.forEach(name => {
    const bp = calculatedData[name] || calculateBreakpoints(name);
    if (!bp) return;
    const row = document.createElement('div');
    row.className = 'pokemon-row';

    let isInSet = true;
    if (isEditing && activeCustomSet) {
      isInSet = customSets[activeCustomSet]?.includes(name) ?? false;
      if (!isInSet) {
        row.classList.add('greyed-out');
      }
      row.style.cursor = 'pointer';
      row.onclick = () => togglePokemonInCustomSet(name);
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'pokemon-name';

    const dexSpan = document.createElement('span');
    dexSpan.className = 'dex-num';
    dexSpan.textContent = pokemonData[name] && pokemonData[name].dex ? `#${pokemonData[name].dex}` : '#?';
    nameDiv.appendChild(dexSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'poke-name-text';
    textSpan.textContent = name;
    nameDiv.appendChild(textSpan);

    if (!isEditing) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '-';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removePokemon(name);
      };
      nameDiv.appendChild(removeBtn);
    }

    row.appendChild(nameDiv);

    const visDiv = document.createElement('div');
    visDiv.className = 'visualization';

    const localMin = bp.dnat;
    const localMax = bp.Max;
    const lineLeft = getPct(localMin);
    const lineWidth = getPct(localMax) - lineLeft;

    const line = document.createElement('div');
    line.className = 'range-line';
    line.style.left = `${lineLeft}%`;
    line.style.width = `${lineWidth}%`;
    visDiv.appendChild(line);

    const types: (keyof Breakpoints)[] = ['dnat', 'base', 'EV', 'Nat', 'scarf', 'Max'];
    types.forEach(type => {
      const val = bp[type];
      const pct = getPct(val);
      const circle = document.createElement('div');
      circle.className = `circle breakpoint-circle ${type}`;
      circle.style.left = `${pct}%`;
      circle.textContent = String(val);
      visDiv.appendChild(circle);
    });

    row.appendChild(visDiv);
    listContainer.appendChild(row);
  });

  // Update buttons
  if (isEditing) {
    if (createCustomSetBtn) createCustomSetBtn.style.display = 'none';
    if (editCustomSetBtn) {
      editCustomSetBtn.textContent = 'Done';
      editCustomSetBtn.style.display = 'inline-block';
    }
  } else {
    if (createCustomSetBtn) createCustomSetBtn.style.display = 'inline-block';
    if (editCustomSetBtn) {
      if (currentSet !== 'temporary' && currentSet !== 'none') {
        editCustomSetBtn.style.display = 'inline-block';
        editCustomSetBtn.textContent = 'Edit Set';
      } else {
        editCustomSetBtn.style.display = 'none';
      }
    }
  }
}

function removePokemon(name: string): void {
  if (!listContainer) return;
  const row = Array.from(listContainer.children).find(r => {
    const textEl = r.querySelector('.poke-name-text');
    return textEl && textEl.textContent === name;
  });
  if (row) {
    row.classList.add('removing');
    setTimeout(() => {
      visiblePokemon = visiblePokemon.filter(n => n !== name);
      switchToTemporary();
      render();
    }, 300);
  }
}

function switchToTemporary(): void {
  if (currentSet !== 'temporary') {
    currentSet = 'temporary';
    if (dropdownBtn) {
      dropdownBtn.textContent = 'Select Set: Temporary Set';
    }
  }
}

function togglePokemonInCustomSet(name: string): void {
  if (!activeCustomSet) return;
  const set = customSets[activeCustomSet];
  if (!set) return;
  const index = set.indexOf(name);
  if (index > -1) {
    set.splice(index, 1);
  } else {
    set.push(name);
  }
  render();
}

// Event Listeners
if (createCustomSetBtn) {
  createCustomSetBtn.onclick = () => {
    const setName = prompt("Enter custom set name:");
    if (setName && !customSets[setName]) {
      customSets[setName] = [...visiblePokemon];
      currentSet = setName;
      activeCustomSet = setName;
      isEditing = true;
      editVisiblePokemon = [...visiblePokemon];
      if (dropdownBtn) {
        dropdownBtn.textContent = `Select Set: ${setName}`;
      }

      // Freeze axis
      const currentBreakpoints: number[] = [];
      visiblePokemon.forEach(n => {
        const bp = calculateBreakpoints(n);
        if (bp) {
          currentBreakpoints.push(bp.dnat, bp.Max);
        }
      });
      if (currentBreakpoints.length > 0) {
        editMinSpeed = Math.min(...currentBreakpoints);
        editMaxSpeed = Math.max(...currentBreakpoints);
      } else {
        editMinSpeed = 0;
        editMaxSpeed = 100;
      }

      render();
    }
  };
}

if (editCustomSetBtn) {
  editCustomSetBtn.onclick = () => {
    if (isEditing) {
      isEditing = false;
      if (activeCustomSet && customSets[activeCustomSet]) {
        visiblePokemon = [...customSets[activeCustomSet]];
      }
      editMinSpeed = null;
      editMaxSpeed = null;
      render();
    } else {
      activeCustomSet = currentSet;
      isEditing = true;
      editVisiblePokemon = [...visiblePokemon];

      // Freeze axis
      const currentBreakpoints: number[] = [];
      visiblePokemon.forEach(n => {
        const bp = calculateBreakpoints(n);
        if (bp) {
          currentBreakpoints.push(bp.dnat, bp.Max);
        }
      });
      if (currentBreakpoints.length > 0) {
        editMinSpeed = Math.min(...currentBreakpoints);
        editMaxSpeed = Math.max(...currentBreakpoints);
      } else {
        editMinSpeed = 0;
        editMaxSpeed = 100;
      }

      render();
    }
  };
}

if (searchInput) {
  searchInput.onkeypress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const name = searchInput.value.trim();
      const matchedName = Object.keys(pokemonData).find(k => k.toLowerCase() === name.toLowerCase());

      if (matchedName) {
        if (isEditing && activeCustomSet) {
          if (!editVisiblePokemon.includes(matchedName)) {
            editVisiblePokemon.push(matchedName);
          }
          if (customSets[activeCustomSet] && !customSets[activeCustomSet].includes(matchedName)) {
            customSets[activeCustomSet].push(matchedName);
          }
        } else {
          if (!visiblePokemon.includes(matchedName)) {
            visiblePokemon.push(matchedName);
            switchToTemporary();
          }
        }
        searchInput.value = '';
        render();
      } else {
        alert("Pokemon not found in dataset.");
      }
    }
  };
}

if (sortSelect) {
  sortSelect.onchange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    currentSort = target.value;
    render();
  };
}

// Initial render
selectSet('reg-m-b');
