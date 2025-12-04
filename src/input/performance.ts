/**
 * Performance Tracking
 *
 * Tracks user performance during playback - matches played notes
 * against expected notes and tracks accuracy.
 *
 * @module input/performance
 */

import type { NoteData, NoteMatchResult } from '../core/types';
import { EventEmitter, type NoteMatchEvent } from '../core/events';
import { normalizeNoteName, getAllNotesFromNoteData } from '../core/noteUtils';

// ============================================
// TYPES
// ============================================

export interface PerformanceStats {
  totalNotes: number;
  correctNotes: number;
  wrongNotes: number;
  earlyNotes: number;
  missedNotes: number;
  accuracy: number;
}

// ============================================
// PERFORMANCE TRACKER CLASS
// ============================================

/**
 * Tracks performance during music playback.
 *
 * @example
 * const tracker = new PerformanceTracker();
 *
 * // Set expected notes for current beat
 * tracker.setExpectedNotes(currentNotes);
 *
 * // Check a played note
 * const result = tracker.checkNote('C4');
 *
 * // Get stats at end
 * const stats = tracker.getStats();
 */
export class PerformanceTracker {
  private expectedNotes: Set<string> = new Set();
  private playedNotes: Set<string> = new Set();
  private upcomingNotes: Set<string> = new Set();

  // Statistics
  private totalNotes = 0;
  private correctNotes = 0;
  private wrongNotes = 0;
  private earlyNotes = 0;
  private missedNotes = 0;

  // State
  private hadMistakeThisRound = false;
  private isActive = false;

  // Events
  readonly onNoteMatch = new EventEmitter<NoteMatchEvent>();

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Start tracking a new piece.
   */
  start(): void {
    this.reset();
    this.isActive = true;
  }

  /**
   * Stop tracking.
   */
  stop(): void {
    this.isActive = false;
    this.expectedNotes.clear();
    this.playedNotes.clear();
    this.upcomingNotes.clear();
  }

  /**
   * Reset statistics.
   */
  reset(): void {
    this.expectedNotes.clear();
    this.playedNotes.clear();
    this.upcomingNotes.clear();
    this.totalNotes = 0;
    this.correctNotes = 0;
    this.wrongNotes = 0;
    this.earlyNotes = 0;
    this.missedNotes = 0;
    this.hadMistakeThisRound = false;
  }

  // ============================================
  // NOTE MANAGEMENT
  // ============================================

  /**
   * Set the expected notes for the current beat.
   * Called when advancing to a new beat.
   */
  setExpectedNotes(notes: NoteData[]): void {
    // Count missed notes from previous beat
    const unmatchedCount = this.expectedNotes.size - this.playedNotes.size;
    this.missedNotes += Math.max(0, unmatchedCount);

    // Clear previous state
    this.expectedNotes.clear();
    this.playedNotes.clear();

    // Add new expected notes
    for (const note of notes) {
      if (!note.isRest) {
        const allNotes = getAllNotesFromNoteData(note);
        for (const n of allNotes) {
          this.expectedNotes.add(normalizeNoteName(n));
        }
      }
    }

    this.totalNotes += this.expectedNotes.size;
  }

  /**
   * Set upcoming notes (for early detection).
   */
  setUpcomingNotes(notes: NoteData[]): void {
    this.upcomingNotes.clear();

    for (const note of notes) {
      if (!note.isRest) {
        const allNotes = getAllNotesFromNoteData(note);
        for (const n of allNotes) {
          this.upcomingNotes.add(normalizeNoteName(n));
        }
      }
    }
  }

  // ============================================
  // NOTE CHECKING
  // ============================================

  /**
   * Check a played note against expected notes.
   *
   * @param playedNote - Note name with octave (e.g., 'C4')
   * @returns Match result
   */
  checkNote(playedNote: string): NoteMatchResult {
    if (!this.isActive) return 'wrong';

    const normalized = normalizeNoteName(playedNote);

    // Check if matches current expected note
    if (this.expectedNotes.has(normalized)) {
      if (!this.playedNotes.has(normalized)) {
        this.playedNotes.add(normalized);
        this.correctNotes++;

        this.onNoteMatch.emit({
          playedNote,
          expectedNotes: Array.from(this.expectedNotes),
          result: 'correct',
        });

        return 'correct';
      }
      // Already played this note
      return 'correct';
    }

    // Check if matches upcoming note (early play)
    if (this.upcomingNotes.has(normalized)) {
      this.earlyNotes++;

      this.onNoteMatch.emit({
        playedNote,
        expectedNotes: Array.from(this.expectedNotes),
        result: 'early',
      });

      return 'early';
    }

    // Wrong note
    this.wrongNotes++;
    this.hadMistakeThisRound = true;

    this.onNoteMatch.emit({
      playedNote,
      expectedNotes: Array.from(this.expectedNotes),
      result: 'wrong',
    });

    return 'wrong';
  }

  /**
   * Check if a note is in the expected set.
   */
  isExpectedNote(note: string): boolean {
    return this.expectedNotes.has(normalizeNoteName(note));
  }

  /**
   * Check if a note is upcoming (for early correct marking).
   */
  isUpcomingNote(note: string): boolean {
    return this.upcomingNotes.has(normalizeNoteName(note));
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get current performance statistics.
   */
  getStats(): PerformanceStats {
    const accuracy = this.totalNotes > 0
      ? (this.correctNotes / this.totalNotes) * 100
      : 100;

    return {
      totalNotes: this.totalNotes,
      correctNotes: this.correctNotes,
      wrongNotes: this.wrongNotes,
      earlyNotes: this.earlyNotes,
      missedNotes: this.missedNotes,
      accuracy: Math.round(accuracy * 10) / 10,
    };
  }

  /**
   * Check if there was a mistake this round.
   */
  hadMistake(): boolean {
    return this.hadMistakeThisRound;
  }

  /**
   * Reset mistake flag (for new piece).
   */
  clearMistakeFlag(): void {
    this.hadMistakeThisRound = false;
  }

  /**
   * Check if tracking is active.
   */
  get active(): boolean {
    return this.isActive;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a performance tracker.
 */
export function createPerformanceTracker(): PerformanceTracker {
  return new PerformanceTracker();
}
