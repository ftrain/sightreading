/**
 * Tests for the practice step generation.
 *
 * These tests cover the core step generation algorithm that determines
 * how pieces are broken down for progressive practice.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSteps,
  generateStepsWithTies,
  findTieGroups,
  expandRangeForTies,
  getStepTypeLabel,
  getStepDescription,
  type TieGroup,
  type MeasureNotes,
} from '../upload/steps';
import type { NoteData } from '../core/types';

describe('generateSteps', () => {
  it('generates correct steps for a 4-measure piece', () => {
    const steps = generateSteps(4);

    // Expected sequence for 4 measures:
    // [1], [1,2], [2], [2,3], [3], [3,4], [4], [1,2,3,4]
    expect(steps).toHaveLength(8);

    expect(steps[0]).toEqual({ measures: [1], type: 'single', mastered: false });
    expect(steps[1]).toEqual({ measures: [1, 2], type: 'pair', mastered: false });
    expect(steps[2]).toEqual({ measures: [2], type: 'single', mastered: false });
    expect(steps[3]).toEqual({ measures: [2, 3], type: 'pair', mastered: false });
    expect(steps[4]).toEqual({ measures: [3], type: 'single', mastered: false });
    expect(steps[5]).toEqual({ measures: [3, 4], type: 'pair', mastered: false });
    expect(steps[6]).toEqual({ measures: [4], type: 'single', mastered: false });
    expect(steps[7]).toEqual({ measures: [1, 2, 3, 4], type: 'consolidate', mastered: false });
  });

  it('generates correct steps for an 8-measure piece', () => {
    const steps = generateSteps(8);

    // Should include consolidation at measure 4 and 8
    const consolidations = steps.filter(s => s.type === 'consolidate');
    expect(consolidations).toHaveLength(4); // [1-4], [5-8], [1-8], [1-8] (full piece)

    // Check 4-measure consolidation
    expect(consolidations[0]).toEqual({
      measures: [1, 2, 3, 4],
      type: 'consolidate',
      mastered: false,
    });

    // Check 8-measure consolidation
    const eightMeasureConsolidation = consolidations.find(
      c => c.measures.length === 8 && c.measures[0] === 1
    );
    expect(eightMeasureConsolidation).toBeDefined();
  });

  it('generates correct steps for a 2-measure piece (no full consolidation)', () => {
    const steps = generateSteps(2);

    // [1], [1,2], [2] - no consolidation for pieces <= 4 measures
    expect(steps).toHaveLength(3);
    expect(steps.every(s => s.type !== 'consolidate')).toBe(true);
  });

  it('generates single step for 1-measure piece', () => {
    const steps = generateSteps(1);

    expect(steps).toHaveLength(1);
    expect(steps[0]).toEqual({ measures: [1], type: 'single', mastered: false });
  });

  it('generates final full-piece consolidation for pieces > 4 measures', () => {
    const steps = generateSteps(6);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.type).toBe('consolidate');
    expect(lastStep.measures).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles 16-measure piece with multiple consolidation levels', () => {
    const steps = generateSteps(16);

    const consolidations = steps.filter(s => s.type === 'consolidate');

    // Should have consolidations at 4, 8, 12, 16 for 4-bar groups
    // Plus 8-bar consolidations at 8, 16
    // Plus final full piece
    const fourBarConsolidations = consolidations.filter(c => c.measures.length === 4);
    const eightBarConsolidations = consolidations.filter(c => c.measures.length === 8);
    const fullPiece = consolidations.filter(c => c.measures.length === 16);

    expect(fourBarConsolidations.length).toBe(4); // measures 1-4, 5-8, 9-12, 13-16
    expect(eightBarConsolidations.length).toBe(2); // measures 1-8, 9-16
    expect(fullPiece.length).toBe(1); // full 1-16
  });

  it('counts single and pair steps correctly', () => {
    const steps = generateSteps(5);

    const singles = steps.filter(s => s.type === 'single');
    const pairs = steps.filter(s => s.type === 'pair');

    expect(singles.length).toBe(5); // One for each measure
    expect(pairs.length).toBe(4); // n-1 pairs for n measures
  });

  it('all steps start with mastered: false', () => {
    const steps = generateSteps(10);

    expect(steps.every(s => s.mastered === false)).toBe(true);
  });
});

describe('getStepTypeLabel', () => {
  it('returns "Learning" for single steps', () => {
    expect(getStepTypeLabel('single')).toBe('Learning');
  });

  it('returns "Connecting" for pair steps', () => {
    expect(getStepTypeLabel('pair')).toBe('Connecting');
  });

  it('returns "Consolidating" for consolidate steps', () => {
    expect(getStepTypeLabel('consolidate')).toBe('Consolidating');
  });
});

describe('getStepDescription', () => {
  it('describes single measure correctly', () => {
    const step = { measures: [1], type: 'single' as const, mastered: false };
    expect(getStepDescription(step)).toBe('Measure 1');
  });

  it('describes pair of measures correctly', () => {
    const step = { measures: [3, 4], type: 'pair' as const, mastered: false };
    expect(getStepDescription(step)).toBe('Measures 3-4');
  });

  it('describes range of measures correctly', () => {
    const step = { measures: [1, 2, 3, 4], type: 'consolidate' as const, mastered: false };
    expect(getStepDescription(step)).toBe('Measures 1-4');
  });

  it('handles larger ranges', () => {
    const step = { measures: [5, 6, 7, 8, 9, 10, 11, 12], type: 'consolidate' as const, mastered: false };
    expect(getStepDescription(step)).toBe('Measures 5-12');
  });
});

// ============================================
// TIE-AWARE STEP GENERATION TESTS
// ============================================

describe('findTieGroups', () => {
  // Helper to create a simple note
  const makeNote = (step: string, tieStart?: boolean, tieEnd?: boolean): NoteData => ({
    step,
    alter: 0,
    octave: 4,
    duration: 1,
    isRest: false,
    tieStart,
    tieEnd,
  });

  it('returns empty array for measures with no ties', () => {
    const measures: MeasureNotes[] = [
      { rightHand: [makeNote('C')], leftHand: [] },
      { rightHand: [makeNote('D')], leftHand: [] },
      { rightHand: [makeNote('E')], leftHand: [] },
    ];

    const groups = findTieGroups(measures);
    expect(groups).toHaveLength(0);
  });

  it('detects a tie between two measures', () => {
    const measures: MeasureNotes[] = [
      { rightHand: [makeNote('C'), makeNote('D', true)], leftHand: [] }, // ends with tie
      { rightHand: [makeNote('D', false, true), makeNote('E')], leftHand: [] }, // starts with tie
      { rightHand: [makeNote('F')], leftHand: [] },
    ];

    const groups = findTieGroups(measures);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ start: 1, end: 2 });
  });

  it('detects tie chain across three measures', () => {
    const measures: MeasureNotes[] = [
      { rightHand: [makeNote('C', true)], leftHand: [] }, // ties forward
      { rightHand: [makeNote('C', true, true)], leftHand: [] }, // tied from prev, ties forward
      { rightHand: [makeNote('C', false, true)], leftHand: [] }, // tied from prev
      { rightHand: [makeNote('D')], leftHand: [] },
    ];

    const groups = findTieGroups(measures);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ start: 1, end: 3 });
  });

  it('detects multiple separate tie groups', () => {
    const measures: MeasureNotes[] = [
      { rightHand: [makeNote('C', true)], leftHand: [] }, // ties to m2
      { rightHand: [makeNote('C', false, true)], leftHand: [] }, // from m1
      { rightHand: [makeNote('D')], leftHand: [] }, // no ties
      { rightHand: [makeNote('E', true)], leftHand: [] }, // ties to m5
      { rightHand: [makeNote('E', false, true)], leftHand: [] }, // from m4
    ];

    const groups = findTieGroups(measures);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ start: 1, end: 2 });
    expect(groups[1]).toEqual({ start: 4, end: 5 });
  });

  it('detects ties in left hand', () => {
    const measures: MeasureNotes[] = [
      { rightHand: [makeNote('C')], leftHand: [makeNote('G', true)] },
      { rightHand: [makeNote('D')], leftHand: [makeNote('G', false, true)] },
    ];

    const groups = findTieGroups(measures);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ start: 1, end: 2 });
  });
});

describe('expandRangeForTies', () => {
  it('returns original range when no tie groups exist', () => {
    const result = expandRangeForTies(2, 3, []);
    expect(result).toEqual({ start: 2, end: 3 });
  });

  it('returns original range when no overlap with tie groups', () => {
    const tieGroups: TieGroup[] = [{ start: 5, end: 6 }];
    const result = expandRangeForTies(1, 2, tieGroups);
    expect(result).toEqual({ start: 1, end: 2 });
  });

  it('expands range to include overlapping tie group', () => {
    const tieGroups: TieGroup[] = [{ start: 2, end: 4 }];
    const result = expandRangeForTies(3, 3, tieGroups);
    expect(result).toEqual({ start: 2, end: 4 });
  });

  it('expands range when starting inside tie group', () => {
    const tieGroups: TieGroup[] = [{ start: 1, end: 3 }];
    const result = expandRangeForTies(2, 5, tieGroups);
    expect(result).toEqual({ start: 1, end: 5 });
  });

  it('expands range when ending inside tie group', () => {
    const tieGroups: TieGroup[] = [{ start: 3, end: 5 }];
    const result = expandRangeForTies(1, 4, tieGroups);
    expect(result).toEqual({ start: 1, end: 5 });
  });

  it('expands for multiple overlapping tie groups', () => {
    const tieGroups: TieGroup[] = [
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ];
    const result = expandRangeForTies(2, 4, tieGroups);
    expect(result).toEqual({ start: 1, end: 5 });
  });
});

describe('generateStepsWithTies', () => {
  it('behaves like generateSteps when no tie groups', () => {
    const stepsWithTies = generateStepsWithTies(4, []);
    const stepsWithout = generateSteps(4);

    // Should have same structure (measures and types)
    expect(stepsWithTies.map(s => s.measures)).toEqual(stepsWithout.map(s => s.measures));
  });

  it('expands single measure steps to include tie group', () => {
    // Tie group from measure 2-3
    const tieGroups: TieGroup[] = [{ start: 2, end: 3 }];
    const steps = generateStepsWithTies(4, tieGroups);

    // Measure 1 should still be single
    const m1 = steps.find(s => s.measures.length === 1 && s.measures[0] === 1);
    expect(m1).toBeDefined();

    // Measure 2 and 3 "single" steps should be expanded to [2,3]
    const m2Single = steps.filter(s => s.measures.includes(2) && !s.measures.includes(1));
    // All steps containing 2 should also contain 3
    expect(m2Single.every(s => s.measures.includes(3))).toBe(true);

    // No step should have just [2] or just [3]
    expect(steps.some(s => s.measures.length === 1 && s.measures[0] === 2)).toBe(false);
    expect(steps.some(s => s.measures.length === 1 && s.measures[0] === 3)).toBe(false);
  });

  it('deduplicates expanded steps', () => {
    // If measure 1-2 are tied, both [1] and [2] expand to [1,2]
    // Should only appear once
    const tieGroups: TieGroup[] = [{ start: 1, end: 2 }];
    const steps = generateStepsWithTies(4, tieGroups);

    // Count how many times [1,2] appears
    const oneTwo = steps.filter(
      s => s.measures.length === 2 && s.measures[0] === 1 && s.measures[1] === 2
    );
    expect(oneTwo.length).toBe(1);
  });
});
