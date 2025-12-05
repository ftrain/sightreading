import './style.css';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import * as Tone from 'tone';
import {
  generateMusicXML,
  regenerateXMLFromNotes,
  getLevel,
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
} from './musicGenerator';
import type { NoteData } from './musicGenerator';
import {
  shouldAllowMetronomeClick,
  beatsToSeconds,
} from './scheduler';
import {
  parseMusicXML,
  ProgressivePracticeSession,
  getStepTypeLabel,
} from './upload';
import { buildMusicXML } from './music/xml/builder';

// State
let toolkit: VerovioToolkit;
let isPlaying = false;
let currentBeatIndex = 0;
let sampler: Tone.Sampler | null = null;
let scheduledEvents: number[] = [];

// Timing data from music generator (source of truth for durations and playback)
interface TimingEvent {
  time: number; // Start time in beats
  duration: number; // Duration in beats
  pitches: string[]; // Pitches to play (e.g., ['C4', 'E4', 'G4'])
}
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

// Store the current piece's XML
let currentPieceXml: string = '';

// Performance tracking - did user play all notes correctly?
let hadMistake = false;

// Current lesson info
let currentLessonDescription = '';

// Current piece notes for playback timing (source of truth)
let currentRightHandNotes: NoteData[] = [];
let currentLeftHandNotes: NoteData[] = [];

// App mode: 'levels' for generated exercises, 'practice' for uploaded files
type AppMode = 'levels' | 'practice';
let currentMode: AppMode = 'levels';
let practiceSession: ProgressivePracticeSession | null = null;


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

  // Handle window resize - re-render existing music, don't generate new
  window.addEventListener('resize', () => {
    const wasMobile = isMobileMode();
    updateMobileMode();
    updateVerovioOptions();
    if (!isPlaying) {
      // Only regenerate if mobile mode changed (different measure count)
      // Otherwise just re-render the existing piece
      if (wasMobile !== isMobileMode()) {
        generateAndRender();
      } else {
        rerenderCurrentMusic();
      }
    }
  });

  // Handle orientation change on mobile
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      const wasMobile = isMobileMode();
      updateMobileMode();
      updateVerovioOptions();
      if (!isPlaying) {
        if (wasMobile !== isMobileMode()) {
          generateAndRender();
        } else {
          rerenderCurrentMusic();
        }
      }
    }, 100);
  });
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
  });
}

// Re-render the current piece without generating new music
function rerenderCurrentMusic() {
  if (!currentPieceXml) return;
  toolkit.loadData(currentPieceXml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;
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
    release: 2, // Longer release for sustain
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

}

// Build timing events from the generated note data
// This is the source of truth for durations
function buildTimingEvents() {
  timingEvents = [];

  // Build a map of time -> { duration, pitches } from source note data
  // This is the source of truth for what to play and when
  const roundTime = (t: number) => Math.round(t * 1000) / 1000;

  interface EventData {
    duration: number;
    pitches: string[];
  }
  const allEvents: Map<string, EventData> = new Map();

  // Process right hand notes
  let currentTime = 0;
  for (const note of currentRightHandNotes) {
    const timeKey = String(roundTime(currentTime));
    const pitch = noteDataToPitch(note);

    const existing = allEvents.get(timeKey);
    if (existing) {
      // Add pitch to existing event (may be chord or simultaneous with LH)
      if (pitch) existing.pitches.push(pitch);
      // Use shortest duration at this time
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

  // Debug: log timing events with pitches
  console.log('Timing events built:', timingEvents.map((e, i) =>
    `${i}: t=${e.time.toFixed(2)} d=${e.duration.toFixed(2)} [${e.pitches.join(', ')}]`
  ));
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

    // Show both note mastery and tempo mastery progress
    let progressText = '';
    if (remaining > 0) {
      progressText = `${remaining} more to advance`;
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

function midiNoteToName(noteNum: number): string {
  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(noteNum / 12) - 1;
  const note = notes[noteNum % 12];
  return `${note}${octave}`;
}

function handleMIDIMessage(event: MIDIMessageEvent) {
  const [status, noteNum, velocity] = event.data!;
  const command = status & 0xf0;

  if (command === 0x90 && velocity > 0) {
    const noteName = midiNoteToName(noteNum);
    activeNotes.add(noteName);
    checkNoteMatch(noteName);
  } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    const noteName = midiNoteToName(noteNum);
    activeNotes.delete(noteName);
  }
}

function checkNoteMatch(playedNote: string) {
  if (!isPlaying || isCountingOff) return;

  const notation = document.getElementById('notation')!;
  const normalizedPlayed = normalizeNote(playedNote);

  // Get expected pitches from source data (not from Verovio)
  // currentBeatIndex points to the NEXT beat, so current beat is currentBeatIndex - 1
  const currentBeatIdx = currentBeatIndex - 1;
  const currentTimingEvent = currentBeatIdx >= 0 ? timingEvents[currentBeatIdx] : null;
  const expectedPitches = currentTimingEvent?.pitches ?? [];

  // Check if played note matches any expected pitch
  const matchedAny = expectedPitches.some(p => normalizeNote(p) === normalizedPlayed);

  // Get current note elements
  const currentElements = Array.from(notation.querySelectorAll('.note.current'));

  if (matchedAny && currentElements.length > 0) {
    // Find which element to mark by matching pitch via Verovio's pname/oct
    // We use Verovio for the base pitch (pname) but use source data for accidentals
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
      // The played note is already normalized (e.g., 'G#4')
      // We need to check if the base letter and octave match
      const playedBase = normalizedPlayed.charAt(0);
      const playedOctave = normalizedPlayed.slice(-1);

      if (basePitch === playedBase && octave === playedOctave) {
        el.classList.add('correct');
        el.classList.remove('wrong');
        break; // Only mark one element per played note
      }
    }
  }

  // Also check upcoming notes (be forgiving of early plays)
  let matchedUpcoming = false;
  if (!matchedAny && currentBeatIndex < timingEvents.length) {
    const upcomingEvent = timingEvents[currentBeatIndex];
    const upcomingMatched = upcomingEvent.pitches.some(p => normalizeNote(p) === normalizedPlayed);

    if (upcomingMatched) {
      // Find the upcoming note elements
      const upcomingTimeMs = upcomingEvent.time * 500;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upcomingElements = (toolkit as any).getElementsAtTime(upcomingTimeMs) as { notes?: string[]; page?: number } | undefined;

      if (upcomingElements && upcomingElements.notes) {
        for (const noteId of upcomingElements.notes) {
          const el = document.getElementById(noteId);
          if (!el || !el.classList.contains('note')) continue;

          const elemData = toolkit.getElementAttr(noteId);
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
        hadMistake = true;
      }
    });
  }
}

function normalizeNote(note: string): string {
  return note
    .replace('Db', 'C#')
    .replace('Eb', 'D#')
    .replace('Fb', 'E')
    .replace('Gb', 'F#')
    .replace('Ab', 'G#')
    .replace('Bb', 'A#')
    .replace('Cb', 'B');
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

  // File upload handlers (both in control bar and options panel)
  const xmlUpload = document.getElementById('xmlUpload') as HTMLInputElement;
  const xmlUploadOptions = document.getElementById('xmlUploadOptions') as HTMLInputElement;

  const handleUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (isPlaying) stop();
      handleFileUpload(file);
      // Clear the input so the same file can be uploaded again
      input.value = '';
    }
  };

  xmlUpload?.addEventListener('change', handleUpload);
  xmlUploadOptions?.addEventListener('change', handleUpload);

  // Exit practice mode button
  const exitPracticeModeBtn = document.getElementById('exitPracticeMode');
  exitPracticeModeBtn?.addEventListener('click', () => {
    if (isPlaying) stop();
    exitPracticeMode();
  });

  levelUpBtn?.addEventListener('click', () => {
    if (currentMode === 'practice' && practiceSession) {
      // Practice mode: advance to next step
      if (isPlaying) stop();
      if (practiceSession.nextStep()) {
        renderPracticeStep();
      }
    } else {
      // Level mode: If tempo mastery achieved, increase tempo instead of level
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
    }
  });

  levelDownBtn?.addEventListener('click', () => {
    if (currentMode === 'practice' && practiceSession) {
      // Practice mode: go to previous step
      if (isPlaying) stop();
      if (practiceSession.previousStep()) {
        renderPracticeStep();
      }
    } else {
      // Level mode
      const current = getLevel();
      if (current > 1) {
        if (isPlaying) stop();
        setLevel(current - 1);
        generateAndRender();
        updateLevelDisplay();
      }
    }
  });

  playPauseBtn.addEventListener('click', async () => {
    if (isPlaying) {
      stop();
    } else {
      await start();
    }
  });

  // Spacebar to toggle play/pause
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
  });
}

async function start() {
  await initAudio();

  isPlaying = true;
  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.classList.add('playing');
  playPauseBtn.setAttribute('aria-label', 'Stop');

  currentBeatIndex = 0;
  hadMistake = false;

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

/**
 * Reset visual highlighting on notes (clear current/past/correct/wrong classes).
 */
function resetVisualHighlighting() {
  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note, .rest').forEach((el) => {
    el.classList.remove('current', 'past', 'correct', 'wrong');
    el.removeAttribute('data-early-correct');
  });
}

function onPieceComplete() {
  if (!isPlaying) return;

  // Mark last notes as past
  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  // Handle differently based on mode
  if (currentMode === 'practice') {
    // Practice mode: always loop the current step
    // User can use level up/down buttons to advance manually
    hadMistake = false;
    currentBeatIndex = 0;

    // Reset visual highlighting (same music, just loop)
    resetVisualHighlighting();

    // Reset transport and replay WITHOUT countoff
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    scheduledEvents = [];
    Tone.getTransport().seconds = 0;
    lastMetronomeTime = 0;
    lastAdvanceBeatTime = 0;

    // No countoff on loop - start music immediately
    isCountingOff = false;
    countoffBeats = 0;
    scheduleMusic(0); // 0 = no countoff
    Tone.getTransport().start();
  } else {
    // Level mode: advance level if no mistakes
    if (!hadMistake) {
      incrementLevel();
    }

    // Reset tracking for next round
    hadMistake = false;
    currentBeatIndex = 0;

    // Generate new piece
    generateAndRender();

    // Fully reset Tone.js Transport before scheduling new piece
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    scheduledEvents = [];
    // Use seconds property for more reliable reset
    Tone.getTransport().seconds = 0;

    // Reset debounce timers to allow first events of new piece
    lastMetronomeTime = 0;
    lastAdvanceBeatTime = 0;

    isCountingOff = true;
    countoffBeats = 0;
    const countoffTotal = currentTimeSig.beats;
    // Don't show initial number - it will appear on first beat

    scheduleMusic(countoffTotal);
    Tone.getTransport().start();
  }
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

  if (currentBeatIndex >= timingEvents.length) {
    return; // onPieceComplete handles the end
  }

  const timingEvent = timingEvents[currentBeatIndex];

  // Use Verovio's getElementsAtTime to find which notes to highlight
  // Verovio defaults to 120 BPM when no tempo is specified in MusicXML
  // At 120 BPM: 1 quarter note = 500ms
  const VEROVIO_MS_PER_BEAT = 500;
  const timeInMs = timingEvent.time * VEROVIO_MS_PER_BEAT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elementsAtTime = (toolkit as any).getElementsAtTime(timeInMs) as { notes?: string[]; page?: number } | undefined;

  // Highlight notes returned by Verovio
  if (elementsAtTime && elementsAtTime.notes) {
    for (const noteId of elementsAtTime.notes) {
      const noteEl = document.getElementById(noteId);
      if (noteEl) {
        noteEl.classList.add('current');

        // Check if this note was played early
        if (noteEl.getAttribute('data-early-correct') === 'true') {
          noteEl.classList.add('correct');
          noteEl.removeAttribute('data-early-correct');
        }
      }
    }
  }

  // Play pitches from source data (timingEvents), NOT from Verovio SVG
  const pitchesPlayed = timingEvent?.pitches ?? [];

  if (sampler && sampler.loaded && pitchesPlayed.length > 0) {
    for (const pitch of pitchesPlayed) {
      sampler.triggerAttackRelease(pitch, '2n');
    }
  }

  // Debug: log what we're playing
  const noteIds = elementsAtTime?.notes?.join(', ') ?? 'none';
  console.log(`Beat ${currentBeatIndex}: playing [${pitchesPlayed.join(', ')}] | time: ${timingEvent.time.toFixed(2)} | Verovio notes: [${noteIds}]`);

  currentBeatIndex++;
}

/**
 * Convert NoteData to Tone.js pitch string (e.g., 'C4', 'F#5', 'Bb3')
 */
function noteDataToPitch(note: NoteData): string | null {
  if (note.isRest) return null;

  let pitchName = note.step;
  if (note.alter === 1) pitchName += '#';
  else if (note.alter === -1) pitchName += 'b';

  return `${pitchName}${note.octave}`;
}

// ============================================
// PRACTICE MODE (UPLOADED FILES)
// ============================================

/**
 * Handle file upload and enter practice mode.
 */
async function handleFileUpload(file: File) {
  try {
    const xmlString = await file.text();
    const parsed = parseMusicXML(xmlString);

    // Debug: log parsed structure
    console.log('Parsed MusicXML:', {
      title: parsed.title,
      measureCount: parsed.measures.length,
      timeSignature: parsed.timeSignature,
      keySignature: parsed.keySignature,
      measures: parsed.measures.map((m) => ({
        number: m.number,
        rhNotes: m.rightHand.length,
        lhNotes: m.leftHand.length
      })).slice(0, 5) // Just first 5 measures for brevity
    });

    if (parsed.measures.length === 0) {
      alert('No measures found in the uploaded file.');
      return;
    }

    // Create practice session
    practiceSession = new ProgressivePracticeSession(parsed);
    currentMode = 'practice';

    // Update BPM to something reasonable for practice
    bpm = 60;
    const bpmInput = document.getElementById('bpm') as HTMLInputElement;
    if (bpmInput) bpmInput.value = '60';

    // Update UI for practice mode
    enterPracticeMode();

    // Render first step
    renderPracticeStep();
  } catch (error) {
    console.error('Error parsing MusicXML:', error);
    alert('Error parsing file. Please ensure it is a valid MusicXML file.');
  }
}

/**
 * Enter practice mode UI.
 */
function enterPracticeMode() {
  if (!practiceSession) return;

  // Update header
  const scoreTitle = document.querySelector('.score-title h1');
  if (scoreTitle) {
    scoreTitle.textContent = practiceSession.getTitle();
  }

  // Show practice info bar
  const practiceInfo = document.getElementById('practiceInfo');
  if (practiceInfo) practiceInfo.hidden = false;

  // Hide level-specific UI
  const levelDisplay = document.getElementById('levelDisplay');
  const progressInfo = document.getElementById('progressInfo');
  const lessonInfo = document.getElementById('lessonInfo');
  if (levelDisplay) levelDisplay.style.display = 'none';
  if (progressInfo) progressInfo.style.display = 'none';
  if (lessonInfo) lessonInfo.textContent = practiceSession.getKeySignature().name;

  // Hide level controls in control bar
  const levelSection = document.querySelector('.control-section.level');
  if (levelSection) (levelSection as HTMLElement).style.display = 'none';

  // Show exit button in options
  const exitBtn = document.getElementById('exitPracticeMode');
  if (exitBtn) exitBtn.hidden = false;

  // Update practice info display
  updatePracticeDisplay();
}

/**
 * Exit practice mode and return to levels.
 */
function exitPracticeMode() {
  currentMode = 'levels';
  practiceSession = null;

  // Restore header
  const scoreTitle = document.querySelector('.score-title h1');
  if (scoreTitle) {
    scoreTitle.textContent = 'Sight Reading';
  }

  // Hide practice info bar
  const practiceInfo = document.getElementById('practiceInfo');
  if (practiceInfo) practiceInfo.hidden = true;

  // Show level-specific UI
  const levelDisplay = document.getElementById('levelDisplay');
  const progressInfo = document.getElementById('progressInfo');
  if (levelDisplay) levelDisplay.style.display = '';
  if (progressInfo) progressInfo.style.display = '';

  // Show level controls
  const levelSection = document.querySelector('.control-section.level');
  if (levelSection) (levelSection as HTMLElement).style.display = '';

  // Hide exit button
  const exitBtn = document.getElementById('exitPracticeMode');
  if (exitBtn) exitBtn.hidden = true;

  // Generate fresh level content
  generateAndRender();
}

/**
 * Update the practice mode display (step info, progress bar).
 */
function updatePracticeDisplay() {
  if (!practiceSession) return;

  const segment = practiceSession.getCurrentSegment();
  const progress = practiceSession.getProgress();

  // Step type
  const stepTypeEl = document.getElementById('practiceStepType');
  if (stepTypeEl) {
    stepTypeEl.textContent = getStepTypeLabel(segment.stepType);
    stepTypeEl.className = `step-type step-type-${segment.stepType}`;
  }

  // Step description
  const stepDescEl = document.getElementById('practiceStepDesc');
  if (stepDescEl) {
    stepDescEl.textContent = segment.description;
  }

  // Step number
  const stepNumEl = document.getElementById('practiceStepNum');
  if (stepNumEl) {
    stepNumEl.textContent = `Step ${progress.currentStep} of ${progress.totalSteps}`;
  }

  // Progress bar
  const progressBar = document.getElementById('practiceProgressBar');
  if (progressBar) {
    progressBar.style.width = `${progress.percent}%`;
  }
}

/**
 * Render the current practice step.
 */
function renderPracticeStep() {
  if (!practiceSession) return;

  const segment = practiceSession.getCurrentSegment();
  const timeSig = practiceSession.getTimeSignature();
  const keySig = practiceSession.getKeySignature();

  // Update current notes
  currentRightHandNotes = segment.rightHand;
  currentLeftHandNotes = segment.leftHand;
  currentTimeSig = timeSig;

  // Debug: log parsed notes
  console.log('Practice step notes:', {
    rightHand: segment.rightHand.map(n => ({
      note: n.isRest ? 'REST' : `${n.step}${n.alter ? (n.alter > 0 ? '#' : 'b') : ''}${n.octave}`,
      duration: n.duration
    })),
    leftHand: segment.leftHand.map(n => ({
      note: n.isRest ? 'REST' : `${n.step}${n.alter ? (n.alter > 0 ? '#' : 'b') : ''}${n.octave}`,
      duration: n.duration
    })),
    timeSig,
    keySig: keySig.name
  });

  // Build MusicXML for this segment
  currentPieceXml = buildMusicXML(
    segment.rightHand,
    segment.leftHand,
    {
      timeSignature: timeSig,
      key: keySig,
    }
  );

  // Render
  renderCurrentMusic();
  updatePracticeDisplay();
}


// Start the app
init().catch(console.error);
