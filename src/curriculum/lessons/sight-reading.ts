/**
 * Sight Reading Lesson
 *
 * Procedurally generated sight-reading exercises based on level.
 *
 * @module curriculum/lessons/sight-reading
 */

import type { NoteData, TimeSignature, KeyInfo } from '../../core/types';
import type { LessonConfig, LessonStepConfig } from '../types';
import { createProceduralSource, type ProceduralMusicSource } from '../../music/sources/procedural';
import { getLevelDescription } from '../levels';

// ============================================
// SIGHT READING LESSON CLASS
// ============================================

/**
 * A sight-reading lesson that generates procedural exercises.
 */
export class SightReadingLesson {
  private level: number;
  private subLevel: number;
  private numMeasures: number;
  private keyOverride: string | null;
  private musicSource: ProceduralMusicSource;

  constructor(config: {
    level: number;
    subLevel: number;
    numMeasures?: number;
    keyOverride?: string | null;
  }) {
    this.level = config.level;
    this.subLevel = config.subLevel;
    this.numMeasures = config.numMeasures ?? 4;
    this.keyOverride = config.keyOverride ?? null;

    this.musicSource = createProceduralSource({
      level: this.level,
      subLevel: this.subLevel,
      numMeasures: this.numMeasures,
      keyOverride: this.keyOverride,
    });
  }

  /**
   * Get the current music data.
   */
  getMusic(): {
    rightHandNotes: NoteData[];
    leftHandNotes: NoteData[];
    timeSignature: TimeSignature;
    key: KeyInfo;
    description: string;
    suggestedBpm: number;
  } {
    const music = this.musicSource.getMusic();
    return {
      rightHandNotes: music.rightHandNotes,
      leftHandNotes: music.leftHandNotes,
      timeSignature: music.timeSignature,
      key: music.key,
      description: music.metadata.description,
      suggestedBpm: music.metadata.suggestedBpm,
    };
  }

  /**
   * Generate new music (same level configuration).
   */
  regenerate(): void {
    this.musicSource.regenerate();
  }

  /**
   * Get level info.
   */
  getLevel(): { level: number; subLevel: number } {
    return { level: this.level, subLevel: this.subLevel };
  }

  /**
   * Get lesson description.
   */
  getDescription(): string {
    return getLevelDescription(this.level, this.subLevel);
  }

  /**
   * Update level and regenerate.
   */
  setLevel(level: number, subLevel: number): void {
    this.level = level;
    this.subLevel = subLevel;
    this.musicSource.setConfig({
      level,
      subLevel,
      numMeasures: this.numMeasures,
      keyOverride: this.keyOverride,
    });
    this.musicSource.regenerate();
  }

  /**
   * Set key override.
   */
  setKeyOverride(key: string | null): void {
    this.keyOverride = key;
    this.musicSource.setConfig({ keyOverride: key });
    this.musicSource.regenerate();
  }

  /**
   * Export as lesson config (for serialization).
   */
  toLessonConfig(): LessonConfig {
    return {
      id: `sight-reading-${this.level}-${this.subLevel}`,
      title: `Level ${this.level}${['a', 'b', 'c', 'd'][this.subLevel]}`,
      type: 'sight-reading',
      description: this.getDescription(),
      steps: [this.toStepConfig()],
      difficulty: Math.ceil(this.level / 2),
      tags: ['sight-reading', `level-${this.level}`],
    };
  }

  /**
   * Export current music as lesson step config.
   */
  toStepConfig(): LessonStepConfig {
    return {
      id: `step-${Date.now()}`,
      musicSource: this.musicSource,
      explanation: this.getDescription(),
      masteryRequired: 3,
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a sight-reading lesson.
 */
export function createSightReadingLesson(config: {
  level: number;
  subLevel: number;
  numMeasures?: number;
  keyOverride?: string | null;
}): SightReadingLesson {
  return new SightReadingLesson(config);
}
