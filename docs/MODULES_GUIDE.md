# Modules Guide: Building Music Applications

This guide explains how to reuse the modules from this codebase to build different music applications.

## Module Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                │
│  (Your custom app: Sight Reading, Theory Trainer, Score Viewer, etc.)   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────────────┐
│                         DOMAIN MODULES                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │curriculum│  │ playback │  │ rendering│  │  input   │  │  music   │  │
│  │          │  │          │  │          │  │          │  │          │  │
│  │ lessons  │  │ engine   │  │ verovio  │  │ midi     │  │ sources  │  │
│  │ progress │  │ sampler  │  │ highligh │  │ perform  │  │ xml      │  │
│  │ levels   │  │ schedule │  │          │  │          │  │ generate │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴─────────────┴────────┐
│                            CORE MODULE                                  │
│            types.ts  │  events.ts  │  noteUtils.ts                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Module (`src/core/`)

**Purpose:** Foundation types, events, and utilities used by all other modules.

**Dependencies:** None

**Can Be Used For:**
- Any music application needing note representation
- Event-driven architectures
- MIDI-related utilities

### Key Exports

```typescript
// Types
import {
  NoteData,           // { step, alter, octave, duration, isRest }
  TimeSignature,      // { beats, beatType }
  KeyInfo,            // { name, fifths, scale }
  LevelConfig,        // Configuration for procedural generation
  Finger,             // 1 | 2 | 3 | 4 | 5
  Hand,               // 'left' | 'right'
} from './core/types';

// Events
import {
  EventEmitter,       // Generic type-safe event emitter
  createAppEvents,    // Factory for standard app events
} from './core/events';

// Utilities
import {
  noteDataToMidi,     // NoteData → MIDI note number
  midiToNoteName,     // MIDI number → "C4", "F#5"
  normalizeNoteName,  // "Db4" → "C#4"
  noteDataToString,   // NoteData → "C4"
  scaleDegreeToNote,  // (degree, key) → note name
} from './core/noteUtils';
```

### Example: Custom Note Representation

```typescript
import { NoteData, noteDataToMidi, noteDataToString } from './core';

const chord: NoteData[] = [
  { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
  { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
  { step: 'G', alter: 0, octave: 4, duration: 1, isRest: false },
];

// Convert to MIDI for playback
const midiNotes = chord.map(noteDataToMidi); // [60, 64, 67]

// Convert to display strings
const labels = chord.map(noteDataToString);  // ['C4', 'E4', 'G4']
```

---

## Music Module (`src/music/`)

**Purpose:** Music generation, representation, and MusicXML building.

**Dependencies:** `core/`

**Can Be Used For:**
- Procedural music generation
- MusicXML creation
- Scale and pattern utilities
- Music theory applications

### Submodules

#### Generators (`music/generators/`)

```typescript
import {
  generateMelody,     // Create melodic line from config
  generateLeftHand,   // Create accompaniment
  getChordNotes,      // Get chord tones for a scale degree
} from './music/generators/melody';

import {
  KEYS,               // All key signatures
  KEY_PROGRESSION,    // Circle of fifths order
  getKeyForLevel,     // Level number → KeyInfo
  scaleDegreeToNote,  // Degree → note in key
} from './music/generators/scales';

import {
  stepwisePatterns,   // Melodic patterns: [1,2,3], [3,2,1], etc.
  triadicPatterns,    // [1,3,5], [5,3,1], etc.
  folkPatterns,       // Folk-style melodic shapes
  classicalPatterns,  // Classical-style patterns
} from './music/generators/patterns';
```

#### Sources (`music/sources/`)

```typescript
import {
  MusicSource,              // Interface for any music provider
  MusicData,                // { rightHandNotes, leftHandNotes, ... }
  ProceduralMusicSource,    // Random generation implementation
  createProceduralSource,   // Factory function
} from './music/sources';
```

#### XML Builder (`music/xml/`)

```typescript
import {
  buildMusicXML,      // NoteData[] → MusicXML string
  countMeasures,      // Count measures in note array
} from './music/xml/builder';
```

### Example: Procedural Music Generator

```typescript
import { createProceduralSource } from './music/sources';
import { buildMusicXML } from './music/xml/builder';

// Create a level 5 exercise
const source = createProceduralSource({
  level: 5,
  subLevel: 2,
  numMeasures: 4,
});

const music = source.getMusic();
const xml = buildMusicXML(music.rightHandNotes, music.leftHandNotes, {
  key: music.key,
  timeSignature: music.timeSignature,
});

// xml is now valid MusicXML ready for Verovio
```

### Example: Custom Scale Exercises

```typescript
import { KEYS, scaleDegreeToNote } from './music/generators/scales';
import { NoteData } from './core/types';

function createScaleExercise(keyName: string): NoteData[] {
  const key = KEYS[keyName];
  const notes: NoteData[] = [];

  // Ascending scale
  for (let degree = 1; degree <= 8; degree++) {
    const { noteName, octave } = scaleDegreeToNote(degree, key, 4);
    notes.push({
      step: noteName.replace(/[#b]/, ''),
      alter: noteName.includes('#') ? 1 : noteName.includes('b') ? -1 : 0,
      octave,
      duration: 1, // quarter notes
      isRest: false,
    });
  }

  return notes;
}

const gMajorScale = createScaleExercise('G');
```

---

## Playback Module (`src/playback/`)

**Purpose:** Audio playback with Tone.js, timing calculations.

**Dependencies:** `core/`, `tone`

**Can Be Used For:**
- Piano/music playback applications
- Metronome apps
- Rhythm trainers
- Karaoke-style apps

### Key Exports

```typescript
import {
  PlaybackEngine,         // Main playback controller
  createPlaybackEngine,   // Factory function
} from './playback/engine';

import {
  PianoSampler,           // Piano audio sampler
  createMetronomeSynth,   // Metronome click synth
} from './playback/sampler';

import {
  beatsToSeconds,         // Convert beats to time
  buildTimingEvents,      // NoteData[] → TimingEvent[]
  getTotalDuration,       // Calculate piece length
} from './playback/scheduler';
```

### Example: Simple Music Player

```typescript
import { PlaybackEngine } from './playback';
import { NoteData } from './core/types';

async function createPlayer() {
  const engine = new PlaybackEngine({ bpm: 100 });
  await engine.init();

  // Subscribe to events
  engine.onBeat.on(({ beatIndex }) => {
    console.log(`Beat ${beatIndex}`);
    // Update your UI here
  });

  engine.onComplete.on(() => {
    console.log('Finished!');
  });

  return engine;
}

// Usage
const player = await createPlayer();
player.load({
  rightHandNotes: myNotes,
  leftHandNotes: [],
  timeSignature: { beats: 4, beatType: 4 },
});
player.play();
```

### Example: Standalone Metronome

```typescript
import { createMetronomeSynth } from './playback/sampler';
import { beatsToSeconds } from './playback/scheduler';
import * as Tone from 'tone';

async function startMetronome(bpm: number) {
  await Tone.start();
  const synth = createMetronomeSynth();
  let beat = 0;

  Tone.getTransport().bpm.value = bpm;
  Tone.getTransport().scheduleRepeat((time) => {
    synth.triggerAttackRelease('C5', '16n', time);
    beat = (beat + 1) % 4;
  }, '4n');

  Tone.getTransport().start();
}
```

---

## Rendering Module (`src/rendering/`)

**Purpose:** MusicXML → SVG rendering, visual highlighting.

**Dependencies:** `core/`, `verovio`

**Can Be Used For:**
- Sheet music viewers
- Score annotation tools
- Music education displays
- Print-ready score rendering

### Key Exports

```typescript
import {
  RenderingEngine,         // High-level rendering manager
  createRenderingEngine,   // Factory function
} from './rendering/engine';

import {
  VerovioRenderer,         // Low-level Verovio wrapper
} from './rendering/verovio';

import {
  groupNotesByPosition,    // Group SVG elements by beat
  highlightCurrentBeat,    // Visual highlighting
  setGroupState,           // Set CSS state on groups
} from './rendering/highlighter';
```

### Example: Score Viewer

```typescript
import { RenderingEngine } from './rendering';

async function createScoreViewer(container: HTMLElement) {
  const renderer = new RenderingEngine(container);
  await renderer.init();

  return {
    render(musicXml: string) {
      const visualGroups = renderer.render(musicXml);
      return visualGroups;
    },

    highlight(beatIndex: number) {
      renderer.highlight(beatIndex);
    },

    clear() {
      renderer.clearHighlighting();
    },
  };
}

// Usage
const viewer = await createScoreViewer(document.getElementById('score')!);
viewer.render(myMusicXml);
viewer.highlight(3); // Highlight 4th beat
```

### Example: Static Score Rendering

```typescript
import { VerovioRenderer } from './rendering/verovio';

async function renderScoreToSvg(musicXml: string): Promise<string> {
  const renderer = new VerovioRenderer();
  await renderer.init();

  renderer.setOptions({
    scale: 40,
    pageWidth: 2000,
    adjustPageHeight: true,
    footer: 'none',
  });

  renderer.loadData(musicXml);
  return renderer.renderToSVG(1); // First page
}
```

---

## Input Module (`src/input/`)

**Purpose:** MIDI input handling, performance tracking.

**Dependencies:** `core/`

**Can Be Used For:**
- MIDI keyboard input
- Performance scoring
- Practice feedback
- Recording applications

### Key Exports

```typescript
import {
  MidiHandler,              // Web MIDI API wrapper
  createMidiHandler,        // Factory function
} from './input/midi';

import {
  PerformanceTracker,       // Note matching and scoring
  createPerformanceTracker, // Factory function
} from './input/performance';
```

### Example: MIDI Input Display

```typescript
import { MidiHandler } from './input/midi';

async function setupMidiDisplay(displayElement: HTMLElement) {
  const handler = new MidiHandler();
  const available = await handler.init();

  if (!available) {
    displayElement.textContent = 'MIDI not supported';
    return;
  }

  handler.onNoteOn.on(({ note, velocity }) => {
    displayElement.textContent = `Playing: ${note} (vel: ${velocity})`;
  });

  handler.onNoteOff.on(({ note }) => {
    displayElement.textContent = `Released: ${note}`;
  });

  handler.onDevicesChanged.on((devices) => {
    console.log('Available MIDI devices:', devices);
  });
}
```

### Example: Practice Feedback

```typescript
import { PerformanceTracker } from './input/performance';
import { MidiHandler } from './input/midi';
import { NoteData } from './core/types';

async function createPracticeFeedback() {
  const midi = new MidiHandler();
  const tracker = new PerformanceTracker();

  await midi.init();

  // Set expected notes for current beat
  tracker.setExpectedNotes([
    { step: 'C', alter: 0, octave: 4, duration: 1, isRest: false },
    { step: 'E', alter: 0, octave: 4, duration: 1, isRest: false },
  ]);

  // Track matches
  midi.onNoteOn.on(({ note }) => {
    const result = tracker.checkNote(note);
    if (result.correct) {
      showFeedback('correct', note);
    } else {
      showFeedback('wrong', note, result.expected);
    }
  });

  // Get final stats
  function getResults() {
    return tracker.getStats(); // { correct, wrong, accuracy }
  }
}
```

---

## Curriculum Module (`src/curriculum/`)

**Purpose:** Lessons, levels, and progress tracking.

**Dependencies:** `core/`, `music/`

**Can Be Used For:**
- Structured learning paths
- Progress persistence
- Lesson/exercise frameworks
- Gamification systems

### Key Exports

```typescript
import {
  getLevelConfig,          // Level → LevelConfig
  getLevelDescription,     // Level → human description
  LEVEL_DESCRIPTIONS,      // All level descriptions
} from './curriculum/levels';

import {
  ProgressManager,         // Progress tracking
  createProgressManager,   // Factory
} from './curriculum/progress';

import {
  SightReadingLesson,      // Procedural practice lesson
} from './curriculum/lessons/sight-reading';

import {
  PieceStudyLesson,        // Repertoire study lesson
} from './curriculum/lessons/piece-study';
```

### Example: Level-Based Practice App

```typescript
import { getLevelConfig, getLevelDescription } from './curriculum/levels';
import { ProgressManager } from './curriculum/progress';
import { createProceduralSource } from './music/sources';

function createPracticeSession() {
  const progress = new ProgressManager();

  function getCurrentExercise() {
    const { level, subLevel } = progress.current;
    const config = getLevelConfig(level, subLevel);

    return {
      music: createProceduralSource({
        level,
        subLevel,
        numMeasures: 4,
      }).getMusic(),
      description: getLevelDescription(level, subLevel),
      suggestedBpm: config.suggestedBpm,
    };
  }

  function recordAttempt(hadMistakes: boolean) {
    progress.recordCompletion(hadMistakes);

    if (progress.shouldAdvanceLevel()) {
      progress.advanceLevel();
      return { advanced: true, newLevel: progress.current };
    }

    if (progress.shouldIncreaseTempo()) {
      progress.increaseTempo();
      return { tempoIncreased: true, newBpm: progress.currentBpm };
    }

    return { continue: true };
  }

  return { getCurrentExercise, recordAttempt };
}
```

---

## Application Examples

### 1. Theory Trainer App

Use: `core/`, `music/generators/`, `input/`

```typescript
// Quiz app for chord/scale recognition
import { KEYS, scaleDegreeToNote } from './music/generators/scales';
import { getChordNotes } from './music/generators/melody';
import { MidiHandler } from './input/midi';

class TheoryQuiz {
  async identifyChord(root: string, type: 'major' | 'minor') {
    const chordNotes = getChordNotes(root, type);
    // Play chord and wait for answer...
  }

  async identifyScale(keyName: string) {
    // Play scale and ask user to identify key...
  }
}
```

### 2. Score Viewer/Player

Use: `core/`, `rendering/`, `playback/`

```typescript
import { RenderingEngine } from './rendering';
import { PlaybackEngine } from './playback';

class ScorePlayer {
  private renderer: RenderingEngine;
  private player: PlaybackEngine;

  async loadFile(mxlFile: File) {
    // Load and render score
    // Sync playback with highlighting
  }
}
```

### 3. MIDI Recorder

Use: `core/`, `input/`, `music/xml/`

```typescript
import { MidiHandler } from './input/midi';
import { buildMusicXML } from './music/xml/builder';

class MidiRecorder {
  private notes: NoteData[] = [];

  async startRecording() {
    // Capture MIDI input as NoteData
  }

  exportToMusicXML(): string {
    return buildMusicXML(this.notes, [], { /* options */ });
  }
}
```

### 4. Rhythm Trainer

Use: `core/`, `playback/`, `input/`

```typescript
import { PlaybackEngine } from './playback';
import { PerformanceTracker } from './input/performance';

class RhythmTrainer {
  // Focus on timing accuracy without pitch
  // Use metronome + tap input
}
```

---

## Module Independence

Each module is designed to be used independently:

| Module | Can Use Standalone? | External Dependencies |
|--------|---------------------|----------------------|
| `core/` | Yes | None |
| `music/` | Yes | core |
| `playback/` | Yes | core, Tone.js |
| `rendering/` | Yes | core, Verovio |
| `input/` | Yes | core |
| `curriculum/` | Partial* | core, music |

*Curriculum depends on music for procedural generation, but progress tracking works alone.

---

## Extending the Modules

### Adding a New Music Source

```typescript
// src/music/sources/yourSource.ts
import { MusicSource, MusicData } from './types';

export class YourMusicSource implements MusicSource {
  getMusic(): MusicData {
    // Your implementation
  }

  get canRegenerate(): boolean {
    return false; // or true if applicable
  }

  get sourceType(): MusicSourceType {
    return 'custom';
  }
}
```

### Adding a New Lesson Type

```typescript
// src/curriculum/lessons/yourLesson.ts
import { Lesson, LessonStep } from '../types';

export class YourLesson implements Lesson {
  getStep(index: number): LessonStep {
    return {
      getMusic() { /* ... */ },
      getInstruction() { return 'Play this phrase'; },
      getHints() { return ['Tip 1', 'Tip 2']; },
    };
  }

  getTotalSteps(): number {
    return 10;
  }
}
```

---

## Best Practices

1. **Import from module index files**
   ```typescript
   import { NoteData } from './core';          // Not './core/types'
   import { PlaybackEngine } from './playback'; // Not './playback/engine'
   ```

2. **Use EventEmitters for cross-module communication**
   ```typescript
   // Don't pass callbacks, use events
   engine.onBeat.on(handler);
   ```

3. **Keep modules independent**
   ```typescript
   // Don't import curriculum from playback
   // If needed, pass data through app layer
   ```

4. **Use factories for complex initialization**
   ```typescript
   const engine = createPlaybackEngine({ bpm: 120 });
   // Not: new PlaybackEngine(...complex setup...)
   ```
