/**
 * Tests for the practice step generation.
 *
 * These tests cover the core step generation algorithm that determines
 * how pieces are broken down for progressive practice.
 */

import { describe, it, expect } from 'vitest';
import { generateSteps, getStepTypeLabel, getStepDescription } from '../upload/steps';

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
