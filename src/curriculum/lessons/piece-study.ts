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

  constructor(
    rightHandNotes: NoteData[],
    leftHandNotes: NoteData[],
    timeSignature: TimeSignature,
    key: KeyInfo,
    description: string,
    suggestedBpm: number
  ) {
    this._rightHandNotes = rightHandNotes;
    this._leftHandNotes = leftHandNotes;
    this._timeSignature = timeSignature;
    this._key = key;
    this._description = description;
    this._suggestedBpm = suggestedBpm;
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
      },
    };
  }
}

// ============================================
// PIECE STUDY LESSON CLASS
// ============================================

/**
 * Lesson for studying a piece in segments.
 */
export class PieceStudyLesson {
  private config: PieceStudyConfig;
  private segments: SegmentMusicSource[] = [];
  private state: LessonState;

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
   * Build segments from the full piece.
   */
  private buildSegments(): void {
    const barsPerStep = this.config.barsPerStep ?? 4;
    const beatsPerBar = this.config.timeSignature.beats;

    // Calculate notes per segment based on duration
    const notesPerBarBeats = beatsPerBar;

    // Split right hand into segments
    const rhSegments = this.splitIntoSegments(
      this.config.rightHandNotes,
      barsPerStep * notesPerBarBeats
    );

    // Split left hand into segments
    const lhSegments = this.splitIntoSegments(
      this.config.leftHandNotes,
      barsPerStep * notesPerBarBeats
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
   * Advance to next step.
   */
  nextStep(): boolean {
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
   * Go to previous step.
   */
  previousStep(): boolean {
    if (this.state.currentStepIndex <= 0) return false;

    this.state.currentStepIndex--;
    this.onStepChange.emit({
      step: this.state.currentStepIndex,
      total: this.segments.length,
    });
    return true;
  }

  /**
   * Jump to specific step.
   */
  goToStep(index: number): boolean {
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
