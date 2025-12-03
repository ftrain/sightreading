# Contributing to Sight Reading Practice

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ftrain/sightreading.git
cd sightreading

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Project Structure

```
src/
├── main.ts           # Main application logic (MIDI, audio, UI)
├── musicGenerator.ts # Procedural music generation
├── style.css         # Styles
├── verovio.d.ts      # TypeScript types for Verovio
└── __tests__/        # Test files
```

## Key Technologies

- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Verovio](https://www.verovio.org/)** - MusicXML to SVG rendering
- **[Tone.js](https://tonejs.github.io/)** - Web audio (piano samples, metronome)
- **[Vitest](https://vitest.dev/)** - Testing framework
- **Web MIDI API** - MIDI keyboard input

## Architecture Overview

### Music Generation (`musicGenerator.ts`)

The `generateMusicXML()` function creates procedurally generated music:

1. Selects parameters based on current difficulty level (durations, intervals, key, etc.)
2. Generates right hand (melody) and left hand (bass) separately
3. Outputs MusicXML that Verovio renders to SVG

Key functions:
- `setLevel(n)` / `getLevel()` - Manage difficulty
- `generateMusicXML()` - Main generation entry point

### Main App (`main.ts`)

Handles:
- Verovio initialization and rendering
- Tone.js audio (piano samples via Salamander, metronome)
- MIDI input detection and note matching
- Beat tracking and scheduling via Tone.Transport
- Hands separate mode sequencing

## How to Contribute

### Bug Reports

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS info
- MIDI device (if relevant)

### Feature Requests

Open an issue describing:
- What you'd like to see
- Why it would be useful
- Any implementation ideas

### Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Ensure the build works: `npm run build`
7. Submit a PR with a clear description

### Code Style

- Use TypeScript throughout
- Follow existing patterns in the codebase
- Keep functions focused and readable
- Add tests for new logic in `musicGenerator.ts`

## Difficulty Level System

When modifying the difficulty system, understand how levels work:

| Level | Notes | Rests | Accidentals | Time Sig | Key |
|-------|-------|-------|-------------|----------|-----|
| 1 | Whole only | None | None | 4/4 | C |
| 2 | Whole, half | Yes | None | 4/4 | C |
| 3 | Quarter | None | None | 4/4 | C |
| 4 | Quarter | Yes | None | 4/4 | C |
| 5 | Quarter | Yes | Yes | 4/4 | C |
| 6 | Mix | Yes | Yes | 4/4 | C |
| 7 | + Eighth | Yes | Yes | 3/4, 4/4 | C |
| 8+ | Full variety | Yes | Yes | 2/4, 3/4, 4/4 | C, G, F, D, Bb |

## License

By contributing, you agree that your contributions will be licensed under the project's LGPL-3.0 license.
