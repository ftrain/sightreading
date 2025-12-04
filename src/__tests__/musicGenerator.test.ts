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
  getCurrentBpm,
  getSuggestedBpm,
  shouldIncreaseTempo,
  increaseTempo,
  setBpm,
  getBpmMasteryRemaining,
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

    it('should clamp level to valid range (1-20)', () => {
      setLevel(0);
      expect(getLevel()).toBe(1);

      setLevel(25);
      expect(getLevel()).toBe(20);
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

    it('should not advance past level 20', () => {
      setLevel(20);
      setSubLevel(3);
      // Complete sub-level 3 at level 20
      for (let rep = 0; rep < 3; rep++) {
        incrementLevel();
      }
      expect(getLevel()).toBe(20);
    });

    it('should reset progress correctly', () => {
      setLevel(5);
      setSubLevel(2);
      incrementLevel();

      resetProgress();

      expect(getLevel()).toBe(1);
      expect(getSubLevel()).toBe(0);
      expect(getRepetitionsRemaining()).toBe(3);
      expect(getCurrentBpm()).toBe(30);
    });
  });

  describe('Tempo Management', () => {
    it('should start at BPM 30', () => {
      expect(getCurrentBpm()).toBe(30);
    });

    it('should suggest appropriate BPM for each level', () => {
      expect(getSuggestedBpm(1)).toBe(30);
      expect(getSuggestedBpm(2)).toBe(30);
      expect(getSuggestedBpm(3)).toBe(40);
      expect(getSuggestedBpm(7)).toBe(60);
    });

    it('should set BPM when level changes', () => {
      setLevel(3);
      expect(getCurrentBpm()).toBe(getSuggestedBpm(3));
    });

    it('should allow manual BPM setting', () => {
      setBpm(120);
      expect(getCurrentBpm()).toBe(120);
    });

    it('should clamp BPM to valid range', () => {
      setBpm(10);
      expect(getCurrentBpm()).toBe(20);

      setBpm(250);
      expect(getCurrentBpm()).toBe(200);
    });

    it('should track tempo mastery separately', () => {
      expect(getBpmMasteryRemaining()).toBe(3);

      incrementLevel();
      expect(getBpmMasteryRemaining()).toBe(2);

      incrementLevel();
      expect(getBpmMasteryRemaining()).toBe(1);

      incrementLevel();
      // Tempo mastery should continue even after sub-level advances
      expect(shouldIncreaseTempo()).toBe(true);
    });

    it('should reset tempo mastery when tempo increases', () => {
      // Build up tempo mastery
      for (let i = 0; i < 3; i++) {
        incrementLevel();
      }
      expect(shouldIncreaseTempo()).toBe(true);

      const oldBpm = getCurrentBpm();
      increaseTempo();
      expect(getCurrentBpm()).toBe(oldBpm + 5);
      expect(shouldIncreaseTempo()).toBe(false);
      expect(getBpmMasteryRemaining()).toBe(3);
    });
  });

  describe('Mobile Mode', () => {
    it('should default to desktop mode', () => {
      expect(isMobileMode()).toBe(false);
    });

    it('should always generate 4 measures', () => {
      // Both mobile and desktop now use 4 measures for cleaner layout
      setMobileMode(false);
      let result = generateMusicXML();
      expect(result.numMeasures).toBe(4);

      setMobileMode(true);
      expect(isMobileMode()).toBe(true);
      result = generateMusicXML();
      expect(result.numMeasures).toBe(4);
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

    it('should include suggested BPM in result', () => {
      const result = generateMusicXML();
      expect(result.suggestedBpm).toBeDefined();
      expect(result.suggestedBpm).toBeGreaterThan(0);
    });

    it('should include key name in result', () => {
      const result = generateMusicXML();
      expect(result.keyName).toBeDefined();
      expect(result.keyName).toBe('C major');
    });

    it('should generate the correct number of measures', () => {
      const result = generateMusicXML();
      const measureMatches = result.xml.match(/<measure number="/g);
      expect(measureMatches).toHaveLength(4); // Always 4 measures now
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

    it('should generate half notes at level 4', () => {
      // Level 4 introduces half notes (levels 1-3 are whole notes with RH, LH, both)
      setLevel(4);
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

    it('should generate quarter notes at level 5', () => {
      // Level 5 introduces quarter notes
      setLevel(5);
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

    it('should generate dotted notes at level 7+', () => {
      // Level 7 introduces dotted notes
      setLevel(7);
      let foundDottedNote = false;
      for (let i = 0; i < 20; i++) {
        const result = generateMusicXML();
        if (result.xml.includes('<dot/>')) {
          foundDottedNote = true;
          break;
        }
      }
      expect(foundDottedNote).toBe(true);
    });
  });

  describe('Key Progression (Level 8+)', () => {
    it('should use G major at level 8', () => {
      setLevel(8);
      const result = generateMusicXML();
      expect(result.keyName).toBe('G major');
      expect(result.xml).toContain('<fifths>1</fifths>');
    });

    it('should use F major at level 9', () => {
      setLevel(9);
      const result = generateMusicXML();
      expect(result.keyName).toBe('F major');
      expect(result.xml).toContain('<fifths>-1</fifths>');
    });

    it('should use D major at level 10', () => {
      setLevel(10);
      const result = generateMusicXML();
      expect(result.keyName).toBe('D major');
      expect(result.xml).toContain('<fifths>2</fifths>');
    });

    it('should reset to whole notes at sub-level 0 for new keys', () => {
      setLevel(8);
      setSubLevel(0);
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

    it('should include key name in lesson description for level 8+', () => {
      setLevel(8);
      const result = generateMusicXML();
      expect(result.lessonDescription).toContain('G major');
    });
  });

  describe('Lesson Descriptions', () => {
    it('should have correct description for level 1a (RH)', () => {
      setLevel(1);
      setSubLevel(0);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('C and G — whole notes (RH)');
    });

    it('should have correct description for level 1b (RH)', () => {
      setLevel(1);
      setSubLevel(1);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('C, E, G triad — whole notes (RH)');
    });

    it('should have correct description for level 2a (LH)', () => {
      setLevel(2);
      setSubLevel(0);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('C and G — whole notes (LH)');
    });

    it('should have correct description for level 3a (both hands)', () => {
      setLevel(3);
      setSubLevel(0);
      const result = generateMusicXML();
      expect(result.lessonDescription).toBe('Simple coordination — whole notes');
    });
  });

  describe('Layout', () => {
    it('should not include system breaks with 4 measures', () => {
      // With 4 measures, everything fits on one line - no system breaks needed
      const result = generateMusicXML();
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

    it('should support progression through all 20 levels', () => {
      setLevel(15);
      expect(getLevel()).toBe(15);

      // Advance one level
      for (let sub = 0; sub < 4; sub++) {
        for (let rep = 0; rep < 3; rep++) {
          incrementLevel();
        }
      }
      expect(getLevel()).toBe(16);
    });
  });
});
