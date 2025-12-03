// Difficulty levels - progressive complexity
// Level 1: C major, whole notes only, stepwise motion
// Level 2: Whole and half notes, with rests
// Level 3: Quarter notes
// Level 4: Quarter notes with rests
// Level 5: Quarter notes with accidentals and rests
// Level 6: Mix of quarter, half, whole notes
// Level 7: Add eighth notes
// Level 8+: Full complexity with varied keys

export interface GeneratedMusic {
  xml: string;
  timeSignature: { beats: number; beatType: number };
  level: number;
}

let currentLevel = 1;

export function getLevel(): number {
  return currentLevel;
}

export function setLevel(level: number): void {
  currentLevel = Math.max(1, Math.min(10, level));
}

export function incrementLevel(): void {
  currentLevel = Math.min(10, currentLevel + 1);
}

interface NoteData {
  step: string;
  alter: number;
  octave: number;
  duration: number;
  isRest: boolean;
}

// Track beam groups for connecting eighth notes
interface BeamState {
  inBeam: boolean;
  beamNumber: number;
}

const scales: Record<string, string[]> = {
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaleDegreeToNote(degree: number, key: string, baseOctave: number): { step: string; alter: number; octave: number } {
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

function getDurationsForLevel(level: number): number[] {
  switch (level) {
    case 1: return [4]; // whole notes only
    case 2: return [4, 2]; // whole and half
    case 3: return [1]; // quarter notes only
    case 4: return [1]; // quarter notes (rests added separately)
    case 5: return [1]; // quarter notes (accidentals added separately)
    case 6: return [4, 2, 1]; // mix
    case 7: return [2, 1, 0.5]; // add eighths
    default: return [2, 1, 1, 0.5, 0.5]; // full variety
  }
}

function getRestProbability(level: number): number {
  switch (level) {
    case 1: return 0;
    case 2: return 0.15;
    case 3: return 0;
    case 4: return 0.2;
    case 5: return 0.15;
    case 6: return 0.1;
    default: return 0.12;
  }
}

function getAccidentalProbability(level: number): number {
  if (level < 5) return 0;
  if (level === 5) return 0.1;
  if (level <= 7) return 0.08;
  return 0.1;
}

function getMaxInterval(level: number): number {
  // How far can notes jump?
  if (level <= 2) return 2; // stepwise or skip
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  return 5;
}

function getKeyForLevel(level: number): { name: string; fifths: number } {
  if (level <= 7) {
    return { name: 'C', fifths: 0 };
  }
  // Higher levels introduce other keys
  const keys = [
    { name: 'C', fifths: 0 },
    { name: 'G', fifths: 1 },
    { name: 'F', fifths: -1 },
  ];
  if (level >= 9) {
    keys.push({ name: 'D', fifths: 2 });
    keys.push({ name: 'Bb', fifths: -2 });
  }
  return pick(keys);
}

function getTimeSignatureForLevel(level: number): { beats: number; beatType: number } {
  if (level <= 5) {
    return { beats: 4, beatType: 4 }; // 4/4 only for beginners
  }
  if (level <= 7) {
    return pick([
      { beats: 4, beatType: 4 },
      { beats: 3, beatType: 4 },
    ]);
  }
  return pick([
    { beats: 4, beatType: 4 },
    { beats: 3, beatType: 4 },
    { beats: 2, beatType: 4 },
  ]);
}

function generateMelody(level: number, key: string, beatsPerMeasure: number, numMeasures: number): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 4;
  let lastDegree = 3; // Start on E (middle of the staff)

  const durations = getDurationsForLevel(level);
  const restProb = getRestProbability(level);
  const accidentalProb = getAccidentalProbability(level);
  const maxInterval = getMaxInterval(level);

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    while (remainingBeats > 0.24) { // Small epsilon for floating point
      // Pick a duration that fits
      let availableDurations = durations.filter(d => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      let dur = pick(availableDurations);

      // For level 1, prefer filling the whole measure with one note
      if (level === 1 && remainingBeats === beatsPerMeasure) {
        dur = Math.min(4, beatsPerMeasure);
      }

      // Ensure we don't overshoot
      dur = Math.min(dur, remainingBeats);

      // Decide if this is a rest
      if (Math.random() < restProb && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      // Calculate pitch - stepwise or small interval motion
      let interval = 0;
      if (notes.length > 0 || m > 0) {
        // Move by step or small skip
        const possibleIntervals: number[] = [];
        for (let i = -maxInterval; i <= maxInterval; i++) {
          // Weight towards stepwise motion
          if (Math.abs(i) <= 1) {
            possibleIntervals.push(i, i, i); // triple weight
          } else if (Math.abs(i) <= 2) {
            possibleIntervals.push(i, i); // double weight
          } else {
            possibleIntervals.push(i);
          }
        }
        interval = pick(possibleIntervals);
      }

      let newDegree = lastDegree + interval;
      // Keep in comfortable range (1-8 for treble, centered around middle)
      newDegree = Math.max(1, Math.min(8, newDegree));

      // Apply accidental?
      let extraAlter = 0;
      if (Math.random() < accidentalProb) {
        extraAlter = pick([-1, 1]);
      }

      const noteData = scaleDegreeToNote(newDegree, key, baseOctave);
      notes.push({
        ...noteData,
        alter: noteData.alter + extraAlter,
        duration: dur,
        isRest: false,
      });

      lastDegree = newDegree;
      remainingBeats -= dur;
    }

    measures.push(notes);
  }

  return measures;
}

function generateBass(level: number, key: string, beatsPerMeasure: number, numMeasures: number): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 3;

  const durations = getDurationsForLevel(level);
  const restProb = getRestProbability(level) * 0.5; // Less rests in bass

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remainingBeats = beatsPerMeasure;

    // Bass tends to be simpler - root and fifth motion
    const bassPattern = pick([[1], [1, 5], [1, 3, 5], [1, 5, 1, 5]]);
    let patternIdx = 0;

    while (remainingBeats > 0.24) {
      let availableDurations = durations.filter(d => d <= remainingBeats);
      if (availableDurations.length === 0) {
        availableDurations = [remainingBeats];
      }

      // Bass prefers longer notes at lower levels
      let dur: number;
      if (level <= 3) {
        dur = Math.max(...availableDurations);
      } else {
        dur = pick(availableDurations);
      }
      dur = Math.min(dur, remainingBeats);

      // Occasional rest
      if (Math.random() < restProb && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remainingBeats -= dur;
        continue;
      }

      const degree = bassPattern[patternIdx % bassPattern.length];
      patternIdx++;

      const noteData = scaleDegreeToNote(degree, key, baseOctave);
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

export function generateMusicXML(): GeneratedMusic {
  const numMeasures = 8;
  const key = getKeyForLevel(currentLevel);
  const timeSig = getTimeSignatureForLevel(currentLevel);
  const beatsPerMeasure = timeSig.beatType === 8 ? timeSig.beats / 2 : timeSig.beats;

  const rightHand = generateMelody(currentLevel, key.name, beatsPerMeasure, numMeasures);
  const leftHand = generateBass(currentLevel, key.name, beatsPerMeasure, numMeasures);

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

  for (let m = 0; m < numMeasures; m++) {
    xml += `    <measure number="${m + 1}">
`;

    // Add system break at measure 5 (after 4 bars)
    if (m === 4) {
      xml += `      <print new-system="yes"/>
`;
    }

    if (m === 0) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${key.fifths}</fifths></key>
        <time><beats>${timeSig.beats}</beats><beat-type>${timeSig.beatType}</beat-type></time>
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

  return { xml, timeSignature: timeSig, level: currentLevel };
}

function noteToXML(note: NoteData, staff: number, divisions: number, beamState: BeamState, nextNote: NoteData | null): string {
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
