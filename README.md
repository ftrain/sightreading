# Sight Reading Practice

A web-based sight reading practice app for piano. Generates infinite procedural music and helps you practice reading notation with real-time feedback.

## Features

- **Progressive Difficulty**: Starts with simple whole notes in C major, gradually introducing half notes, quarter notes, eighth notes, rests, accidentals, and varied time signatures
- **Hands Separate Mode**: Practice right hand, left hand, then both hands together on the same piece before advancing
- **MIDI Input**: Connect your MIDI keyboard for real-time note detection
  - Correct notes glow teal
  - Wrong notes glow red
  - Early notes are accepted (forgiving timing)
- **Metronome**: Configurable metronome with count-off and 16th note subdivisions
- **Grand Staff**: Full piano notation with treble and bass clefs
- **Responsive Display**: Music is displayed in two 4-bar lines that adapt to your screen

## Controls

- **BPM**: Set the tempo (default 30 - very slow for beginners)
- **Metronome**: Toggle metronome on/off
- **Vol**: Adjust metronome volume
- **Hands Separate**: When enabled, practice RH → LH → Both hands before advancing
- **MIDI**: Select your MIDI input device
- **Level +/-**: Manually adjust difficulty level
- **Start/Stop**: Begin or end practice session

## Difficulty Levels

1. C major, whole notes only, stepwise motion
2. Whole and half notes with rests
3. Quarter notes
4. Quarter notes with rests
5. Quarter notes with accidentals and rests
6. Mix of quarter, half, and whole notes
7. Add eighth notes (beamed)
8-10. Full complexity with varied keys and time signatures

## Tech Stack

- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Verovio](https://www.verovio.org/) - Music notation rendering (MusicXML to SVG)
- [Tone.js](https://tonejs.github.io/) - Web audio (piano samples, metronome)
- Web MIDI API - MIDI keyboard input

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Usage

1. Open the app in a browser
2. Connect a MIDI keyboard (optional but recommended)
3. Select your MIDI device from the dropdown
4. Click "Start"
5. Play the highlighted notes on your keyboard
6. Practice until you can play each piece without mistakes to advance

## License

MIT
