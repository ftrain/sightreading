import { describe, it, expect } from 'vitest';
import {
  applyDots,
  getMetronomeDebounceInterval,
  shouldAllowMetronomeClick,
  beatsToSeconds,
  calculateNoteSchedule,
  calculatePieceEndTime,
  calculateMetronomeSchedule,
} from '../scheduler';

describe('scheduler', () => {
  describe('applyDots', () => {
    it('should return base duration with no dots', () => {
      expect(applyDots(2, 0)).toBe(2);
      expect(applyDots(1, 0)).toBe(1);
    });

    it('should apply single dot correctly (1.5x)', () => {
      // Dotted half note: 2 * 1.5 = 3 beats
      expect(applyDots(2, 1)).toBe(3);
      // Dotted quarter note: 1 * 1.5 = 1.5 beats
      expect(applyDots(1, 1)).toBe(1.5);
      // Dotted eighth note: 0.5 * 1.5 = 0.75 beats
      expect(applyDots(0.5, 1)).toBe(0.75);
    });

    it('should apply double dot correctly (1.75x)', () => {
      // Double-dotted half note: 2 * 1.75 = 3.5 beats
      expect(applyDots(2, 2)).toBe(3.5);
      // Double-dotted quarter note: 1 * 1.75 = 1.75 beats
      expect(applyDots(1, 2)).toBe(1.75);
    });

    it('should apply triple dot correctly (1.875x)', () => {
      // Triple-dotted half note: 2 * 1.875 = 3.75 beats
      expect(applyDots(2, 3)).toBe(3.75);
    });
  });

  describe('getMetronomeDebounceInterval', () => {
    it('should calculate correct debounce interval at 60 BPM', () => {
      // At 60 BPM: 1 beat = 1 second, 1 subdivision = 0.25s, half = 0.125s = 125ms
      const interval = getMetronomeDebounceInterval(60);
      expect(interval).toBe(125);
    });

    it('should calculate correct debounce interval at 120 BPM', () => {
      // At 120 BPM: 1 beat = 0.5 second, 1 subdivision = 0.125s, half = 0.0625s = 62.5ms
      const interval = getMetronomeDebounceInterval(120);
      expect(interval).toBe(62.5);
    });

    it('should calculate correct debounce interval at 30 BPM', () => {
      // At 30 BPM: 1 beat = 2 seconds, 1 subdivision = 0.5s, half = 0.25s = 250ms
      const interval = getMetronomeDebounceInterval(30);
      expect(interval).toBe(250);
    });
  });

  describe('shouldAllowMetronomeClick', () => {
    it('should allow click when enough time has passed', () => {
      const bpm = 60;
      const lastClick = 0;
      const currentTime = 200; // 200ms later, debounce is 125ms
      expect(shouldAllowMetronomeClick(currentTime, lastClick, bpm)).toBe(true);
    });

    it('should reject click when too soon after last click', () => {
      const bpm = 60;
      const lastClick = 0;
      const currentTime = 50; // 50ms later, debounce is 125ms
      expect(shouldAllowMetronomeClick(currentTime, lastClick, bpm)).toBe(false);
    });

    it('should allow click exactly at debounce threshold', () => {
      const bpm = 60;
      const lastClick = 0;
      const currentTime = 125; // exactly at threshold
      expect(shouldAllowMetronomeClick(currentTime, lastClick, bpm)).toBe(true);
    });

    it('should reject when both times are 0 (protects against duplicate initial clicks)', () => {
      // When both are 0, interval is 0 which is less than threshold
      // This is correct - it prevents duplicate clicks at startup
      const bpm = 60;
      expect(shouldAllowMetronomeClick(0, 0, bpm)).toBe(false);
    });

    it('should allow first click when lastClickTime is reset to 0', () => {
      // In practice, lastMetronomeTime is reset to 0 before scheduling
      // and performance.now() returns a positive value, so first click is allowed
      const bpm = 60;
      const currentTime = 1000; // 1 second after page load
      expect(shouldAllowMetronomeClick(currentTime, 0, bpm)).toBe(true);
    });
  });

  describe('beatsToSeconds', () => {
    it('should convert beats to seconds at 60 BPM', () => {
      expect(beatsToSeconds(1, 60)).toBe(1);
      expect(beatsToSeconds(2, 60)).toBe(2);
      expect(beatsToSeconds(0.5, 60)).toBe(0.5);
    });

    it('should convert beats to seconds at 120 BPM', () => {
      expect(beatsToSeconds(1, 120)).toBe(0.5);
      expect(beatsToSeconds(2, 120)).toBe(1);
      expect(beatsToSeconds(0.5, 120)).toBe(0.25);
    });

    it('should convert beats to seconds at 30 BPM', () => {
      expect(beatsToSeconds(1, 30)).toBe(2);
      expect(beatsToSeconds(0.5, 30)).toBe(1);
    });

    it('should handle fractional beats precisely', () => {
      // At 60 BPM, eighth note (0.5 beats) should be exactly 0.5 seconds
      expect(beatsToSeconds(0.5, 60)).toBe(0.5);
      // At 60 BPM, sixteenth note (0.25 beats) should be exactly 0.25 seconds
      expect(beatsToSeconds(0.25, 60)).toBe(0.25);
    });
  });

  describe('calculateNoteSchedule', () => {
    it('should schedule notes after countoff', () => {
      const beatGroups = [
        { duration: 1 }, // quarter note
        { duration: 1 }, // quarter note
      ];
      const countoff = 4; // 4 beat countoff
      const bpm = 60;

      const schedule = calculateNoteSchedule(beatGroups, countoff, bpm);

      // First note at 4 seconds (after 4-beat countoff at 60 BPM)
      expect(schedule[0]).toBe(4);
      // Second note at 5 seconds (1 beat later)
      expect(schedule[1]).toBe(5);
    });

    it('should handle eighth notes correctly', () => {
      const beatGroups = [
        { duration: 0.5 }, // eighth note
        { duration: 0.5 }, // eighth note
        { duration: 1 },   // quarter note
      ];
      const countoff = 4;
      const bpm = 60;

      const schedule = calculateNoteSchedule(beatGroups, countoff, bpm);

      expect(schedule[0]).toBe(4);     // First eighth at 4s
      expect(schedule[1]).toBe(4.5);   // Second eighth at 4.5s
      expect(schedule[2]).toBe(5);     // Quarter at 5s
    });

    it('should handle mixed note values', () => {
      const beatGroups = [
        { duration: 2 },   // half note
        { duration: 0.5 }, // eighth note
        { duration: 0.5 }, // eighth note
        { duration: 1 },   // quarter note
      ];
      const countoff = 4;
      const bpm = 120; // At 120 BPM, 1 beat = 0.5s

      const schedule = calculateNoteSchedule(beatGroups, countoff, bpm);

      expect(schedule[0]).toBe(2);    // Half at 2s (4 beats * 0.5s/beat)
      expect(schedule[1]).toBe(3);    // Eighth at 3s (6 beats * 0.5s/beat)
      expect(schedule[2]).toBe(3.25); // Eighth at 3.25s (6.5 beats * 0.5s/beat)
      expect(schedule[3]).toBe(3.5);  // Quarter at 3.5s (7 beats * 0.5s/beat)
    });

    it('should return empty array for empty beatGroups', () => {
      const schedule = calculateNoteSchedule([], 4, 60);
      expect(schedule).toEqual([]);
    });
  });

  describe('calculatePieceEndTime', () => {
    it('should calculate end time correctly', () => {
      const beatGroups = [
        { duration: 1 },
        { duration: 1 },
        { duration: 1 },
        { duration: 1 },
      ];
      const countoff = 4;
      const bpm = 60;

      // 4 beat countoff + 4 beats of music = 8 beats = 8 seconds at 60 BPM
      expect(calculatePieceEndTime(beatGroups, countoff, bpm)).toBe(8);
    });

    it('should handle fractional durations', () => {
      const beatGroups = [
        { duration: 0.5 },
        { duration: 0.5 },
        { duration: 1 },
      ];
      const countoff = 4;
      const bpm = 60;

      // 4 beat countoff + 2 beats of music = 6 beats = 6 seconds
      expect(calculatePieceEndTime(beatGroups, countoff, bpm)).toBe(6);
    });
  });

  describe('calculateMetronomeSchedule', () => {
    it('should generate correct schedule for 4 beats', () => {
      const schedule = calculateMetronomeSchedule(4);

      // 4 beats * 4 subdivisions = 16 entries
      expect(schedule.length).toBe(16);

      // Check first beat subdivisions
      expect(schedule[0]).toEqual({ time: '0:0:0', subdivision: 0 });
      expect(schedule[1]).toEqual({ time: '0:0:1', subdivision: 1 });
      expect(schedule[2]).toEqual({ time: '0:0:2', subdivision: 2 });
      expect(schedule[3]).toEqual({ time: '0:0:3', subdivision: 3 });

      // Check second beat
      expect(schedule[4]).toEqual({ time: '0:1:0', subdivision: 0 });
    });

    it('should handle fractional beat totals', () => {
      // 4.5 beats should round up to 5 beats worth of subdivisions
      const schedule = calculateMetronomeSchedule(4.5);
      expect(schedule.length).toBe(18); // ceil(4.5 * 4) = 18
    });

    it('should handle single beat', () => {
      const schedule = calculateMetronomeSchedule(1);
      expect(schedule.length).toBe(4);
      expect(schedule[0]).toEqual({ time: '0:0:0', subdivision: 0 });
      expect(schedule[3]).toEqual({ time: '0:0:3', subdivision: 3 });
    });
  });

  describe('timing precision for eighth notes', () => {
    it('should not have timing collisions for consecutive eighth notes', () => {
      // This tests the bug where eighth notes would get scheduled at the same time
      const beatGroups = [
        { duration: 0.5 },
        { duration: 0.5 },
        { duration: 0.5 },
        { duration: 0.5 },
      ];
      const countoff = 0;
      const bpm = 60;

      const schedule = calculateNoteSchedule(beatGroups, countoff, bpm);

      // All times should be unique
      const uniqueTimes = new Set(schedule);
      expect(uniqueTimes.size).toBe(schedule.length);

      // Times should be evenly spaced
      expect(schedule[0]).toBe(0);
      expect(schedule[1]).toBe(0.5);
      expect(schedule[2]).toBe(1);
      expect(schedule[3]).toBe(1.5);
    });

    it('should maintain precision across many notes', () => {
      // Simulate a full measure of sixteenth notes
      const beatGroups = Array(16).fill({ duration: 0.25 });
      const countoff = 0;
      const bpm = 120;

      const schedule = calculateNoteSchedule(beatGroups, countoff, bpm);

      // At 120 BPM, each sixteenth is 0.125 seconds
      for (let i = 0; i < schedule.length; i++) {
        expect(schedule[i]).toBeCloseTo(i * 0.125, 10);
      }
    });
  });
});
