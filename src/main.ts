import './style.css';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import * as Tone from 'tone';
import {
  generateMusicXML,
  regenerateXMLFromNotes,
  getLevel,
  getSubLevel,
  setLevel,
  setSubLevel,
  incrementLevel,
  getFullLevelString,
  getRepetitionsRemaining,
  setMobileMode,
  isMobileMode,
  getCurrentBpm,
  shouldIncreaseTempo,
  increaseTempo,
  setBpm,
  getBpmMasteryRemaining,
  setIncludeFingering,
  setKeyOverride,
  setHandModeOverride,
} from './musicGenerator';
import type { NoteData, TimingEvent, KeyInfo } from './core/types';
import { midiToNoteName, normalizeNoteName } from './core/noteUtils';
import {
  shouldAllowMetronomeClick,
  beatsToSeconds,
} from './scheduler';
import {
  createMidiSource,
  createXmlSource,
} from './music/sources';
import { buildMusicXML } from './music/xml/builder';
import { PieceStudyLesson } from './curriculum/lessons/piece-study';
import { recordAttempt, getAccuracy } from './app/analytics';

// State
let toolkit: VerovioToolkit;
let isPlaying = false;
let currentBeatIndex = 0;
let sampler: Tone.Sampler | null = null;
let scheduledEvents: number[] = [];

// SVG elements grouped by beat position (for visual highlighting only)
interface VisualGroup {
  elements: SVGElement[];
}
let visualGroups: VisualGroup[] = [];

// Timing data from music generator (source of truth for durations and playback)
// TimingEvent imported from core/types
let timingEvents: TimingEvent[] = [];

// Current time signature
let currentTimeSig = { beats: 4, beatType: 4 };

// Countoff state
let countoffBeats = 0;
let isCountingOff = false;

// Metronome debounce to prevent double clicks
let lastMetronomeTime = 0;

// Current notes being played (for MIDI matching)
let activeNotes: Set<string> = new Set();

// MIDI devices
let midiInputs: Map<string, MIDIInput> = new Map();
let selectedMidiInput: string | null = localStorage.getItem('midiDeviceId');

// Settings
let bpm = 30;
let metronomeEnabled = true;
let metronomeVolume = -20; // dB base for metronome (quieter default)
let autoTempoRamp = false;

// Store the current piece's XML
let currentPieceXml: string = '';

// Performance tracking
let mistakeCount = 0;

// Current lesson info
let currentLessonDescription = '';

// Current piece notes for playback timing (source of truth)
let currentRightHandNotes: NoteData[] = [];
let currentLeftHandNotes: NoteData[] = [];

// Piece study lesson for imported files (chunks into segments)
let currentPieceStudy: PieceStudyLesson | null = null;


// Detect mobile device and orientation
function detectMobile(): boolean {
  // Check for touch device OR narrow viewport in landscape
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isNarrowViewport = window.innerWidth < 1024;
  const isLandscape = window.innerWidth > window.innerHeight;

  // Mobile mode: touch device, or narrow landscape viewport
  return isTouchDevice || (isNarrowViewport && isLandscape);
}

function updateMobileMode() {
  const wasMobile = isMobileMode();
  const nowMobile = detectMobile();

  if (wasMobile !== nowMobile) {
    setMobileMode(nowMobile);
    // Update UI to reflect mobile mode
    document.body.classList.toggle('mobile-mode', nowMobile);
  }
}

async function init() {
  // Initialize Verovio
  const VerovioModule = await createVerovioModule();
  toolkit = new VerovioToolkit(VerovioModule);

  // Detect initial mobile state
  updateMobileMode();

  updateVerovioOptions();

  // Generate initial music
  generateAndRender();

  // Setup UI
  setupControls();

  // Setup MIDI
  setupMIDI();

  // Handle window resize and orientation change
  const handleResize = () => {
    const wasMobile = isMobileMode();
    updateMobileMode();
    updateVerovioOptions();
    if (!isPlaying) {
      // In piece study mode, just re-render current segment
      // In sight reading mode, regenerate if mobile mode changed
      if (currentPieceStudy) {
        rerenderCurrentMusic();
      } else {
        wasMobile !== isMobileMode() ? generateAndRender() : rerenderCurrentMusic();
      }
    }
  };
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));
}

function updateVerovioOptions() {
  const container = document.getElementById('notation')!;
  const width = Math.max(800, container.clientWidth - 20);

  // Smaller scale gives more horizontal room for note spacing
  const scale = isMobileMode() ? 35 : 42;

  toolkit.setOptions({
    pageWidth: width,
    pageHeight: 800,
    scale: scale,
    adjustPageHeight: true,
    footer: 'none',
    header: 'none',
    breaks: 'none', // Let Verovio fit all 4 measures on one line
    // Spacing for eighth notes
    spacingNonLinear: 0.55,
    spacingLinear: 0.3,
    spacingStaff: 6,
    spacingSystem: 4,
    // Show measure numbers on every measure
    mnumInterval: 1,
  });
}

// Re-render the current piece without generating new music
function rerenderCurrentMusic() {
  if (!currentPieceXml) return;
  toolkit.loadData(currentPieceXml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;
  groupNotesByPosition();
}

// Regenerate XML from current notes (for fingering toggle)
function regenerateCurrentMusicXML() {
  if (currentRightHandNotes.length === 0 && currentLeftHandNotes.length === 0) return;
  currentPieceXml = regenerateXMLFromNotes(
    currentRightHandNotes,
    currentLeftHandNotes,
    currentTimeSig
  );
}

async function initAudio() {
  if (sampler) return;
  await Tone.start();

  sampler = new Tone.Sampler({
    urls: {
      A0: 'A0.mp3',
      C1: 'C1.mp3',
      'D#1': 'Ds1.mp3',
      'F#1': 'Fs1.mp3',
      A1: 'A1.mp3',
      C2: 'C2.mp3',
      'D#2': 'Ds2.mp3',
      'F#2': 'Fs2.mp3',
      A2: 'A2.mp3',
      C3: 'C3.mp3',
      'D#3': 'Ds3.mp3',
      'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',
      C4: 'C4.mp3',
      'D#4': 'Ds4.mp3',
      'F#4': 'Fs4.mp3',
      A4: 'A4.mp3',
      C5: 'C5.mp3',
      'D#5': 'Ds5.mp3',
      'F#5': 'Fs5.mp3',
      A5: 'A5.mp3',
      C6: 'C6.mp3',
      'D#6': 'Ds6.mp3',
      'F#6': 'Fs6.mp3',
      A6: 'A6.mp3',
      C7: 'C7.mp3',
      'D#7': 'Ds7.mp3',
      'F#7': 'Fs7.mp3',
      A7: 'A7.mp3',
      C8: 'C8.mp3',
    },
    release: 2,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
  }).toDestination();

  await Tone.loaded();
}

function playMetronomeClick(subdivisionInBeat: number) {
  if (!metronomeEnabled) return;

  // Debounce to prevent double clicks from overlapping schedules
  const now = performance.now();
  if (!shouldAllowMetronomeClick(now, lastMetronomeTime, bpm)) {
    return;
  }
  lastMetronomeTime = now;

  // Create a fresh synth each time to avoid timing conflicts
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();

  let volume: number;
  let pitch: string;

  if (subdivisionInBeat === 0) {
    // Main beat - start quieter (was metronomeVolume, now -6dB quieter)
    volume = metronomeVolume - 6;
    pitch = 'G5';
  } else {
    // Subdivisions are 18dB quieter than main beat (much quieter)
    volume = metronomeVolume - 24;
    pitch = 'C5';
  }

  synth.volume.value = volume;
  synth.triggerAttackRelease(pitch, '32n');

  // Dispose after playing
  setTimeout(() => synth.dispose(), 500);
}

function generateAndRender() {
  // Clear piece study mode when generating new procedural exercises
  currentPieceStudy = null;

  updateVerovioOptions();
  const {
    xml,
    timeSignature,
    lessonDescription,
    suggestedBpm,
    rightHandNotes,
    leftHandNotes,
  } = generateMusicXML();

  currentTimeSig = timeSignature;
  currentPieceXml = xml;
  currentLessonDescription = lessonDescription;
  currentRightHandNotes = rightHandNotes;
  currentLeftHandNotes = leftHandNotes;

  // Sync BPM with lesson suggestion on level change
  const bpmInput = document.getElementById('bpm') as HTMLInputElement;
  if (bpmInput && suggestedBpm) {
    const currentBpm = getCurrentBpm();
    // Only update if this is a new level (BPM resets)
    if (currentBpm === suggestedBpm) {
      bpm = suggestedBpm;
      bpmInput.value = String(suggestedBpm);
      setBpm(suggestedBpm);
    }
  }

  renderCurrentMusic();

  // Update level display
  updateLevelDisplay();
}

function renderCurrentMusic() {
  toolkit.loadData(currentPieceXml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;

  // Build timing events from the source note data (not from SVG)
  buildTimingEvents();

  // Group SVG elements by position for visual highlighting
  groupNotesByPosition();
}

// Build timing events from the generated note data
// This is the source of truth for durations AND pitches
function buildTimingEvents() {
  timingEvents = [];

  // Round time to avoid floating point precision issues
  const roundTime = (t: number) => Math.round(t * 1000) / 1000;

  interface EventData {
    duration: number;
    pitches: string[];
  }
  const allEvents: Map<string, EventData> = new Map();

  // Helper to convert NoteData to pitch string
  const noteDataToPitch = (note: NoteData): string | null => {
    if (note.isRest) return null;
    let pitchName = note.step;
    if (note.alter === 1) pitchName += '#';
    else if (note.alter === -1) pitchName += 'b';
    return `${pitchName}${note.octave}`;
  };

  // Process right hand notes
  let currentTime = 0;
  for (const note of currentRightHandNotes) {
    const timeKey = String(roundTime(currentTime));
    const pitch = noteDataToPitch(note);
    const existing = allEvents.get(timeKey);
    if (existing) {
      if (pitch) existing.pitches.push(pitch);
      if (note.duration < existing.duration) existing.duration = note.duration;
    } else {
      allEvents.set(timeKey, {
        duration: note.duration,
        pitches: pitch ? [pitch] : [],
      });
    }
    currentTime += note.duration;
  }

  // Process left hand notes
  currentTime = 0;
  for (const note of currentLeftHandNotes) {
    const timeKey = String(roundTime(currentTime));
    const pitch = noteDataToPitch(note);
    const existing = allEvents.get(timeKey);
    if (existing) {
      if (pitch) existing.pitches.push(pitch);
      if (note.duration < existing.duration) existing.duration = note.duration;
    } else {
      allEvents.set(timeKey, {
        duration: note.duration,
        pitches: pitch ? [pitch] : [],
      });
    }
    currentTime += note.duration;
  }

  // Convert to sorted array
  const sortedTimes = Array.from(allEvents.keys()).map(Number).sort((a, b) => a - b);

  for (let i = 0; i < sortedTimes.length; i++) {
    const time = sortedTimes[i];
    const timeKey = String(time);
    const eventData = allEvents.get(timeKey)!;
    const nextTime = i < sortedTimes.length - 1 ? sortedTimes[i + 1] : time + eventData.duration;
    const duration = nextTime - time;
    timingEvents.push({ time, duration, pitches: eventData.pitches });
  }
}

function updateLevelDisplay() {
  const levelDisplay = document.getElementById('levelDisplay');
  const levelIndicator = document.getElementById('levelIndicator');
  const lessonInfo = document.getElementById('lessonInfo');
  const progressInfo = document.getElementById('progressInfo');
  const levelJump = document.getElementById('levelJump') as HTMLSelectElement;

  const levelString = getFullLevelString();
  const levelText = `Level ${levelString}`;

  // Update the badge in the score header
  if (levelDisplay) {
    levelDisplay.textContent = levelString;
  }

  // Update the control bar indicator
  if (levelIndicator) {
    levelIndicator.textContent = levelText;
  }

  // Sync level jump selector
  if (levelJump) {
    levelJump.value = String(getLevel());
  }

  if (lessonInfo) {
    lessonInfo.textContent = currentLessonDescription;
  }

  if (progressInfo) {
    const remaining = getRepetitionsRemaining();
    const tempoMasteryRemaining = getBpmMasteryRemaining();
    const accuracy = getAccuracy(getLevel(), getSubLevel());

    // Show both note mastery and tempo mastery progress
    let progressText = '';
    if (remaining > 0) {
      progressText = `${remaining} more to advance`;
    }

    // Show accuracy if we have data
    if (accuracy > 0) {
      progressText += progressText ? ' | ' : '';
      progressText += `${accuracy}% accuracy`;
    }

    // Show tempo increase suggestion if mastered at current tempo
    if (shouldIncreaseTempo()) {
      progressText += progressText ? ' | ' : '';
      progressText += 'Ready to increase tempo!';
    } else if (tempoMasteryRemaining > 0 && remaining === 0) {
      progressText += progressText ? ' | ' : '';
      progressText += `${tempoMasteryRemaining} at tempo`;
    }

    progressInfo.textContent = progressText;
  }
}


function groupNotesByPosition() {
  const notation = document.getElementById('notation')!;
  const elements = notation.querySelectorAll('.note, .rest');
  const notationRect = notation.getBoundingClientRect();

  // Include all staves (both hands)
  const staffToInclude: number | null = null;

  // First, collect all elements with their positions
  interface NotePosition {
    el: SVGElement;
    x: number;
    y: number;
    staff: number | null;
  }
  const notePositions: NotePosition[] = [];

  // Find staff line positions to determine which system each note belongs to
  const staffLines = notation.querySelectorAll('.staff');
  const systemYRanges: { top: number; bottom: number }[] = [];

  // Group staff lines into systems (each system has 2 staves for grand staff)
  for (let i = 0; i < staffLines.length; i += 2) {
    const staff1Rect = staffLines[i]?.getBoundingClientRect();
    const staff2Rect = staffLines[i + 1]?.getBoundingClientRect();
    if (staff1Rect && staff2Rect) {
      systemYRanges.push({
        top: Math.min(staff1Rect.top, staff2Rect.top) - notationRect.top,
        bottom: Math.max(staff1Rect.bottom, staff2Rect.bottom) - notationRect.top,
      });
    }
  }

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;

    const relativeY = rect.top - notationRect.top;
    const relativeX = rect.left - notationRect.left;

    // Determine which system this note is in
    let systemIndex = 0;
    for (let i = 0; i < systemYRanges.length; i++) {
      if (
        relativeY >= systemYRanges[i].top &&
        relativeY <= systemYRanges[i].bottom
      ) {
        systemIndex = i;
        break;
      }
      // If we're past this system's range, try the next one
      if (relativeY > systemYRanges[i].bottom) {
        systemIndex = i + 1;
      }
    }

    // Determine staff within the system (1 = treble/top, 2 = bass/bottom)
    let noteStaff: number | null = null;
    if (systemYRanges[systemIndex]) {
      const systemMidpoint =
        (systemYRanges[systemIndex].top + systemYRanges[systemIndex].bottom) / 2;
      noteStaff = relativeY < systemMidpoint ? 1 : 2;
    }

    // If in single-hand mode, only include notes from that staff
    if (
      staffToInclude !== null &&
      noteStaff !== null &&
      noteStaff !== staffToInclude
    ) {
      return;
    }

    notePositions.push({
      el: el as SVGElement,
      x: relativeX,
      y: systemIndex * 10000 + relativeX, // Sort key: system first, then x position
      staff: noteStaff,
    });
  });

  // Sort by system (y-based) then by x position
  notePositions.sort((a, b) => a.y - b.y);

  // Group notes that are at the same x position (within tolerance)
  const tolerance = 5;
  const positionMap = new Map<number, SVGElement[]>();

  notePositions.forEach(({ el, x }) => {
    let foundKey: number | null = null;
    for (const key of positionMap.keys()) {
      if (Math.abs(key - x) < tolerance) {
        foundKey = key;
        break;
      }
    }

    if (foundKey !== null) {
      positionMap.get(foundKey)!.push(el);
    } else {
      positionMap.set(x, [el]);
    }
  });

  // Build beat groups in order of first appearance
  const seenKeys = new Set<number>();
  visualGroups = [];

  notePositions.forEach(({ x }) => {
    // Find the key this x belongs to
    let key: number | null = null;
    for (const k of positionMap.keys()) {
      if (Math.abs(k - x) < tolerance) {
        key = k;
        break;
      }
    }

    if (key !== null && !seenKeys.has(key)) {
      seenKeys.add(key);
      const els = positionMap.get(key)!;
      // Only store elements for visual highlighting - timing comes from timingEvents
      visualGroups.push({ elements: els });
    }
  });
}

function setupMIDI() {
  if (!navigator.requestMIDIAccess) {
    console.log('Web MIDI not supported');
    return;
  }

  navigator.requestMIDIAccess().then(
    (midiAccess) => {
      updateMidiDevices(midiAccess);

      midiAccess.onstatechange = () => {
        updateMidiDevices(midiAccess);
      };
    },
    (err) => console.log('MIDI access denied:', err)
  );
}

function updateMidiDevices(midiAccess: MIDIAccess) {
  midiInputs.clear();

  for (const input of midiAccess.inputs.values()) {
    midiInputs.set(input.id, input);
    input.onmidimessage = handleMIDIMessage;
  }

  const midiSelect = document.getElementById('midiInput') as HTMLSelectElement;
  if (midiSelect) {
    const currentValue = midiSelect.value;
    midiSelect.innerHTML = '<option value="">No MIDI Device</option>';

    for (const [id, input] of midiInputs) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = input.name || id;
      midiSelect.appendChild(option);
    }

    // Prefer saved device, then current selection, then first available
    const savedDevice = localStorage.getItem('midiDeviceId');
    if (savedDevice && midiInputs.has(savedDevice)) {
      midiSelect.value = savedDevice;
    } else if (currentValue && midiInputs.has(currentValue)) {
      midiSelect.value = currentValue;
    } else if (midiInputs.size > 0) {
      const firstDevice = midiInputs.keys().next().value;
      if (firstDevice) midiSelect.value = firstDevice;
    }

    selectedMidiInput = midiSelect.value || null;
  }
}

function handleMIDIMessage(event: MIDIMessageEvent) {
  const [status, noteNum, velocity] = event.data!;
  const command = status & 0xf0;

  if (command === 0x90 && velocity > 0) {
    const noteName = midiToNoteName(noteNum);
    activeNotes.add(noteName);
    checkNoteMatch(noteName);
  } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    const noteName = midiToNoteName(noteNum);
    activeNotes.delete(noteName);
  }
}

function checkNoteMatch(playedNote: string) {
  if (!isPlaying || isCountingOff) return;

  const notation = document.getElementById('notation')!;
  const normalizedPlayed = normalizeNoteName(playedNote);

  // Get expected pitches from source data (not from Verovio)
  // currentBeatIndex points to the NEXT beat, so current beat is currentBeatIndex - 1
  const currentBeatIdx = currentBeatIndex - 1;
  const currentTimingEvent = currentBeatIdx >= 0 ? timingEvents[currentBeatIdx] : null;
  const expectedPitches = currentTimingEvent?.pitches ?? [];

  // Check if played note matches any expected pitch
  const matchedAny = expectedPitches.some(p => normalizeNoteName(p) === normalizedPlayed);

  // Get current note elements for visual feedback
  const currentElements = Array.from(notation.querySelectorAll('.note.current'));

  if (matchedAny && currentElements.length > 0) {
    // Find which element to mark by matching pitch via Verovio's pname/oct
    for (const el of currentElements) {
      if (el.classList.contains('correct')) continue;

      const id = el.getAttribute('id');
      if (!id) continue;

      const elemData = toolkit.getElementAttr(id);
      if (!elemData || !elemData.pname || !elemData.oct) continue;

      // Get base note from Verovio (e.g., 'g', '4')
      const basePitch = (elemData.pname as string).toUpperCase();
      const octave = elemData.oct;

      // Check if played note matches this element's base pitch
      const playedBase = normalizedPlayed.charAt(0);
      const playedOctave = normalizedPlayed.slice(-1);

      if (basePitch === playedBase && octave === playedOctave) {
        el.classList.add('correct');
        el.classList.remove('wrong');
        break;
      }
    }
  }

  // Also check upcoming notes (be forgiving of early plays)
  let matchedUpcoming = false;
  if (!matchedAny && currentBeatIndex < timingEvents.length) {
    const upcomingEvent = timingEvents[currentBeatIndex];
    const upcomingMatched = upcomingEvent.pitches.some(p => normalizeNoteName(p) === normalizedPlayed);

    if (upcomingMatched && currentBeatIndex < visualGroups.length) {
      const upcomingGroup = visualGroups[currentBeatIndex];
      for (const el of upcomingGroup.elements) {
        if (el.classList.contains('note')) {
          const id = el.getAttribute('id');
          if (!id) continue;

          const elemData = toolkit.getElementAttr(id);
          if (!elemData || !elemData.pname || !elemData.oct) continue;

          const basePitch = (elemData.pname as string).toUpperCase();
          const octave = elemData.oct;
          const playedBase = normalizedPlayed.charAt(0);
          const playedOctave = normalizedPlayed.slice(-1);

          if (basePitch === playedBase && octave === playedOctave) {
            el.setAttribute('data-early-correct', 'true');
            matchedUpcoming = true;
            break;
          }
        }
      }
    }
  }

  if (!matchedAny && !matchedUpcoming && currentElements.length > 0) {
    currentElements.forEach((el) => {
      if (!el.classList.contains('correct')) {
        el.classList.add('wrong');
        mistakeCount++;
      }
    });
  }
}

function setupControls() {
  const playPauseBtn = document.getElementById('playPause')!;
  const bpmInput = document.getElementById('bpm') as HTMLInputElement;
  const metronomeCheckbox = document.getElementById(
    'metronome'
  ) as HTMLInputElement;
  const midiSelect = document.getElementById('midiInput') as HTMLSelectElement;
  const levelUpBtn = document.getElementById('levelUp');
  const levelDownBtn = document.getElementById('levelDown');

  // Options panel toggle
  const optionsToggle = document.getElementById('optionsToggle');
  const optionsPanel = document.getElementById('optionsPanel');
  const optionsClose = document.getElementById('optionsClose');

  if (optionsToggle && optionsPanel) {
    optionsToggle.addEventListener('click', () => {
      const isHidden = optionsPanel.hidden;
      optionsPanel.hidden = !isHidden;
      optionsToggle.setAttribute('aria-expanded', String(!isHidden));
    });

    if (optionsClose) {
      optionsClose.addEventListener('click', () => {
        optionsPanel.hidden = true;
        optionsToggle.setAttribute('aria-expanded', 'false');
      });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (
        !optionsPanel.hidden &&
        !optionsPanel.contains(e.target as Node) &&
        !optionsToggle.contains(e.target as Node)
      ) {
        optionsPanel.hidden = true;
        optionsToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  bpmInput.addEventListener('change', () => {
    bpm = parseInt(bpmInput.value) || 30;
    setBpm(bpm); // Sync with musicGenerator's tempo tracking
  });

  metronomeCheckbox.addEventListener('change', () => {
    metronomeEnabled = metronomeCheckbox.checked;
    // Sync the toolbar button state
    const metronomeBtn = document.getElementById('metronomeToggle');
    if (metronomeBtn) {
      metronomeBtn.classList.toggle('active', metronomeCheckbox.checked);
      metronomeBtn.setAttribute('aria-pressed', String(metronomeCheckbox.checked));
    }
  });

  // Metronome toggle button in control bar
  const metronomeToggle = document.getElementById('metronomeToggle');
  if (metronomeToggle) {
    metronomeToggle.addEventListener('click', () => {
      const isActive = metronomeToggle.classList.toggle('active');
      metronomeToggle.setAttribute('aria-pressed', String(isActive));
      metronomeEnabled = isActive;
      // Sync the options panel checkbox
      if (metronomeCheckbox) {
        metronomeCheckbox.checked = isActive;
      }
    });
  }

  const metronomeVolumeSlider = document.getElementById(
    'metronomeVolume'
  ) as HTMLInputElement;
  if (metronomeVolumeSlider) {
    metronomeVolumeSlider.addEventListener('input', () => {
      // Slider is 0-100, map to -40dB to 0dB
      const sliderValue = parseInt(metronomeVolumeSlider.value);
      metronomeVolume = (sliderValue / 100) * 40 - 40; // 0 -> -40dB, 100 -> 0dB
    });
  }

  // Level jump selector
  const levelJumpSelect = document.getElementById('levelJump') as HTMLSelectElement;
  if (levelJumpSelect) {
    levelJumpSelect.addEventListener('change', () => {
      const newLevel = parseInt(levelJumpSelect.value);
      if (newLevel >= 1) {
        if (isPlaying) stop();
        setLevel(newLevel);
        setSubLevel(0);
        generateAndRender();
        updateLevelDisplay();
      }
    });
  }

  // Key override selector
  const keySelect = document.getElementById('keySelect') as HTMLSelectElement;
  if (keySelect) {
    keySelect.addEventListener('change', () => {
      if (isPlaying) stop();
      const selectedKey = keySelect.value || null;
      setKeyOverride(selectedKey);
      generateAndRender();
    });
  }

  // Hand mode override selector
  const handModeSelect = document.getElementById('handMode') as HTMLSelectElement;
  if (handModeSelect) {
    handModeSelect.addEventListener('change', () => {
      if (isPlaying) stop();
      const mode = handModeSelect.value as 'right' | 'left' | 'both' | '';
      setHandModeOverride(mode || null);
      generateAndRender();
    });
  }

  const showFingeringCheckbox = document.getElementById(
    'showFingering'
  ) as HTMLInputElement;
  if (showFingeringCheckbox) {
    showFingeringCheckbox.addEventListener('change', () => {
      setIncludeFingering(showFingeringCheckbox.checked);
      // Sync the toolbar button state
      const fingeringBtn = document.getElementById('fingeringToggle');
      if (fingeringBtn) {
        fingeringBtn.classList.toggle('active', showFingeringCheckbox.checked);
        fingeringBtn.setAttribute('aria-pressed', String(showFingeringCheckbox.checked));
      }
      // Re-render current music with fingering (don't regenerate new music)
      regenerateCurrentMusicXML();
      rerenderCurrentMusic();
    });
  }

  // Fingering toggle button in control bar
  const fingeringToggle = document.getElementById('fingeringToggle');
  if (fingeringToggle) {
    fingeringToggle.addEventListener('click', () => {
      const isActive = fingeringToggle.classList.toggle('active');
      fingeringToggle.setAttribute('aria-pressed', String(isActive));
      setIncludeFingering(isActive);
      // Sync the options panel checkbox
      if (showFingeringCheckbox) {
        showFingeringCheckbox.checked = isActive;
      }
      // Re-render current music with fingering (don't regenerate new music)
      regenerateCurrentMusicXML();
      rerenderCurrentMusic();
    });
  }

  midiSelect.addEventListener('change', () => {
    selectedMidiInput = midiSelect.value || null;
    if (selectedMidiInput) {
      localStorage.setItem('midiDeviceId', selectedMidiInput);
    } else {
      localStorage.removeItem('midiDeviceId');
    }
  });

  // Auto tempo ramp checkbox
  const autoTempoRampCheckbox = document.getElementById('autoTempoRamp') as HTMLInputElement;
  if (autoTempoRampCheckbox) {
    autoTempoRampCheckbox.addEventListener('change', () => {
      autoTempoRamp = autoTempoRampCheckbox.checked;
    });
  }

  levelUpBtn?.addEventListener('click', () => {
    // In piece study mode, navigate to next measure
    if (currentPieceStudy) {
      nextSegment();
      return;
    }
    // If tempo mastery achieved, increase tempo instead of level
    if (shouldIncreaseTempo()) {
      increaseTempo();
      const newBpm = getCurrentBpm();
      bpm = newBpm;
      const bpmInputEl = document.getElementById('bpm') as HTMLInputElement;
      if (bpmInputEl) bpmInputEl.value = String(newBpm);
      updateLevelDisplay();
    } else {
      if (isPlaying) stop();
      incrementLevel();
      generateAndRender();
      updateLevelDisplay();
    }
  });

  levelDownBtn?.addEventListener('click', () => {
    // In piece study mode, navigate to previous measure
    if (currentPieceStudy) {
      previousSegment();
      return;
    }
    const current = getLevel();
    if (current > 1) {
      if (isPlaying) stop();
      setLevel(current - 1);
      generateAndRender();
      updateLevelDisplay();
    }
  });

  playPauseBtn.addEventListener('click', async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    // Ignore if user is typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (isPlaying) {
        stop();
      } else {
        await start();
      }
    }
    // Arrow keys for segment navigation (when in piece study mode)
    if (currentPieceStudy) {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextSegment();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousSegment();
      }
    }
  });

  // File import handler
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (isPlaying) stop();

      const filename = file.name.toLowerCase();
      let result;

      if (filename.endsWith('.mid') || filename.endsWith('.midi')) {
        result = await createMidiSource(file);
      } else if (filename.endsWith('.xml') || filename.endsWith('.musicxml') || filename.endsWith('.mxl')) {
        result = await createXmlSource(file);
      } else {
        alert('Unsupported file type. Please use .mid, .midi, .xml, .musicxml, or .mxl files.');
        fileInput.value = '';
        return;
      }

      if (!result.ok) {
        alert(`Import failed: ${result.error.message}`);
        fileInput.value = '';
        return;
      }

      // Load the imported music
      const musicData = result.value.getMusic();
      loadImportedMusic(musicData, file.name);

      // Reset file input for future imports
      fileInput.value = '';
    });
  }
}

// Load imported music data into the app using PieceStudyLesson for chunking
function loadImportedMusic(
  musicData: { rightHandNotes: NoteData[]; leftHandNotes: NoteData[]; timeSignature: { beats: number; beatType: number }; key: KeyInfo; metadata: { description: string; suggestedBpm: number } },
  filename: string
) {
  // Create a PieceStudyLesson with sliding window for progressive learning
  // Pattern: Measure 1 → 1-2 → 2-3 → 3-4 → ...
  currentPieceStudy = new PieceStudyLesson({
    id: `import-${Date.now()}`,
    title: musicData.metadata.description || filename,
    rightHandNotes: musicData.rightHandNotes,
    leftHandNotes: musicData.leftHandNotes,
    timeSignature: musicData.timeSignature,
    key: musicData.key,
    suggestedBpm: musicData.metadata.suggestedBpm,
    barsPerStep: 1,
    learningMode: 'sliding', // Progressive sliding window
  });

  // Load the first segment
  loadCurrentSegment();

  // Update BPM from import
  const suggestedBpm = musicData.metadata.suggestedBpm;
  if (suggestedBpm) {
    bpm = suggestedBpm;
    const bpmInput = document.getElementById('bpm') as HTMLInputElement;
    if (bpmInput) bpmInput.value = String(suggestedBpm);
    setBpm(suggestedBpm);
  }

  // Show segment navigation
  updateSegmentDisplay();
}

// Load the current segment from piece study lesson
function loadCurrentSegment() {
  if (!currentPieceStudy) return;

  const step = currentPieceStudy.getCurrentStep();
  const music = step.musicSource.getMusic();

  // Update current notes
  currentRightHandNotes = music.rightHandNotes;
  currentLeftHandNotes = music.leftHandNotes;
  currentTimeSig = music.timeSignature;

  // Build MusicXML from segment notes with correct measure numbers
  currentPieceXml = buildMusicXML(
    currentRightHandNotes,
    currentLeftHandNotes,
    {
      key: music.key,
      timeSignature: currentTimeSig,
      startMeasure: music.metadata.startMeasure,
    }
  );

  // Update lesson description
  currentLessonDescription = `${currentPieceStudy.getTitle()} — ${step.explanation}`;

  // Render the music
  renderCurrentMusic();
}

// Update segment display in UI
function updateSegmentDisplay() {
  if (!currentPieceStudy) return;

  const step = currentPieceStudy.getCurrentStep();

  const lessonInfo = document.getElementById('lessonInfo');
  if (lessonInfo) {
    lessonInfo.textContent = currentLessonDescription;
  }

  const levelDisplay = document.getElementById('levelDisplay');
  if (levelDisplay) {
    levelDisplay.textContent = '♪';
  }

  const levelIndicator = document.getElementById('levelIndicator');
  if (levelIndicator) {
    // Show the current window (e.g., "Measure 1" or "Measures 1-2")
    levelIndicator.textContent = step.explanation;
  }

  const progressInfo = document.getElementById('progressInfo');
  if (progressInfo) {
    if (currentPieceStudy.isSlidingMode) {
      progressInfo.textContent = `→ to advance (${step.total} measures total)`;
    } else {
      progressInfo.textContent = `Use ← → to navigate measures`;
    }
  }
}

// Navigate to next segment
function nextSegment() {
  if (!currentPieceStudy) return;
  if (isPlaying) stop();

  if (currentPieceStudy.nextStep()) {
    loadCurrentSegment();
    updateSegmentDisplay();
  }
}

// Navigate to previous segment
function previousSegment() {
  if (!currentPieceStudy) return;
  if (isPlaying) stop();

  if (currentPieceStudy.previousStep()) {
    loadCurrentSegment();
    updateSegmentDisplay();
  }
}

async function start() {
  await initAudio();

  isPlaying = true;
  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.classList.add('playing');
  playPauseBtn.setAttribute('aria-label', 'Stop');

  currentBeatIndex = 0;
  mistakeCount = 0;

  groupNotesByPosition();

  // Fully reset Tone.js Transport before scheduling
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  scheduledEvents = [];

  // Force position reset - must happen after stop/cancel
  transport.position = 0;
  transport.bpm.value = bpm;

  // Reset debounce timers
  lastMetronomeTime = 0;
  lastAdvanceBeatTime = 0;

  const countoffTotal = currentTimeSig.beats;
  isCountingOff = true;
  countoffBeats = 0;
  // Don't show initial number - it will appear on first beat

  scheduleMusic(countoffTotal);

  Tone.getTransport().start();
}

function scheduleMusic(countoffTotal: number) {
  // Use timing events from music generator (source of truth for all timing)
  const events = timingEvents;

  // Calculate total duration of the piece
  let totalDuration = 0;
  if (events.length > 0) {
    const lastEvent = events[events.length - 1];
    totalDuration = lastEvent.time + lastEvent.duration;
  }

  const totalBeats = countoffTotal + totalDuration;
  const totalSubdivisions = Math.ceil(totalBeats * 4);

  // Schedule all metronome clicks and countoff updates using bars:beats:sixteenths
  // (safe for metronome since it's always on integer subdivisions)
  for (let sub = 0; sub < totalSubdivisions; sub++) {
    const beatNumber = Math.floor(sub / 4);
    const subInBeat = sub % 4;
    const time = `0:${beatNumber}:${subInBeat}`;

    const eventId = Tone.getTransport().schedule(() => {
      playMetronomeClick(subInBeat);

      // Handle countoff display updates
      // Show 4, 3, 2, 1 on each beat (beatNumber 0, 1, 2, 3)
      if (subInBeat === 0 && beatNumber < countoffTotal) {
        const displayNumber = countoffTotal - beatNumber;
        updateCountoffDisplay(displayNumber);
        countoffBeats = beatNumber + 1;
        if (countoffBeats >= countoffTotal) {
          isCountingOff = false;
          // Hide after a short delay so "1" is visible
          setTimeout(() => updateCountoffDisplay(0), 200);
        }
      }
    }, time);
    scheduledEvents.push(eventId);
  }

  // Schedule note events using timing from music generator
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const timeInBeats = countoffTotal + event.time;
    const timeInSeconds = beatsToSeconds(timeInBeats, bpm);

    // Schedule the note/rest to become current
    const noteEventId = Tone.getTransport().schedule(() => {
      advanceBeat();
    }, timeInSeconds);
    scheduledEvents.push(noteEventId);
  }

  // Schedule end of piece using seconds
  const endTimeInSeconds = beatsToSeconds(countoffTotal + totalDuration, bpm);
  const endEventId = Tone.getTransport().schedule(() => {
    onPieceComplete();
  }, endTimeInSeconds);
  scheduledEvents.push(endEventId);
}

function onPieceComplete() {
  if (!isPlaying) return;

  // Mark last notes as past
  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  // Reset tracking for next round
  mistakeCount = 0;
  currentBeatIndex = 0;

  // Fully reset Tone.js Transport before scheduling new piece
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().seconds = 0;

  // Reset debounce timers
  lastMetronomeTime = 0;
  lastAdvanceBeatTime = 0;

  // Handle piece study mode separately from sight reading mode
  if (currentPieceStudy) {
    onPieceStudySegmentComplete();
  } else {
    onSightReadingComplete();
  }
}

// Handle completion of a piece study segment
function onPieceStudySegmentComplete() {
  if (!currentPieceStudy) return;

  // Reset visual highlighting
  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note, .rest').forEach((el) => {
    el.classList.remove('current', 'past', 'correct', 'wrong');
    el.removeAttribute('data-early-correct');
  });

  // Auto-advance if no mistakes, loop if there were mistakes
  if (mistakeCount === 0) {
    // Advance to next segment
    const hasMore = currentPieceStudy.nextStep();

    if (hasMore) {
      loadCurrentSegment();
      updateSegmentDisplay();

      // Continue playing with countoff for new segment
      isCountingOff = true;
      countoffBeats = 0;
      const countoffTotal = currentTimeSig.beats;
      scheduleMusic(countoffTotal);
      Tone.getTransport().start();
    } else {
      // Piece complete
      stop();
      const progressInfo = document.getElementById('progressInfo');
      if (progressInfo) {
        progressInfo.textContent = 'Complete! Use ← to review.';
      }
    }
  } else {
    // Had mistakes - loop the current segment (no countoff)
    mistakeCount = 0;
    isCountingOff = false;
    countoffBeats = 0;
    scheduleMusic(0);
    Tone.getTransport().start();
  }
}

// Handle completion of sight reading exercise
function onSightReadingComplete() {
  // Record analytics
  const noteCount = currentRightHandNotes.filter(n => !n.isRest).length +
    currentLeftHandNotes.filter(n => !n.isRest).length;
  recordAttempt(getLevel(), getSubLevel(), noteCount, mistakeCount);

  // Advance level if no mistakes
  if (mistakeCount === 0) {
    incrementLevel();
    // Auto tempo ramp: increase by 5 BPM on success
    if (autoTempoRamp && bpm < 180) {
      bpm += 5;
      setBpm(bpm);
      const bpmInput = document.getElementById('bpm') as HTMLInputElement;
      if (bpmInput) bpmInput.value = String(bpm);
      Tone.getTransport().bpm.value = bpm;
    }
  }

  // Generate new piece
  generateAndRender();

  // Start playing new piece
  isCountingOff = true;
  countoffBeats = 0;
  const countoffTotal = currentTimeSig.beats;
  scheduleMusic(countoffTotal);
  Tone.getTransport().start();
}

function updateCountoffDisplay(remaining: number) {
  const countoffEl = document.getElementById('countoff')!;
  if (remaining > 0) {
    countoffEl.textContent = String(remaining);
    countoffEl.classList.add('visible');
  } else {
    countoffEl.textContent = '';
    countoffEl.classList.remove('visible');
  }
}

function stop() {
  isPlaying = false;
  isCountingOff = false;
  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.classList.remove('playing');
  playPauseBtn.setAttribute('aria-label', 'Start');

  updateCountoffDisplay(0);

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().seconds = 0;

  // Reset metronome debounce
  lastMetronomeTime = 0;

  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note, .rest').forEach((el) => {
    el.classList.remove('current', 'correct', 'wrong', 'past');
  });
}

// Track last beat advance time to prevent double-firing
let lastAdvanceBeatTime = 0;

function advanceBeat() {
  // Debounce to prevent double-firing from Tone.js lookahead
  const now = performance.now();
  if (now - lastAdvanceBeatTime < 50) {
    return;
  }
  lastAdvanceBeatTime = now;

  const notation = document.getElementById('notation')!;

  // Mark previous notes as past
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  if (currentBeatIndex >= visualGroups.length) {
    return; // onPieceComplete handles the end
  }

  const currentGroup = visualGroups[currentBeatIndex];

  // Visual highlighting
  currentGroup.elements.forEach((el) => {
    el.classList.add('current');

    // Check if this note was played early
    if (el.getAttribute('data-early-correct') === 'true') {
      el.classList.add('correct');
      el.removeAttribute('data-early-correct');
    }
  });

  // Play pitches from source data (timingEvents), NOT from Verovio SVG
  const timingEvent = timingEvents[currentBeatIndex];
  if (timingEvent && sampler && sampler.loaded) {
    for (const pitch of timingEvent.pitches) {
      sampler.triggerAttackRelease(pitch, '2n');
    }
  }

  currentBeatIndex++;
}

// Start the app
init().catch(console.error);
