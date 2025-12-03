import { describe, it, expect } from 'vitest';
import { analyzePhrase, getAnalysisSummary, analyzeMelodicContour } from '../theoryAnalyzer';

describe('theoryAnalyzer', () => {
  describe('analyzePhrase', () => {
    it('should analyze a simple C major triad', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const analysis = analyzePhrase(notes, 'C');

      expect(analysis.key).toBe('C');
      expect(analysis.detectedChords.length).toBeGreaterThan(0);
      // Should detect C major chord
      expect(analysis.detectedChords.some(c => c.includes('C'))).toBe(true);
    });

    it('should filter out rests', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: '', alter: 0, octave: 0, duration: 1, isRest: true },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const analysis = analyzePhrase(notes, 'C');

      expect(analysis.intervalPatterns.length).toBe(1); // Only one interval between C and G
    });

    it('should handle empty note array', () => {
      const analysis = analyzePhrase([], 'C');

      expect(analysis.key).toBe('C');
      expect(analysis.detectedChords).toHaveLength(0);
      expect(analysis.hints).toHaveLength(0);
    });

    it('should detect stepwise motion', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const analysis = analyzePhrase(notes, 'C');

      // Should have hint about stepwise motion
      const hasStepwiseHint = analysis.hints.some(h =>
        h.type === 'pattern' && h.title.toLowerCase().includes('stepwise')
      );
      expect(hasStepwiseHint).toBe(true);
    });

    it('should add key hint for non-C keys', () => {
      const notes = [
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'A', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'B', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      const analysis = analyzePhrase(notes, 'G');

      const hasKeyHint = analysis.hints.some(h =>
        h.type === 'technique' && h.title.includes('G Major')
      );
      expect(hasKeyHint).toBe(true);
    });
  });

  describe('getAnalysisSummary', () => {
    it('should return empty string for no hints', () => {
      const analysis = {
        key: 'C',
        detectedChords: [],
        scalePattern: null,
        intervalPatterns: [],
        hints: [],
      };

      expect(getAnalysisSummary(analysis)).toBe('');
    });

    it('should return formatted hint string', () => {
      const analysis = {
        key: 'C',
        detectedChords: ['C'],
        scalePattern: null,
        intervalPatterns: [],
        hints: [{
          type: 'chord' as const,
          title: 'Chord Outline',
          description: 'This is a C major chord.',
        }],
      };

      const summary = getAnalysisSummary(analysis);
      expect(summary).toContain('Chord Outline');
      expect(summary).toContain('C major chord');
    });
  });

  describe('analyzeMelodicContour', () => {
    it('should detect ascending contour', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      expect(analyzeMelodicContour(notes)).toBe('ascending');
    });

    it('should detect descending contour', () => {
      const notes = [
        { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      expect(analyzeMelodicContour(notes)).toBe('descending');
    });

    it('should detect wave-like contour', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'D', alter: 0, octave: 4, duration: 1, isRest: false },
        { step: 'F', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      expect(analyzeMelodicContour(notes)).toBe('wave-like');
    });

    it('should handle single note', () => {
      const notes = [
        { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
      ];

      expect(analyzeMelodicContour(notes)).toBe('single note');
    });
  });
});
