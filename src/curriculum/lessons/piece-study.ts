/**
 * Piece Study Lesson
 *
 * Walk through an existing piece in segments with explanations.
 * Designed for guided study of specific repertoire.
 *
 * @module curriculum/lessons/piece-study
 *
 * @example
 * // Walk through Bach Invention in 4-bar segments
 * const lesson = new PieceStudyLesson({
 *   id: 'bach-invention-1',
 *   title: 'Bach Invention No. 1 in C Major',
 *   rightHandNotes: [...],
 *   leftHandNotes: [...],
 *   timeSignature: { beats: 4, beatType: 4 },
 *   key: { name: 'C major', fifths: 0, scale: ['C','D','E','F','G','A','B'] },
 *   barsPerStep: 4,
 *   explanations: [
 *     'The subject enters in the right hand, establishing the motif...',
 *     'The left hand answers with the subject in imitation...',
 *   ]
 * });
 */

import type { NoteData, TimeSignature, KeyInfo } from '../../core/types';
import type { LessonConfig, LessonState } from '../types';
import type { MusicSource, MusicData } from '../../music/sources/types';
import { EventEmitter } from '../../core/events';

// ============================================
// TYPES
// ============================================

export interface PieceStudyConfig {
  /** Unique identifier */
  id: string;
  /** Display title (e.g., "Bach Invention No. 1") */
  title: string;
  /** Complete right hand notes */
  rightHandNotes: NoteData[];
  /** Complete left hand notes */
  leftHandNotes: NoteData[];
  /** Time signature */
  timeSignature: TimeSignature;
  /** Key signature */
  key: KeyInfo;
  /** Suggested BPM */
  suggestedBpm?: number;
  /** Bars per study segment */
  barsPerStep?: number;
  /** Explanations for each segment */
  explanations?: string[];
  /** Overall piece description */
  description?: string;
  /** Learning mode: 'segments' (fixed chunks) or 'sliding' (progressive window) */
  learningMode?: 'segments' | 'sliding';
}

// ============================================
// SEGMENT MUSIC SOURCE
// ============================================

/**
 * Music source for a segment of a piece.
 */
class SegmentMusicSource implements MusicSource {
  readonly sourceType = 'predefined' as const;
  readonly canRegenerate = false;

  private _rightHandNotes: NoteData[];
  private _leftHandNotes: NoteData[];
  private _timeSignature: TimeSignature;
  private _key: KeyInfo;
  private _description: string;
  private _suggestedBpm: number;
  private _startMeasure: number;

  constructor(
    rightHandNotes: NoteData[],
    leftHandNotes: NoteData[],
    timeSignature: TimeSignature,
    key: KeyInfo,
    description: string,
    suggestedBpm: number,
    startMeasure: number = 1
  ) {
    this._rightHandNotes = rightHandNotes;
    this._leftHandNotes = leftHandNotes;
    this._timeSignature = timeSignature;
    this._key = key;
    this._description = description;
    this._suggestedBpm = suggestedBpm;
    this._startMeasure = startMeasure;
  }

  getMusic(): MusicData {
    return {
      rightHandNotes: this._rightHandNotes,
      leftHandNotes: this._leftHandNotes,
      timeSignature: this._timeSignature,
      key: this._key,
      metadata: {
        description: this._description,
        suggestedBpm: this._suggestedBpm,
        startMeasure: this._startMeasure,
      },
    };
  }
}

// ============================================
// PIECE STUDY LESSON CLASS
// ============================================

/**
 * Lesson for studying a piece in segments.
 *
 * Supports two learning modes:
 * - 'segments': Fixed chunks (measure 1, then 2, then 3...)
 * - 'sliding': Progressive window (measure 1 → 1-2 → 2-3 → 3-4...)
 */
export class PieceStudyLesson {
  private config: PieceStudyConfig;
  private segments: SegmentMusicSource[] = [];
  private measures: NoteData[][] = []; // Individual measures for RH
  private measuresLH: NoteData[][] = []; // Individual measures for LH
  private state: LessonState;

  // Sliding window state
  private windowStart = 0; // First measure in current window (0-indexed)
  private windowEnd = 0;   // Last measure in current window (0-indexed)
  // Phases: single → pair → single → pair → ... → review (every 4 measures)
  private windowPhase: 'single' | 'pair' | 'review' = 'single';
  private groupStart = 0;  // Start of current 4-measure group for review

  // Events
  readonly onStepChange = new EventEmitter<{ step: number; total: number }>();
  readonly onComplete = new EventEmitter<void>();

  constructor(config: PieceStudyConfig) {
    this.config = config;
    this.state = {
      currentStepIndex: 0,
      stepCompletions: [],
      startedAt: new Date(),
    };

    this.buildSegments();
  }

  /**
   * Check if using sliding window mode.
   */
  get isSlidingMode(): boolean {
    return this.config.learningMode === 'sliding';
  }

  /**
   * Build segments from the full piece.
   */
  private buildSegments(): void {
    const barsPerStep = this.config.barsPerStep ?? 4;
    const beatsPerBar = this.config.timeSignature.beats;

    // Always split into individual measures for sliding window support
    this.measures = this.splitIntoSegments(
      this.config.rightHandNotes,
      beatsPerBar // 1 measure = beatsPerBar beats
    );
    this.measuresLH = this.splitIntoSegments(
      this.config.leftHandNotes,
      beatsPerBar
    );

    // For segments mode, group measures into larger chunks
    const rhSegments = this.splitIntoSegments(
      this.config.rightHandNotes,
      barsPerStep * beatsPerBar
    );
    const lhSegments = this.splitIntoSegments(
      this.config.leftHandNotes,
      barsPerStep * beatsPerBar
    );

    // Create music sources for each segment
    const numSegments = Math.max(rhSegments.length, lhSegments.length);

    for (let i = 0; i < numSegments; i++) {
      const explanation = this.config.explanations?.[i] ?? `Bars ${i * barsPerStep + 1}-${(i + 1) * barsPerStep}`;

      this.segments.push(
        new SegmentMusicSource(
          rhSegments[i] || [],
          lhSegments[i] || [],
          this.config.timeSignature,
          this.config.key,
          explanation,
          this.config.suggestedBpm ?? 60
        )
      );

      this.state.stepCompletions.push(0);
    }
  }

  /**
   * Split notes into segments based on total beats.
   */
  private splitIntoSegments(notes: NoteData[], beatsPerSegment: number): NoteData[][] {
    const segments: NoteData[][] = [];
    let currentSegment: NoteData[] = [];
    let currentBeats = 0;

    for (const note of notes) {
      currentSegment.push(note);
      currentBeats += note.duration;

      if (currentBeats >= beatsPerSegment - 0.01) {
        segments.push(currentSegment);
        currentSegment = [];
        currentBeats = 0;
      }
    }

    // Add remaining notes
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Get current step.
   */
  getCurrentStep(): {
    index: number;
    total: number;
    musicSource: MusicSource;
    explanation: string;
    completions: number;
  } {
    if (this.isSlidingMode) {
      return this.getSlidingWindowStep();
    }

    const segment = this.segments[this.state.currentStepIndex];
    const music = segment.getMusic();

    return {
      index: this.state.currentStepIndex,
      total: this.segments.length,
      musicSource: segment,
      explanation: music.metadata.description,
      completions: this.state.stepCompletions[this.state.currentStepIndex],
    };
  }

  /**
   * Get current step for sliding window mode.
   */
  private getSlidingWindowStep(): {
    index: number;
    total: number;
    musicSource: MusicSource;
    explanation: string;
    completions: number;
  } {
    // Combine notes from windowStart to windowEnd (inclusive)
    const rhNotes: NoteData[] = [];
    const lhNotes: NoteData[] = [];

    for (let i = this.windowStart; i <= this.windowEnd; i++) {
      if (this.measures[i]) rhNotes.push(...this.measures[i]);
      if (this.measuresLH[i]) lhNotes.push(...this.measuresLH[i]);
    }

    let measureRange: string;
    if (this.windowPhase === 'review') {
      // Review uses dash: 1-4
      measureRange = `Review: ${this.windowStart + 1}-${this.windowEnd + 1}`;
    } else if (this.windowStart === this.windowEnd) {
      // Single measure: just the number
      measureRange = `${this.windowStart + 1}`;
    } else {
      // Pair uses plus: 1+2
      measureRange = `${this.windowStart + 1}+${this.windowEnd + 1}`;
    }

    const musicSource = new SegmentMusicSource(
      rhNotes,
      lhNotes,
      this.config.timeSignature,
      this.config.key,
      measureRange,
      this.config.suggestedBpm ?? 60,
      this.windowStart + 1 // 1-indexed measure number
    );

    return {
      index: this.windowStart,
      total: this.measures.length,
      musicSource,
      explanation: measureRange,
      completions: 0,
    };
  }

  /**
   * Advance to next step.
   * In sliding mode: progress the learning window.
   */
  nextStep(): boolean {
    if (this.isSlidingMode) {
      return this.advanceSlidingWindow();
    }

    if (this.state.currentStepIndex >= this.segments.length - 1) {
      this.state.completedAt = new Date();
      this.onComplete.emit();
      return false;
    }

    this.state.currentStepIndex++;
    this.onStepChange.emit({
      step: this.state.currentStepIndex,
      total: this.segments.length,
    });
    return true;
  }

  /**
   * Advance the sliding window.
   * Pattern: 1 → 1-2 → 2 → 2-3 → 3 → 3-4 → 1-4 (review) → 4-5 → 5 → 5-6 → ...
   */
  private advanceSlidingWindow(): boolean {
    const totalMeasures = this.measures.length;

    if (this.windowPhase === 'single') {
      // From single, expand to pair with next measure
      if (this.windowEnd < totalMeasures - 1) {
        this.windowEnd++;
        this.windowPhase = 'pair';
        this.emitStepChange(totalMeasures);
        return true;
      } else {
        // At the last measure, we're done
        this.state.completedAt = new Date();
        this.onComplete.emit();
        return false;
      }
    } else if (this.windowPhase === 'pair') {
      // From pair, check if we've completed 4 measures from group start
      const measuresInGroup = this.windowEnd - this.groupStart + 1;

      if (measuresInGroup >= 4) {
        // Time for review of the 4-measure group
        this.windowStart = this.groupStart;
        this.windowEnd = this.groupStart + 3;
        this.windowPhase = 'review';
        this.emitStepChange(totalMeasures);
        return true;
      } else {
        // Move to single on the second measure of the pair
        this.windowStart = this.windowEnd;
        this.windowPhase = 'single';
        this.emitStepChange(totalMeasures);
        return true;
      }
    } else if (this.windowPhase === 'review') {
      // After review, bridge to next group with a pair
      const nextStart = this.windowEnd; // Last measure of review

      if (nextStart < totalMeasures - 1) {
        // Start next group, bridge with pair from last reviewed measure
        this.groupStart = nextStart; // New group starts at measure 4 (0-indexed: 3)
        this.windowStart = nextStart;
        this.windowEnd = nextStart + 1;
        this.windowPhase = 'pair';
        this.emitStepChange(totalMeasures);
        return true;
      } else {
        // No more measures, we're done
        this.state.completedAt = new Date();
        this.onComplete.emit();
        return false;
      }
    }

    return false;
  }

  private emitStepChange(totalMeasures: number): void {
    this.onStepChange.emit({
      step: this.windowStart,
      total: totalMeasures,
    });
  }

  /**
   * Go to previous step.
   */
  previousStep(): boolean {
    if (this.isSlidingMode) {
      return this.rewindSlidingWindow();
    }

    if (this.state.currentStepIndex <= 0) return false;

    this.state.currentStepIndex--;
    this.onStepChange.emit({
      step: this.state.currentStepIndex,
      total: this.segments.length,
    });
    return true;
  }

  /**
   * Rewind the sliding window.
   * Reverses the advancement pattern.
   */
  private rewindSlidingWindow(): boolean {
    const totalMeasures = this.measures.length;

    if (this.windowPhase === 'review') {
      // Go back to the pair before review (e.g., 1-4 → 3-4)
      this.windowStart = this.windowEnd - 1;
      this.windowPhase = 'pair';
      this.emitStepChange(totalMeasures);
      return true;
    } else if (this.windowPhase === 'pair') {
      // Go back to single on the first measure of the pair
      this.windowEnd = this.windowStart;
      this.windowPhase = 'single';
      this.emitStepChange(totalMeasures);
      return true;
    } else if (this.windowPhase === 'single') {
      // Go back to previous pair
      if (this.windowStart > 0) {
        this.windowStart--;
        this.windowEnd = this.windowStart + 1;
        this.windowPhase = 'pair';
        this.emitStepChange(totalMeasures);
        return true;
      }
      return false; // Already at the beginning
    }

    return false;
  }

  /**
   * Jump to specific step.
   */
  goToStep(index: number): boolean {
    if (this.isSlidingMode) {
      // In sliding mode, jump to a specific measure as single
      if (index < 0 || index >= this.measures.length) return false;
      this.windowStart = index;
      this.windowEnd = index;
      this.windowPhase = 'single';
      this.onStepChange.emit({
        step: index,
        total: this.measures.length,
      });
      return true;
    }

    if (index < 0 || index >= this.segments.length) return false;

    this.state.currentStepIndex = index;
    this.onStepChange.emit({
      step: index,
      total: this.segments.length,
    });
    return true;
  }

  /**
   * Record completion of current step.
   */
  recordCompletion(): void {
    this.state.stepCompletions[this.state.currentStepIndex]++;
  }

  /**
   * Get total number of measures (for sliding mode).
   */
  getMeasureCount(): number {
    return this.measures.length;
  }

  /**
   * Get current window info (for sliding mode display).
   */
  getWindowInfo(): { start: number; end: number; phase: 'single' | 'pair' | 'review' } {
    return {
      start: this.windowStart,
      end: this.windowEnd,
      phase: this.windowPhase,
    };
  }

  // ============================================
  // INFO
  // ============================================

  /**
   * Get lesson title.
   */
  getTitle(): string {
    return this.config.title;
  }

  /**
   * Get lesson description.
   */
  getDescription(): string {
    return this.config.description ?? `Study ${this.config.title}`;
  }

  /**
   * Get number of segments.
   */
  getSegmentCount(): number {
    return this.segments.length;
  }

  /**
   * Check if lesson is complete.
   */
  isComplete(): boolean {
    return this.state.completedAt !== undefined;
  }

  /**
   * Get full piece music (all segments combined).
   */
  getFullPiece(): MusicData {
    return {
      rightHandNotes: this.config.rightHandNotes,
      leftHandNotes: this.config.leftHandNotes,
      timeSignature: this.config.timeSignature,
      key: this.config.key,
      metadata: {
        description: this.config.title,
        suggestedBpm: this.config.suggestedBpm ?? 60,
      },
    };
  }

  /**
   * Export as lesson config.
   */
  toLessonConfig(): LessonConfig {
    return {
      id: this.config.id,
      title: this.config.title,
      type: 'piece-study',
      description: this.config.description,
      steps: this.segments.map((segment, i) => ({
        id: `${this.config.id}-step-${i}`,
        musicSource: segment,
        explanation: this.config.explanations?.[i],
        masteryRequired: 1,
      })),
      tags: ['piece-study', 'repertoire'],
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a piece study lesson.
 */
export function createPieceStudyLesson(config: PieceStudyConfig): PieceStudyLesson {
  return new PieceStudyLesson(config);
}
