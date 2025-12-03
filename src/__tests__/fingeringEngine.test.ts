import { describe, it, expect } from 'vitest';
import {
  generateFingering,
  formatFingeringDisplay,
  fingerName,
} from '../fingeringEngine';

describe('fingeringEngine', () => {
  describe('position-based fingering (beginners)', () => {
    it('should use C Position fingering for C-D-E-F-G (RH)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // In C Position, RH fingering should be 1-2-3-4-5
      expect(result.notes.map(n => n.finger)).toEqual([1, 2, 3, 4, 5]);
      expect(result.position).toBe('C Position');
      expect(result.difficulty).toBe(1); // Easy positional fingering
    });

    it('should use C Position fingering for C-E-G (RH triad)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // C-E-G in C Position = fingers 1-3-5
      expect(result.notes.map(n => n.finger)).toEqual([1, 3, 5]);
      expect(result.position).toBe('C Position');
    });

    it('should use inverted fingering for left hand C Position', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 3, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'left');

      // In C Position, LH fingering should be 5-4-3-2-1 (pinky on C, thumb on G)
      expect(result.notes.map(n => n.finger)).toEqual([5, 4, 3, 2, 1]);
      expect(result.position).toBe('C Position');
    });

    it('should indicate position in tips', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      expect(result.tips.some(t => t.includes('Position'))).toBe(true);
    });
  });

  describe('generateFingering', () => {
    it('should generate fingering for a simple scale', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      expect(result.notes).toHaveLength(5);
      expect(result.difficulty).toBeGreaterThan(0);
      expect(result.difficulty).toBeLessThanOrEqual(10);

      // Each note should have a finger assignment
      result.notes.forEach((n) => {
        expect(n.finger).toBeGreaterThanOrEqual(1);
        expect(n.finger).toBeLessThanOrEqual(5);
        expect(n.hand).toBe('right');
      });
    });

    it('should handle empty note array', () => {
      const result = generateFingering([], 'right');

      expect(result.notes).toHaveLength(0);
      expect(result.difficulty).toBe(0);
    });

    it('should filter out rests', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: '', alter: 0, octave: 0, duration: 1, isRest: true },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      expect(result.notes).toHaveLength(2);
    });

    it('should generate different fingering for left hand', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 3, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'left');

      expect(result.notes).toHaveLength(3);
      result.notes.forEach((n) => {
        expect(n.hand).toBe('left');
      });
    });

    it('should use algorithmic fingering for passages outside 5-finger position', () => {
      // Create a passage spanning more than a 5th (requires thumb crossing)
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'A', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'B', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'C', alter: 0, octave: 5, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // Should fall back to algorithmic (no position)
      expect(result.position).toBeUndefined();
      expect(result.notes).toHaveLength(8);
    });

    it('should handle sharps and flats', () => {
      const notes = [
        { step: 'F', alter: 1, octave: 4, duration: 1, isRest: false }, // F#
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'B', alter: -1, octave: 4, duration: 1, isRest: false }, // Bb
      ];

      const result = generateFingering(notes, 'right');

      expect(result.notes).toHaveLength(3);
      expect(result.notes[0].note).toBe('F#4');
      expect(result.notes[2].note).toBe('Bb4');
    });
  });

  describe('formatFingeringDisplay', () => {
    it('should format fingering as space-separated numbers', () => {
      const suggestion = {
        notes: [
          { finger: 1 as const, hand: 'right' as const, note: 'C4', midiNote: 60 },
          { finger: 2 as const, hand: 'right' as const, note: 'D4', midiNote: 62 },
          { finger: 3 as const, hand: 'right' as const, note: 'E4', midiNote: 64 },
        ],
        difficulty: 2,
        tips: [],
      };

      expect(formatFingeringDisplay(suggestion)).toBe('1 2 3');
    });

    it('should handle empty fingering', () => {
      const suggestion = {
        notes: [],
        difficulty: 0,
        tips: [],
      };

      expect(formatFingeringDisplay(suggestion)).toBe('');
    });
  });

  describe('fingerName', () => {
    it('should return correct finger names', () => {
      expect(fingerName(1)).toBe('thumb');
      expect(fingerName(2)).toBe('index');
      expect(fingerName(3)).toBe('middle');
      expect(fingerName(4)).toBe('ring');
      expect(fingerName(5)).toBe('pinky');
    });
  });

  describe('algorithm correctness', () => {
    it('should avoid same finger on consecutive different notes', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // Consecutive notes should have different fingers
      for (let i = 1; i < result.notes.length; i++) {
        expect(result.notes[i].finger).not.toBe(result.notes[i - 1].finger);
      }
    });

    it('should prefer natural finger progressions for ascending RH', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // Ascending scale should use increasing fingers in position
      expect(result.notes[0].finger).toBeLessThan(result.notes[1].finger);
      expect(result.notes[1].finger).toBeLessThan(result.notes[2].finger);
    });

    it('should prefer natural finger progressions for descending LH', () => {
      const notes = [
        { step: 'G', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 3, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'left');

      // LH descending should use increasing fingers (1 -> 2 -> 3)
      // because LH is inverted: thumb on high notes, pinky on low
      expect(result.notes[0].finger).toBeLessThan(result.notes[1].finger);
      expect(result.notes[1].finger).toBeLessThan(result.notes[2].finger);
    });
  });
});
