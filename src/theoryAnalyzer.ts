// Music Theory Analyzer using Tonal.js
// Provides pedagogical hints about musical patterns in generated phrases

import {
  Note,
  Interval,
  Chord,
  Key,
  RomanNumeral,
  Progression,
} from 'tonal';

export interface TheoryHint {
  type: 'scale' | 'chord' | 'interval' | 'pattern' | 'technique';
  title: string;
  description: string;
  notes?: string[];
}

export interface PhraseAnalysis {
  key: string;
  detectedChords: string[];
  scalePattern: string | null;
  intervalPatterns: string[];
  hints: TheoryHint[];
}

// Convert our internal note format to tonal format
function noteToTonal(step: string, alter: number, octave: number): string {
  let note = step;
  if (alter === 1) note += '#';
  if (alter === -1) note += 'b';
  return `${note}${octave}`;
}

// Analyze a sequence of notes for musical patterns
export function analyzePhrase(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  keySignature: string = 'C'
): PhraseAnalysis {
  const hints: TheoryHint[] = [];
  const pitchClasses: string[] = [];
  const tonalNotes: string[] = [];

  // Filter out rests and convert to tonal format
  notes.filter(n => !n.isRest).forEach(n => {
    const tonalNote = noteToTonal(n.step, n.alter, n.octave);
    tonalNotes.push(tonalNote);
    pitchClasses.push(Note.pitchClass(tonalNote));
  });

  if (tonalNotes.length === 0) {
    return {
      key: keySignature,
      detectedChords: [],
      scalePattern: null,
      intervalPatterns: [],
      hints: [],
    };
  }

  // Detect chords from note groups
  const uniquePitchClasses = [...new Set(pitchClasses)];
  const detectedChords = Chord.detect(uniquePitchClasses);

  // Analyze intervals between consecutive notes
  const intervalPatterns: string[] = [];
  for (let i = 0; i < tonalNotes.length - 1; i++) {
    const interval = Interval.distance(tonalNotes[i], tonalNotes[i + 1]);
    intervalPatterns.push(interval);
  }

  // Check for scale patterns
  const keyInfo = Key.majorKey(keySignature);
  const scaleNotes = [...keyInfo.scale]; // Convert readonly to mutable array
  let scalePattern: string | null = null;

  // Check if notes follow scale degrees
  const isScaleRun = checkScaleRun(pitchClasses, scaleNotes);
  if (isScaleRun) {
    scalePattern = `${keySignature} major scale`;
    hints.push({
      type: 'scale',
      title: 'Scale Pattern',
      description: `This phrase follows the ${keySignature} major scale. Practice scales daily!`,
      notes: [...scaleNotes], // Make a copy
    });
  }

  // Check for arpeggio patterns
  if (detectedChords.length > 0) {
    const mainChord = detectedChords[0];
    hints.push({
      type: 'chord',
      title: 'Chord Outline',
      description: `These notes outline a ${mainChord} chord. Try playing the chord first to hear the harmony.`,
      notes: uniquePitchClasses,
    });
  }

  // Analyze interval patterns for teaching hints
  const stepwiseMotion = intervalPatterns.filter(i =>
    i === '2m' || i === '2M' || i === '-2m' || i === '-2M'
  ).length;

  const leaps = intervalPatterns.filter(i => {
    const semitones = Math.abs(Interval.semitones(i) || 0);
    return semitones > 2;
  }).length;

  if (stepwiseMotion > intervalPatterns.length * 0.7) {
    hints.push({
      type: 'pattern',
      title: 'Stepwise Motion',
      description: 'This phrase moves mostly by step (2nds). Focus on smooth finger connections.',
    });
  }

  if (leaps > intervalPatterns.length * 0.3) {
    hints.push({
      type: 'pattern',
      title: 'Melodic Leaps',
      description: 'This phrase has several leaps. Look ahead and prepare your hand position.',
    });
  }

  // Check for specific interval patterns
  const hasOctave = intervalPatterns.some(i => i === '8P' || i === '-8P');
  if (hasOctave) {
    hints.push({
      type: 'interval',
      title: 'Octave Jump',
      description: 'There\'s an octave in this phrase. Keep your thumb ready for quick repositioning.',
    });
  }

  // Check for repeated notes
  const hasRepeats = intervalPatterns.some(i => i === '1P');
  if (hasRepeats) {
    hints.push({
      type: 'technique',
      title: 'Repeated Notes',
      description: 'Use finger substitution or alternating fingers for repeated notes at faster tempos.',
    });
  }

  // Add key-specific hints for new keys
  if (keySignature !== 'C') {
    const keyData = Key.majorKey(keySignature);
    const accidentals = keyData.alteration;
    const accType = accidentals > 0 ? 'sharp' : 'flat';
    const count = Math.abs(accidentals);

    hints.push({
      type: 'technique',
      title: `${keySignature} Major Key`,
      description: `Remember: ${count} ${accType}${count !== 1 ? 's' : ''} in this key. ${getKeyMemoryTip(keySignature)}`,
    });
  }

  return {
    key: keySignature,
    detectedChords,
    scalePattern,
    intervalPatterns,
    hints,
  };
}

// Check if notes follow a scale pattern
function checkScaleRun(pitchClasses: string[], scale: string[]): boolean {
  if (pitchClasses.length < 3) return false;

  // Normalize both to pitch classes
  const normalizedScale = scale.map(n => Note.pitchClass(n));

  // Check if consecutive notes are adjacent scale degrees
  let consecutiveScaleSteps = 0;
  for (let i = 0; i < pitchClasses.length - 1; i++) {
    const idx1 = normalizedScale.indexOf(pitchClasses[i]);
    const idx2 = normalizedScale.indexOf(pitchClasses[i + 1]);

    if (idx1 !== -1 && idx2 !== -1) {
      const diff = Math.abs(idx2 - idx1);
      if (diff === 1 || diff === 6) { // Adjacent or wrapping around
        consecutiveScaleSteps++;
      }
    }
  }

  return consecutiveScaleSteps >= (pitchClasses.length - 1) * 0.6;
}

// Memory tips for key signatures
function getKeyMemoryTip(key: string): string {
  const tips: Record<string, string> = {
    'G': 'F# is on the top line of treble clef.',
    'F': 'Bb is on the middle line of treble clef.',
    'D': 'F# and C# - remember "Father Charles".',
    'Bb': 'Bb and Eb - the two "left-side" flats.',
    'A': 'Three sharps: F#, C#, G# - they go up by fifths.',
    'Eb': 'Three flats: Bb, Eb, Ab - they go down by fifths.',
    'E': 'Four sharps - watch for D#!',
    'Ab': 'Four flats - watch for Db!',
    'B': 'Five sharps - almost all black keys!',
    'Db': 'Five flats - Gb is the "new" one.',
  };
  return tips[key] || 'Watch for the accidentals!';
}

// Analyze melodic contour (shape of the melody)
export function analyzeMelodicContour(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>
): string {
  const pitches = notes
    .filter(n => !n.isRest)
    .map(n => Note.midi(noteToTonal(n.step, n.alter, n.octave)) || 60);

  if (pitches.length < 2) return 'single note';

  const direction: number[] = [];
  for (let i = 0; i < pitches.length - 1; i++) {
    if (pitches[i + 1] > pitches[i]) direction.push(1);
    else if (pitches[i + 1] < pitches[i]) direction.push(-1);
    else direction.push(0);
  }

  const ascending = direction.filter(d => d === 1).length;
  const descending = direction.filter(d => d === -1).length;

  if (ascending > descending * 2) return 'ascending';
  if (descending > ascending * 2) return 'descending';
  if (ascending > 0 && descending > 0) return 'wave-like';
  return 'static';
}

// Get roman numeral analysis for educational purposes
export function getRomanNumeralHint(
  chordName: string,
  keySignature: string
): string | null {
  try {
    const rn = RomanNumeral.get(Progression.toRomanNumerals(keySignature, [chordName])[0]);
    if (rn && rn.name) {
      return `This is the ${rn.name} chord in ${keySignature} major.`;
    }
  } catch {
    // Chord might not fit in the key
  }
  return null;
}

// Export analysis summary for display
// Level parameter controls which hints are appropriate for the student
export function getAnalysisSummary(analysis: PhraseAnalysis, level: number = 7): string {
  if (analysis.hints.length === 0) {
    return '';
  }

  // Filter hints based on level - beginners shouldn't see complex theory
  let allowedTypes: string[];
  if (level <= 2) {
    // Levels 1-2: Only basic pattern hints (up/down motion)
    allowedTypes = ['pattern'];
  } else if (level <= 4) {
    // Levels 3-4: Add scale hints
    allowedTypes = ['pattern', 'scale'];
  } else if (level <= 6) {
    // Levels 5-6: Add interval hints
    allowedTypes = ['pattern', 'scale', 'interval', 'technique'];
  } else {
    // Level 7+: Full theory hints including chords
    allowedTypes = ['chord', 'scale', 'pattern', 'technique', 'interval'];
  }

  // Return the most relevant hint that's appropriate for this level
  // Prioritize simpler concepts first for earlier levels
  const priorityOrder = level <= 4
    ? ['pattern', 'scale', 'technique', 'interval', 'chord']
    : ['chord', 'scale', 'pattern', 'technique', 'interval'];

  for (const type of priorityOrder) {
    if (!allowedTypes.includes(type)) continue;
    const hint = analysis.hints.find(h => h.type === type);
    if (hint) {
      return `${hint.title}: ${hint.description}`;
    }
  }

  return '';
}
