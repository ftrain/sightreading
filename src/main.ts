import './style.css';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import * as Tone from 'tone';
import {
  generateMusicXML,
  getLevel,
  setLevel,
  incrementLevel,
  getFullLevelString,
  getRepetitionsRemaining,
  setMobileMode,
  isMobileMode,
} from './musicGenerator';

// State
let toolkit: VerovioToolkit;
let isPlaying = false;
let currentBeatIndex = 0;
let sampler: Tone.Sampler | null = null;
let scheduledEvents: number[] = [];

// Grouped notes by beat position with duration in quarter notes
interface BeatGroup {
  elements: SVGElement[];
  duration: number; // in quarter notes (1 = quarter, 2 = half, 4 = whole, 0.5 = eighth)
}
let beatGroups: BeatGroup[] = [];

// Current time signature
let currentTimeSig = { beats: 4, beatType: 4 };

// Countoff state
let countoffBeats = 0;
let isCountingOff = false;

// Current notes being played (for MIDI matching)
let activeNotes: Set<string> = new Set();

// MIDI devices
let midiInputs: Map<string, MIDIInput> = new Map();
let selectedMidiInput: string | null = localStorage.getItem('midiDeviceId');

// Settings
let bpm = 30;
let metronomeEnabled = true;
let metronomeVolume = -20; // dB base for metronome (quieter default)
let handsSeparate = false;

// Hands separate mode: 'rh' = right hand, 'lh' = left hand, 'both' = both hands
type HandMode = 'rh' | 'lh' | 'both';
let currentHandMode: HandMode = 'rh';

// Store the current piece's XML so we can replay it with different hands
let currentPieceXml: string = '';

// Performance tracking - did user play all notes correctly?
let hadMistake = false;

// Current lesson info
let currentLessonDescription = '';

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

  // Handle window resize
  window.addEventListener('resize', () => {
    updateMobileMode();
    updateVerovioOptions();
    if (!isPlaying) {
      regenerateCurrentMusic();
    }
  });

  // Handle orientation change on mobile
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateMobileMode();
      updateVerovioOptions();
      if (!isPlaying) {
        regenerateCurrentMusic();
      }
    }, 100);
  });
}

function updateVerovioOptions() {
  const container = document.getElementById('notation')!;
  const width = Math.max(600, container.clientWidth - 40);

  // Adjust scale based on mobile mode
  const scale = isMobileMode() ? 45 : 50;

  toolkit.setOptions({
    pageWidth: width,
    pageHeight: isMobileMode() ? 400 : 800,
    scale: scale,
    adjustPageHeight: true,
    footer: 'none',
    header: 'none',
    breaks: 'encoded', // Respect system breaks in MusicXML
  });
}

function regenerateCurrentMusic() {
  const { xml, lessonDescription } = generateMusicXML();
  currentLessonDescription = lessonDescription;
  toolkit.loadData(xml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;
  groupNotesByPosition();
  updateLevelDisplay();
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
  // Use immediate timing to avoid "start time" errors
  synth.triggerAttackRelease(pitch, '32n');

  // Dispose after playing
  setTimeout(() => synth.dispose(), 500);
}

function generateAndRender() {
  updateVerovioOptions();
  const { xml, timeSignature, lessonDescription } = generateMusicXML();
  currentTimeSig = timeSignature;
  currentPieceXml = xml;
  currentLessonDescription = lessonDescription;

  // If hands separate mode, start with right hand only
  if (handsSeparate) {
    currentHandMode = 'rh';
  } else {
    currentHandMode = 'both';
  }

  renderCurrentHand();

  // Update level display
  updateLevelDisplay();
}

function renderCurrentHand() {
  toolkit.loadData(currentPieceXml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;

  // Update the hand indicator in level display
  updateHandIndicator();

  // Note: groupNotesByPosition is called after rendering is complete
  // The caller should ensure this happens at the right time
  groupNotesByPosition();
}

function updateHandIndicator() {
  const levelDisplay = document.getElementById('levelDisplay');
  if (levelDisplay) {
    const level = `Level ${getFullLevelString()}`;
    if (handsSeparate) {
      const modeLabel =
        currentHandMode === 'rh' ? 'RH' : currentHandMode === 'lh' ? 'LH' : 'Both';
      levelDisplay.textContent = `${level} (${modeLabel})`;
    } else {
      levelDisplay.textContent = level;
    }
  }
}

function updateLevelDisplay() {
  const levelDisplay = document.getElementById('levelDisplay');
  const lessonInfo = document.getElementById('lessonInfo');
  const progressInfo = document.getElementById('progressInfo');

  if (levelDisplay) {
    const levelText = `Level ${getFullLevelString()}`;
    if (handsSeparate) {
      const modeLabel =
        currentHandMode === 'rh' ? 'RH' : currentHandMode === 'lh' ? 'LH' : 'Both';
      levelDisplay.textContent = `${levelText} (${modeLabel})`;
    } else {
      levelDisplay.textContent = levelText;
    }
  }

  if (lessonInfo) {
    lessonInfo.textContent = currentLessonDescription;
  }

  if (progressInfo) {
    const remaining = getRepetitionsRemaining();
    if (remaining > 0) {
      progressInfo.textContent = `${remaining} more to advance`;
    } else {
      progressInfo.textContent = '';
    }
  }
}

function groupNotesByPosition() {
  const notation = document.getElementById('notation')!;
  const elements = notation.querySelectorAll('.note, .rest');
  const notationRect = notation.getBoundingClientRect();

  // Determine which staff to include based on current hand mode
  // RH = staff 1 (treble), LH = staff 2 (bass), both = null (include all)
  const staffToInclude =
    currentHandMode === 'rh' ? 1 : currentHandMode === 'lh' ? 2 : null;

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
  beatGroups = [];

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
      const duration = getDurationFromElement(els[0]);
      beatGroups.push({ elements: els, duration });
    }
  });

  console.log(
    `groupNotesByPosition: mode=${currentHandMode}, beatGroups.length=${beatGroups.length}, systems=${systemYRanges.length}`
  );
}

function getDurationFromElement(el: SVGElement): number {
  const id = el.getAttribute('id');
  if (id && toolkit) {
    try {
      const elemData = toolkit.getElementAttr(id);
      if (elemData && elemData.dur) {
        // dur is the note type: 1=whole, 2=half, 4=quarter, 8=eighth, etc.
        const durValue = parseInt(elemData.dur as string);
        // Convert to quarter note units: whole=4, half=2, quarter=1, eighth=0.5
        return 4 / durValue;
      }
    } catch {
      // Fallback
    }
  }
  return 1; // Default to quarter note
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

  // Check current notes
  const currentElements = notation.querySelectorAll('.note.current');
  let matchedAny = false;

  currentElements.forEach((el) => {
    const noteData = getNoteDataFromElement(el as SVGElement);
    if (noteData && normalizeNote(noteData) === normalizedPlayed) {
      el.classList.add('correct');
      el.classList.remove('wrong');
      matchedAny = true;
    }
  });

  // Also check upcoming notes (be forgiving of early plays)
  // Look at the next beat group that hasn't been played yet
  if (!matchedAny && currentBeatIndex < beatGroups.length) {
    const upcomingGroup = beatGroups[currentBeatIndex];
    for (const el of upcomingGroup.elements) {
      if (el.classList.contains('note')) {
        const noteData = getNoteDataFromElement(el);
        if (noteData && normalizeNote(noteData) === normalizedPlayed) {
          // Mark as correct early - it will show when the note becomes current
          el.setAttribute('data-early-correct', 'true');
          matchedAny = true;
        }
      }
    }
  }

  if (!matchedAny && currentElements.length > 0) {
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

function getNoteDataFromElement(el: SVGElement): string | null {
  const id = el.getAttribute('id');
  if (id && toolkit) {
    try {
      const elemData = toolkit.getElementAttr(id);
      if (elemData && elemData.pname && elemData.oct) {
        let noteName = (elemData.pname as string).toUpperCase();
        if (elemData.accid === 's') noteName += '#';
        if (elemData.accid === 'f') noteName += 'b';
        return `${noteName}${elemData.oct}`;
      }
    } catch {
      // Fallback
    }
  }
  return null;
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

  bpmInput.addEventListener('change', () => {
    bpm = parseInt(bpmInput.value) || 30;
  });

  metronomeCheckbox.addEventListener('change', () => {
    metronomeEnabled = metronomeCheckbox.checked;
  });

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

  const handsSeparateCheckbox = document.getElementById(
    'handsSeparate'
  ) as HTMLInputElement;
  if (handsSeparateCheckbox) {
    handsSeparateCheckbox.addEventListener('change', () => {
      handsSeparate = handsSeparateCheckbox.checked;
      if (!isPlaying) {
        generateAndRender();
      }
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

  levelUpBtn?.addEventListener('click', () => {
    incrementLevel();
    if (!isPlaying) {
      generateAndRender();
    }
    updateLevelDisplay();
  });

  levelDownBtn?.addEventListener('click', () => {
    const current = getLevel();
    if (current > 1) {
      setLevel(current - 1);
      if (!isPlaying) {
        generateAndRender();
      }
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
}

async function start() {
  await initAudio();

  isPlaying = true;
  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.textContent = 'Stop';
  playPauseBtn.classList.add('playing');

  currentBeatIndex = 0;
  hadMistake = false;

  groupNotesByPosition();

  // Set up Tone.js Transport
  Tone.getTransport().bpm.value = bpm;
  Tone.getTransport().cancel(); // Clear any previous events
  scheduledEvents = [];

  const countoffTotal = currentTimeSig.beats;
  isCountingOff = true;
  countoffBeats = 0;
  updateCountoffDisplay(countoffTotal);

  scheduleMusic(countoffTotal);

  Tone.getTransport().start();
}

function scheduleMusic(countoffTotal: number) {
  // Calculate total duration of the piece
  let totalDuration = 0;
  for (const group of beatGroups) {
    totalDuration += group.duration;
  }

  const totalBeats = countoffTotal + totalDuration;
  const totalSubdivisions = Math.ceil(totalBeats * 4);

  // Track scheduled times to avoid duplicates
  const scheduledTimes = new Set<string>();

  // Schedule all metronome clicks and countoff updates
  for (let sub = 0; sub < totalSubdivisions; sub++) {
    const beatNumber = Math.floor(sub / 4);
    const subInBeat = sub % 4;
    const time = `0:${beatNumber}:${subInBeat}`;

    if (scheduledTimes.has(`metro:${time}`)) continue;
    scheduledTimes.add(`metro:${time}`);

    const eventId = Tone.getTransport().schedule(() => {
      playMetronomeClick(subInBeat);

      // Handle countoff display updates
      if (subInBeat === 0 && beatNumber < countoffTotal) {
        countoffBeats = beatNumber + 1;
        if (countoffBeats >= countoffTotal) {
          isCountingOff = false;
          updateCountoffDisplay(0);
        } else {
          updateCountoffDisplay(countoffTotal - countoffBeats);
        }
      }
    }, time);
    scheduledEvents.push(eventId);
  }

  // Schedule note events
  let currentTime = countoffTotal; // Start time in quarter notes after countoff
  for (let i = 0; i < beatGroups.length; i++) {
    const group = beatGroups[i];
    const beatNumber = Math.floor(currentTime);
    const subInBeat = Math.round((currentTime % 1) * 4) % 4;
    const time = `0:${beatNumber}:${subInBeat}`;

    // Add small offset if this time is already used for a note
    let noteTime = time;
    let offset = 0;
    while (scheduledTimes.has(`note:${noteTime}`)) {
      offset += 0.001;
      noteTime = `0:${beatNumber}:${subInBeat + offset}`;
    }
    scheduledTimes.add(`note:${noteTime}`);

    // Schedule the note/rest to become current
    const noteEventId = Tone.getTransport().schedule(() => {
      advanceBeat();
    }, noteTime);
    scheduledEvents.push(noteEventId);

    currentTime += group.duration;
  }

  // Schedule end of piece
  const endBeat = Math.floor(countoffTotal + totalDuration);
  const endSub = Math.round(((countoffTotal + totalDuration) % 1) * 4) % 4;
  const endEventId = Tone.getTransport().schedule(() => {
    onPieceComplete();
  }, `0:${endBeat}:${endSub}`);
  scheduledEvents.push(endEventId);

  console.log(
    `scheduleMusic: countoff=${countoffTotal}, totalDuration=${totalDuration}, beatGroups=${beatGroups.length}, endTime=${endBeat}:${endSub}`
  );
}

function onPieceComplete() {
  if (!isPlaying) return;

  // Mark last notes as past
  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  // Determine what to do next based on hands separate mode
  let shouldGenerateNew = false;

  if (handsSeparate) {
    if (currentHandMode === 'rh') {
      // Move to left hand (same piece) if no mistake
      if (!hadMistake) {
        currentHandMode = 'lh';
      }
      // If had mistake, stay on RH and repeat
    } else if (currentHandMode === 'lh') {
      // Move to both hands (same piece) if no mistake
      if (!hadMistake) {
        currentHandMode = 'both';
      }
      // If had mistake, stay on LH and repeat
    } else {
      // Both hands mode
      if (!hadMistake) {
        // Success! Increment level and generate new piece
        incrementLevel();
        shouldGenerateNew = true;
      }
      // If had mistake in "both" mode, repeat "both" (don't generate new)
    }
  } else {
    // Not in hands separate mode
    if (!hadMistake) {
      incrementLevel();
    }
    // Always generate new piece (even on mistake) when not in hands separate mode
    shouldGenerateNew = true;
  }

  // Reset mistake tracking for next round
  hadMistake = false;
  currentBeatIndex = 0;

  if (shouldGenerateNew) {
    generateAndRender();
  } else {
    // Same piece, same or different hand - re-render and clear visual state
    renderCurrentHand();
    updateLevelDisplay();

    // Clear any correct/wrong/past markers from previous attempt
    const notationEl = document.getElementById('notation')!;
    notationEl.querySelectorAll('.note, .rest').forEach((el) => {
      el.classList.remove('correct', 'wrong', 'past');
      el.removeAttribute('data-early-correct');
    });
  }

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().position = 0;

  isCountingOff = true;
  countoffBeats = 0;
  const countoffTotal = currentTimeSig.beats;
  updateCountoffDisplay(countoffTotal);

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
  playPauseBtn.textContent = 'Start';
  playPauseBtn.classList.remove('playing');

  updateCountoffDisplay(0);

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().position = 0;

  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note, .rest').forEach((el) => {
    el.classList.remove('current', 'correct', 'wrong', 'past');
  });
}

function advanceBeat() {
  const notation = document.getElementById('notation')!;

  // Mark previous notes as past
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  if (currentBeatIndex >= beatGroups.length) {
    return; // onPieceComplete handles the end
  }

  const currentGroup = beatGroups[currentBeatIndex];

  currentGroup.elements.forEach((el) => {
    el.classList.add('current');

    // Check if this note was played early
    if (el.getAttribute('data-early-correct') === 'true') {
      el.classList.add('correct');
      el.removeAttribute('data-early-correct');
    }

    if (el.classList.contains('note')) {
      const pitch = extractPitchFromNote(el);
      if (pitch && sampler && sampler.loaded) {
        // Use longer duration for sustain
        sampler.triggerAttackRelease(pitch, '2n');
      }
    }
  });

  currentBeatIndex++;
}

function extractPitchFromNote(noteEl: SVGElement): string | null {
  const id = noteEl.getAttribute('id');
  if (id && toolkit) {
    try {
      const elemData = toolkit.getElementAttr(id);
      if (elemData && elemData.pname && elemData.oct) {
        let noteName = (elemData.pname as string).toUpperCase();
        if (elemData.accid === 's') noteName += '#';
        if (elemData.accid === 'f') noteName += 'b';
        return `${noteName}${elemData.oct}`;
      }
    } catch {
      // Fallback
    }
  }
  return 'C4';
}

// Start the app
init().catch(console.error);
