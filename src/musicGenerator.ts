// Pedagogically-Sound Sight Reading Generator
// Designed with input from piano teaching methodology
//
// Philosophy:
// - Repetition is key to mastery
// - Progress should feel incremental and achievable
// - Each sub-level introduces ONE new concept
// - Folk and classical melodic patterns aid memorability
// - Musical coherence helps students understand phrasing

export interface GeneratedMusic {
  xml: string;
  timeSignature: { beats: number; beatType: number };
  level: number;
  subLevel: number;
  lessonDescription: string;
  numMeasures: number;
}

// Level structure: Level 1a, 1b, 1c... 2a, 2b, 2c... etc.
// Each level has 4 sub-levels to master before advancing
interface LevelProgress {
  level: number;
  subLevel: number; // 0-3 (a, b, c, d)
  repetitions: number; // How many times this sub-level has been practiced
}

let progress: LevelProgress = {
  level: 1,
  subLevel: 0,
  repetitions: 0,
};

// Mastery requirements: need 3 successful plays to advance sub-level
const MASTERY_THRESHOLD = 3;

// Mobile mode: 4 measures instead of 8
let mobileMode = false;

export function setMobileMode(mobile: boolean): void {
  mobileMode = mobile;
}

export function isMobileMode(): boolean {
  return mobileMode;
}

export function getLevel(): number {
  return progress.level;
}

export function getSubLevel(): number {
  return progress.subLevel;
}

export function getSubLevelLetter(): string {
  return ['a', 'b', 'c', 'd'][progress.subLevel] || 'a';
}

export function getFullLevelString(): string {
  return `${progress.level}${getSubLevelLetter()}`;
}

export function setLevel(level: number): void {
  progress.level = Math.max(1, Math.min(10, level));
  progress.subLevel = 0;
  progress.repetitions = 0;
}

export function setSubLevel(subLevel: number): void {
  progress.subLevel = Math.max(0, Math.min(3, subLevel));
  progress.repetitions = 0;
}

export function incrementLevel(): void {
  progress.repetitions++;

  // Need MASTERY_THRESHOLD successful plays to advance
  if (progress.repetitions >= MASTERY_THRESHOLD) {
    progress.repetitions = 0;
    progress.subLevel++;

    // If we've completed all sub-levels, advance to next level
    if (progress.subLevel >= 4) {
      progress.subLevel = 0;
      progress.level = Math.min(10, progress.level + 1);
    }
  }
}

export function resetProgress(): void {
  progress = { level: 1, subLevel: 0, repetitions: 0 };
}

export function getRepetitionsRemaining(): number {
  return Math.max(0, MASTERY_THRESHOLD - progress.repetitions);
}

// ============================================
// LESSON STRUCTURE
// ============================================
// Each level focuses on specific skills
// Sub-levels provide gentle incremental progression
//
// Level 1: Middle C position (C-G), whole notes only
//   1a: Just C and G (two notes)
//   1b: Add E (three notes)
//   1c: Add D and F (five notes)
//   1d: All notes C-G with focus on stepwise motion
//
// Level 2: Half notes introduction
//   2a: Half notes only, C and G
//   2b: Half notes, C-E-G (triad outline)
//   2c: Mix of whole and half notes
//   2d: Longer phrases with whole/half
//
// Level 3: Quarter notes introduction
//   3a: Quarter notes in simple patterns (stepwise)
//   3b: Quarter notes with small skips
//   3c: Mix of quarter and half notes
//   3d: Full rhythmic variety (whole, half, quarter)
//
// Level 4: Rests introduction
//   4a: Quarter rests only
//   4b: Half rests
//   4c: Mix of rest types
//   4d: Musical phrases with rests
//
// Level 5: Accidentals (sharps/flats)
//   5a: F# only (leading tone)
//   5b: Bb only (subdominant)
//   5c: Common accidentals
//   5d: Chromatic neighbor tones
//
// Level 6: Left hand focus
//   6a: Bass clef reading, C-G
//   6b: Longer bass patterns
//   6c: Both hands with simple coordination
//   6d: Hands together practice
//
// Level 7: Eighth notes
//   7a: Paired eighths on beats
//   7b: Eighth note patterns
//   7c: Mix with quarters
//   7d: Syncopation introduction
//
// Level 8+: Advanced concepts (time signatures, keys)

interface NoteData {
  step: string;
  alter: number;
  octave: number;
  duration: number;
  isRest: boolean;
}

// ============================================
// FOLK AND CLASSICAL MELODIC PATTERNS
// ============================================
// These patterns are based on common melodic fragments from
// folk music and classical repertoire, adapted for beginners

// Stepwise patterns (scale fragments) - numbered from scale degree
const stepwisePatterns = [
  [1, 2, 3], // Do-Re-Mi
  [3, 2, 1], // Mi-Re-Do
  [1, 2, 3, 2, 1], // Up and back
  [5, 4, 3], // Sol-Fa-Mi
  [3, 4, 5], // Mi-Fa-Sol
  [1, 2, 3, 4, 5], // Scale ascending
  [5, 4, 3, 2, 1], // Scale descending
  [1, 2, 1], // Neighbor tone
  [3, 2, 3], // Upper neighbor
  [5, 6, 5], // Sol-La-Sol
];

// Triadic patterns (arpeggios)
const triadicPatterns = [
  [1, 3, 5], // C-E-G (major triad)
  [5, 3, 1], // G-E-C (descending)
  [1, 3, 5, 3], // Up and back
  [5, 3, 1, 3], // Down and up
  [1, 5, 3], // C-G-E
  [3, 1, 5], // E-C-G
];

// Folk melody fragments (simplified versions of famous melodies)
const folkPatterns = [
  // "Mary Had a Little Lamb" fragment
  [3, 2, 1, 2, 3, 3, 3],
  // "Twinkle Twinkle" opening
  [1, 1, 5, 5, 6, 6, 5],
  // "Hot Cross Buns"
  [3, 2, 1],
  // "Merrily We Roll Along"
  [3, 2, 1, 2, 3, 3, 3],
  // "Ode to Joy" fragment
  [3, 3, 4, 5, 5, 4, 3, 2],
  // "Au Clair de la Lune" fragment
  [1, 1, 1, 2, 3, 2, 1, 3, 2, 2, 1],
  // "Frère Jacques" fragment
  [1, 2, 3, 1],
  // "Row Row Row Your Boat" fragment
  [1, 1, 1, 2, 3],
  // "London Bridge" fragment
  [5, 4, 3, 4, 5, 5, 5],
];

// Classical patterns (simplified versions)
const classicalPatterns = [
  // Bach-style bass patterns
  [1, 5, 3, 5],
  [1, 3, 5, 3],
  // Mozart-style Alberti bass
  [1, 5, 3, 5, 1, 5, 3, 5],
  // Beethoven "Für Elise" fragment (simplified)
  [5, 4, 5, 4, 5, 2, 4, 3, 1],
  // Chopin nocturne bass
  [1, 5, 3],
  // Simple cadential pattern
  [5, 4, 3, 2, 1],
];

// ============================================
// LESSON DESCRIPTIONS
// ============================================
const lessonDescriptions: Record<string, string> = {
  '1a': 'C and G only - whole notes',
  '1b': 'C, E, and G - whole notes',
  '1c': 'C through G - whole notes',
  '1d': 'Stepwise melodies - whole notes',
  '2a': 'Half notes - C and G',
  '2b': 'Half notes - C, E, G triad',
  '2c': 'Mixing whole and half notes',
  '2d': 'Longer phrases',
  '3a': 'Quarter notes - stepwise',
  '3b': 'Quarter notes - with skips',
  '3c': 'Quarter and half notes mixed',
  '3d': 'Full rhythmic variety',
  '4a': 'Quarter rests',
  '4b': 'Half rests',
  '4c': 'Mixed rests',
  '4d': 'Musical phrasing with rests',
  '5a': 'Introducing F#',
  '5b': 'Introducing Bb',
  '5c': 'Common accidentals',
  '5d': 'Chromatic neighbor tones',
  '6a': 'Bass clef reading',
  '6b': 'Bass patterns',
  '6c': 'Simple coordination',
  '6d': 'Hands together',
  '7a': 'Paired eighth notes',
  '7b': 'Eighth note patterns',
  '7c': 'Mixing eighths and quarters',
  '7d': 'Syncopation basics',
  '8a': '3/4 time signature',
  '8b': '2/4 time signature',
  '8c': 'G major key',
  '8d': 'F major key',
  '9a': 'D major key',
  '9b': 'Wider intervals',
  '9c': 'Complex rhythms',
  '9d': 'Performance preparation',
  '10a': 'Full complexity',
  '10b': 'Concert pieces',
  '10c': 'Sight reading mastery',
  '10d': 'Advanced musicianship',
};

// ============================================
// SCALES AND KEYS
// ============================================
const scales: Record<string, string[]> = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaleDegreeToNote(
  degree: number,
  key: string,
  baseOctave: number
): { step: string; alter: number; octave: number } {
  const scale = scales[key] || scales['C'];
  const normalizedDegree = ((degree - 1) % 7 + 7) % 7;
  const octaveOffset = Math.floor((degree - 1) / 7);
  const noteName = scale[normalizedDegree];

  const step = noteName[0];
  let alter = 0;
  if (noteName.includes('#')) alter = 1;
  if (noteName.includes('b')) alter = -1;

  return { step, alter, octave: baseOctave + octaveOffset };
}

// ============================================
// LEVEL-SPECIFIC CONFIGURATION
// ============================================
interface LevelConfig {
  durations: number[];
  restProbability: number;
  accidentalProbability: number;
  maxInterval: number;
  key: { name: string; fifths: number };
  timeSignature: { beats: number; beatType: number };
  noteRange: number[]; // Scale degrees to use
  patterns: number[][]; // Which melodic patterns to use
  includeLeftHand: boolean;
  description: string;
}

function getLevelConfig(level: number, subLevel: number): LevelConfig {
  const key = getFullLevelString();

  // Default configuration
  const config: LevelConfig = {
    durations: [4],
    restProbability: 0,
    accidentalProbability: 0,
    maxInterval: 2,
    key: { name: 'C', fifths: 0 },
    timeSignature: { beats: 4, beatType: 4 },
    noteRange: [1, 3, 5],
    patterns: stepwisePatterns.slice(0, 3),
    includeLeftHand: level >= 6,
    description: lessonDescriptions[key] || `Level ${level}${['a', 'b', 'c', 'd'][subLevel]}`,
  };

  // Level 1: Whole notes only, limited range
  if (level === 1) {
    config.durations = [4];
    config.restProbability = 0;
    config.maxInterval = 2;

    switch (subLevel) {
      case 0: // 1a: Just C and G
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1], [1, 1, 5], [5, 5, 1]];
        break;
      case 1: // 1b: Add E
        config.noteRange = [1, 3, 5];
        config.patterns = [[1, 3, 5], [5, 3, 1], [1, 3], [3, 5]];
        break;
      case 2: // 1c: C through G
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4, 5]];
        break;
      case 3: // 1d: All with stepwise focus
        config.noteRange = [1, 2, 3, 4, 5];
        config.patterns = stepwisePatterns;
        break;
    }
  }

  // Level 2: Half notes
  else if (level === 2) {
    config.noteRange = [1, 2, 3, 4, 5];

    switch (subLevel) {
      case 0:
        config.durations = [2];
        config.noteRange = [1, 5];
        config.patterns = [[1, 5], [5, 1]];
        break;
      case 1:
        config.durations = [2];
        config.patterns = triadicPatterns;
        break;
      case 2:
        config.durations = [4, 2];
        config.patterns = [...stepwisePatterns.slice(0, 5), ...triadicPatterns.slice(0, 3)];
        break;
      case 3:
        config.durations = [4, 2, 2];
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
    }
  }

  // Level 3: Quarter notes
  else if (level === 3) {
    config.noteRange = [1, 2, 3, 4, 5, 6];

    switch (subLevel) {
      case 0:
        config.durations = [1];
        config.maxInterval = 1;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.durations = [1];
        config.maxInterval = 2;
        config.patterns = [...stepwisePatterns, ...triadicPatterns.slice(0, 3)];
        break;
      case 2:
        config.durations = [1, 2];
        config.patterns = [...folkPatterns.slice(0, 3)];
        break;
      case 3:
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns.slice(0, 5)];
        break;
    }
  }

  // Level 4: Rests
  else if (level === 4) {
    config.noteRange = [1, 2, 3, 4, 5, 6];
    config.durations = [1, 2];

    switch (subLevel) {
      case 0:
        config.restProbability = 0.15;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.restProbability = 0.2;
        config.durations = [2, 1];
        config.patterns = folkPatterns.slice(0, 4);
        break;
      case 2:
        config.restProbability = 0.15;
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns.slice(0, 5), ...triadicPatterns];
        break;
      case 3:
        config.restProbability = 0.12;
        config.durations = [4, 2, 1];
        config.patterns = folkPatterns;
        break;
    }
  }

  // Level 5: Accidentals
  else if (level === 5) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.durations = [2, 1];

    switch (subLevel) {
      case 0:
        config.accidentalProbability = 0.05;
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.accidentalProbability = 0.08;
        config.patterns = [...stepwisePatterns, ...triadicPatterns];
        break;
      case 2:
        config.accidentalProbability = 0.1;
        config.restProbability = 0.1;
        config.patterns = folkPatterns;
        break;
      case 3:
        config.accidentalProbability = 0.12;
        config.restProbability = 0.1;
        config.durations = [4, 2, 1];
        config.patterns = [...folkPatterns, ...classicalPatterns.slice(0, 3)];
        break;
    }
  }

  // Level 6: Left hand and coordination
  else if (level === 6) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.durations = [2, 1];
    config.includeLeftHand = true;

    switch (subLevel) {
      case 0:
        config.patterns = [[1, 5], [5, 1], [1, 3, 5]];
        break;
      case 1:
        config.patterns = [...classicalPatterns.slice(0, 2), ...triadicPatterns];
        break;
      case 2:
        config.patterns = [...folkPatterns.slice(0, 3), ...classicalPatterns.slice(0, 3)];
        break;
      case 3:
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
    }
  }

  // Level 7: Eighth notes
  else if (level === 7) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7];
    config.includeLeftHand = true;

    switch (subLevel) {
      case 0:
        config.durations = [0.5, 0.5, 1]; // Pairs of eighths
        config.patterns = stepwisePatterns;
        break;
      case 1:
        config.durations = [0.5, 1];
        config.patterns = [...stepwisePatterns, ...folkPatterns.slice(0, 3)];
        break;
      case 2:
        config.durations = [0.5, 1, 2];
        config.restProbability = 0.08;
        config.patterns = folkPatterns;
        break;
      case 3:
        config.durations = [0.5, 1, 2, 4];
        config.restProbability = 0.1;
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
    }
  }

  // Level 8: Time signatures and new keys
  else if (level === 8) {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.durations = [0.5, 1, 2];
    config.includeLeftHand = true;
    config.restProbability = 0.1;

    switch (subLevel) {
      case 0:
        config.timeSignature = { beats: 3, beatType: 4 };
        config.patterns = folkPatterns;
        break;
      case 1:
        config.timeSignature = { beats: 2, beatType: 4 };
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
      case 2:
        config.key = { name: 'G', fifths: 1 };
        config.patterns = classicalPatterns;
        break;
      case 3:
        config.key = { name: 'F', fifths: -1 };
        config.patterns = [...folkPatterns, ...classicalPatterns];
        break;
    }
  }

  // Levels 9-10: Advanced
  else {
    config.noteRange = [1, 2, 3, 4, 5, 6, 7, 8];
    config.durations = [0.5, 1, 2, 4];
    config.includeLeftHand = true;
    config.restProbability = 0.12;
    config.accidentalProbability = 0.1;
    config.maxInterval = 5;

    const keys = [
      { name: 'C', fifths: 0 },
      { name: 'G', fifths: 1 },
      { name: 'F', fifths: -1 },
      { name: 'D', fifths: 2 },
    ];

    if (level >= 10) {
      keys.push({ name: 'Bb', fifths: -2 });
    }

    config.key = pick(keys);
    config.timeSignature = pick([
      { beats: 4, beatType: 4 },
      { beats: 3, beatType: 4 },
      { beats: 2, beatType: 4 },
    ]);
    config.patterns = [...folkPatterns, ...classicalPatterns];
  }

  return config;
}

// ============================================
// MELODY GENERATION
// ============================================
interface BeamState {
  inBeam: boolean;
  beamNumber: number;
}

function generateMelody(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 4;

  // Pick a melodic pattern to use as a motif
  const pattern = pick(config.patterns);
  let patternIndex = 0;

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      // Pick duration that fits
      let availableDurations = config.durations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      let dur = pick(availableDurations);
      dur = Math.min(dur, remainingBeats);

      // Decide if this is a rest
      if (Math.random() < config.restProbability && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      // Get the next scale degree from the pattern
      let degree = pattern[patternIndex % pattern.length];
      patternIndex++;

      // Occasionally vary the pattern
      if (Math.random() < 0.2 && notes.length > 0) {
        // Small random adjustment
        degree = degree + pick([-1, 0, 0, 1]);
      }

      // Keep in the allowed note range
      const minDegree = Math.min(...config.noteRange);
      const maxDegree = Math.max(...config.noteRange);
      degree = Math.max(minDegree, Math.min(maxDegree, degree));

      // Apply accidental?
      let extraAlter = 0;
      if (Math.random() < config.accidentalProbability) {
        extraAlter = pick([-1, 1]);
      }

      const noteData = scaleDegreeToNote(degree, config.key.name, baseOctave);
      notes.push({
        ...noteData,
        alter: noteData.alter + extraAlter,
        duration: dur,
        isRest: false,
      });

      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

function generateBass(
  config: LevelConfig,
  beatsPerMeasure: number,
  numMeasures: number
): NoteData[][] {
  if (!config.includeLeftHand) {
    // Return empty measures with whole rests
    return Array(numMeasures)
      .fill(null)
      .map(() => [{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);
  }

  const measures: NoteData[][] = [];
  const baseOctave = 3;

  // Bass patterns - simpler than melody
  const bassPatterns = [[1], [1, 5], [1, 3, 5], [1, 5, 1, 5], [1, 3, 5, 3]];
  const pattern = pick(bassPatterns);
  let patternIdx = 0;

  // Bass uses longer notes at earlier levels
  const bassDurations =
    progress.level <= 4 ? [beatsPerMeasure] : progress.level <= 6 ? [2, 1] : config.durations;

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) {
      let availableDurations = bassDurations.filter((d) => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      // Bass prefers longer notes
      const dur = Math.min(Math.max(...availableDurations), remainingBeats);

      // Occasional rest
      if (Math.random() < config.restProbability * 0.5 && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      const degree = pattern[patternIdx % pattern.length];
      patternIdx++;

      const noteData = scaleDegreeToNote(degree, config.key.name, baseOctave);
      notes.push({
        ...noteData,
        duration: dur,
        isRest: false,
      });

      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

// ============================================
// MUSICXML GENERATION
// ============================================
export function generateMusicXML(): GeneratedMusic {
  const config = getLevelConfig(progress.level, progress.subLevel);

  // Mobile mode: 4 measures, Desktop: 8 measures
  const numMeasures = mobileMode ? 4 : 8;

  const beatsPerMeasure =
    config.timeSignature.beatType === 8
      ? config.timeSignature.beats / 2
      : config.timeSignature.beats;

  const rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
  const leftHand = generateBass(config, beatsPerMeasure, numMeasures);

  const divisions = 4;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  // System break position depends on number of measures
  const systemBreakMeasure = mobileMode ? numMeasures + 1 : 5; // No break in mobile, or at measure 5

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

    // Add system break at appropriate position (not needed for 4-bar mobile)
    if (m === systemBreakMeasure - 1 && !mobileMode) {
      xml += `      <print new-system="yes"/>
`;
    }

    if (m === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${config.key.fifths}</fifths></key>
        <time><beats>${config.timeSignature.beats}</beats><beat-type>${config.timeSignature.beatType}</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
`;
    }

    // Right hand (staff 1)
    const rhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < rightHand[m].length; i++) {
      const note = rightHand[m][i];
      const nextNote = i < rightHand[m].length - 1 ? rightHand[m][i + 1] : null;
      xml += noteToXML(note, 1, divisions, rhBeamState, nextNote);
    }

    // Backup to write left hand
    const rhDuration = rightHand[m].reduce((sum, n) => sum + n.duration, 0);
    xml += `      <backup><duration>${Math.round(rhDuration * divisions)}</duration></backup>
`;

    // Left hand (staff 2)
    const lhBeamState: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < leftHand[m].length; i++) {
      const note = leftHand[m][i];
      const nextNote = i < leftHand[m].length - 1 ? leftHand[m][i + 1] : null;
      xml += noteToXML(note, 2, divisions, lhBeamState, nextNote);
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
</score-partwise>`;

  return {
    xml,
    timeSignature: config.timeSignature,
    level: progress.level,
    subLevel: progress.subLevel,
    lessonDescription: config.description,
    numMeasures,
  };
}

function noteToXML(
  note: NoteData,
  staff: number,
  divisions: number,
  beamState: BeamState,
  nextNote: NoteData | null
): string {
  const dur = Math.round(note.duration * divisions);

  if (note.isRest) {
    beamState.inBeam = false;
    return `      <note>
        <rest/>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
        <staff>${staff}</staff>
      </note>
`;
  }

  let alterXml = '';
  if (note.alter !== 0) {
    alterXml = `          <alter>${note.alter}</alter>\n`;
  }

  let accidentalXml = '';
  if (note.alter === 1) {
    accidentalXml = `        <accidental>sharp</accidental>\n`;
  } else if (note.alter === -1) {
    accidentalXml = `        <accidental>flat</accidental>\n`;
  }

  // Beam logic for eighth notes and shorter
  let beamXml = '';
  const isBeamable = note.duration <= 0.5;
  const nextIsBeamable = nextNote && !nextNote.isRest && nextNote.duration <= 0.5;

  if (isBeamable) {
    if (!beamState.inBeam && nextIsBeamable) {
      beamState.inBeam = true;
      beamState.beamNumber++;
      beamXml = `        <beam number="1">begin</beam>\n`;
    } else if (beamState.inBeam && nextIsBeamable) {
      beamXml = `        <beam number="1">continue</beam>\n`;
    } else if (beamState.inBeam && !nextIsBeamable) {
      beamState.inBeam = false;
      beamXml = `        <beam number="1">end</beam>\n`;
    }
  } else {
    beamState.inBeam = false;
  }

  return `      <note>
        <pitch>
          <step>${note.step}</step>
${alterXml}          <octave>${note.octave}</octave>
        </pitch>
        <duration>${dur}</duration>
        ${getNoteType(note.duration)}
${accidentalXml}${beamXml}        <staff>${staff}</staff>
      </note>
`;
}

function getNoteType(duration: number): string {
  if (duration >= 4) return '<type>whole</type>';
  if (duration >= 2) return '<type>half</type>';
  if (duration >= 1) return '<type>quarter</type>';
  if (duration >= 0.5) return '<type>eighth</type>';
  if (duration >= 0.25) return '<type>16th</type>';
  return '<type>16th</type>';
}
