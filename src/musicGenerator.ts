/**
 * Pedagogically-Sound Sight Reading Generator
 *
 * Philosophy: Repetition for mastery, incremental progress,
 * folk/classical patterns for memorability, keys reset to basics.
 */

import { generateFingering } from './fingeringEngine';
import type { Finger, NoteData } from './core/types';
import {
  getLevelConfig,
  getLessonDescription,
  getSuggestedBpm as getConfigBpm,
  getKeyByName,
  type LevelConfig,
} from './curriculum/levelConfigs';

// Re-export NoteData for backwards compatibility
export type { NoteData } from './core/types';

// Settings
let includeFingering = false;
let keyOverride: string | null = null;
let handModeOverride: 'right' | 'left' | 'both' | null = null;
let mobileMode = false;

export const setIncludeFingering = (v: boolean) => { includeFingering = v; };
export const getIncludeFingering = () => includeFingering;
export const setKeyOverride = (k: string | null) => { keyOverride = k; };
export const getKeyOverride = () => keyOverride;
export const setHandModeOverride = (m: 'right' | 'left' | 'both' | null) => { handModeOverride = m; };
export const getHandModeOverride = () => handModeOverride;
export const setMobileMode = (v: boolean) => { mobileMode = v; };
export const isMobileMode = () => mobileMode;

// Progress tracking
interface LevelProgress {
  level: number;
  subLevel: number;
  repetitions: number;
  currentBpm: number;
  bpmMastery: number;
}

const STORAGE_KEY = 'sightreading-progress';
const NOTE_MASTERY = 3;
const BPM_MASTERY = 3;
const BPM_INCREMENT = 5;

function loadProgress(): LevelProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      return {
        level: Math.max(1, Math.min(23, p.level || 1)),
        subLevel: Math.max(0, Math.min(3, p.subLevel || 0)),
        repetitions: p.repetitions || 0,
        currentBpm: Math.max(20, Math.min(200, p.currentBpm || 30)),
        bpmMastery: p.bpmMastery || 0,
      };
    }
  } catch { /* ignore */ }
  return { level: 1, subLevel: 0, repetitions: 0, currentBpm: 30, bpmMastery: 0 };
}

const saveProgress = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* ignore */ }
};

let progress = loadProgress();

// Progress getters/setters
export const getLevel = () => progress.level;
export const getSubLevel = () => progress.subLevel;
export const getSubLevelLetter = () => ['a', 'b', 'c', 'd'][progress.subLevel] || 'a';
export const getFullLevelString = () => `${progress.level}${getSubLevelLetter()}`;
export const getCurrentBpm = () => progress.currentBpm;
export const getBpmMastery = () => progress.bpmMastery;
export const getSuggestedBpm = getConfigBpm;
export const getRepetitionsRemaining = () => Math.max(0, NOTE_MASTERY - progress.repetitions);
export const getBpmMasteryRemaining = () => Math.max(0, BPM_MASTERY - progress.bpmMastery);
export const shouldIncreaseTempo = () => progress.bpmMastery >= BPM_MASTERY;

export function setLevel(level: number) {
  progress = { level: Math.max(1, Math.min(23, level)), subLevel: 0, repetitions: 0, currentBpm: getConfigBpm(level), bpmMastery: 0 };
  saveProgress();
}

export function setSubLevel(subLevel: number) {
  progress.subLevel = Math.max(0, Math.min(3, subLevel));
  progress.repetitions = 0;
  saveProgress();
}

export function setBpm(bpm: number) {
  progress.currentBpm = Math.max(20, Math.min(200, bpm));
  progress.bpmMastery = 0;
  saveProgress();
}

export function incrementLevel() {
  progress.repetitions++;
  progress.bpmMastery++;
  if (progress.repetitions >= NOTE_MASTERY) {
    progress.repetitions = 0;
    progress.subLevel++;
    if (progress.subLevel >= 4) {
      progress.subLevel = 0;
      progress.level = Math.min(23, progress.level + 1);
      progress.currentBpm = getConfigBpm(progress.level);
      progress.bpmMastery = 0;
    }
  }
  saveProgress();
}

export function increaseTempo() {
  if (shouldIncreaseTempo()) {
    progress.currentBpm = Math.min(200, progress.currentBpm + BPM_INCREMENT);
    progress.bpmMastery = 0;
    saveProgress();
  }
}

export function resetProgress() {
  progress = { level: 1, subLevel: 0, repetitions: 0, currentBpm: 30, bpmMastery: 0 };
  saveProgress();
}

// Generated music output
export interface GeneratedMusic {
  xml: string;
  timeSignature: { beats: number; beatType: number };
  level: number;
  subLevel: number;
  lessonDescription: string;
  numMeasures: number;
  suggestedBpm: number;
  keyName: string;
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
}

// Helper functions
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function scaleDegreeToNote(degree: number, keyName: string, baseOctave: number) {
  const key = getKeyByName(keyName) || getKeyByName('C')!;
  const scale = key.scale;
  const norm = ((degree - 1) % 7 + 7) % 7;
  const octOff = Math.floor((degree - 1) / 7);
  const name = scale[norm];
  return {
    step: name[0],
    alter: name.includes('#') ? 1 : name.includes('b') ? -1 : 0,
    octave: baseOctave + octOff,
  };
}

// Melody generation
function generateMelody(config: LevelConfig, beatsPerMeasure: number, numMeasures: number): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 4;
  const pattern = pick(config.patterns);
  let patternIdx = 0;
  const keyRoot = config.key.name.split(' ')[0];

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remaining = beatsPerMeasure;

    while (remaining > 0.24) {
      let avail = config.durations.filter(d => d <= remaining);
      if (!avail.length) avail = [remaining];
      const dur = Math.min(pick(avail), remaining);

      if (Math.random() < config.restProbability && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remaining -= dur;
        continue;
      }

      let degree = pattern[patternIdx++ % pattern.length];
      if (Math.random() < 0.2 && notes.length > 0) degree += pick([-1, 0, 0, 1]);

      const [minD, maxD] = [Math.min(...config.noteRange), Math.max(...config.noteRange)];
      degree = Math.max(minD, Math.min(maxD, degree));

      let extraAlter = 0;
      if (Math.random() < config.accidentalProbability) extraAlter = pick([-1, 1]);

      const noteData = scaleDegreeToNote(degree, keyRoot, baseOctave);
      notes.push({ ...noteData, alter: noteData.alter + extraAlter, duration: dur, isRest: false });
      remaining -= dur;
    }
    measures.push(notes);
  }
  return measures;
}

function generateLeftHand(config: LevelConfig, beatsPerMeasure: number, numMeasures: number): NoteData[][] {
  const measures: NoteData[][] = [];
  const baseOctave = 3;
  const isMelodic = config.handMode === 'left';
  const pattern = pick(config.patterns);
  let patternIdx = 0;
  const keyRoot = config.key.name.split(' ')[0];

  // In accompaniment mode, prefer longer note values
  const bassDurations = isMelodic ? config.durations :
    progress.level <= 4 ? [beatsPerMeasure] :
    progress.level <= 6 ? [2, 1] : config.durations;

  for (let m = 0; m < numMeasures; m++) {
    const notes: NoteData[] = [];
    let remaining = beatsPerMeasure;

    while (remaining > 0.24) {
      let avail = bassDurations.filter(d => d <= remaining);
      if (!avail.length) avail = [remaining];
      const dur = isMelodic ? Math.min(pick(avail), remaining) : Math.min(Math.max(...avail), remaining);

      if (Math.random() < config.restProbability * (isMelodic ? 1 : 0.5) && notes.length > 0) {
        notes.push({ step: '', alter: 0, octave: 0, duration: dur, isRest: true });
        remaining -= dur;
        continue;
      }

      let degree = pattern[patternIdx++ % pattern.length];
      if (isMelodic && Math.random() < 0.2 && notes.length > 0) degree += pick([-1, 0, 0, 1]);

      const [minD, maxD] = [Math.min(...config.noteRange), Math.max(...config.noteRange)];
      degree = Math.max(minD, Math.min(maxD, degree));

      const noteData = scaleDegreeToNote(degree, keyRoot, baseOctave);
      notes.push({ ...noteData, duration: dur, isRest: false });
      remaining -= dur;
    }
    measures.push(notes);
  }
  return measures;
}

// MusicXML generation
interface BeamState { inBeam: boolean; beamNumber: number; }

function noteToXML(note: NoteData, staff: number, divisions: number, beam: BeamState, next: NoteData | null, finger?: Finger): string {
  const dur = Math.round(note.duration * divisions);

  if (note.isRest) {
    beam.inBeam = false;
    return `      <note><rest/><duration>${dur}</duration>${getNoteType(note.duration)}<staff>${staff}</staff></note>\n`;
  }

  const alterXml = note.alter !== 0 ? `<alter>${note.alter}</alter>` : '';
  const accXml = note.alter === 1 ? '<accidental>sharp</accidental>' : note.alter === -1 ? '<accidental>flat</accidental>' : '';

  // Beam logic
  let beamXml = '';
  const isBeamable = note.duration <= 0.5;
  const nextBeamable = next && !next.isRest && next.duration <= 0.5;
  if (isBeamable) {
    if (!beam.inBeam && nextBeamable) { beam.inBeam = true; beam.beamNumber++; beamXml = '<beam number="1">begin</beam>'; }
    else if (beam.inBeam && nextBeamable) { beamXml = '<beam number="1">continue</beam>'; }
    else if (beam.inBeam && !nextBeamable) { beam.inBeam = false; beamXml = '<beam number="1">end</beam>'; }
  } else beam.inBeam = false;

  const fingerXml = finger !== undefined && includeFingering
    ? `<notations><technical><fingering placement="${staff === 1 ? 'above' : 'below'}">${finger}</fingering></technical></notations>` : '';

  return `      <note><pitch><step>${note.step}</step>${alterXml}<octave>${note.octave}</octave></pitch><duration>${dur}</duration>${getNoteType(note.duration)}${accXml}${beamXml}<staff>${staff}</staff>${fingerXml}</note>\n`;
}

function getNoteType(d: number): string {
  if (d === 3) return '<type>half</type><dot/>';
  if (d === 1.5) return '<type>quarter</type><dot/>';
  if (d === 0.75) return '<type>eighth</type><dot/>';
  if (d >= 4) return '<type>whole</type>';
  if (d >= 2) return '<type>half</type>';
  if (d >= 1) return '<type>quarter</type>';
  if (d >= 0.5) return '<type>eighth</type>';
  return '<type>16th</type>';
}

function buildXML(rightHand: NoteData[][], leftHand: NoteData[][], config: LevelConfig, divisions: number): string {
  const numMeasures = rightHand.length;
  const ts = config.timeSignature;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<part-list><score-part id="P1"><part-name print-object="no"></part-name></score-part></part-list>
<part id="P1">
`;

  const rhFlat = rightHand.flat();
  const lhFlat = leftHand.flat();
  const rhFinger = includeFingering ? generateFingering(rhFlat, 'right') : null;
  const lhFinger = includeFingering ? generateFingering(lhFlat, 'left') : null;
  let rhIdx = 0, lhIdx = 0;

  for (let m = 0; m < numMeasures; m++) {
    xml += `<measure number="${m + 1}">\n`;
    if (m === 0) {
      xml += `<attributes><divisions>${divisions}</divisions><key><fifths>${config.key.fifths}</fifths></key>`;
      xml += `<time><beats>${ts.beats}</beats><beat-type>${ts.beatType}</beat-type></time>`;
      xml += `<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>\n`;
    }

    // Right hand
    const rhBeam: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < rightHand[m].length; i++) {
      const n = rightHand[m][i];
      const next = rightHand[m][i + 1] || null;
      const f = rhFinger && !n.isRest ? rhFinger.notes[rhIdx++]?.finger : undefined;
      xml += noteToXML(n, 1, divisions, rhBeam, next, f);
    }

    // Backup
    const rhDur = rightHand[m].reduce((s, n) => s + n.duration, 0);
    xml += `<backup><duration>${Math.round(rhDur * divisions)}</duration></backup>\n`;

    // Left hand
    const lhBeam: BeamState = { inBeam: false, beamNumber: 0 };
    for (let i = 0; i < leftHand[m].length; i++) {
      const n = leftHand[m][i];
      const next = leftHand[m][i + 1] || null;
      const f = lhFinger && !n.isRest ? lhFinger.notes[lhIdx++]?.finger : undefined;
      xml += noteToXML(n, 2, divisions, lhBeam, next, f);
    }

    xml += `</measure>\n`;
  }

  xml += `</part>\n</score-partwise>`;
  return xml;
}

export function regenerateXMLFromNotes(
  rightHandNotes: NoteData[],
  leftHandNotes: NoteData[],
  timeSignature: { beats: number; beatType: number }
): string {
  const config = getLevelConfig(progress.level, progress.subLevel, keyOverride);
  const beatsPerMeasure = timeSignature.beatType === 8 ? timeSignature.beats / 2 : timeSignature.beats;

  const splitMeasures = (notes: NoteData[]): NoteData[][] => {
    const measures: NoteData[][] = [];
    let cur: NoteData[] = [], beats = 0;
    for (const n of notes) {
      cur.push(n);
      beats += n.duration;
      if (beats >= beatsPerMeasure - 0.01) { measures.push(cur); cur = []; beats = 0; }
    }
    if (cur.length) measures.push(cur);
    return measures;
  };

  const rh = splitMeasures(rightHandNotes);
  const lh = splitMeasures(leftHandNotes);
  const numMeasures = Math.max(rh.length, lh.length);

  // Pad to same length
  while (rh.length < numMeasures) rh.push([{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);
  while (lh.length < numMeasures) lh.push([{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }]);

  return buildXML(rh, lh, { ...config, timeSignature }, 4);
}

export function generateMusicXML(): GeneratedMusic {
  const config = getLevelConfig(progress.level, progress.subLevel, keyOverride);
  const numMeasures = 4;
  const beatsPerMeasure = config.timeSignature.beatType === 8 ? config.timeSignature.beats / 2 : config.timeSignature.beats;
  const handMode = handModeOverride ?? config.handMode;

  let rightHand: NoteData[][], leftHand: NoteData[][];
  const restMeasure = () => [{ step: '', alter: 0, octave: 0, duration: beatsPerMeasure, isRest: true }];

  if (handMode === 'right') {
    rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
    leftHand = Array(numMeasures).fill(null).map(restMeasure);
  } else if (handMode === 'left') {
    rightHand = Array(numMeasures).fill(null).map(restMeasure);
    leftHand = generateLeftHand(config, beatsPerMeasure, numMeasures);
  } else {
    rightHand = generateMelody(config, beatsPerMeasure, numMeasures);
    leftHand = generateLeftHand(config, beatsPerMeasure, numMeasures);
  }

  return {
    xml: buildXML(rightHand, leftHand, config, 4),
    timeSignature: config.timeSignature,
    level: progress.level,
    subLevel: progress.subLevel,
    lessonDescription: getLessonDescription(progress.level, progress.subLevel),
    numMeasures,
    suggestedBpm: config.suggestedBpm,
    keyName: config.key.name,
    rightHandNotes: rightHand.flat(),
    leftHandNotes: leftHand.flat(),
  };
}
