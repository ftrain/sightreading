# Dataflow Enforcement Agent

This document defines strict dataflow patterns and library recommendations for the Sight Reading application. **Consult this guide before writing any code.**

## Core Principles

### 1. Single Source of Truth for Timing

```
✅ CORRECT: NoteData[] from music generators → timing calculations
❌ WRONG: Extracting timing from SVG elements or DOM
```

**Rule**: The `musicGenerator.ts` creates `NoteData[]` with `duration` properties. This is the ONLY source of timing truth.

```typescript
// ✅ Correct pattern
const timingEvents = buildTimingEvents(rightHandNotes, leftHandNotes);
const scheduleTime = beatsToSeconds(event.time, bpm);

// ❌ Never do this
const duration = parseFloat(svgElement.getAttribute('dur')); // NO!
const timing = extractFromDOM(visualGroups); // NO!
```

### 2. Import from Core, Not Local Duplicates

**Rule**: All shared types and utilities MUST be imported from `src/core/`.

```typescript
// ✅ Correct imports
import { NoteData, TimeSignature, KeyInfo, LevelConfig } from './core/types';
import { noteDataToMidi, normalizeNoteName, midiToNoteName } from './core/noteUtils';
import { EventEmitter, createAppEvents } from './core/events';

// ❌ Never duplicate these locally
function normalizeNote(note: string): string { ... } // NO! Use core/noteUtils
interface TimingEvent { ... } // NO! Use core/types
```

### 3. Layered Module Dependencies

```
LAYER 0: core/           (no dependencies)
         ↓
LAYER 1: music/          (depends on core)
         playback/       (depends on core)
         rendering/      (depends on core)
         input/          (depends on core)
         ↓
LAYER 2: curriculum/     (depends on core, music)
         ↓
LAYER 3: main.ts         (orchestrates all)
```

**Rule**: Lower layers MUST NOT import from higher layers.

```typescript
// ❌ FORBIDDEN: Lower layer importing from higher
// In src/core/types.ts:
import { SomeThing } from '../curriculum/types'; // NO!

// ❌ FORBIDDEN: Cross-layer sibling imports at wrong level
// In src/playback/engine.ts:
import { MidiHandler } from '../input/midi'; // MAYBE - evaluate need

// ✅ ALLOWED: Higher importing from lower
// In src/curriculum/lessons/sight-reading.ts:
import { NoteData } from '../../core/types'; // YES
import { generateMelody } from '../../music/generators/melody'; // YES
```

---

## Library Requirements

### Use These Libraries (Already Installed)

| Library | Purpose | Import From |
|---------|---------|-------------|
| **Tone.js** | Audio synthesis, scheduling | `tone` |
| **Verovio** | MusicXML → SVG rendering | `verovio` |
| **Tonal** | Music theory (scales, chords) | `tonal` |

### Recommended Additions

| Need | Library | Why |
|------|---------|-----|
| .mxl decompression | `jszip` or use Verovio's `loadZipDataBuffer()` | Verovio already supports .mxl natively |
| MIDI file parsing | `@tonejs/midi` | Integrates with existing Tone.js |
| MusicXML types | `musicxml-interfaces` | TypeScript safety for XML building |

### DO NOT Reinvent

```typescript
// ❌ Don't write your own
function customZipDecompress(buffer: ArrayBuffer) { ... }
function parseMidiBytes(data: Uint8Array) { ... }
function calculateScale(root: string, mode: string) { ... }

// ✅ Use libraries
import JSZip from 'jszip';
import { Midi } from '@tonejs/midi';
import { Scale } from 'tonal';
```

---

## Type Safety Rules

### 1. No `any` Types

```typescript
// ❌ Forbidden
function handleEvent(event: any) { ... }
const data: any = {};

// ✅ Required
function handleEvent(event: MIDIMessageEvent) { ... }
const data: NoteData = { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false };
```

### 2. Discriminated Unions for State

```typescript
// ✅ Use discriminated unions
type PlaybackState =
  | { status: 'stopped' }
  | { status: 'playing'; beatIndex: number }
  | { status: 'paused'; beatIndex: number }
  | { status: 'countoff'; remainingBeats: number };

// ❌ Not flat booleans
let isPlaying = false;
let isPaused = false;
let isCountingOff = false; // Confusing overlap
```

### 3. Result Types for Fallible Operations

```typescript
// ✅ Explicit success/failure
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function loadMidiFile(buffer: ArrayBuffer): Result<MidiData, MidiParseError> {
  try {
    const midi = new Midi(buffer);
    return { ok: true, value: convertToMidiData(midi) };
  } catch (e) {
    return { ok: false, error: { message: 'Invalid MIDI file', cause: e } };
  }
}

// ❌ Not boolean returns
function loadMidiFile(buffer: ArrayBuffer): MidiData | null { ... } // Loses error info
```

---

## Event-Driven Communication

### Use EventEmitters for Cross-Module Communication

```typescript
// ✅ Correct: Events for decoupling
class PlaybackEngine {
  readonly onBeat = new EventEmitter<PlaybackBeatEvent>();

  private advanceBeat() {
    this.onBeat.emit({ beatIndex: this.currentBeat, notes: this.activeNotes });
  }
}

// In UI code:
playbackEngine.onBeat.on((event) => {
  highlightCurrentBeat(visualGroups, event.beatIndex);
});

// ❌ Wrong: Direct DOM manipulation in engine
class PlaybackEngine {
  private advanceBeat() {
    document.querySelector('.current')?.classList.remove('current'); // NO!
  }
}
```

---

## File Organization Rules

### 1. Maximum File Size: 300 Lines

If a file exceeds 300 lines, split it:

```
src/playback/engine.ts (280 lines) ✅

src/main.ts (1162 lines) ❌
  → Split into:
    - src/app/controls.ts
    - src/app/playbackController.ts
    - src/app/midiController.ts
    - src/main.ts (orchestration only)
```

### 2. One Responsibility Per File

```typescript
// ❌ Mixed responsibilities
// src/musicGenerator.ts contains:
//   - Level configuration
//   - Melody generation
//   - XML building
//   - Progress tracking

// ✅ Split by responsibility
src/curriculum/levels.ts      // Level configuration
src/music/generators/melody.ts // Melody generation
src/music/xml/builder.ts       // XML building
src/curriculum/progress.ts     // Progress tracking
```

### 3. Index Files for Re-exports

```typescript
// src/core/index.ts
export * from './types';
export * from './events';
export * from './noteUtils';

// Usage
import { NoteData, EventEmitter, noteDataToMidi } from './core';
```

---

## Forbidden Patterns

### 1. Global Mutable State

```typescript
// ❌ Forbidden: Module-level mutable state
let currentBpm = 60;
let isPlaying = false;

export function play() {
  isPlaying = true; // Mutating global
}

// ✅ Required: Encapsulated state in classes
export class PlaybackController {
  private state: PlaybackState = { status: 'stopped' };

  play() {
    this.state = { status: 'playing', beatIndex: 0 };
  }
}
```

### 2. DOM Queries in Non-UI Modules

```typescript
// ❌ Forbidden: DOM access in music/playback modules
// In src/music/generators/melody.ts:
const container = document.getElementById('notation'); // NO!

// ✅ DOM access only in:
//   - src/main.ts (app initialization)
//   - src/rendering/ (visual rendering)
//   - src/app/* (UI controllers)
```

### 3. Synchronous Blocking Operations

```typescript
// ❌ Forbidden: Blocking the main thread
function loadFile(path: string): string {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', path, false); // Synchronous!
  xhr.send();
  return xhr.responseText;
}

// ✅ Required: Async operations
async function loadFile(path: string): Promise<string> {
  const response = await fetch(path);
  return response.text();
}
```

---

## Checklist Before Committing

- [ ] No duplicate type definitions (all in `core/types.ts`)
- [ ] No duplicate utility functions (use `core/noteUtils.ts`)
- [ ] Timing derived from `NoteData[]`, not DOM/SVG
- [ ] All cross-module communication via EventEmitters
- [ ] No `any` types
- [ ] Files under 300 lines
- [ ] No direct DOM manipulation in music/playback modules
- [ ] Library used instead of custom implementation for:
  - ZIP decompression
  - MIDI parsing
  - Music theory calculations
  - Audio synthesis

---

## Quick Reference: Module Interfaces

### MusicSource Interface
```typescript
interface MusicSource {
  getMusic(): MusicData;
  regenerate?(): MusicData;
  readonly canRegenerate: boolean;
  readonly sourceType: 'procedural' | 'imported' | 'predefined';
}
```

### MusicData Interface
```typescript
interface MusicData {
  rightHandNotes: NoteData[];
  leftHandNotes: NoteData[];
  timeSignature: TimeSignature;
  key: KeyInfo;
  metadata: MusicMetadata;
}
```

### Event Types
```typescript
type PlaybackBeatEvent = { beatIndex: number; notes: NoteData[] };
type PlaybackStateEvent = { status: 'playing' | 'paused' | 'stopped' };
type MidiInputEvent = { note: string; velocity: number; timestamp: number };
type NoteMatchEvent = { expected: string; played: string; correct: boolean };
```

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Module overview
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - Improvement roadmap
- [MODULES_GUIDE.md](./MODULES_GUIDE.md) - Reusing modules in other apps
