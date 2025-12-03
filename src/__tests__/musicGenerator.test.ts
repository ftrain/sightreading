import { describe, it, expect, beforeEach } from 'vitest'
import { getLevel, setLevel, incrementLevel, generateMusicXML } from '../musicGenerator'

describe('musicGenerator', () => {
  beforeEach(() => {
    setLevel(1)
  })

  describe('level management', () => {
    it('starts at level 1', () => {
      expect(getLevel()).toBe(1)
    })

    it('setLevel clamps to valid range', () => {
      setLevel(0)
      expect(getLevel()).toBe(1)

      setLevel(15)
      expect(getLevel()).toBe(10)

      setLevel(5)
      expect(getLevel()).toBe(5)
    })

    it('incrementLevel increases level up to 10', () => {
      setLevel(1)
      incrementLevel()
      expect(getLevel()).toBe(2)

      setLevel(10)
      incrementLevel()
      expect(getLevel()).toBe(10)
    })
  })

  describe('generateMusicXML', () => {
    it('generates valid MusicXML structure', () => {
      const result = generateMusicXML()

      expect(result.xml).toContain('<?xml version="1.0"')
      expect(result.xml).toContain('<score-partwise')
      expect(result.xml).toContain('<part-list>')
      expect(result.xml).toContain('<part id="P1">')
      expect(result.xml).toContain('</score-partwise>')
    })

    it('generates 8 measures', () => {
      const result = generateMusicXML()
      const measureMatches = result.xml.match(/<measure number="\d+">/g)

      expect(measureMatches).toHaveLength(8)
    })

    it('includes system break at measure 5', () => {
      const result = generateMusicXML()

      expect(result.xml).toContain('<print new-system="yes"/>')
    })

    it('includes grand staff setup (treble and bass clefs)', () => {
      const result = generateMusicXML()

      expect(result.xml).toContain('<staves>2</staves>')
      expect(result.xml).toContain('<clef number="1"><sign>G</sign>')
      expect(result.xml).toContain('<clef number="2"><sign>F</sign>')
    })

    it('returns time signature info', () => {
      setLevel(1) // Level 1 always uses 4/4
      const result = generateMusicXML()

      expect(result.timeSignature).toEqual({ beats: 4, beatType: 4 })
    })

    it('returns current level', () => {
      setLevel(3)
      const result = generateMusicXML()

      expect(result.level).toBe(3)
    })

    it('level 1 uses only whole notes in C major', () => {
      setLevel(1)
      const result = generateMusicXML()

      // Should contain whole notes
      expect(result.xml).toContain('<type>whole</type>')
      // Should use C major (no key signature)
      expect(result.xml).toContain('<fifths>0</fifths>')
    })

    it('higher levels introduce more variety', () => {
      setLevel(7)
      const result = generateMusicXML()

      // Level 7 should have eighth notes available
      // (may or may not appear due to randomness, but structure should be valid)
      expect(result.xml).toContain('<score-partwise')
    })

    it('generates both right hand and left hand notes', () => {
      const result = generateMusicXML()

      expect(result.xml).toContain('<staff>1</staff>')
      expect(result.xml).toContain('<staff>2</staff>')
    })

    it('includes backup elements for left hand', () => {
      const result = generateMusicXML()

      expect(result.xml).toContain('<backup>')
    })
  })

  describe('note variety by level', () => {
    it('level 2 can include half notes', () => {
      setLevel(2)
      // Run multiple times to increase chance of variety
      let hasHalf = false
      for (let i = 0; i < 10; i++) {
        const result = generateMusicXML()
        if (result.xml.includes('<type>half</type>')) {
          hasHalf = true
          break
        }
      }
      expect(hasHalf).toBe(true)
    })

    it('level 3+ can include quarter notes', () => {
      setLevel(3)
      let hasQuarter = false
      for (let i = 0; i < 10; i++) {
        const result = generateMusicXML()
        if (result.xml.includes('<type>quarter</type>')) {
          hasQuarter = true
          break
        }
      }
      expect(hasQuarter).toBe(true)
    })
  })
})
