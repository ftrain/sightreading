# Architecture Overview

This document describes the modular architecture of the Sight Reading Practice application.

## Module Structure

```
src/
  core/           # Shared types, events, utilities
  music/          # Music generation and representation
    generators/   # Melody, pattern, scale generation
    sources/      # MusicSource implementations
    xml/          # MusicXML building
  playback/       # Audio playback engine
  rendering/      # Visual rendering (Verovio)
  curriculum/     # Lessons and progress tracking
    lessons/      # Lesson implementations
  input/          # MIDI and performance tracking
  upload/         # MusicXML upload and progressive practice
  songs/          # Built-in song library
```

## Core Module (`src/core/`)

Foundation types and utilities shared across all modules.

- **types.ts** - All shared TypeScript interfaces (NoteData, TimeSignature, KeyInfo, LevelConfig)
- **events.ts** - EventEmitter pattern for decoupled communication
- **noteUtils.ts** - Note conversion, MIDI utilities, theory helpers

## Music Module (`src/music/`)

Music generation and representation.

### Generators (`music/generators/`)
- **patterns.ts** - Melodic patterns (stepwise, triadic, folk, classical)
- **scales.ts** - Key signatures and scale degree conversion
- **melody.ts** - Melody generation algorithms

### Sources (`music/sources/`)
Implements the `MusicSource` interface for different music sources:
- **procedural.ts** - Random generation based on level config
- Future: imported files, predefined pieces

### XML (`music/xml/`)
- **builder.ts** - Builds MusicXML from NoteData arrays

## Playback Module (`src/playback/`)

Audio playback using Tone.js.

- **engine.ts** - PlaybackEngine class with event-based communication
- **sampler.ts** - PianoSampler wrapping Tone.js Sampler
- **scheduler.ts** - Timing calculations (beats to seconds, etc.)

### Usage
```typescript
const engine = new PlaybackEngine({ bpm: 60 });
await engine.init();

engine.onBeat.on((event) => {
  // Update UI on each beat
});

engine.load({ rightHandNotes, leftHandNotes, timeSignature });
engine.play();
```

## Rendering Module (`src/rendering/`)

Visual rendering using Verovio.

- **engine.ts** - RenderingEngine coordinating rendering + highlighting
- **verovio.ts** - VerovioRenderer wrapper
- **highlighter.ts** - SVG element highlighting functions

### Usage
```typescript
const renderer = new RenderingEngine(container);
await renderer.init();

const groups = renderer.render(musicXml);
highlightCurrentBeat(groups, beatIndex);
```

## Curriculum Module (`src/curriculum/`)

Lesson framework and progress tracking.

- **types.ts** - Lesson, LessonStep, Curriculum interfaces
- **progress.ts** - ProgressManager for tracking mastery
- **levels.ts** - Level configurations

### Lessons (`curriculum/lessons/`)
- **sight-reading.ts** - SightReadingLesson for procedural practice
- **piece-study.ts** - PieceStudyLesson for repertoire (e.g., Bach walkthroughs)

### Creating Custom Lessons
```typescript
class MyLesson implements Lesson {
  getStep(index: number): LessonStep {
    return {
      getMusic(): MusicData { /* ... */ },
      getInstruction(): string { /* ... */ },
      getHints(): string[] { /* ... */ }
    };
  }
}
```

## Input Module (`src/input/`)

MIDI input and performance tracking.

- **midi.ts** - MidiHandler for Web MIDI API
- **performance.ts** - PerformanceTracker for scoring

## Data Flow

```
MusicSource → MusicData → MusicXML → Verovio → SVG
                 ↓
            PlaybackEngine → Tone.js → Audio
                 ↓
              onBeat events → UI highlighting
```

## Event System

Components communicate via EventEmitter:

- **PlaybackEngine.onBeat** - Fires on each beat for UI sync
- **PlaybackEngine.onStateChange** - Play/stop state changes
- **PlaybackEngine.onComplete** - Piece finished
- **MidiHandler.onNoteOn/Off** - MIDI input events
- **PerformanceTracker.onMatch** - Note matching results

## Upload Module (`src/upload/`)

MusicXML file upload and progressive practice session management.

- **parser.ts** - MusicXML parser extracting notes, time/key signatures, measures
- **steps.ts** - Practice step generation algorithm (single measures, pairs, consolidation)
- **practice-session.ts** - ProgressivePracticeSession class managing step progression

### Practice Step Algorithm
The step generator creates a progressive sequence:
1. Single measure focus
2. Pair with next measure (bridge learning)
3. 4-measure consolidation (phrase boundaries)
4. 8-measure consolidation (larger sections)
5. Full piece consolidation

### Usage
```typescript
import { parseMusicXML, ProgressivePracticeSession } from './upload';

const parsed = parseMusicXML(xmlString);
const session = new ProgressivePracticeSession(parsed);

// Get current segment to practice
const segment = session.getCurrentSegment();
// { rightHand: NoteData[], leftHand: NoteData[], description: 'Measure 1' }

// Advance when mastered
session.nextStep();
```

## Songs Module (`src/songs/`)

Built-in song library with public domain pieces.

- **index.ts** - Song registry and lookup functions

### Adding Built-in Songs
```typescript
const songs: Song[] = [
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    composer: 'Bach',
    difficulty: 'beginner',
    xml: `<?xml version="1.0"?>...`
  }
];
```

## Design Principles

1. **Decoupled modules** - Components communicate via events, not direct calls
2. **Type-safe interfaces** - Strong typing for all data structures
3. **Single responsibility** - Each module handles one concern
4. **LLM-friendly** - Small files (~100-300 lines) with clear documentation
5. **Reusable** - Components can be used independently or combined
