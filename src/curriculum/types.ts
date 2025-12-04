/**
 * Curriculum Types
 *
 * Type definitions for lessons, curriculum, and learning progression.
 *
 * @module curriculum/types
 */

import type { KeyInfo } from '../core/types';
import type { MusicSource } from '../music/sources/types';

// ============================================
// LESSON TYPES
// ============================================

/**
 * Types of lessons the platform supports.
 */
export type LessonType =
  | 'sight-reading'    // Procedurally generated exercises
  | 'piece-study'      // Walk through an existing piece
  | 'technique'        // Scales, arpeggios, patterns
  | 'theory';          // Theory concepts with musical examples

/**
 * A step within a lesson.
 */
export interface LessonStepConfig {
  /** Unique identifier */
  id: string;
  /** Music source for this step */
  musicSource: MusicSource;
  /** Optional explanation/commentary */
  explanation?: string;
  /** Learning objectives */
  objectives?: string[];
  /** Number of successful plays required */
  masteryRequired?: number;
  /** Theory hints to display */
  theoryHints?: string[];
}

/**
 * A complete lesson definition.
 */
export interface LessonConfig {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Type of lesson */
  type: LessonType;
  /** Description */
  description?: string;
  /** Lesson steps */
  steps: LessonStepConfig[];
  /** Tags for categorization */
  tags?: string[];
  /** Difficulty level (1-10) */
  difficulty?: number;
}

/**
 * Runtime lesson state.
 */
export interface LessonState {
  /** Current step index */
  currentStepIndex: number;
  /** Completions per step */
  stepCompletions: number[];
  /** Started timestamp */
  startedAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
}

// ============================================
// CURRICULUM TYPES
// ============================================

/**
 * A curriculum is a collection of lessons in sequence.
 */
export interface CurriculumConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Ordered lesson IDs */
  lessonIds: string[];
  /** Tags */
  tags?: string[];
}

/**
 * Level in a structured curriculum.
 */
export interface CurriculumLevel {
  /** Level number (1-based) */
  level: number;
  /** Sub-levels (a, b, c, d) */
  subLevels: LessonConfig[];
  /** Key for this level */
  key: KeyInfo;
  /** Description */
  description: string;
}

// ============================================
// PROGRESS TYPES
// ============================================

/**
 * User progress through a curriculum.
 */
export interface CurriculumProgress {
  /** Curriculum ID */
  curriculumId: string;
  /** Current level */
  currentLevel: number;
  /** Current sub-level */
  currentSubLevel: number;
  /** Completed lessons */
  completedLessons: string[];
  /** Current tempo */
  currentBpm: number;
  /** Tempo mastery count */
  bpmMastery: number;
  /** Repetitions at current sub-level */
  repetitions: number;
  /** Last practiced timestamp */
  lastPracticedAt?: Date;
}

/**
 * Mastery configuration.
 */
export interface MasteryConfig {
  /** Repetitions needed to advance sub-level */
  repetitionsToAdvance: number;
  /** Plays at tempo to increase BPM */
  playsToIncreaseTempo: number;
  /** BPM increment amount */
  bpmIncrement: number;
  /** Minimum BPM */
  minBpm: number;
  /** Maximum BPM */
  maxBpm: number;
}

// ============================================
// LESSON EVENTS
// ============================================

/**
 * Event emitted when step changes.
 */
export interface StepChangeEvent {
  previousStep: number;
  currentStep: number;
  isComplete: boolean;
}

/**
 * Event emitted on step completion.
 */
export interface StepCompleteEvent {
  stepIndex: number;
  hadMistakes: boolean;
  completionCount: number;
  masteryAchieved: boolean;
}

/**
 * Event emitted on lesson completion.
 */
export interface LessonCompleteEvent {
  lessonId: string;
  totalSteps: number;
  totalTime: number;
}
