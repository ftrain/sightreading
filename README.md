# Sight Reading Practice

**[Try it live](https://ftrain.github.io/sightreading)** | [GitHub](https://github.com/ftrain/sightreading)

A web-based sight reading practice app for piano. Generates infinite procedural exercises with a structured curriculum that progresses from simple whole notes to complex rhythms across multiple keys.

## Features

- **Structured Curriculum**: 20 levels progressing through C major fundamentals, then new keys (G, F, D, Bb, etc.)
- **Interleaved Hand Practice**: Each concept is practiced RH → LH → Both hands before advancing
- **MIDI Input**: Connect your MIDI keyboard for real-time note detection
  - Correct notes highlight in teal
  - Wrong notes highlight in red
  - Forgiving timing (early notes accepted)
- **Metronome**: Count-off with 4-3-2-1 display, 16th note subdivisions
- **Grand Staff**: Clean notation with treble and bass clefs
- **Progress Tracking**: Mastery system requires consistent correct play before advancing
- **Tempo Progression**: Start slow (30 BPM), increase as you master each level

## Curriculum Overview

### C Major Foundation (Levels 1-7)

| Level | Focus | Hands |
|-------|-------|-------|
| 1 | Whole notes, C-G range | RH only |
| 2 | Whole notes, bass clef intro | LH only |
| 3 | Whole notes, coordination | Both |
| 4 | Half notes | RH → LH → Both |
| 5 | Quarter notes | RH → LH → Both |
| 6 | Rests, 3/4 time | RH → LH → Both |
| 7 | Dotted notes, wider intervals | RH → LH → Both |

### New Keys (Levels 8+)

Each new key follows the same pattern:
- 8a-d: G major (1 sharp)
- 9a-d: F major (1 flat)
- 10a-d: D major (2 sharps)
- And so on through the circle of fifths...

## Controls

- **Tempo**: Set BPM (starts at 30 for beginners)
- **Metronome**: Toggle on/off, adjust volume
- **Level +/-**: Manually adjust difficulty
- **Options**: Access level jump, key override, and fingering settings
- **Start/Stop**: Begin or end practice session

## Tech Stack

- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Verovio](https://www.verovio.org/) - Music notation rendering (MusicXML → SVG)
- [Tone.js](https://tonejs.github.io/) - Web audio (metronome, sounds)
- [Playwright](https://playwright.dev/) - E2E testing
- [Vitest](https://vitest.dev/) - Unit testing
- Web MIDI API - MIDI keyboard input

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Run E2E tests
npx playwright test

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Architecture

```
src/
├── main.ts           # App entry, UI, playback scheduling
├── musicGenerator.ts # Procedural music generation, curriculum
├── scheduler.ts      # Timing utilities for playback
├── fingeringEngine.ts# Piano fingering suggestions
├── theoryAnalyzer.ts # Music theory analysis (unused)
└── __tests__/        # Unit tests
```

Key data flow:
1. `musicGenerator` creates `NoteData[]` for each hand
2. `buildTimingEvents()` extracts timing from note data
3. `scheduleMusic()` schedules playback via Tone.js
4. `visualGroups` maps SVG elements for highlighting

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

LGPL-3.0 - See [LICENSE](LICENSE) for details.

Uses [Verovio](https://www.verovio.org/) (LGPL-3.0).
