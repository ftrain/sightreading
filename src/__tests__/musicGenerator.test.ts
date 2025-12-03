import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMusicXML,
  getLevel,
  setLevel,
  incrementLevel,
  getSubLevel,
  getFullLevelString,
  getRepetitionsRemaining,
  setMobileMode,
  isMobileMode,
  resetProgress,
  setSubLevel,
} from '../musicGenerator';

describe('musicGenerator', () => {
  beforeEach(() => {
    resetProgress();
    setMobileMode(false);
  });

  describe('Level Management', () => {
    it('should start at level 1, sub-level 0', () => {
      expect(getLevel()).toBe(1);
      expect(getSubLevel()).toBe(0);
    });

    it('should format level as "1a" for level 1 sub-level 0', () => {
      expect(getFullLevelString()).toBe('1a');
    });

    it('should format level correctly for all sub-levels', () => {
      setSubLevel(0);
      expect(getFullLevelString()).toBe('1a');
      setSubLevel(1);
      expect(getFullLevelString()).toBe('1b');
      setSubLevel(2);
      expect(getFullLevelString()).toBe('1c');
      setSubLevel(3);
      expect(getFullLevelString()).toBe('1d');
    });

    it('should clamp level to valid range (1-10)', () => {
      setLevel(0);
      expect(getLevel()).toBe(1);

      setLevel(15);
      expect(getLevel()).toBe(10);
    });

    it('should require 3 successful plays to advance sub-level', () => {
      expect(getSubLevel()).toBe(0);
      expect(getRepetitionsRemaining()).toBe(3);

      incrementLevel();
      expect(getSubLevel()).toBe(0);
      expect(getRepetitionsRemaining()).toBe(2);

      incrementLevel();
      expect(getSubLevel()).toBe(0);
      expect(getRepetitionsRemaining()).toBe(1);

      incrementLevel();
      expect(getSubLevel()).toBe(1); // Advanced to sub-level 1
      expect(getRepetitionsRemaining()).toBe(3);
    });

    it('should advance main level after completing all sub-levels', () => {
      // Complete all 4 sub-levels (0, 1, 2, 3)
      for (let subLevel = 0; subLevel < 4; subLevel++) {
        for (let rep = 0; rep < 3; rep++) {
          incrementLevel();
        }
      }
      expect(getLevel()).toBe(2);
      expect(getSubLevel()).toBe(0);
    });

    it('should not advance past level 10', () => {
      setLevel(10);
      setSubLevel(3);
      // Complete sub-level 3 at level 10
      for (let rep = 0; rep < 3; rep++) {
        incrementLevel();
      }
      expect(getLevel()).toBe(10);
    });

    it('should reset progress correctly', () => {
      setLevel(5);
      setSubLevel(2);
      incrementLevel();

      resetProgress();

      expect(getLevel()).toBe(1);
      expect(getSubLevel()).toBe(0);
      expect(getRepetitionsRemaining()).toBe(3);
    });
  });

  describe('Mobile Mode', () => {
    it('should default to desktop mode (8 measures)', () => {
      expect(isMobileMode()).toBe(false);
      const result = generateMusicXML();
      expect(result.numMeasures).toBe(8);
    });

    it('should generate 4 measures in mobile mode', () => {
      setMobileMode(true);
      expect(isMobileMode()).toBe(true);
      const result = generateMusicXML();
      expect(result.numMeasures).toBe(4);
    });

    it('should generate 8 measures in desktop mode', () => {
      setMobileMode(false);
      const result = generateMusicXML();
      expect(result.numMeasures).toBe(8);
    });
  });

  describe('MusicXML Generation', () => {
    it('should generate valid XML', () => {
      const result = generateMusicXML();
      expect(result.xml).toContain('<?xml version="1.0"');
      expect(result.xml).toContain('score-partwise');
    });

    it('should include time signature in result', () => {
      const result = generateMusicXML();
      expect(result.timeSignature).toBeDefined();
      expect(result.timeSignature.beats).toBeGreaterThan(0);
      expect(result.timeSignature.beatType).toBeGreaterThan(0);
    });

    it('should include lesson description', () => {
      const result = generateMusicXML();
      expect(result.lessonDescription).toBeDefined();
      expect(result.lessonDescription.length).toBeGreaterThan(0);
    });

    it('should include level and sub-level in result', () => {
      const result = generateMusicXML();
      expect(result.level).toBe(1);
      expect(result.subLevel).toBe(0);
    });

    it('should generate the correct number of measures', () => {
      const result = generateMusicXML();
      const measureMatches = result.xml.match(/<measure number="/g);
      expect(measureMatches).toHaveLength(8);
    });

    it('should include grand staff setup', () => {
      const result = generateMusicXML();
      expect(result.xml).toContain('<staves>2</staves>');
      expect(result.xml).toContain('<sign>G</sign>'); // Treble clef
      expect(result.xml).toContain('<sign>F</sign>'); // Bass clef
    });

    it('includes backup elements for left hand', () => {
      const result = generateMusicXML();
      expect(result.xml).toContain('<backup>');
    });

    it('generates both right hand and left hand notes', () => {
      const result = generateMusicXML();
      expect(result.xml).toContain('<staff>1</staff>');
      expect(result.xml).toContain('<staff>2</staff>');
    });
  });

  describe('Level-Specific Content', () => {
    it('should generate whole notes at level 1', () => {
      setLevel(1);
      // Run multiple times to account for randomness
      let foundWholeNote = false;
      for (let i = 0; i < 10; i++) {
        const result = generateMusicXML();
        if (result.xml.includes('<type>whole</type>')) {
          foundWholeNote = true;
          break;
        }
      }
      expect(foundWholeNote).toBe(true);
    });

    it('should have C major key at level 1', () => {
      setLevel(1);
      const result = generateMusicXML();
      expect(result.xml).toContain('<fifths>0</fifths>');
    });

    it('should have 4/4 time at level 1', () => {
      setLevel(1);
      const result = generateMusicXML();
      expect(result.xml).toContain('<beats>4</beats>');
      expect(result.xml).toContain('<beat-type>4</beat-type>');
    });

    it('should generate half notes at level 2', () => {
      setLevel(2);
      let foundHalfNote = false;
      for (let i = 0; i < 10; i++) {
        const result = generateMusicXML();
        if (result.xml.includes('<type>half</type>')) {
          foundHalfNote = true;
          break;
        }
      }
      expect(foundHalfNote).toBe(true);
    });

    it('should generate quarter notes at level 3', () => {
      setLevel(3);
      let foundQuarterNote = false;
      for (let i = 0; i < 10; i++) {
        const result = generateMusicXML();
        if (result.xml.includes('<type>quarter</type>')) {
          foundQuarterNote = true;
          break;
        }
      }
      expect(foundQuarterNote).toBe(true);
    });

    it('should potentially include eighth notes at level 7+', () => {
      setLevel(7);
      let foundEighthNote = false;
      for (let i = 0; i < 20; i++) {
        const result = generateMusicXML();
        if (result.xml.includes('<type>eighth</type>')) {
          foundEighthNote = true;
          break;
        }
      }
      expect(foundEighthNote).toBe(true);
    });
  });

  describe('Lesson Descriptions', () => {
    it('should have correct description for level 1a', () => {
      setLevel(1);
      setSubLevel(0);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('C and G only - whole notes');
    });

    it('should have correct description for level 1b', () => {
      setLevel(1);
      setSubLevel(1);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('C, E, and G - whole notes');
    });

    it('should have correct description for level 2a', () => {
      setLevel(2);
      setSubLevel(0);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('Half notes - C and G');
    });
  });

  describe('System Breaks', () => {
    it('should include system break in desktop mode (8 measures)', () => {
      setMobileMode(false);
      const result = generateMusicXML();
      expect(result.xml).toContain('new-system="yes"');
    });

    it('should not include system break in mobile mode (4 measures)', () => {
      setMobileMode(true);
      const result = generateMusicXML();
      // In 4-bar mode, no system break is needed
      expect(result.xml).not.toContain('new-system="yes"');
    });
  });

  describe('Note Generation', () => {
    it('should generate notes within valid range', () => {
      for (let level = 1; level <= 10; level++) {
        setLevel(level);
        const result = generateMusicXML();
        // Check that notes have valid steps (A-G)
        const stepMatches = result.xml.match(/<step>([A-G])<\/step>/g);
        expect(stepMatches).not.toBeNull();
        if (stepMatches) {
          stepMatches.forEach((match) => {
            const step = match.match(/<step>([A-G])<\/step>/)?.[1];
            expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(step);
          });
        }
      }
    });

    it('should generate notes with valid octaves', () => {
      const result = generateMusicXML();
      const octaveMatches = result.xml.match(/<octave>(\d)<\/octave>/g);
      expect(octaveMatches).not.toBeNull();
      if (octaveMatches) {
        octaveMatches.forEach((match) => {
          const octave = parseInt(match.match(/<octave>(\d)<\/octave>/)?.[1] || '0');
          expect(octave).toBeGreaterThanOrEqual(2);
          expect(octave).toBeLessThanOrEqual(6);
        });
      }
    });
  });

  describe('Progression System', () => {
    it('should take 12 successful plays to advance one main level', () => {
      // 4 sub-levels × 3 repetitions each = 12 total
      const startLevel = getLevel();
      for (let i = 0; i < 12; i++) {
        incrementLevel();
      }
      expect(getLevel()).toBe(startLevel + 1);
    });

    it('should take correct number of plays to go from level 1 to 10', () => {
      // Level 1 -> 10 = 9 level advancements
      // 9 × 12 = 108 successful plays
      for (let level = 1; level < 10; level++) {
        for (let sub = 0; sub < 4; sub++) {
          for (let rep = 0; rep < 3; rep++) {
            incrementLevel();
          }
        }
      }
      expect(getLevel()).toBe(10);
    });
  });
});
