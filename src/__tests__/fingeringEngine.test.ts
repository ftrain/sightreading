import { describe, it, expect } from 'vitest';
import {
  generateFingering,
  formatFingeringDisplay,
  fingerName,
} from '../fingeringEngine';

describe('fingeringEngine', () => {
  describe('position-based fingering (C-D-E-F-G)', () => {
    it('should use 1-2-3-4-5 for C-D-E-F-G ascending (RH)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // C=1, D=2, E=3, F=4, G=5
      expect(result.notes.map(n => n.finger)).toEqual([1, 2, 3, 4, 5]);
      expect(result.position).toBe('C Position');
      expect(result.difficulty).toBe(1); // Fits in 5-finger position
    });

    it('should use 1-3-5 for C-E-G triad (RH)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // C=1, E=3, G=5
      expect(result.notes.map(n => n.finger)).toEqual([1, 3, 5]);
      expect(result.position).toBe('C Position');
    });

    it('should use inverted fingering for left hand (5-4-3-2-1)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 3, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'left');

      // LH: C=5, D=4, E=3, F=2, G=1
      expect(result.notes.map(n => n.finger)).toEqual([5, 4, 3, 2, 1]);
      expect(result.position).toBe('C Position');
    });

    it('should include position in tips', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      expect(result.tips.some(t => t.includes('Position'))).toBe(true);
    });
  });

  describe('generateFingering basics', () => {
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

  describe('extended range fingering', () => {
    it('should handle octave range with extension (use finger 5 for high notes)', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'C', alter: 0, octave: 5, duration: 1, isRest: false }, // Octave above
      ];

      const result = generateFingering(notes, 'right');

      // C=1, E=3, G=5, high C=5 (extension)
      expect(result.notes.map(n => n.finger)).toEqual([1, 3, 5, 5]);
      expect(result.difficulty).toBe(2); // Octave range = difficulty 2
    });

    it('should use consistent fingering for repeated patterns', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // Same note should always get same finger
      expect(result.notes[0].finger).toBe(result.notes[2].finger); // Both Cs
      expect(result.notes[1].finger).toBe(result.notes[3].finger); // Both Gs
      expect(result.notes.map(n => n.finger)).toEqual([1, 5, 1, 5]);
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

  describe('predictability and consistency', () => {
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

    it('should use increasing fingers for ascending RH scale', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // Ascending scale should use increasing fingers
      expect(result.notes[0].finger).toBeLessThan(result.notes[1].finger);
      expect(result.notes[1].finger).toBeLessThan(result.notes[2].finger);
    });

    it('should use decreasing fingers for descending LH pattern', () => {
      const notes = [
        { step: 'G', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 3, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 3, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'left');

      // LH descending: high note (G) uses thumb (1), lower notes use higher fingers
      // G=1, F=2, E=3
      expect(result.notes[0].finger).toBeLessThan(result.notes[1].finger);
      expect(result.notes[1].finger).toBeLessThan(result.notes[2].finger);
    });

    it('should give same note same finger regardless of sequence', () => {
      // Jumping pattern: C-G-E-G-C-E
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // All Cs should have the same finger
      expect(result.notes[0].finger).toBe(result.notes[4].finger);
      // All Gs should have the same finger
      expect(result.notes[1].finger).toBe(result.notes[3].finger);
      // All Es should have the same finger
      expect(result.notes[2].finger).toBe(result.notes[5].finger);
    });
  });

  describe('G position fingering', () => {
    it('should correctly finger G-A-B-C-D (RH)', () => {
      const notes = [
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'A', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'B', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'C', alter: 0, octave: 5, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 5, duration: 1, isRest: false },
      ];

      const result = generateFingering(notes, 'right');

      // G=1 (root), A=2, B=3, C=4, D=5
      expect(result.notes.map(n => n.finger)).toEqual([1, 2, 3, 4, 5]);
      expect(result.position).toBe('G Position');
    });
  });
});
