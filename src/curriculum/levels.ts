/**
 * Level Definitions
 *
 * Curriculum level configurations for sight-reading progression.
 *
 * @module curriculum/levels
 *
 * Philosophy:
 * - Levels 1-7: C major foundation with interleaved hand practice
 * - Levels 8+: New keys following circle of fifths
 * - Each level has 4 sub-levels (a, b, c, d)
 * - handMode cycles: right → left → both
 */

import type { LevelConfig } from '../core/types';
import { KEYS, getKeyForLevel, stepwisePatterns, triadicPatterns, folkPatterns, classicalPatterns, wideIntervalPatterns } from '../music/generators';

// ============================================
// LEVEL DESCRIPTIONS
// ============================================

/**
 * Human-readable descriptions for each level/sub-level.
 */
export const LEVEL_DESCRIPTIONS: Record<string, string> = {
  // Level 1: Right hand whole notes
  '1a': 'C and G — whole notes (RH)',
  '1b': 'C, E, G triad — whole notes (RH)',
  '1c': 'C through G — whole notes (RH)',
  '1d': 'Stepwise — whole notes (RH)',
  // Level 2: Left hand whole notes
  '2a': 'C and G — whole notes (LH)',
  '2b': 'C, E, G triad — whole notes (LH)',
  '2c': 'C through G — whole notes (LH)',
  '2d': 'Stepwise — whole notes (LH)',
  // Level 3: Both hands whole notes
  '3a': 'Simple coordination — whole notes',
  '3b': 'Triad patterns — whole notes',
  '3c': 'Stepwise — whole notes',
  '3d': 'Full patterns — whole notes',
  // Level 4: Half notes
  '4a': 'Half notes (RH)',
  '4b': 'Half notes (LH)',
  '4c': 'Whole and half notes (RH)',
  '4d': 'Whole and half notes — both hands',
  // Level 5: Quarter notes
  '5a': 'Quarter notes — stepwise (RH)',
  '5b': 'Quarter notes — stepwise (LH)',
  '5c': 'Quarter and half notes (RH)',
  '5d': 'Quarter notes — both hands',
  // Level 6: Rests and 3/4 time
  '6a': 'Quarter rests (RH)',
  '6b': 'Quarter rests (LH)',
  '6c': '3/4 time signature (RH)',
  '6d': '3/4 time — both hands',
  // Level 7: Dotted notes and wider range
  '7a': 'Dotted half notes (RH)',
  '7b': 'Dotted half notes (LH)',
  '7c': 'Wider intervals — 6ths (RH)',
  '7d': 'Full range — both hands',
};

/**
 * Get description for a level/sub-level combination.
 */
export function getLevelDescription(level: number, subLevel: number): string {
  const subLabels = ['a', 'b', 'c', 'd'];
  const key = `${level}${subLabels[subLevel]}`;

  if (LEVEL_DESCRIPTIONS[key]) {
    return LEVEL_DESCRIPTIONS[key];
  }

  // For levels 8+, generate description from key
  if (level >= 8) {
    const keyInfo = getKeyForLevel(level);
    const descriptions = ['whole notes (RH)', 'whole notes (LH)', 'quarter notes (RH)', 'both hands'];
    return `${keyInfo.name} — ${descriptions[subLevel]}`;
  }

  return `Level ${level}${subLabels[subLevel]}`;
}

// ============================================
// SUGGESTED BPM
// ============================================

/**
 * Get suggested BPM for a level.
 */
export function getSuggestedBpm(level: number): number {
  if (level <= 2) return 30;
  if (level <= 4) return 40;
  if (level <= 6) return 50;
  if (level <= 7) return 60;
  if (level >= 8) {
    const keyLevel = level - 7;
    return 40 + keyLevel * 5;
  }
  return 60;
}

// ============================================
// LEVEL CONFIGURATION
// ============================================

/**
 * Get full configuration for a specific level and sub-level.
 */
export function getLevelConfig(
  level: number,
  subLevel: number,
  keyOverride?: string | null
): LevelConfig {
  // Use key override if set, otherwise use level default
  const keyInfo = keyOverride && KEYS[keyOverride] ? KEYS[keyOverride] : getKeyForLevel(level);

  // Default configuration
  const config: LevelConfig = {
    durations: [4],
    restProbability: 0,
    accidentalProbability: 0,
    maxInterval: 2,
    key: keyInfo,
    timeSignature: { beats: 4, beatType: 4 },
    noteRange: [1, 3, 5],
    patterns: stepwisePatterns.slice(0, 3),
    handMode: 'right',
    suggestedBpm: getSuggestedBpm(level),
    chordProbability: 0,
    chordTypes: 'none',
  };

  // Apply level-specific configuration
  applyLevelConfig(config, level, subLevel);

  return config;
}

/**
 * Apply level-specific configuration.
 */
function applyLevelConfig(config: LevelConfig, level: number, subLevel: number): void {
  if (level === 1) {
    applyLevel1(config, subLevel);
  } else if (level === 2) {
    applyLevel2(config, subLevel);
  } else if (level === 3) {
    applyLevel3(config, subLevel);
  } else if (level === 4) {
    applyLevel4(config, subLevel);
  } else if (level === 5) {
    applyLevel5(config, subLevel);
  } else if (level === 6) {
    applyLevel6(config, subLevel);
  } else if (level === 7) {
    applyLevel7(config, subLevel);
  } else if (level >= 8) {
    applyNewKeyLevel(config, level, subLevel);
  }
}

// ============================================
// LEVEL-SPECIFIC CONFIGURATIONS
// ============================================

function applyLevel1(config: LevelConfig, subLevel: number): void {
  config.durations = [4];
  config.restProbability = 0;
  config.maxInterval = 2;
  config.suggestedBpm = 30;
  config.handMode = 'right';

  switch (subLevel) {
    case 0:
      config.noteRange = [1, 5];
      config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
      break;
    case 1:
      config.noteRange = [1, 3, 5];
      config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
      break;
    case 2:
      config.noteRange = [1, 2, 3, 4, 5];
      config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
      break;
    case 3:
      config.noteRange = [1, 2, 3, 4, 5];
      config.patterns = stepwisePatterns;
      break;
  }
}

function applyLevel2(config: LevelConfig, subLevel: number): void {
  config.durations = [4];
  config.restProbability = 0;
  config.maxInterval = 2;
  config.suggestedBpm = 30;
  config.handMode = 'left';

  switch (subLevel) {
    case 0:
      config.noteRange = [1, 5];
      config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
      break;
    case 1:
      config.noteRange = [1, 3, 5];
      config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
      break;
    case 2:
      config.noteRange = [1, 2, 3, 4, 5];
      config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
      break;
    case 3:
      config.noteRange = [1, 2, 3, 4, 5];
      config.patterns = stepwisePatterns;
      break;
  }
}

function applyLevel3(config: LevelConfig, subLevel: number): void {
  config.durations = [4];
  config.restProbability = 0;
  config.maxInterval = 2;
  config.suggestedBpm = 30;
  config.handMode = 'both';
  config.noteRange = [1, 2, 3, 4, 5];

  switch (subLevel) {
    case 0:
      config.patterns = [[1, 5], [5, 1]];
      break;
    case 1:
      config.patterns = triadicPatterns.slice(0, 3);
      break;
    case 2:
      config.patterns = stepwisePatterns.slice(0, 5);
      break;
    case 3:
      config.patterns = [...stepwisePatterns, ...triadicPatterns];
      break;
  }
}

function applyLevel4(config: LevelConfig, subLevel: number): void {
  config.noteRange = [1, 2, 3, 4, 5];
  config.suggestedBpm = 30;

  switch (subLevel) {
    case 0:
      config.handMode = 'right';
      config.durations = [2];
      config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
      break;
    case 1:
      config.handMode = 'left';
      config.durations = [2];
      config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
      break;
    case 2:
      config.handMode = 'right';
      config.durations = [4, 2];
      config.patterns = [...stepwisePatterns.slice(0, 5), ...triadicPatterns.slice(0, 3)];
      break;
    case 3:
      config.handMode = 'both';
      config.durations = [4, 2];
      config.patterns = [...stepwisePatterns, ...triadicPatterns];
      break;
  }
}

function applyLevel5(config: LevelConfig, subLevel: number): void {
  config.noteRange = [1, 2, 3, 4, 5, 6];
  config.suggestedBpm = 40;

  switch (subLevel) {
    case 0:
      config.handMode = 'right';
      config.durations = [1];
      config.maxInterval = 1;
      config.patterns = stepwisePatterns;
      break;
    case 1:
      config.handMode = 'left';
      config.durations = [1];
      config.maxInterval = 1;
      config.patterns = stepwisePatterns;
      break;
    case 2:
      config.handMode = 'right';
      config.durations = [1, 2];
      config.patterns = [...folkPatterns.slice(0, 3)];
      break;
    case 3:
      config.handMode = 'both';
      config.durations = [1, 2];
      config.patterns = [...folkPatterns.slice(0, 5)];
      break;
  }
}

function applyLevel6(config: LevelConfig, subLevel: number): void {
  config.noteRange = [1, 2, 3, 4, 5, 6];
  config.durations = [1, 2];
  config.suggestedBpm = 40;

  switch (subLevel) {
    case 0:
      config.handMode = 'right';
      config.restProbability = 0.15;
      config.patterns = stepwisePatterns;
      break;
    case 1:
      config.handMode = 'left';
      config.restProbability = 0.15;
      config.patterns = stepwisePatterns;
      break;
    case 2:
      config.handMode = 'right';
      config.timeSignature = { beats: 3, beatType: 4 };
      config.restProbability = 0.1;
      config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
      break;
    case 3:
      config.handMode = 'both';
      config.timeSignature = { beats: 3, beatType: 4 };
      config.restProbability = 0.1;
      config.durations = [4, 2, 1];
      config.patterns = folkPatterns;
      break;
  }
}

function applyLevel7(config: LevelConfig, subLevel: number): void {
  config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
  config.suggestedBpm = 50;

  switch (subLevel) {
    case 0:
      config.handMode = 'right';
      config.durations = [3, 2, 1];
      config.patterns = stepwisePatterns;
      break;
    case 1:
      config.handMode = 'left';
      config.durations = [3, 2, 1];
      config.patterns = stepwisePatterns;
      break;
    case 2:
      config.handMode = 'right';
      config.durations = [2, 1];
      config.maxInterval = 6;
      config.patterns = [[1, 6], [6, 1], [1, 3, 5], [3, 8], ...triadicPatterns];
      break;
    case 3:
      config.handMode = 'both';
      config.durations = [3, 2, 1];
      config.maxInterval = 6;
      config.patterns = [...folkPatterns, ...wideIntervalPatterns.slice(0, 5)];
      break;
  }
}

function applyNewKeyLevel(config: LevelConfig, level: number, subLevel: number): void {
  config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];

  switch (subLevel) {
    case 0:
      config.handMode = 'right';
      config.durations = [4];
      config.restProbability = 0;
      config.patterns = stepwisePatterns;
      config.suggestedBpm = 35;
      break;
    case 1:
      config.handMode = 'left';
      config.durations = [4];
      config.restProbability = 0;
      config.patterns = stepwisePatterns;
      config.suggestedBpm = 35;
      break;
    case 2:
      config.handMode = 'right';
      config.durations = [1, 2];
      config.restProbability = 0.1;
      config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
      config.suggestedBpm = 45;
      break;
    case 3:
      config.handMode = 'both';
      config.durations = [1, 2];
      config.restProbability = 0.1;
      config.patterns = [...folkPatterns, ...classicalPatterns];
      config.suggestedBpm = 50;
      break;
  }

  // Higher levels: more challenging
  if (level >= 12) config.maxInterval = 4;
  if (level >= 14) config.maxInterval = 5;
}

// ============================================
// EXPORTS
// ============================================

/**
 * Get all level descriptions as array.
 */
export function getAllLevelDescriptions(): { level: number; subLevel: number; description: string }[] {
  const descriptions: { level: number; subLevel: number; description: string }[] = [];

  for (let level = 1; level <= 20; level++) {
    for (let subLevel = 0; subLevel < 4; subLevel++) {
      descriptions.push({
        level,
        subLevel,
        description: getLevelDescription(level, subLevel),
      });
    }
  }

  return descriptions;
}

/**
 * Get total number of levels in curriculum.
 */
export const TOTAL_LEVELS = 20;

/**
 * Get total number of sub-levels per level.
 */
export const SUB_LEVELS_PER_LEVEL = 4;
