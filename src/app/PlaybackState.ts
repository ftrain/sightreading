/**
 * PlaybackState - Encapsulates playback state and debounce logic
 *
 * Replaces 17+ global variables in main.ts with a single state object.
 */

import type { NoteData, TimingEvent } from '../core/types';

export type PlaybackStatus = 'stopped' | 'playing' | 'countoff';

interface VisualGroup {
  elements: SVGElement[];
}

export interface PlaybackStateData {
  status: PlaybackStatus;
  beatIndex: number;
  countoffBeats: number;
  hadMistake: boolean;
  bpm: number;
  metronomeEnabled: boolean;
  metronomeVolume: number;
  // Current piece data
  pieceXml: string;
  lessonDescription: string;
  timeSig: { beats: number; beatType: number };
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
  timingEvents: TimingEvent[];
  visualGroups: VisualGroup[];
  // MIDI state
  activeNotes: Set<string>;
  selectedMidiInput: string | null;
}

const DEFAULT_STATE: PlaybackStateData = {
  status: 'stopped',
  beatIndex: 0,
  countoffBeats: 0,
  hadMistake: false,
  bpm: 30,
  metronomeEnabled: true,
  metronomeVolume: -20,
  pieceXml: '',
  lessonDescription: '',
  timeSig: { beats: 4, beatType: 4 },
  rightHandNotes: [],
  leftHandNotes: [],
  timingEvents: [],
  visualGroups: [],
  activeNotes: new Set(),
  selectedMidiInput: localStorage.getItem('midiDeviceId'),
};

export class PlaybackState {
  private state: PlaybackStateData = { ...DEFAULT_STATE, activeNotes: new Set() };
  private debounce = { lastMetronome: 0, lastAdvanceBeat: 0 };

  // Status
  get isPlaying() { return this.state.status === 'playing'; }
  get isCountingOff() { return this.state.status === 'countoff'; }
  get status() { return this.state.status; }
  set status(s: PlaybackStatus) { this.state.status = s; }

  // Beat tracking
  get beatIndex() { return this.state.beatIndex; }
  set beatIndex(i: number) { this.state.beatIndex = i; }
  get countoffBeats() { return this.state.countoffBeats; }
  set countoffBeats(n: number) { this.state.countoffBeats = n; }

  // Performance
  get hadMistake() { return this.state.hadMistake; }
  set hadMistake(v: boolean) { this.state.hadMistake = v; }

  // Settings
  get bpm() { return this.state.bpm; }
  set bpm(v: number) { this.state.bpm = v; }
  get metronomeEnabled() { return this.state.metronomeEnabled; }
  set metronomeEnabled(v: boolean) { this.state.metronomeEnabled = v; }
  get metronomeVolume() { return this.state.metronomeVolume; }
  set metronomeVolume(v: number) { this.state.metronomeVolume = v; }

  // Current piece
  get pieceXml() { return this.state.pieceXml; }
  set pieceXml(v: string) { this.state.pieceXml = v; }
  get lessonDescription() { return this.state.lessonDescription; }
  set lessonDescription(v: string) { this.state.lessonDescription = v; }
  get timeSig() { return this.state.timeSig; }
  set timeSig(v: { beats: number; beatType: number }) { this.state.timeSig = v; }
  get rightHandNotes() { return this.state.rightHandNotes; }
  set rightHandNotes(v: NoteData[]) { this.state.rightHandNotes = v; }
  get leftHandNotes() { return this.state.leftHandNotes; }
  set leftHandNotes(v: NoteData[]) { this.state.leftHandNotes = v; }
  get timingEvents() { return this.state.timingEvents; }
  set timingEvents(v: TimingEvent[]) { this.state.timingEvents = v; }
  get visualGroups() { return this.state.visualGroups; }
  set visualGroups(v: VisualGroup[]) { this.state.visualGroups = v; }

  // MIDI
  get activeNotes() { return this.state.activeNotes; }
  get selectedMidiInput() { return this.state.selectedMidiInput; }
  set selectedMidiInput(v: string | null) {
    this.state.selectedMidiInput = v;
    if (v) localStorage.setItem('midiDeviceId', v);
    else localStorage.removeItem('midiDeviceId');
  }

  // Debounce helpers
  shouldFireMetronome(): boolean {
    const minInterval = (60 / this.state.bpm) * 1000 * 0.8;
    const now = performance.now();
    if (now - this.debounce.lastMetronome < minInterval) return false;
    this.debounce.lastMetronome = now;
    return true;
  }

  shouldAdvanceBeat(): boolean {
    const now = performance.now();
    if (now - this.debounce.lastAdvanceBeat < 50) return false;
    this.debounce.lastAdvanceBeat = now;
    return true;
  }

  // Reset for new playback
  startPlayback() {
    this.state.status = 'countoff';
    this.state.beatIndex = 0;
    this.state.countoffBeats = 0;
    this.state.hadMistake = false;
    this.debounce = { lastMetronome: 0, lastAdvanceBeat: 0 };
  }

  stopPlayback() {
    this.state.status = 'stopped';
    this.state.beatIndex = 0;
    this.state.countoffBeats = 0;
    this.debounce = { lastMetronome: 0, lastAdvanceBeat: 0 };
  }

  finishCountoff() {
    this.state.status = 'playing';
  }
}

// Singleton instance
export const playbackState = new PlaybackState();
