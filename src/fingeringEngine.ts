// Piano Fingering Engine
// Implements a cost-based dynamic programming algorithm for optimal finger assignment
// Based on research from Al Kasimi et al. and the performer.js approach

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
}

// Physical constraints and costs
const HAND_SPAN = {
  // Maximum comfortable span between fingers (in semitones)
  '1-2': 4,  // thumb to index
  '1-3': 6,  // thumb to middle
  '1-4': 8,  // thumb to ring
  '1-5': 10, // thumb to pinky (octave reach)
  '2-3': 2,  // index to middle
  '2-4': 4,  // index to ring
  '2-5': 6,  // index to pinky
  '3-4': 2,  // middle to ring
  '3-5': 4,  // middle to pinky
  '4-5': 2,  // ring to pinky
};

// Base cost for each finger (thumb is slightly harder to use on black keys)
const FINGER_BASE_COST: Record<Finger, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.7,
  4: 1.2, // ring finger is weaker
  5: 1.1,
};

// Transition costs between fingers (some transitions are awkward)
const TRANSITION_COST: Record<string, number> = {
  // Same finger repeated (requires lift)
  'same': 3.0,

  // Thumb crossing (common technique)
  '1-over-2': 1.5,
  '1-over-3': 2.0,
  '1-over-4': 3.0,
  '2-over-1': 1.5,
  '3-over-1': 2.0,
  '4-over-1': 3.0,

  // Finger substitution on same note
  'substitution': 2.5,

  // Awkward crossings to avoid
  '2-over-3': 4.0,
  '3-over-4': 4.0,
  '4-over-5': 5.0, // very awkward

  // Natural progressions (low cost)
  'natural': 0.5,
};

// Check if a note is a black key
function isBlackKey(midiNote: number): boolean {
  const pitchClass = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(pitchClass); // C#, D#, F#, G#, A#
}

// Calculate the cost of using a specific finger on a note
function fingerNoteCost(finger: Finger, midiNote: number): number {
  let cost = FINGER_BASE_COST[finger];

  // Thumb on black key is awkward
  if (finger === 1 && isBlackKey(midiNote)) {
    cost *= 1.5;
  }

  // Pinky on black key is also harder
  if (finger === 5 && isBlackKey(midiNote)) {
    cost *= 1.2;
  }

  return cost;
}

// Calculate the span cost between two fingers
function spanCost(finger1: Finger, finger2: Finger, interval: number): number {
  if (finger1 === finger2) return TRANSITION_COST['same'];

  const key = finger1 < finger2
    ? `${finger1}-${finger2}`
    : `${finger2}-${finger1}`;

  const maxSpan = HAND_SPAN[key as keyof typeof HAND_SPAN] || 6;
  const absInterval = Math.abs(interval);

  // If interval exceeds comfortable span, high cost
  if (absInterval > maxSpan) {
    return 5.0 + (absInterval - maxSpan) * 2;
  }

  // Penalize stretches
  if (absInterval > maxSpan * 0.7) {
    return 1.5;
  }

  return TRANSITION_COST['natural'];
}

// Calculate transition cost between two finger assignments
function transitionCost(
  prevFinger: Finger,
  prevMidi: number,
  currFinger: Finger,
  currMidi: number,
  hand: Hand
): number {
  const interval = currMidi - prevMidi;
  let cost = 0;

  // Same finger on different notes
  if (prevFinger === currFinger) {
    cost += TRANSITION_COST['same'];
  }

  // Check for thumb crossing (going up with right hand, down with left)
  const goingUp = interval > 0;
  const isRightHand = hand === 'right';

  // Thumb under for ascending (RH) or descending (LH)
  if (prevFinger > 1 && currFinger === 1) {
    if ((isRightHand && goingUp) || (!isRightHand && !goingUp)) {
      cost += TRANSITION_COST['1-over-2'];
    } else {
      cost += TRANSITION_COST['natural'];
    }
  }

  // Finger over thumb
  if (prevFinger === 1 && currFinger > 1) {
    const key = `${currFinger}-over-1`;
    cost += TRANSITION_COST[key] || TRANSITION_COST['natural'];
  }

  // Add span cost
  cost += spanCost(prevFinger, currFinger, interval);

  return cost;
}

// Main fingering algorithm using dynamic programming (Viterbi-style)
export function generateFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand = 'right'
): FingeringSuggestion {
  // Filter out rests
  const playableNotes = notes.filter(n => !n.isRest);

  if (playableNotes.length === 0) {
    return { notes: [], difficulty: 0, tips: [] };
  }

  // Convert to MIDI notes
  const midiNotes = playableNotes.map(n => {
    let noteName = n.step;
    if (n.alter === 1) noteName += '#';
    if (n.alter === -1) noteName += 'b';
    return Note.midi(`${noteName}${n.octave}`) || 60;
  });

  // Dynamic programming: dp[i][f] = minimum cost to reach note i using finger f
  const fingers: Finger[] = [1, 2, 3, 4, 5];
  const n = midiNotes.length;

  // Cost matrix
  const dp: number[][] = Array(n).fill(null).map(() => Array(5).fill(Infinity));

  // Backtrack matrix to reconstruct path
  const backtrack: number[][] = Array(n).fill(null).map(() => Array(5).fill(-1));

  // Initialize first note
  for (const f of fingers) {
    dp[0][f - 1] = fingerNoteCost(f, midiNotes[0]);
  }

  // Fill DP table
  for (let i = 1; i < n; i++) {
    for (const currFinger of fingers) {
      const currCost = fingerNoteCost(currFinger, midiNotes[i]);

      for (const prevFinger of fingers) {
        const transition = transitionCost(
          prevFinger,
          midiNotes[i - 1],
          currFinger,
          midiNotes[i],
          hand
        );

        const totalCost = dp[i - 1][prevFinger - 1] + transition + currCost;

        if (totalCost < dp[i][currFinger - 1]) {
          dp[i][currFinger - 1] = totalCost;
          backtrack[i][currFinger - 1] = prevFinger - 1;
        }
      }
    }
  }

  // Find optimal ending finger
  let minCost = Infinity;
  let lastFinger = 0;
  for (let f = 0; f < 5; f++) {
    if (dp[n - 1][f] < minCost) {
      minCost = dp[n - 1][f];
      lastFinger = f;
    }
  }

  // Backtrack to get the full fingering
  const fingeringPath: Finger[] = Array(n);
  let currentFinger = lastFinger;
  for (let i = n - 1; i >= 0; i--) {
    fingeringPath[i] = (currentFinger + 1) as Finger;
    currentFinger = backtrack[i][currentFinger];
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

  // Generate tips based on the fingering
  const tips = generateFingeringTips(result, hand);

  // Normalize difficulty to 1-10 scale
  const difficulty = Math.min(10, Math.max(1, Math.round(minCost / n * 2)));

  return { notes: result, difficulty, tips };
}

// Generate helpful tips based on the computed fingering
function generateFingeringTips(fingering: FingeringResult[], hand: Hand): string[] {
  const tips: string[] = [];

  // Check for thumb crossings
  let thumbCrossings = 0;
  for (let i = 1; i < fingering.length; i++) {
    const prev = fingering[i - 1].finger;
    const curr = fingering[i].finger;
    if ((prev === 1 && curr > 2) || (curr === 1 && prev > 2)) {
      thumbCrossings++;
    }
  }

  if (thumbCrossings > 0) {
    tips.push(`${thumbCrossings} thumb crossing${thumbCrossings > 1 ? 's' : ''} - practice the crossings slowly first.`);
  }

  // Check for position shifts
  let positionShifts = 0;
  for (let i = 1; i < fingering.length; i++) {
    const interval = Math.abs(fingering[i].midiNote - fingering[i - 1].midiNote);
    if (interval > 5) {
      positionShifts++;
    }
  }

  if (positionShifts > 2) {
    tips.push('Several hand position changes - look ahead to prepare.');
  }

  // Check for black key fingering
  const blackKeyNotes = fingering.filter(f => isBlackKey(f.midiNote));
  if (blackKeyNotes.length > fingering.length * 0.3) {
    tips.push('Many black keys - keep your hand positioned forward on the keyboard.');
  }

  // Check for 4th finger usage
  const fourthFingerUsage = fingering.filter(f => f.finger === 4).length;
  if (fourthFingerUsage > 2) {
    tips.push('Practice the 4th finger passages separately for strength.');
  }

  // Hand-specific tips
  if (hand === 'left') {
    tips.push('Left hand: thumb crosses go the opposite direction from right hand.');
  }

  return tips;
}

// Format fingering for display as numbers above/below notes
export function formatFingeringDisplay(suggestion: FingeringSuggestion): string {
  return suggestion.notes.map(n => n.finger).join(' ');
}

// Get a simple fingering string for a single hand's part
export function getSimpleFingering(
  notes: Array<{ step: string; alter: number; octave: number; isRest: boolean }>,
  hand: Hand
): string {
  const suggestion = generateFingering(notes, hand);
  return formatFingeringDisplay(suggestion);
}

// Export finger number to finger name mapping for accessibility
export function fingerName(finger: Finger): string {
  const names: Record<Finger, string> = {
    1: 'thumb',
    2: 'index',
    3: 'middle',
    4: 'ring',
    5: 'pinky',
  };
  return names[finger];
}
