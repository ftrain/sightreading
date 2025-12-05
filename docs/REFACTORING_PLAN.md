# Refactoring Plan

This document outlines the technical debt, proposed improvements, and feature roadmap for the Sight Reading application.

## Current State Analysis

### Code Metrics

| File | Lines | Issues |
|------|-------|--------|
| `main.ts` | 1,162 | Global state, mixed concerns, duplicated utilities |
| `musicGenerator.ts` | 1,542 | 362-line function, repeated patterns, coupled to DOM |
| `scheduler.ts` | 104 | Good, but partially duplicated in playback/ |
| `fingeringEngine.ts` | 205 | Duplicate types, external dep (tonal) |

### Issue Summary

| Category | Count | Severity |
|----------|-------|----------|
| Duplicated functions | 3 | High |
| Duplicated types | 2 | Medium |
| Global state variables | 17 | High |
| Functions > 100 lines | 3 | High |
| Magic numbers | 15+ | Medium |

---

## Phase 1: Eliminate Duplication (High Impact, Low Risk)

### 1.1 Remove Duplicate Note Utilities from main.ts

**Files:** `main.ts` lines 611-629, 690-698

**Action:** Delete these functions and import from `core/noteUtils`:

```typescript
// DELETE from main.ts:
function normalizeNote(note: string): string { ... }  // Line 690
function midiNoteToName(noteNum: number): string { ... }  // Line 611

// REPLACE with:
import { normalizeNoteName, midiToNoteName } from './core/noteUtils';
```

**Impact:** -20 lines, single source of truth

---

### 1.2 Merge Duplicate Note Extraction Functions

**Files:** `main.ts` lines 701-717, 1143-1159

**Action:** Keep `getNoteDataFromElement()`, delete `extractPitchFromNote()`:

```typescript
// These are nearly identical - merge into one
function getNoteDataFromElement(el: SVGElement): string | null { ... }
function extractPitchFromNote(noteEl: SVGElement): string | null { ... }

// After: Single function with consistent null handling
```

**Impact:** -16 lines, no behavioral change

---

### 1.3 Remove Duplicate Types from fingeringEngine.ts

**Files:** `fingeringEngine.ts` lines 20-35, `core/types.ts` lines 193-220

**Action:**

```typescript
// DELETE from fingeringEngine.ts:
export type Finger = 1 | 2 | 3 | 4 | 5;
export type Hand = 'left' | 'right';
export interface FingeringResult { ... }

// REPLACE with:
import { Finger, Hand, FingeringResult } from './core/types';
```

**Impact:** -15 lines, type consistency

---

### 1.4 Consolidate TimingEvent Definition

**Files:** `main.ts` line 44-48, `core/types.ts` line 143

**Action:** Import from core instead of local definition

---

## Phase 2: Extract Services (Medium Impact, Medium Risk)

### 2.1 Create PlaybackStateService

**Extract from:** `main.ts` lines 31-35, 54-58, 1098

**New file:** `src/app/PlaybackState.ts`

```typescript
export type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'countoff';

export interface PlaybackStateData {
  status: PlaybackStatus;
  currentBeatIndex: number;
  countoffBeats: number;
  hadMistake: boolean;
}

export class PlaybackStateService {
  private state: PlaybackStateData = {
    status: 'stopped',
    currentBeatIndex: 0,
    countoffBeats: 0,
    hadMistake: false,
  };

  private debounce = {
    lastMetronomeTime: 0,
    lastAdvanceBeatTime: 0,
  };

  get isPlaying(): boolean {
    return this.state.status === 'playing';
  }

  get isCountingOff(): boolean {
    return this.state.status === 'countoff';
  }

  play(): void {
    this.state.status = 'playing';
  }

  pause(): void {
    this.state.status = 'paused';
  }

  stop(): void {
    this.state = {
      status: 'stopped',
      currentBeatIndex: 0,
      countoffBeats: 0,
      hadMistake: false,
    };
    this.debounce = { lastMetronomeTime: 0, lastAdvanceBeatTime: 0 };
  }

  shouldFireMetronomeClick(bpm: number): boolean {
    const minInterval = (60 / bpm) * 1000 * 0.8;
    const now = performance.now();
    if (now - this.debounce.lastMetronomeTime < minInterval) return false;
    this.debounce.lastMetronomeTime = now;
    return true;
  }

  shouldAdvanceBeat(): boolean {
    const now = performance.now();
    if (now - this.debounce.lastAdvanceBeatTime < 50) return false;
    this.debounce.lastAdvanceBeatTime = now;
    return true;
  }
}
```

---

### 2.2 Create UIControlHandlers Module

**Extract from:** `main.ts` lines 719-921 (setupControls)

**New file:** `src/app/controls/index.ts`

```typescript
// Split 202-line setupControls() into focused handlers:
export { BpmControlHandler } from './BpmControlHandler';
export { MetronomeControlHandler } from './MetronomeControlHandler';
export { LevelControlHandler } from './LevelControlHandler';
export { KeyControlHandler } from './KeyControlHandler';
export { FingeringControlHandler } from './FingeringControlHandler';
export { MidiSelectHandler } from './MidiSelectHandler';
export { PlaybackControlHandler } from './PlaybackControlHandler';
```

Each handler: ~30-50 lines, single responsibility.

---

### 2.3 Move Visual Group Management to rendering/

**Extract from:** `main.ts` lines 431-556

**Target:** `src/rendering/highlighter.ts` (extend existing)

The `groupNotesByPosition()` function should be part of the rendering module.

---

## Phase 3: Break Up Large Functions

### 3.1 Refactor getLevelConfig() (362 lines)

**File:** `musicGenerator.ts` lines 566-928

**Solution:** Data-driven configuration

```typescript
// New file: src/curriculum/levelConfigs.ts

interface LevelConfigEntry {
  baseConfig: Partial<LevelConfig>;
  subLevels: Record<string, Partial<LevelConfig>>;
}

const LEVEL_CONFIGS: Record<number, LevelConfigEntry> = {
  1: {
    baseConfig: {
      durations: [4],
      restProbability: 0,
      maxInterval: 2,
      suggestedBpm: 30,
      handMode: 'right',
    },
    subLevels: {
      a: { noteRange: [1, 5], patterns: [[1, 5], [5, 1], [1, 1, 5]] },
      b: { noteRange: [1, 3, 5], patterns: [[1, 3, 5], [5, 3, 1]] },
      c: { noteRange: [1, 2, 3, 4, 5], patterns: [[1, 2, 3], [3, 2, 1]] },
      d: { noteRange: [1, 2, 3, 4, 5], patterns: [[1, 2, 3, 4, 5]] },
    },
  },
  // ... levels 2-23
};

export function getLevelConfig(level: number, subLevel: number): LevelConfig {
  const entry = LEVEL_CONFIGS[level];
  const subLevelKey = ['a', 'b', 'c', 'd'][subLevel];
  return {
    ...DEFAULT_CONFIG,
    ...entry.baseConfig,
    ...entry.subLevels[subLevelKey],
    key: getKeyForLevel(level),
  };
}
```

**Impact:** -300 lines of switch statements, declarative configuration

---

### 3.2 Simplify checkNoteMatch() (43 lines of complex logic)

**File:** `main.ts` lines 645-688

**Solution:** Use PerformanceTracker from `input/performance.ts`

```typescript
// Replace ad-hoc matching with:
import { PerformanceTracker } from './input/performance';

const tracker = new PerformanceTracker();

// On beat change:
tracker.setExpectedNotes(currentNotes);

// On MIDI input:
midiHandler.onNoteOn.on((event) => {
  const result = tracker.checkNote(event.note);
  if (result.correct) {
    // Visual feedback
  }
});
```

---

## Phase 4: Add File Import Features

### 4.1 Compressed MusicXML (.mxl) Support

**Library:** Verovio (already installed) supports .mxl natively

```typescript
// New file: src/music/sources/mxlImporter.ts

import { VerovioToolkit } from 'verovio/esm';

export async function loadMxlFile(file: File): Promise<MusicData> {
  const buffer = await file.arrayBuffer();
  const toolkit = new VerovioToolkit();

  // Verovio handles .mxl decompression internally
  toolkit.loadZipDataBuffer(buffer);

  const mei = toolkit.getMEI();
  // Parse MEI to extract notes, or render directly
  // ...
}
```

**Alternative with JSZip:**

```bash
npm install jszip
npm install -D @types/jszip
```

```typescript
import JSZip from 'jszip';

export async function decompressMxl(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // MXL files contain META-INF/container.xml pointing to the main XML
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  const rootFile = parseContainerXml(containerXml); // e.g., "score.xml"

  const musicXml = await zip.file(rootFile)?.async('string');
  return musicXml!;
}
```

---

### 4.2 MIDI File Import

**Library:** `@tonejs/midi`

```bash
npm install @tonejs/midi
```

```typescript
// New file: src/music/sources/midiImporter.ts

import { Midi } from '@tonejs/midi';
import { NoteData, TimeSignature } from '../core/types';

export interface MidiImportResult {
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
  timeSignature: TimeSignature;
  tempo: number;
}

export async function loadMidiFile(file: File): Promise<MidiImportResult> {
  const buffer = await file.arrayBuffer();
  const midi = new Midi(buffer);

  const tempo = midi.header.tempos[0]?.bpm || 120;
  const timeSignature = parseTimeSignature(midi.header.timeSignatures[0]);

  // Split tracks by channel or pitch range
  const { rightHand, leftHand } = splitTracksForPiano(midi.tracks);

  return {
    rightHandNotes: convertToNoteData(rightHand),
    leftHandNotes: convertToNoteData(leftHand),
    timeSignature,
    tempo,
  };
}

function convertToNoteData(track: Track): NoteData[] {
  return track.notes.map((note) => ({
    step: getNoteName(note.midi),
    alter: getAlter(note.midi),
    octave: getOctave(note.midi),
    duration: note.durationTicks / midi.header.ppq, // Convert to beats
    isRest: false,
  }));
}
```

---

### 4.3 MusicSource Interface for Imports

```typescript
// Extend src/music/sources/types.ts

export type MusicSourceType = 'procedural' | 'mxl-import' | 'midi-import' | 'predefined';

// New implementation
export class MxlMusicSource implements MusicSource {
  private musicData: MusicData;

  constructor(xmlContent: string) {
    this.musicData = this.parseXml(xmlContent);
  }

  getMusic(): MusicData {
    return this.musicData;
  }

  get canRegenerate(): boolean {
    return false; // Imported files don't regenerate
  }

  get sourceType(): MusicSourceType {
    return 'mxl-import';
  }
}

export class MidiMusicSource implements MusicSource {
  private musicData: MusicData;

  constructor(midiResult: MidiImportResult) {
    this.musicData = this.convertToMusicData(midiResult);
  }

  getMusic(): MusicData {
    return this.musicData;
  }

  get canRegenerate(): boolean {
    return false;
  }

  get sourceType(): MusicSourceType {
    return 'midi-import';
  }
}
```

---

## Phase 5: TypeScript Improvements

### 5.1 Strict Compiler Options

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 5.2 Branded Types for Note Names

```typescript
// In core/types.ts

// Branded type for validated note names
declare const NoteNameBrand: unique symbol;
export type NoteName = string & { [NoteNameBrand]: true };

export function asNoteName(s: string): NoteName {
  if (!/^[A-G][#b]?\d$/.test(s)) {
    throw new Error(`Invalid note name: ${s}`);
  }
  return s as NoteName;
}

// Usage
function playNote(note: NoteName) { ... }

playNote(asNoteName('C4')); // OK
playNote('invalid');         // Type error
```

### 5.3 Const Assertions for Configuration

```typescript
// In curriculum/levelConfigs.ts

const DURATIONS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  dottedHalf: 3,
  dottedQuarter: 1.5,
  dottedEighth: 0.75,
} as const;

type Duration = typeof DURATIONS[keyof typeof DURATIONS];

// Compile-time check that durations are valid
const config: LevelConfig = {
  durations: [DURATIONS.quarter, DURATIONS.eighth], // Type-checked
};
```

---

## Feature Roadmap

### Near-term (Next Sprint)

1. **File Import UI**
   - Add file input button for .mxl and .mid files
   - Switch between procedural and imported modes
   - Display imported piece info (title, composer, key, tempo)

2. **Performance Analytics**
   - Track accuracy per level
   - Show progress over time
   - Identify problematic intervals/keys

### Medium-term

1. **Repertoire Library**
   - Pre-bundled pieces (Bach Inventions, scales, etudes)
   - Difficulty ratings
   - Progress tracking per piece

2. **Practice Modes**
   - Hands separate practice
   - Loop difficult passages
   - Slow practice with tempo ramp-up

### Long-term

1. **Theory Integration**
   - Chord identification exercises
   - Scale/mode recognition
   - Sight-singing (rhythm only mode)

2. **Multi-user Features**
   - Progress sync across devices
   - Teacher/student mode
   - Practice assignments

---

## Library Recommendations Summary

| Feature | Library | Why |
|---------|---------|-----|
| .mxl decompression | Verovio (built-in) or JSZip | Already using Verovio |
| MIDI parsing | @tonejs/midi | Integrates with Tone.js |
| Music theory | Tonal (already installed) | Comprehensive, TypeScript |
| Audio | Tone.js (already installed) | Industry standard |
| Rendering | Verovio (already installed) | Best MusicXML renderer |
| State management | (none needed yet) | Keep simple for now |

---

## Testing Requirements

### Unit Tests (Vitest)

- All utility functions in `core/noteUtils.ts`
- Level configuration generation
- Timing calculations
- Note matching logic

### E2E Tests (Playwright)

- File upload and rendering
- Playback timing accuracy
- MIDI input handling
- Level progression

### Test Coverage Target

- Core modules: 90%+
- Music generation: 80%+
- UI controllers: 60%+
