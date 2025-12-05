/**
 * Practice Step Generation
 *
 * Pure functions for generating practice step sequences.
 * No dependencies on parser or browser APIs.
 *
 * @module upload/steps
 */

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
