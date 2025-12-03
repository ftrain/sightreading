// Piano Fingering Engine
// Provides pedagogically-correct fingering for sight reading practice
//
// Philosophy:
// - Beginners learn in FIXED HAND POSITIONS (C position, G position, etc.)
// - In a 5-finger position, finger number = scale degree (simple!)
// - Only use algorithmic fingering for advanced passages with thumb crossings
// - Left hand mirrors right hand positions

import { Note } from 'tonal';

// Finger numbers: 1=thumb, 2=index, 3=middle, 4=ring, 5=pinky
export type Finger = 1 | 2 | 3 | 4 | 5;
export type Hand = 'left' | 'right';

export interface FingeringResult {
  finger: Finger;
  hand: Hand;
  note: string;
  midiNote: number;
}

export interface FingeringSuggestion {
  notes: FingeringResult[];
  difficulty: number;
  tips: string[];
  position?: string; // e.g., "C Position" for beginners
}

// ============================================
// HAND POSITIONS (Pedagogical Foundation)
// ============================================
// Each position defines which note the thumb (RH) or pinky (LH) starts on

interface HandPosition {
  name: string;
  // MIDI note number for the lowest note in position
  // RH: thumb on this note, fingers 1-2-3-4-5 on consecutive white keys
  // LH: pinky on this note, fingers 5-4-3-2-1 on consecutive white keys
  rootMidi: number;
  // The 5 notes in this position (MIDI numbers)
  notes: number[];
}

// Standard beginner positions
const POSITIONS: HandPosition[] = [
  { name: 'C Position', rootMidi: 60, notes: [60, 62, 64, 65, 67] },      // C4-D4-E4-F4-G4
  { name: 'G Position', rootMidi: 67, notes: [67, 69, 71, 72, 74] },      // G4-A4-B4-C5-D5
  { name: 'F Position', rootMidi: 65, notes: [65, 67, 69, 70, 72] },      // F4-G4-A4-Bb4-C5
  { name: 'D Position', rootMidi: 62, notes: [62, 64, 66, 67, 69] },      // D4-E4-F#4-G4-A4
  { name: 'Middle C Position', rootMidi: 60, notes: [60, 62, 64, 65, 67] }, // Same as C but conceptually different
];

// Bass clef positions (one octave lower)
const BASS_POSITIONS: HandPosition[] = [
  { name: 'C Position', rootMidi: 48, notes: [48, 50, 52, 53, 55] },      // C3-D3-E3-F3-G3
  { name: 'G Position', rootMidi: 43, notes: [43, 45, 47, 48, 50] },      // G2-A2-B2-C3-D3
  { name: 'F Position', rootMidi: 41, notes: [41, 43, 45, 46, 48] },      // F2-G2-A2-Bb2-C3
];

// ============================================
// POSITION-BASED FINGERING (For Beginners)
// ============================================

/**
 * Determines if all notes fit within a 5-finger position
 * Returns the position name and fingering if they do
 */
function tryPositionalFingering(
  midiNotes: number[],
  hand: Hand
): { position: HandPosition; fingerings: Finger[] } | null {
  if (midiNotes.length === 0) return null;

  // Find the range of notes
  const minNote = Math.min(...midiNotes);
  const maxNote = Math.max(...midiNotes);
  const range = maxNote - minNote;

  // If range exceeds a 5th (7 semitones), can't use simple position
  if (range > 7) return null;

  // Try to find a position that contains all these notes
  const positions = hand === 'left' ? BASS_POSITIONS : POSITIONS;

  for (const pos of positions) {
    const posMin = Math.min(...pos.notes);
    const posMax = Math.max(...pos.notes);

    // Check if all notes fall within this position's range (with some tolerance)
    if (minNote >= posMin - 2 && maxNote <= posMax + 2) {
      // Map each note to a finger based on position
      const fingerings: Finger[] = midiNotes.map(midi => {
        // Find closest position note
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let i = 0; i < pos.notes.length; i++) {
          const dist = Math.abs(pos.notes[i] - midi);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }

        // For right hand: finger = index + 1 (thumb=1 on first note)
        // For left hand: finger = 5 - index (pinky=5 on first note)
        if (hand === 'right') {
          return (closestIdx + 1) as Finger;
        } else {
          return (5 - closestIdx) as Finger;
        }
      });

      return { position: pos, fingerings };
    }
  }

  return null;
}

// ============================================
// ALGORITHMIC FINGERING (For Advanced Passages)
// ============================================

// Physical constraints
const HAND_SPAN = {
  '1-2': 4, '1-3': 6, '1-4': 8, '1-5': 10,
  '2-3': 2, '2-4': 4, '2-5': 6,
  '3-4': 2, '3-5': 4,
  '4-5': 2,
};

const FINGER_BASE_COST: Record<Finger, number> = {
  1: 1.0, 2: 0.8, 3: 0.7, 4: 1.2, 5: 1.1,
};

const TRANSITION_COST: Record<string, number> = {
  'same': 3.0,
  'thumb-under-natural': 0.8,  // Natural thumb crossing direction
  'thumb-under-awkward': 2.5,  // Against natural direction
  'finger-over-natural': 1.0,  // Natural finger-over-thumb
  'finger-over-awkward': 3.0,  // Against natural direction
  'natural': 0.5,
};

function isBlackKey(midiNote: number): boolean {
  const pitchClass = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(pitchClass);
}

function fingerNoteCost(finger: Finger, midiNote: number): number {
  let cost = FINGER_BASE_COST[finger];
  if (finger === 1 && isBlackKey(midiNote)) cost *= 1.5;
  if (finger === 5 && isBlackKey(midiNote)) cost *= 1.2;
  return cost;
}

function spanCost(finger1: Finger, finger2: Finger, interval: number): number {
  if (finger1 === finger2) return TRANSITION_COST['same'];

  const key = finger1 < finger2 ? `${finger1}-${finger2}` : `${finger2}-${finger1}`;
  const maxSpan = HAND_SPAN[key as keyof typeof HAND_SPAN] || 6;
  const absInterval = Math.abs(interval);

  if (absInterval > maxSpan) {
    return 5.0 + (absInterval - maxSpan) * 2;
  }
  if (absInterval > maxSpan * 0.7) {
    return 1.5;
  }
  return TRANSITION_COST['natural'];
}

function transitionCost(
  prevFinger: Finger,
  prevMidi: number,
  currFinger: Finger,
  currMidi: number,
  hand: Hand
): number {
  const interval = currMidi - prevMidi;
  let cost = 0;

  if (prevFinger === currFinger) {
    cost += TRANSITION_COST['same'];
  }

  const goingUp = interval > 0;
  const isRightHand = hand === 'right';

  // Thumb crossing under other fingers
  // Natural direction: RH ascending or LH descending
  if (prevFinger > 1 && currFinger === 1) {
    const isNaturalDirection = (isRightHand && goingUp) || (!isRightHand && !goingUp);
    if (isNaturalDirection) {
      cost += TRANSITION_COST['thumb-under-natural'];  // FIXED: was inverted
    } else {
      cost += TRANSITION_COST['thumb-under-awkward'];
    }
  }

  // Finger crossing over thumb
  // Natural direction: RH ascending or LH descending
  if (prevFinger === 1 && currFinger > 1) {
    const isNaturalDirection = (isRightHand && goingUp) || (!isRightHand && !goingUp);
    if (isNaturalDirection) {
      cost += TRANSITION_COST['finger-over-natural'];  // FIXED: was inverted
    } else {
      cost += TRANSITION_COST['finger-over-awkward'];
    }
  }

  cost += spanCost(prevFinger, currFinger, interval);
  return cost;
}

function algorithmicFingering(
  midiNotes: number[],
  hand: Hand
): Finger[] {
  const fingers: Finger[] = [1, 2, 3, 4, 5];
  const n = midiNotes.length;

  const dp: number[][] = Array(n).fill(null).map(() => Array(5).fill(Infinity));
  const backtrack: number[][] = Array(n).fill(null).map(() => Array(5).fill(-1));

  // Initialize
  for (const f of fingers) {
    dp[0][f - 1] = fingerNoteCost(f, midiNotes[0]);
  }

  // Fill DP
  for (let i = 1; i < n; i++) {
    for (const currFinger of fingers) {
      const currCost = fingerNoteCost(currFinger, midiNotes[i]);
      for (const prevFinger of fingers) {
        const transition = transitionCost(prevFinger, midiNotes[i - 1], currFinger, midiNotes[i], hand);
        const totalCost = dp[i - 1][prevFinger - 1] + transition + currCost;
        if (totalCost < dp[i][currFinger - 1]) {
          dp[i][currFinger - 1] = totalCost;
          backtrack[i][currFinger - 1] = prevFinger - 1;
        }
      }
    }
  }

  // Backtrack
  let minCost = Infinity;
  let lastFinger = 0;
  for (let f = 0; f < 5; f++) {
    if (dp[n - 1][f] < minCost) {
      minCost = dp[n - 1][f];
      lastFinger = f;
    }
  }

  const path: Finger[] = Array(n);
  let curr = lastFinger;
  for (let i = n - 1; i >= 0; i--) {
    path[i] = (curr + 1) as Finger;
    curr = backtrack[i][curr];
  }

  return path;
}

// ============================================
// MAIN FINGERING FUNCTION
// ============================================

export function generateFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand = 'right'
): FingeringSuggestion {
  const playableNotes = notes.filter(n => !n.isRest);

  if (playableNotes.length === 0) {
    return { notes: [], difficulty: 0, tips: [] };
  }

  // Convert to MIDI
  const midiNotes = playableNotes.map(n => {
    let noteName = n.step;
    if (n.alter === 1) noteName += '#';
    if (n.alter === -1) noteName += 'b';
    return Note.midi(`${noteName}${n.octave}`) || 60;
  });

  // Try position-based fingering first (pedagogically preferred)
  const positional = tryPositionalFingering(midiNotes, hand);

  let fingeringPath: Finger[];
  let positionName: string | undefined;
  let tips: string[] = [];

  if (positional) {
    // Use simple positional fingering
    fingeringPath = positional.fingerings;
    positionName = positional.position.name;
    tips.push(`${positionName}: fingers stay in place`);
  } else {
    // Fall back to algorithmic fingering for complex passages
    fingeringPath = algorithmicFingering(midiNotes, hand);
    tips = generateFingeringTips(fingeringPath, midiNotes, hand);
  }

  // Build result
  const result: FingeringResult[] = playableNotes.map((note, i) => {
    let noteName = note.step;
    if (note.alter === 1) noteName += '#';
    if (note.alter === -1) noteName += 'b';

    return {
      finger: fingeringPath[i],
      hand,
      note: `${noteName}${note.octave}`,
      midiNote: midiNotes[i],
    };
  });

  // Calculate difficulty
  const difficulty = positional ? 1 : calculateDifficulty(fingeringPath, midiNotes);

  return { notes: result, difficulty, tips, position: positionName };
}

function calculateDifficulty(fingering: Finger[], midiNotes: number[]): number {
  let score = 0;
  for (let i = 1; i < fingering.length; i++) {
    const interval = Math.abs(midiNotes[i] - midiNotes[i - 1]);
    if (fingering[i] === fingering[i - 1]) score += 2;
    if (interval > 5) score += 1;
    if ((fingering[i - 1] === 1 && fingering[i] > 2) ||
        (fingering[i] === 1 && fingering[i - 1] > 2)) {
      score += 1; // Thumb crossing
    }
  }
  return Math.min(10, Math.max(1, Math.round(score / fingering.length * 3) + 2));
}

function generateFingeringTips(fingering: Finger[], midiNotes: number[], hand: Hand): string[] {
  const tips: string[] = [];

  // Count thumb crossings
  let thumbCrossings = 0;
  for (let i = 1; i < fingering.length; i++) {
    if ((fingering[i - 1] === 1 && fingering[i] > 2) ||
        (fingering[i] === 1 && fingering[i - 1] > 2)) {
      thumbCrossings++;
    }
  }

  if (thumbCrossings > 0) {
    tips.push(`${thumbCrossings} thumb crossing${thumbCrossings > 1 ? 's' : ''} - practice slowly`);
  }

  // Position shifts
  let shifts = 0;
  for (let i = 1; i < midiNotes.length; i++) {
    if (Math.abs(midiNotes[i] - midiNotes[i - 1]) > 5) shifts++;
  }
  if (shifts > 2) {
    tips.push('Several position shifts - look ahead');
  }

  // Black keys
  const blackKeys = midiNotes.filter(isBlackKey).length;
  if (blackKeys > midiNotes.length * 0.3) {
    tips.push('Many black keys - position hand forward');
  }

  return tips;
}

// ============================================
// EXPORTS
// ============================================

export function formatFingeringDisplay(suggestion: FingeringSuggestion): string {
  return suggestion.notes.map(n => n.finger).join(' ');
}

export function getSimpleFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand
): string {
  return formatFingeringDisplay(generateFingering(notes, hand));
}

export function fingerName(finger: Finger): string {
  const names: Record<Finger, string> = {
    1: 'thumb', 2: 'index', 3: 'middle', 4: 'ring', 5: 'pinky',
  };
  return names[finger];
}
