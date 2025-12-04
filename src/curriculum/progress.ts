/**
 * Progress Tracking
 *
 * Manages user progress through curriculum with persistence.
 *
 * @module curriculum/progress
 */

import type { CurriculumProgress, MasteryConfig } from './types';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'sightreading-progress';

const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  repetitionsToAdvance: 3,
  playsToIncreaseTempo: 3,
  bpmIncrement: 5,
  minBpm: 20,
  maxBpm: 200,
};

// ============================================
// PROGRESS MANAGER CLASS
// ============================================

/**
 * Manages user progress through curriculum.
 *
 * @example
 * const progress = new ProgressManager();
 *
 * // Track completion
 * progress.recordCompletion(false); // No mistakes
 *
 * // Check advancement
 * if (progress.shouldAdvanceLevel()) {
 *   progress.advanceLevel();
 * }
 */
export class ProgressManager {
  private progress: CurriculumProgress;
  private masteryConfig: MasteryConfig;

  constructor(
    initialProgress?: Partial<CurriculumProgress>,
    masteryConfig?: Partial<MasteryConfig>
  ) {
    this.masteryConfig = { ...DEFAULT_MASTERY_CONFIG, ...masteryConfig };
    this.progress = this.loadProgress(initialProgress);
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private loadProgress(initial?: Partial<CurriculumProgress>): CurriculumProgress {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return this.validateProgress(parsed);
      }
    } catch {
      // Ignore parse errors
    }

    return this.validateProgress(initial || {});
  }

  private validateProgress(data: Partial<CurriculumProgress>): CurriculumProgress {
    return {
      curriculumId: data.curriculumId || 'default',
      currentLevel: Math.max(1, Math.min(20, data.currentLevel || 1)),
      currentSubLevel: Math.max(0, Math.min(3, data.currentSubLevel || 0)),
      completedLessons: data.completedLessons || [],
      currentBpm: Math.max(
        this.masteryConfig.minBpm,
        Math.min(this.masteryConfig.maxBpm, data.currentBpm || 30)
      ),
      bpmMastery: data.bpmMastery || 0,
      repetitions: data.repetitions || 0,
      lastPracticedAt: data.lastPracticedAt,
    };
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  get level(): number {
    return this.progress.currentLevel;
  }

  get subLevel(): number {
    return this.progress.currentSubLevel;
  }

  get subLevelLetter(): string {
    return ['a', 'b', 'c', 'd'][this.progress.currentSubLevel] || 'a';
  }

  get fullLevelString(): string {
    return `${this.progress.currentLevel}${this.subLevelLetter}`;
  }

  get bpm(): number {
    return this.progress.currentBpm;
  }

  get repetitions(): number {
    return this.progress.repetitions;
  }

  get bpmMastery(): number {
    return this.progress.bpmMastery;
  }

  get repetitionsRemaining(): number {
    return Math.max(0, this.masteryConfig.repetitionsToAdvance - this.progress.repetitions);
  }

  get bpmMasteryRemaining(): number {
    return Math.max(0, this.masteryConfig.playsToIncreaseTempo - this.progress.bpmMastery);
  }

  // ============================================
  // SETTERS
  // ============================================

  setLevel(level: number): void {
    this.progress.currentLevel = Math.max(1, Math.min(20, level));
    this.progress.currentSubLevel = 0;
    this.progress.repetitions = 0;
    this.progress.currentBpm = this.getSuggestedBpm(level);
    this.progress.bpmMastery = 0;
    this.saveProgress();
  }

  setSubLevel(subLevel: number): void {
    this.progress.currentSubLevel = Math.max(0, Math.min(3, subLevel));
    this.progress.repetitions = 0;
    this.saveProgress();
  }

  setBpm(bpm: number): void {
    this.progress.currentBpm = Math.max(
      this.masteryConfig.minBpm,
      Math.min(this.masteryConfig.maxBpm, bpm)
    );
    this.progress.bpmMastery = 0;
    this.saveProgress();
  }

  // ============================================
  // PROGRESSION LOGIC
  // ============================================

  /**
   * Record a completion (successful play through).
   */
  recordCompletion(hadMistakes: boolean): void {
    if (!hadMistakes) {
      this.progress.repetitions++;
      this.progress.bpmMastery++;
    }
    this.progress.lastPracticedAt = new Date();
    this.saveProgress();
  }

  /**
   * Check if should advance to next sub-level.
   */
  shouldAdvanceLevel(): boolean {
    return this.progress.repetitions >= this.masteryConfig.repetitionsToAdvance;
  }

  /**
   * Check if should increase tempo.
   */
  shouldIncreaseTempo(): boolean {
    return this.progress.bpmMastery >= this.masteryConfig.playsToIncreaseTempo;
  }

  /**
   * Advance to next sub-level or level.
   */
  advanceLevel(): void {
    this.progress.repetitions = 0;
    this.progress.currentSubLevel++;

    if (this.progress.currentSubLevel >= 4) {
      this.progress.currentSubLevel = 0;
      this.progress.currentLevel = Math.min(20, this.progress.currentLevel + 1);
      this.progress.currentBpm = this.getSuggestedBpm(this.progress.currentLevel);
      this.progress.bpmMastery = 0;
    }

    this.saveProgress();
  }

  /**
   * Increase tempo.
   */
  increaseTempo(): void {
    if (this.shouldIncreaseTempo()) {
      this.progress.currentBpm = Math.min(
        this.masteryConfig.maxBpm,
        this.progress.currentBpm + this.masteryConfig.bpmIncrement
      );
      this.progress.bpmMastery = 0;
      this.saveProgress();
    }
  }

  /**
   * Reset all progress.
   */
  reset(): void {
    this.progress = {
      curriculumId: 'default',
      currentLevel: 1,
      currentSubLevel: 0,
      completedLessons: [],
      currentBpm: 30,
      bpmMastery: 0,
      repetitions: 0,
    };
    this.saveProgress();
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get suggested BPM for a level.
   */
  getSuggestedBpm(level: number): number {
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

  /**
   * Get the full progress object.
   */
  getProgress(): CurriculumProgress {
    return { ...this.progress };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a progress manager with optional initial state.
 */
export function createProgressManager(
  initial?: Partial<CurriculumProgress>,
  masteryConfig?: Partial<MasteryConfig>
): ProgressManager {
  return new ProgressManager(initial, masteryConfig);
}
