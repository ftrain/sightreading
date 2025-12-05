# MusicXML Upload & Progressive Practice Feature

## Overview

Add capability to upload a MusicXML file and practice it measure-by-measure with progressive grouping. The display algorithm builds familiarity by showing overlapping measure groups.

## Display Algorithm: "Sliding Window with Consolidation"

```
Measure sequence: 1, 2, 3, 4, 5, 6, 7, 8...

Practice sequence:
1. [1]           - Learn measure 1
2. [1, 2]        - Connect 1 to 2
3. [2]           - Focus on 2 alone
4. [2, 3]        - Connect 2 to 3
5. [3]           - Focus on 3 alone
6. [3, 4]        - Connect 3 to 4
7. [4]           - Focus on 4 alone
8. [1, 2, 3, 4]  - Consolidate first phrase (every 4 measures)
9. [4, 5]        - Bridge to next phrase
10. [5]          - Focus on 5 alone
... continue pattern ...
16. [5, 6, 7, 8] - Consolidate second phrase
17. [1-8]        - Consolidate both phrases (every 8 measures)
```

Key principles:
- Single measure focus before connection
- Overlapping pairs build continuity
- Consolidation at phrase boundaries (4 bars, 8 bars)
- Progressive expansion maintains context

## Architecture

### New Files

```
src/
  upload/
    parser.ts          # MusicXML parser → NoteData[]
    practice-session.ts # Progressive practice state machine

index.html             # Add upload UI
src/main.ts            # Add upload mode handling
```

### MusicXML Parser (`src/upload/parser.ts`)

Parse MusicXML to extract:
- Notes with pitch (step, alter, octave)
- Durations
- Rests
- Time signature
- Key signature
- Measure boundaries

```typescript
interface ParsedMusicXML {
  measures: MeasureData[];
  timeSignature: TimeSignature;
  keySignature: KeyInfo;
  title?: string;
}

interface MeasureData {
  number: number;
  rightHand: NoteData[];
  leftHand: NoteData[];
}

function parseMusicXML(xmlString: string): ParsedMusicXML
```

### Practice Session (`src/upload/practice-session.ts`)

State machine for progressive practice:

```typescript
interface PracticeStep {
  measures: number[];      // Which measures to show [1], [1,2], [2], etc.
  type: 'single' | 'pair' | 'consolidate';
  mastered: boolean;
}

class ProgressivePracticeSession {
  private measures: MeasureData[];
  private steps: PracticeStep[];
  private currentStepIndex: number;

  // Generate the step sequence from measure count
  private buildStepSequence(): void;

  // Get current practice segment
  getCurrentSegment(): { notes: NoteData[], description: string };

  // Mark current step as mastered, advance
  markMastered(): void;

  // Navigation
  nextStep(): boolean;
  previousStep(): boolean;

  // Progress info
  getProgress(): { current: number, total: number, percent: number };
}
```

### Step Generation Algorithm

```typescript
function generateSteps(measureCount: number): PracticeStep[] {
  const steps: PracticeStep[] = [];

  for (let i = 1; i <= measureCount; i++) {
    // Single measure
    steps.push({ measures: [i], type: 'single' });

    // Pair with next (if not last)
    if (i < measureCount) {
      steps.push({ measures: [i, i + 1], type: 'pair' });
    }

    // Consolidate every 4 measures
    if (i % 4 === 0 && i >= 4) {
      steps.push({
        measures: range(i - 3, i),
        type: 'consolidate'
      });
    }

    // Larger consolidation every 8 measures
    if (i % 8 === 0 && i >= 8) {
      steps.push({
        measures: range(i - 7, i),
        type: 'consolidate'
      });
    }
  }

  // Final full piece
  if (measureCount > 4) {
    steps.push({
      measures: range(1, measureCount),
      type: 'consolidate'
    });
  }

  return steps;
}
```

## UI Changes

### Upload Button (in options panel or main controls)

```html
<div class="control-section upload">
  <label class="upload-btn" for="xmlUpload">
    <svg><!-- upload icon --></svg>
    <span>Upload</span>
  </label>
  <input type="file" id="xmlUpload" accept=".xml,.musicxml" hidden />
</div>
```

### Practice Mode Display

When in upload practice mode:
- Show piece title
- Show current step: "Measures 1-2" or "Measure 3"
- Progress bar: "Step 5 of 24"
- Step type indicator: "Learning" / "Connecting" / "Consolidating"

### Mode Switching

```typescript
type AppMode = 'levels' | 'upload-practice';

let currentMode: AppMode = 'levels';
let practiceSession: ProgressivePracticeSession | null = null;

// On file upload:
async function handleFileUpload(file: File) {
  const xml = await file.text();
  const parsed = parseMusicXML(xml);
  practiceSession = new ProgressivePracticeSession(parsed);
  currentMode = 'upload-practice';
  renderCurrentStep();
}

// On step completion:
function onPieceComplete() {
  if (currentMode === 'upload-practice') {
    practiceSession.markMastered();
    if (practiceSession.nextStep()) {
      renderCurrentStep();
    } else {
      showCompletionMessage();
    }
  } else {
    // existing level progression
  }
}
```

## Implementation Steps

1. **Create branch**: `feature/musicxml-upload`

2. **Add MusicXML parser** (`src/upload/parser.ts`)
   - Parse XML structure
   - Extract note data per measure
   - Handle grand staff (treble/bass)
   - Extract time/key signatures

3. **Add practice session** (`src/upload/practice-session.ts`)
   - Build step sequence
   - Track mastery state
   - Merge measures into segments

4. **Add UI for upload** (`index.html`)
   - File input (hidden)
   - Upload button with icon
   - Practice mode header (piece title, progress)

5. **Integrate with main.ts**
   - Mode switching logic
   - Render current segment
   - Handle completion/advancement

6. **Style the new UI** (`src/style.css`)
   - Upload button styling
   - Practice progress display
   - Step type indicators

7. **Testing**
   - Unit tests for parser
   - Unit tests for step generation
   - E2E test with sample MusicXML

## File Format Support

Start with basic MusicXML:
- `<note>` elements with `<pitch>` or `<rest>`
- `<duration>` and `<type>`
- `<measure>` boundaries
- `<attributes>` for time/key signatures
- Grand staff with `<staff>` numbers 1 (treble) and 2 (bass)

Not initially supported (future):
- Chord symbols
- Dynamics
- Articulations
- Multiple voices per staff
- Compressed MusicXML (.mxl)

## User Flow

1. User clicks "Upload" button
2. File picker opens, user selects .xml file
3. File is parsed, practice session created
4. UI switches to practice mode:
   - Header shows piece title
   - Progress shows "Step 1 of N"
   - First measure displays
5. User plays through measure
6. On completion (no mistakes), advances to next step
7. Can navigate back with < button if needed
8. Eventually completes all steps
9. Can return to level mode or upload another file
