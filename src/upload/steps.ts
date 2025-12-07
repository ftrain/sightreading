/**
 * Practice Step Generation
 *
 * Pure functions for generating practice step sequences.
 * No dependencies on parser or browser APIs.
 *
 * @module upload/steps
 */

import type { NoteData } from '../core/types';

// ============================================
// TYPES
// ============================================

export type StepType = 'single' | 'pair' | 'consolidate';

export interface PracticeStep {
  /** Which measures to show (1-indexed) */
  measures: number[];
  /** Type of practice step */
  type: StepType;
  /** Whether this step has been mastered */
  mastered: boolean;
}

/**
 * Represents measures that are linked by ties and must be shown together.
 */
export interface TieGroup {
  /** First measure in the group (1-indexed) */
  start: number;
  /** Last measure in the group (1-indexed) */
  end: number;
}

// ============================================
// TIE GROUP DETECTION
// ============================================

/**
 * Check if a measure's notes end with a tie start (ties into next measure).
 */
function measureEndsWithTie(notes: NoteData[]): boolean {
  if (notes.length === 0) return false;
  const lastNote = notes[notes.length - 1];
  return lastNote.tieStart === true;
}

/**
 * Check if a measure's notes start with a tie end (tied from previous measure).
 */
function measureStartsWithTie(notes: NoteData[]): boolean {
  if (notes.length === 0) return false;
  const firstNote = notes[0];
  return firstNote.tieEnd === true;
}

/**
 * Interface for measure data (minimal subset needed for tie detection).
 */
export interface MeasureNotes {
  rightHand: NoteData[];
  leftHand: NoteData[];
}

/**
 * Find groups of measures that are linked by ties.
 * Measures in the same group must always be shown together.
 *
 * @param measures - Array of measure data with notes
 * @returns Array of tie groups (only groups that span multiple measures)
 */
export function findTieGroups(measures: MeasureNotes[]): TieGroup[] {
  if (measures.length === 0) return [];

  const groups: TieGroup[] = [];
  let currentGroupStart: number | null = null;

  for (let i = 0; i < measures.length; i++) {
    const measureNum = i + 1; // 1-indexed
    const measure = measures[i];

    // Check if this measure ends with a tie (either hand)
    const endsWithTie =
      measureEndsWithTie(measure.rightHand) ||
      measureEndsWithTie(measure.leftHand);

    // Check if this measure starts with a tie (either hand)
    const startsWithTie =
      measureStartsWithTie(measure.rightHand) ||
      measureStartsWithTie(measure.leftHand);

    if (startsWithTie && currentGroupStart === null) {
      // This measure is tied from previous but we didn't track the start
      // This can happen if the tie starts in measure 1
      // We'll assume the group starts from the previous measure
      currentGroupStart = Math.max(1, measureNum - 1);
    }

    if (currentGroupStart !== null && !endsWithTie) {
      // The group ends here (this measure doesn't tie forward)
      if (measureNum > currentGroupStart) {
        groups.push({
          start: currentGroupStart,
          end: measureNum,
        });
      }
      currentGroupStart = null;
    } else if (endsWithTie && currentGroupStart === null) {
      // Start a new group
      currentGroupStart = measureNum;
    }
    // If endsWithTie && currentGroupStart !== null, continue the group
  }

  // Handle unclosed group at end of piece
  if (currentGroupStart !== null) {
    groups.push({
      start: currentGroupStart,
      end: measures.length,
    });
  }

  return groups;
}

/**
 * Check if a measure range would split a tie group.
 * Returns the expanded range if it would split a tie, or the original range if not.
 */
export function expandRangeForTies(
  start: number,
  end: number,
  tieGroups: TieGroup[]
): { start: number; end: number } {
  let expandedStart = start;
  let expandedEnd = end;

  for (const group of tieGroups) {
    // Check if this range overlaps with the tie group
    const overlaps = !(end < group.start || start > group.end);
    if (overlaps) {
      // Expand to include the entire tie group
      expandedStart = Math.min(expandedStart, group.start);
      expandedEnd = Math.max(expandedEnd, group.end);
    }
  }

  return { start: expandedStart, end: expandedEnd };
}

// ============================================
// STEP GENERATION
// ============================================

/**
 * Generate a range of numbers (inclusive).
 */
function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

/**
 * Generate the practice step sequence using the sliding window algorithm.
 *
 * Pattern for each measure i:
 * 1. [i] - Single measure focus
 * 2. [i, i+1] - Pair with next (if not last)
 * 3. At measure 4, 8, 12... add consolidation of previous 4 measures
 * 4. At measure 8, 16, 24... add consolidation of previous 8 measures
 * 5. Final step: full piece
 */
export function generateSteps(measureCount: number): PracticeStep[] {
  const steps: PracticeStep[] = [];

  for (let i = 1; i <= measureCount; i++) {
    // Single measure focus
    steps.push({
      measures: [i],
      type: 'single',
      mastered: false,
    });

    // Pair with next measure (if not last)
    if (i < measureCount) {
      steps.push({
        measures: [i, i + 1],
        type: 'pair',
        mastered: false,
      });
    }

    // Consolidate every 4 measures (phrase boundary)
    if (i % 4 === 0 && i >= 4) {
      steps.push({
        measures: range(i - 3, i),
        type: 'consolidate',
        mastered: false,
      });
    }

    // Larger consolidation every 8 measures
    if (i % 8 === 0 && i >= 8) {
      steps.push({
        measures: range(i - 7, i),
        type: 'consolidate',
        mastered: false,
      });
    }
  }

  // Final full piece consolidation (if more than 4 measures)
  if (measureCount > 4) {
    steps.push({
      measures: range(1, measureCount),
      type: 'consolidate',
      mastered: false,
    });
  }

  return steps;
}

/**
 * Generate practice steps with tie awareness.
 * Steps are expanded to include complete tie groups so ties are never split.
 *
 * @param measureCount - Total number of measures
 * @param tieGroups - Groups of measures linked by ties
 * @returns Practice steps with tie-aware measure ranges
 */
export function generateStepsWithTies(
  measureCount: number,
  tieGroups: TieGroup[]
): PracticeStep[] {
  const steps: PracticeStep[] = [];
  const seen = new Set<string>(); // Track unique measure ranges

  // Helper to add a step with deduplication
  const addStep = (start: number, end: number, type: StepType) => {
    // Expand range to include any overlapping tie groups
    const expanded = expandRangeForTies(start, end, tieGroups);
    const key = `${expanded.start}-${expanded.end}`;

    if (!seen.has(key)) {
      seen.add(key);
      steps.push({
        measures: range(expanded.start, expanded.end),
        type,
        mastered: false,
      });
    }
  };

  for (let i = 1; i <= measureCount; i++) {
    // Single measure focus (may expand if in tie group)
    addStep(i, i, 'single');

    // Pair with next measure (if not last)
    if (i < measureCount) {
      addStep(i, i + 1, 'pair');
    }

    // Consolidate every 4 measures (phrase boundary)
    if (i % 4 === 0 && i >= 4) {
      addStep(i - 3, i, 'consolidate');
    }

    // Larger consolidation every 8 measures
    if (i % 8 === 0 && i >= 8) {
      addStep(i - 7, i, 'consolidate');
    }
  }

  // Final full piece consolidation (if more than 4 measures)
  if (measureCount > 4) {
    addStep(1, measureCount, 'consolidate');
  }

  return steps;
}

/**
 * Get a human-readable description for a step.
 */
export function getStepDescription(step: PracticeStep): string {
  const { measures } = step;

  if (measures.length === 1) {
    return `Measure ${measures[0]}`;
  } else if (measures.length === 2) {
    return `Measures ${measures[0]}-${measures[1]}`;
  } else {
    return `Measures ${measures[0]}-${measures[measures.length - 1]}`;
  }
}

/**
 * Get a label for the step type.
 */
export function getStepTypeLabel(type: StepType): string {
  switch (type) {
    case 'single':
      return 'Learning';
    case 'pair':
      return 'Connecting';
    case 'consolidate':
      return 'Consolidating';
  }
}
