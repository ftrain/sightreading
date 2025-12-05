/**
 * MIDI File Importer
 *
 * Converts MIDI files to MusicData using @tonejs/midi library.
 * Handles track splitting for piano (treble/bass clef assignment).
 *
 * @module music/sources/midiImporter
 */

import { Midi } from '@tonejs/midi';
import type { NoteData, TimeSignature, KeyInfo } from '../../core/types';
import type { MusicData, MusicSource, ImportResult } from './types';

/**
 * Options for MIDI import
 */
export interface MidiImportOptions {
  /** MIDI note number to split hands (default: 60 = middle C) */
  splitPoint?: number;
  /** Whether to quantize note durations */
  quantize?: boolean;
  /** Default key if not specified in MIDI (default: C major) */
  defaultKey?: KeyInfo;
}

const DEFAULT_KEY: KeyInfo = {
  name: 'C major',
  fifths: 0,
  scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
};

/**
 * Import a MIDI file and convert to MusicData
 */
export async function importMidiFile(
  file: File,
  options: MidiImportOptions = {}
): Promise<ImportResult<MusicData>> {
  try {
    const buffer = await file.arrayBuffer();
    return importMidiBuffer(buffer, options, file.name);
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
        cause: e,
      },
    };
  }
}

/**
 * Import MIDI from ArrayBuffer
 */
export function importMidiBuffer(
  buffer: ArrayBuffer,
  options: MidiImportOptions = {},
  filename?: string
): ImportResult<MusicData> {
  const { splitPoint = 60, defaultKey = DEFAULT_KEY } = options;

  try {
    const midi = new Midi(buffer);

    if (midi.tracks.length === 0) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'MIDI file contains no tracks',
        },
      };
    }

    // Get tempo and time signature
    const tempo = midi.header.tempos[0]?.bpm ?? 120;
    const timeSig = midi.header.timeSignatures[0];
    const timeSignature: TimeSignature = {
      beats: timeSig?.timeSignature[0] ?? 4,
      beatType: timeSig?.timeSignature[1] ?? 4,
    };

    // Collect all notes from all tracks
    const allNotes: Array<{
      midi: number;
      time: number; // in seconds
      duration: number; // in seconds
    }> = [];

    for (const track of midi.tracks) {
      for (const note of track.notes) {
        allNotes.push({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
        });
      }
    }

    if (allNotes.length === 0) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'MIDI file contains no notes',
        },
      };
    }

    // Sort by time
    allNotes.sort((a, b) => a.time - b.time);

    // Convert seconds to beats
    const secondsPerBeat = 60 / tempo;
    const notesInBeats = allNotes.map((n) => ({
      midi: n.midi,
      time: n.time / secondsPerBeat,
      duration: n.duration / secondsPerBeat,
    }));

    // Split into right hand (>= splitPoint) and left hand (< splitPoint)
    const rightHandRaw = notesInBeats.filter((n) => n.midi >= splitPoint);
    const leftHandRaw = notesInBeats.filter((n) => n.midi < splitPoint);

    // Convert to NoteData arrays
    const rightHandNotes = convertToNoteData(rightHandRaw);
    const leftHandNotes = convertToNoteData(leftHandRaw);

    // If one hand is empty, fill with rests matching the other hand's duration
    const totalDuration = Math.max(
      getTotalDuration(rightHandNotes),
      getTotalDuration(leftHandNotes)
    );

    if (rightHandNotes.length === 0 && totalDuration > 0) {
      rightHandNotes.push(createRest(totalDuration));
    }
    if (leftHandNotes.length === 0 && totalDuration > 0) {
      leftHandNotes.push(createRest(totalDuration));
    }

    const musicData: MusicData = {
      rightHandNotes,
      leftHandNotes,
      timeSignature,
      key: defaultKey,
      metadata: {
        description: filename ? `Imported: ${filename}` : 'MIDI Import',
        suggestedBpm: Math.round(tempo),
        tags: ['imported', 'midi'],
      },
    };

    return { ok: true, value: musicData };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Invalid MIDI file: ${e instanceof Error ? e.message : 'Unknown error'}`,
        cause: e,
      },
    };
  }
}

/**
 * Convert raw note data to NoteData array, merging simultaneous notes into chords
 */
function convertToNoteData(
  notes: Array<{ midi: number; time: number; duration: number }>
): NoteData[] {
  if (notes.length === 0) return [];

  const result: NoteData[] = [];
  let currentTime = 0;

  // Group notes by start time (within small tolerance)
  const tolerance = 0.01; // beats
  const groups: Array<Array<{ midi: number; time: number; duration: number }>> = [];

  for (const note of notes) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && Math.abs(note.time - lastGroup[0].time) < tolerance) {
      lastGroup.push(note);
    } else {
      groups.push([note]);
    }
  }

  for (const group of groups) {
    const noteTime = group[0].time;

    // Add rest if there's a gap
    if (noteTime > currentTime + tolerance) {
      const restDuration = noteTime - currentTime;
      result.push(createRest(quantizeDuration(restDuration)));
      currentTime = noteTime;
    }

    // Sort by pitch (lowest first for root note)
    group.sort((a, b) => a.midi - b.midi);

    // Create main note from lowest
    const rootNote = group[0];
    const duration = quantizeDuration(rootNote.duration);
    const noteData = midiToNoteData(rootNote.midi, duration);

    // Add chord notes if multiple notes at same time
    if (group.length > 1) {
      noteData.chordNotes = group.slice(1).map((n) => {
        const { step, alter, octave } = midiToNoteData(n.midi, 1);
        return { step, alter, octave };
      });
    }

    result.push(noteData);
    currentTime = noteTime + duration;
  }

  return result;
}

/**
 * Convert MIDI note number to NoteData
 */
function midiToNoteData(midi: number, duration: number): NoteData {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteName = noteNames[noteIndex];

  return {
    step: noteName[0],
    alter: noteName.includes('#') ? 1 : 0,
    octave,
    duration,
    isRest: false,
  };
}

/**
 * Create a rest NoteData
 */
function createRest(duration: number): NoteData {
  return {
    step: 'C',
    alter: 0,
    octave: 4,
    duration,
    isRest: true,
  };
}

/**
 * Quantize duration to nearest standard note value
 */
function quantizeDuration(duration: number): number {
  const values = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  let closest = values[0];
  let minDiff = Math.abs(duration - closest);

  for (const v of values) {
    const diff = Math.abs(duration - v);
    if (diff < minDiff) {
      minDiff = diff;
      closest = v;
    }
  }

  return closest;
}

/**
 * Get total duration of note array
 */
function getTotalDuration(notes: NoteData[]): number {
  return notes.reduce((sum, n) => sum + n.duration, 0);
}

/**
 * MusicSource implementation for imported MIDI files
 */
export class MidiMusicSource implements MusicSource {
  private musicData: MusicData;

  constructor(musicData: MusicData) {
    this.musicData = musicData;
  }

  getMusic(): MusicData {
    return this.musicData;
  }

  get canRegenerate(): boolean {
    return false; // Imported files don't regenerate
  }

  get sourceType(): 'midi-import' {
    return 'midi-import';
  }
}

/**
 * Create a MidiMusicSource from a File
 */
export async function createMidiSource(
  file: File,
  options?: MidiImportOptions
): Promise<ImportResult<MidiMusicSource>> {
  const result = await importMidiFile(file, options);
  if (result.ok) {
    return { ok: true, value: new MidiMusicSource(result.value) };
  }
  return result;
}
