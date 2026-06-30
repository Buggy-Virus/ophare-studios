import { POKEMON_DATA } from './pokemon_data.js';

/**
 * Standard Pokémon Natures (Alignments) and their stat multipliers.
 * A boosted stat receives a 1.1x multiplier, while a reduced stat receives a 0.9x multiplier.
 */
const NATURE_EFFECTS = {
  Hardy:   { at: 1.0, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.0 },
  Lonely:  { at: 1.1, df: 0.9, sa: 1.0, sd: 1.0, sp: 1.0 },
  Brave:   { at: 1.1, df: 1.0, sa: 1.0, sd: 1.0, sp: 0.9 },
  Adamant: { at: 1.1, df: 1.0, sa: 0.9, sd: 1.0, sp: 1.0 },
  Naughty: { at: 1.1, df: 1.0, sa: 1.0, sd: 0.9, sp: 1.0 },
  Bold:    { at: 0.9, df: 1.1, sa: 1.0, sd: 1.0, sp: 1.0 },
  Docile:  { at: 1.0, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.0 },
  Relaxed: { at: 1.0, df: 1.1, sa: 1.0, sd: 1.0, sp: 0.9 },
  Impish:  { at: 1.0, df: 1.1, sa: 0.9, sd: 1.0, sp: 1.0 },
  Lax:     { at: 1.0, df: 1.1, sa: 1.0, sd: 0.9, sp: 1.0 },
  Timid:   { at: 0.9, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.1 },
  Hasty:   { at: 1.0, df: 0.9, sa: 1.0, sd: 1.0, sp: 1.1 },
  Serious: { at: 1.0, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.0 },
  Jolly:   { at: 1.0, df: 1.0, sa: 0.9, sd: 1.0, sp: 1.1 },
  Naive:   { at: 1.0, df: 1.0, sa: 1.0, sd: 0.9, sp: 1.1 },
  Modest:  { at: 0.9, df: 1.0, sa: 1.1, sd: 1.0, sp: 1.0 },
  Mild:    { at: 1.0, df: 0.9, sa: 1.1, sd: 1.0, sp: 1.0 },
  Quiet:   { at: 1.0, df: 1.0, sa: 1.1, sd: 1.0, sp: 0.9 },
  Bashful: { at: 1.0, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.0 },
  Rash:    { at: 1.0, df: 1.0, sa: 1.1, sd: 0.9, sp: 1.0 },
  Calm:    { at: 0.9, df: 1.0, sa: 1.0, sd: 1.1, sp: 1.0 },
  Gentle:  { at: 1.0, df: 0.9, sa: 1.0, sd: 1.1, sp: 1.0 },
  Sassy:   { at: 1.0, df: 1.0, sa: 1.0, sd: 1.1, sp: 0.9 },
  Careful: { at: 1.0, df: 1.0, sa: 0.9, sd: 1.1, sp: 1.0 },
  Quirky:  { at: 1.0, df: 1.0, sa: 1.0, sd: 1.0, sp: 1.0 }
};

/**
 * Class representing a Pokemon's training configuration.
 * Stores stat points (EVs) for each stat type and an alignment (nature).
 */
class PokemonBuild {
  /**
   * @param {Object} [statPoints] - Stat points for each stat type (default 0).
   * @param {number} [statPoints.hp]
   * @param {number} [statPoints.at]
   * @param {number} [statPoints.df]
   * @param {number} [statPoints.sa]
   * @param {number} [statPoints.sd]
   * @param {number} [statPoints.sp]
   * @param {string|Object|number} [alignment] - Nature name (e.g., 'Jolly'), custom multiplier object, or flat number.
   */
  constructor(statPoints = {}, alignment = 'Neutral') {
    this.statPoints = {
      hp: statPoints.hp || 0,
      at: statPoints.at || 0,
      df: statPoints.df || 0,
      sa: statPoints.sa || 0,
      sd: statPoints.sd || 0,
      sp: statPoints.sp || 0
    };
    this.alignment = alignment;
  }
}

/**
 * Resolves the alignment multiplier for a given stat.
 * @param {string|Object|number} alignment - Nature name, custom effects mapping, or flat numeric multiplier.
 * @param {string} statName - One of: 'at', 'df', 'sa', 'sd', 'sp'
 * @returns {number} The multiplier (typically 1.1, 1.0, or 0.9).
 */
function getAlignmentMultiplier(alignment, statName) {
  if (alignment === null || alignment === undefined) return 1.0;
  if (typeof alignment === 'number') return alignment;
  
  if (typeof alignment === 'string') {
    // Normalise casing (e.g. "jolly" -> "Jolly")
    const formatted = alignment.charAt(0).toUpperCase() + alignment.slice(1).toLowerCase();
    const nature = NATURE_EFFECTS[formatted];
    if (nature && nature[statName] !== undefined) {
      return nature[statName];
    }
    return 1.0;
  }
  
  if (typeof alignment === 'object') {
    return alignment[statName] !== undefined ? alignment[statName] : 1.0;
  }
  
  return 1.0;
}

/**
 * Calculates the final stats of a fetched Pokemon based on its training configuration.
 * 
 * Formulas:
 *   HP = HP_BASE + HP_STATPOINTS + 75
 *   OTHERSTAT = Math.floor((OTHERSTAT_BASE + OTHERSTAT_STATPOINTS + 20) * ALIGNMENT)
 * 
 * @param {string|Object} pokemon - Either the string name of a Pokemon in POKEMON_DATA, or an object containing the base stats.
 * @param {PokemonBuild|Object} build - PokemonBuild instance or object with statPoints and alignment.
 * @returns {Object} Calculated final stats.
 */
function calculateFinalStats(pokemon, build) {
  // 1. Resolve base stats
  let baseStats = null;
  if (typeof pokemon === 'string') {
    const data = POKEMON_DATA[pokemon];
    if (!data) {
      throw new Error(`Pokemon "${pokemon}" not found in dataset.`);
    }
    baseStats = data.bs;
  } else if (pokemon && typeof pokemon === 'object') {
    baseStats = pokemon.bs || pokemon.baseStats || pokemon.stats || pokemon;
  }

  if (!baseStats) {
    throw new Error('Invalid base stats structure provided.');
  }

  // 2. Resolve build configuration
  const statPoints = (build && build.statPoints) || build || {};
  const alignment = (build && build.alignment) !== undefined ? build.alignment : 'Neutral';

  // 3. Perform calculations
  return {
    hp: (baseStats.hp || 0) + (statPoints.hp || 0) + 75,
    at: Math.floor(((baseStats.at || 0) + (statPoints.at || 0) + 20) * getAlignmentMultiplier(alignment, 'at')),
    df: Math.floor(((baseStats.df || 0) + (statPoints.df || 0) + 20) * getAlignmentMultiplier(alignment, 'df')),
    sa: Math.floor(((baseStats.sa || 0) + (statPoints.sa || 0) + 20) * getAlignmentMultiplier(alignment, 'sa')),
    sd: Math.floor(((baseStats.sd || 0) + (statPoints.sd || 0) + 20) * getAlignmentMultiplier(alignment, 'sd')),
    sp: Math.floor(((baseStats.sp || 0) + (statPoints.sp || 0) + 20) * getAlignmentMultiplier(alignment, 'sp'))
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  NATURE_EFFECTS,
  PokemonBuild,
  getAlignmentMultiplier,
  calculateFinalStats
};

// Expose to window global if in browser context
if (typeof window !== 'undefined') {
  window.PokemonUtils = {
    NATURE_EFFECTS,
    PokemonBuild,
    getAlignmentMultiplier,
    calculateFinalStats
  };
}
