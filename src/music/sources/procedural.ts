/**
 * Procedural Music Source
 *
 * Generates random music based on level configuration.
 * This is the main music source for sight-reading practice.
 *
 * @module music/sources/procedural
 */

import type { NoteData, LevelConfig } from '../../core/types';
import type { MusicSource, MusicData, MusicMetadata, ProceduralConfig } from './types';
import { generateMelody, generateLeftHand, generateRests } from '../generators/melody';
import { getKeyForLevel, getKey, stepwisePatterns, triadicPatterns, folkPatterns, classicalPatterns, wideIntervalPatterns } from '../generators';

// ============================================
// LESSON DESCRIPTIONS
// ============================================

/**
 * Get human-readable description for a level/sublevel.
 */
function getLessonDescription(level: number, subLevel: number): string {
  const subLabels = ['a', 'b', 'c', 'd'];
  const sub = subLabels[subLevel];

  // C major foundation levels (1-7)
  const cMajorDescriptions: Record<string, string> = {
    '1a': 'C and G — whole notes (RH)',
    '1b': 'C, E, G triad — whole notes (RH)',
    '1c': 'C through G — whole notes (RH)',
    '1d': 'Stepwise — whole notes (RH)',
    '2a': 'C and G — whole notes (LH)',
    '2b': 'C, E, G triad — whole notes (LH)',
    '2c': 'C through G — whole notes (LH)',
    '2d': 'Stepwise — whole notes (LH)',
    '3a': 'Simple coordination — whole notes',
    '3b': 'Triad patterns — whole notes',
    '3c': 'Stepwise — whole notes',
    '3d': 'Full patterns — whole notes',
    '4a': 'Half notes (RH)',
    '4b': 'Half notes (LH)',
    '4c': 'Whole and half notes (RH)',
    '4d': 'Whole and half notes — both hands',
    '5a': 'Quarter notes — stepwise (RH)',
    '5b': 'Quarter notes — stepwise (LH)',
    '5c': 'Quarter and half notes (RH)',
    '5d': 'Quarter notes — both hands',
    '6a': 'Quarter rests (RH)',
    '6b': 'Quarter rests (LH)',
    '6c': '3/4 time signature (RH)',
    '6d': '3/4 time — both hands',
    '7a': 'Dotted half notes (RH)',
    '7b': 'Dotted half notes (LH)',
    '7c': 'Wider intervals — 6ths (RH)',
    '7d': 'Full range — both hands',
  };

  if (level <= 7) {
    return cMajorDescriptions[`${level}${sub}`] || `Level ${level}${sub}`;
  }

  // New key levels (8+)
  const keyInfo = getKeyForLevel(level);
  const keyDescriptions = [
    'whole notes (RH)',
    'whole notes (LH)',
    'quarter notes (RH)',
    'both hands',
  ];

  return `${keyInfo.name} — ${keyDescriptions[subLevel]}`;
}

/**
 * Get suggested BPM for a level.
 */
function getSuggestedBpm(level: number): number {
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
 * Get configuration for a specific level and sub-level.
 */
function getLevelConfig(
  level: number,
  subLevel: number,
  keyOverride?: string | null
): LevelConfig {
  // Use key override if set, otherwise use level default
  const keyInfo =
    keyOverride && getKey(keyOverride)
      ? getKey(keyOverride)
      : getKeyForLevel(level);

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

  // Level-specific configurations
  if (level === 1) {
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
  } else if (level === 2) {
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
  } else if (level === 3) {
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
  } else if (level === 4) {
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
  } else if (level === 5) {
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
  } else if (level === 6) {
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
  } else if (level === 7) {
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
  } else if (level >= 8) {
    // New key levels
    config.key = keyInfo;
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

  return config;
}

// ============================================
// PROCEDURAL MUSIC SOURCE
// ============================================

/**
 * Procedural music source that generates random music
 * based on level configuration.
 */
export class ProceduralMusicSource implements MusicSource {
  readonly sourceType = 'procedural' as const;
  readonly canRegenerate = true;

  private config: ProceduralConfig;
  private cachedMusic: MusicData | null = null;

  constructor(config: ProceduralConfig) {
    this.config = config;
  }

  /**
   * Get the current music data.
   */
  getMusic(): MusicData {
    if (!this.cachedMusic) {
      this.cachedMusic = this.generate();
    }
    return this.cachedMusic;
  }

  /**
   * Generate new music (invalidates cache).
   */
  regenerate(): MusicData {
    this.cachedMusic = this.generate();
    return this.cachedMusic;
  }

  /**
   * Internal generation logic.
   */
  private generate(): MusicData {
    const levelConfig = getLevelConfig(
      this.config.level,
      this.config.subLevel,
      this.config.keyOverride
    );

    const beatsPerMeasure =
      levelConfig.timeSignature.beatType === 8
        ? levelConfig.timeSignature.beats / 2
        : levelConfig.timeSignature.beats;

    // Generate hands based on handMode
    let rightHand: NoteData[][];
    let leftHand: NoteData[][];

    if (levelConfig.handMode === 'right') {
      rightHand = generateMelody(levelConfig, beatsPerMeasure, this.config.numMeasures);
      leftHand = generateRests(beatsPerMeasure, this.config.numMeasures);
    } else if (levelConfig.handMode === 'left') {
      rightHand = generateRests(beatsPerMeasure, this.config.numMeasures);
      leftHand = generateLeftHand(
        levelConfig,
        beatsPerMeasure,
        this.config.numMeasures,
        this.config.level
      );
    } else {
      rightHand = generateMelody(levelConfig, beatsPerMeasure, this.config.numMeasures);
      leftHand = generateLeftHand(
        levelConfig,
        beatsPerMeasure,
        this.config.numMeasures,
        this.config.level
      );
    }

    // Flatten into note arrays
    const rightHandNotes = rightHand.flat();
    const leftHandNotes = leftHand.flat();

    const metadata: MusicMetadata = {
      description: getLessonDescription(this.config.level, this.config.subLevel),
      suggestedBpm: levelConfig.suggestedBpm,
      level: this.config.level,
      subLevel: this.config.subLevel,
    };

    return {
      rightHandNotes,
      leftHandNotes,
      timeSignature: levelConfig.timeSignature,
      key: levelConfig.key,
      metadata,
    };
  }

  /**
   * Update configuration and regenerate.
   */
  setConfig(config: Partial<ProceduralConfig>): void {
    this.config = { ...this.config, ...config };
    this.cachedMusic = null;
  }

  /**
   * Get current configuration.
   */
  getConfig(): ProceduralConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating procedural music sources.
 */
export function createProceduralSource(config: ProceduralConfig): ProceduralMusicSource {
  return new ProceduralMusicSource(config);
}
