# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Project Overview

Sight Reading Practice is a web app for learning to read piano sheet music. It generates procedural exercises with a structured curriculum and provides real-time feedback via MIDI input.

## Build & Test Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173/sightreading/)
npm test             # Run unit tests (Vitest)
npx playwright test  # Run E2E tests
npm run build        # Production build
npm run deploy       # Deploy to GitHub Pages
```

## Architecture

See `docs/ARCHITECTURE.md` for detailed modular architecture documentation.

### Module Structure

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
```

### Key Files (Legacy - still in use)

- `src/main.ts` - App initialization, UI controls, playback scheduling, MIDI handling
- `src/musicGenerator.ts` - Procedural music generation, level curriculum, progress tracking
- `src/scheduler.ts` - Pure utility functions for timing calculations
- `src/fingeringEngine.ts` - Piano fingering suggestions

### Data Flow (Timing)

The timing system uses the music generator as the single source of truth:

1. `musicGenerator.ts` creates `NoteData[]` with `duration` property for each note
2. `main.ts:buildTimingEvents()` merges RH/LH notes into `timingEvents[]`
3. `main.ts:scheduleMusic()` uses `timingEvents` for Tone.js scheduling
4. SVG elements in `visualGroups[]` are only used for visual highlighting

**Important**: Never extract timing/duration from SVG elements. The music generator is the source of truth.

### Level System

- **Levels 1-3**: C major whole notes (RH → LH → Both)
- **Levels 4-7**: C major rhythms (half notes, quarters, rests/3-4, dotted)
- **Levels 8-10**: C major advanced rhythms (eighths, dotted eighths, sixteenths)
- **Levels 11+**: New keys following circle of fifths (G, F, D, Bb, A, Eb, E, Ab...)
- Each level has 4 sub-levels (a, b, c, d)
- `handMode: 'right' | 'left' | 'both'` determines which staves have notes vs rests

### Music Generation

- Uses MusicXML format rendered by Verovio
- `generateMusicXML()` returns: xml, timeSignature, lessonDescription, rightHandNotes, leftHandNotes, etc.
- Notes are stored as `NoteData` with step, alter, octave, duration, isRest
- Durations: 4=whole, 2=half, 1=quarter, 0.5=eighth, 0.25=sixteenth, 0.75=dotted eighth

## Common Tasks

### Adding a New Level Feature

1. Update `LevelConfig` interface in `musicGenerator.ts`
2. Modify `getLevelConfig()` to use the new config
3. Update lesson descriptions in `getLessonDescription()`
4. Update dropdown in `index.html`
5. Add tests in `src/__tests__/musicGenerator.test.ts`

### Modifying Playback Timing

1. Only modify timing in `buildTimingEvents()` or `scheduleMusic()`
2. Never parse timing from SVG elements
3. Run timing tests: `npx playwright test --grep "Playback Timing"`

### Updating UI

1. HTML structure is in `index.html`
2. Styles in `src/style.css`
3. Control handlers in `setupControls()` in `main.ts`

## Testing

- Unit tests: `npm test` (105 tests in Vitest)
- E2E tests: `npx playwright test` (Chromium, includes timing verification)
- Key timing tests verify no duplicate notes and proper spacing

## Gotchas

- MusicXML uses `<part-name print-object="no">` to hide "Piano" label
- Countoff shows 4-3-2-1 on each beat (not before first beat)
- Level progress is saved to localStorage
- `visualGroups` is for SVG highlighting only, not timing
- Level cap is 23 (10 C major levels + 13 key levels)
