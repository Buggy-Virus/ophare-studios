import { POKEMON_DATA, BaseStats, StatName } from './pokemon_data.js';

export type NatureStatName = 'at' | 'df' | 'sa' | 'sd' | 'sp';

export type NatureMultipliers = Record<NatureStatName, number>;

export type NatureName =
  | 'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty'
  | 'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax'
  | 'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive'
  | 'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash'
  | 'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky';

/**
 * Standard Pokémon Natures (Alignments) and their stat multipliers.
 * A boosted stat receives a 1.1x multiplier, while a reduced stat receives a 0.9x multiplier.
 */
const NATURE_EFFECTS: Record<NatureName, NatureMultipliers> = {
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

export type AlignmentType = string | Partial<NatureMultipliers> | number;

/**
 * Class representing a Pokemon's training configuration.
 * Stores stat points (EVs) for each stat type and an alignment (nature).
 */
class PokemonBuild {
  public statPoints: BaseStats;
  public alignment: AlignmentType;

  constructor(statPoints: Partial<BaseStats> = {}, alignment: AlignmentType = 'Neutral') {
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
 * @param alignment - Nature name, custom effects mapping, or flat numeric multiplier.
 * @param statName - One of: 'at', 'df', 'sa', 'sd', 'sp'
 * @returns The multiplier (typically 1.1, 1.0, or 0.9).
 */
function getAlignmentMultiplier(alignment: AlignmentType | null | undefined, statName: NatureStatName): number {
  if (alignment === null || alignment === undefined) return 1.0;
  if (typeof alignment === 'number') return alignment;

  if (typeof alignment === 'string') {
    // Normalise casing (e.g. "jolly" -> "Jolly")
    const formatted = (alignment.charAt(0).toUpperCase() + alignment.slice(1).toLowerCase()) as NatureName;
    const nature = NATURE_EFFECTS[formatted];
    if (nature && nature[statName] !== undefined) {
      return nature[statName];
    }
    return 1.0;
  }

  if (typeof alignment === 'object') {
    const val = alignment[statName];
    return val !== undefined ? val : 1.0;
  }

  return 1.0;
}

export type BaseStatsInput =
  | string
  | Partial<BaseStats>
  | { bs?: Partial<BaseStats>; baseStats?: Partial<BaseStats>; stats?: Partial<BaseStats> };

export interface FinalStats extends BaseStats {}

/**
 * Calculates the final stats of a fetched Pokemon based on its training configuration.
 *
 * Formulas:
 *   HP = HP_BASE + HP_STATPOINTS + 75
 *   OTHERSTAT = Math.floor((OTHERSTAT_BASE + OTHERSTAT_STATPOINTS + 20) * ALIGNMENT)
 *
 * @param pokemon - Either the string name of a Pokemon in POKEMON_DATA, or an object containing the base stats.
 * @param build - PokemonBuild instance or object with statPoints and alignment.
 * @returns Calculated final stats.
 */
function calculateFinalStats(
  pokemon: BaseStatsInput,
  build?: PokemonBuild | { statPoints?: Partial<BaseStats>; alignment?: AlignmentType } | Partial<BaseStats>
): FinalStats {
  // 1. Resolve base stats
  let baseStats: Partial<BaseStats> | null = null;
  if (typeof pokemon === 'string') {
    const data = POKEMON_DATA[pokemon];
    if (!data) {
      throw new Error(`Pokemon "${pokemon}" not found in dataset.`);
    }
    baseStats = data.bs;
  } else if (pokemon && typeof pokemon === 'object') {
    const obj = pokemon as Record<string, any>;
    baseStats = obj.bs || obj.baseStats || obj.stats || obj;
  }

  if (!baseStats) {
    throw new Error('Invalid base stats structure provided.');
  }

  // 2. Resolve build configuration
  let statPoints: Partial<BaseStats> = {};
  let alignment: AlignmentType = 'Neutral';

  if (build) {
    if (build instanceof PokemonBuild) {
      statPoints = build.statPoints;
      alignment = build.alignment;
    } else if ('statPoints' in build || 'alignment' in build) {
      statPoints = (build as { statPoints?: Partial<BaseStats> }).statPoints || {};
      alignment = (build as { alignment?: AlignmentType }).alignment !== undefined
        ? (build as { alignment?: AlignmentType }).alignment!
        : 'Neutral';
    } else {
      statPoints = build as Partial<BaseStats>;
    }
  }

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

declare global {
  interface Window {
    PokemonUtils?: {
      NATURE_EFFECTS: typeof NATURE_EFFECTS;
      PokemonBuild: typeof PokemonBuild;
      getAlignmentMultiplier: typeof getAlignmentMultiplier;
      calculateFinalStats: typeof calculateFinalStats;
    };
  }
}

// Expose to window global if in browser context
if (typeof window !== 'undefined') {
  window.PokemonUtils = {
    NATURE_EFFECTS,
    PokemonBuild,
    getAlignmentMultiplier,
    calculateFinalStats
  };
}
