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
import type { NoteData, KeyInfo } from './core/types';
import { midiToNoteName, normalizeNoteName } from './core/noteUtils';
import { beatsToSeconds } from './scheduler';
import {
  createMidiSource,
  createXmlSource,
} from './music/sources';
import { buildMusicXML } from './music/xml/builder';
import { PieceStudyLesson } from './curriculum/lessons/piece-study';
import { recordAttempt, getAccuracy } from './app/analytics';
import { playbackState as ps } from './app/PlaybackState';

// Core instances
let toolkit: VerovioToolkit;
let sampler: Tone.Sampler | null = null;
let scheduledEvents: number[] = [];
let midiInputs: Map<string, MIDIInput> = new Map();
let autoTempoRamp = false;
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
    if (!ps.isPlaying) {
      if (currentPieceStudy) rerenderCurrentMusic();
      else wasMobile !== isMobileMode() ? generateAndRender() : rerenderCurrentMusic();
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
  if (!ps.pieceXml) return;
  toolkit.loadData(ps.pieceXml);
  const svg = toolkit.renderToSVG(1);
  const notation = document.getElementById('notation')!;
  notation.innerHTML = svg;
  groupNotesByPosition();
}

// Regenerate XML from current notes (for fingering toggle)
function regenerateCurrentMusicXML() {
  if (ps.rightHandNotes.length === 0 && ps.leftHandNotes.length === 0) return;
  ps.pieceXml = regenerateXMLFromNotes(ps.rightHandNotes, ps.leftHandNotes, ps.timeSig);
}

async function initAudio() {
  if (sampler) return;
  await Tone.start();

  // Generate sample URLs for all octaves (Salamander piano samples)
  const urls: Record<string, string> = {};
  for (let oct = 0; oct <= 7; oct++) {
    urls[`A${oct}`] = `A${oct}.mp3`;
    urls[`C${oct + 1}`] = `C${oct + 1}.mp3`;
    urls[`D#${oct + 1}`] = `Ds${oct + 1}.mp3`;
    urls[`F#${oct + 1}`] = `Fs${oct + 1}.mp3`;
  }
  urls['C8'] = 'C8.mp3';

  // Use local samples if available, fallback to CDN
  // Run scripts/download-samples.sh to cache locally
  const localPath = import.meta.env.BASE_URL + 'samples/';
  const cdnPath = 'https://tonejs.github.io/audio/salamander/';

  // Try local first, fallback to CDN
  const baseUrl = await checkSamplesExist(localPath) ? localPath : cdnPath;

  sampler = new Tone.Sampler({
    urls,
    release: 2,
    baseUrl,
  }).toDestination();

  await Tone.loaded();
}

async function checkSamplesExist(path: string): Promise<boolean> {
  try {
    const res = await fetch(path + 'A4.mp3', { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function playMetronomeClick(subdivisionInBeat: number) {
  if (!ps.metronomeEnabled || !ps.shouldFireMetronome()) return;

  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();

  const isMainBeat = subdivisionInBeat === 0;
  synth.volume.value = ps.metronomeVolume - (isMainBeat ? 6 : 24);
  synth.triggerAttackRelease(isMainBeat ? 'G5' : 'C5', '32n');
  setTimeout(() => synth.dispose(), 500);
}

function generateAndRender() {
  currentPieceStudy = null;
  updateVerovioOptions();

  const { xml, timeSignature, lessonDescription, suggestedBpm, rightHandNotes, leftHandNotes } = generateMusicXML();
  ps.timeSig = timeSignature;
  ps.pieceXml = xml;
  ps.lessonDescription = lessonDescription;
  ps.rightHandNotes = rightHandNotes;
  ps.leftHandNotes = leftHandNotes;

  // Sync BPM with lesson suggestion on level change
  const bpmInput = document.getElementById('bpm') as HTMLInputElement;
  if (bpmInput && suggestedBpm && getCurrentBpm() === suggestedBpm) {
    ps.bpm = suggestedBpm;
    bpmInput.value = String(suggestedBpm);
    setBpm(suggestedBpm);
  }

  renderCurrentMusic();
  updateLevelDisplay();
}

function renderCurrentMusic() {
  toolkit.loadData(ps.pieceXml);
  const svg = toolkit.renderToSVG(1);
  document.getElementById('notation')!.innerHTML = svg;
  buildTimingEvents();
  groupNotesByPosition();
}

// Build timing events from note data (source of truth for durations)
function buildTimingEvents() {
  const roundTime = (t: number) => Math.round(t * 1000) / 1000;
  const allEvents: Map<string, number> = new Map();

  // Merge both hands by time position
  for (const notes of [ps.rightHandNotes, ps.leftHandNotes]) {
    let t = 0;
    for (const note of notes) {
      const key = String(roundTime(t));
      const existing = allEvents.get(key);
      if (existing === undefined || note.duration < existing) allEvents.set(key, note.duration);
      t += note.duration;
    }
  }

  const sorted = Array.from(allEvents.keys()).map(Number).sort((a, b) => a - b);
  ps.timingEvents = sorted.map((time, i) => ({
    time,
    duration: (i < sorted.length - 1 ? sorted[i + 1] : time + allEvents.get(String(time))!) - time,
  }));
}

function updateLevelDisplay() {
  const levelStr = getFullLevelString();
  const el = (id: string) => document.getElementById(id);

  if (el('levelDisplay')) el('levelDisplay')!.textContent = levelStr;
  if (el('levelIndicator')) el('levelIndicator')!.textContent = `Level ${levelStr}`;
  if (el('levelJump')) (el('levelJump') as HTMLSelectElement).value = String(getLevel());
  if (el('lessonInfo')) el('lessonInfo')!.textContent = ps.lessonDescription;

  const progressInfo = el('progressInfo');
  if (progressInfo) {
    const remaining = getRepetitionsRemaining();
    const tempoRemaining = getBpmMasteryRemaining();
    const accuracy = getAccuracy(getLevel(), getSubLevel());
    const parts: string[] = [];
    if (remaining > 0) parts.push(`${remaining} more to advance`);
    if (accuracy > 0) parts.push(`${accuracy}% accuracy`);
    if (shouldIncreaseTempo()) parts.push('Ready to increase tempo!');
    else if (tempoRemaining > 0 && remaining === 0) parts.push(`${tempoRemaining} at tempo`);
    progressInfo.textContent = parts.join(' | ');
  }
}


function groupNotesByPosition() {
  const notation = document.getElementById('notation')!;
  const notationRect = notation.getBoundingClientRect();
  const staffLines = notation.querySelectorAll('.staff');

  // Build system Y ranges (grand staff = 2 staves per system)
  const systemYRanges: { top: number; bottom: number }[] = [];
  for (let i = 0; i < staffLines.length; i += 2) {
    const r1 = staffLines[i]?.getBoundingClientRect();
    const r2 = staffLines[i + 1]?.getBoundingClientRect();
    if (r1 && r2) systemYRanges.push({
      top: Math.min(r1.top, r2.top) - notationRect.top,
      bottom: Math.max(r1.bottom, r2.bottom) - notationRect.top,
    });
  }

  // Collect note positions with system-based sort key
  const notePositions: { el: SVGElement; x: number; sortKey: number }[] = [];
  notation.querySelectorAll('.note, .rest').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;
    const relY = rect.top - notationRect.top;
    const relX = rect.left - notationRect.left;
    let sysIdx = systemYRanges.findIndex(r => relY >= r.top && relY <= r.bottom);
    if (sysIdx < 0) sysIdx = systemYRanges.findIndex(r => relY > r.bottom) + 1;
    notePositions.push({ el: el as SVGElement, x: relX, sortKey: (sysIdx < 0 ? 0 : sysIdx) * 10000 + relX });
  });
  notePositions.sort((a, b) => a.sortKey - b.sortKey);

  // Group by x position (tolerance 5px)
  const posMap = new Map<number, SVGElement[]>();
  for (const { el, x } of notePositions) {
    let key = [...posMap.keys()].find(k => Math.abs(k - x) < 5);
    if (key !== undefined) posMap.get(key)!.push(el);
    else posMap.set(x, [el]);
  }

  // Build visual groups in order of first appearance
  const seen = new Set<number>();
  ps.visualGroups = [];
  for (const { x } of notePositions) {
    const key = [...posMap.keys()].find(k => Math.abs(k - x) < 5);
    if (key !== undefined && !seen.has(key)) {
      seen.add(key);
      ps.visualGroups.push({ elements: posMap.get(key)! });
    }
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
  if (!midiSelect) return;

  const currentValue = midiSelect.value;
  midiSelect.innerHTML = '<option value="">No MIDI Device</option>';
  for (const [id, input] of midiInputs) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = input.name || id;
    midiSelect.appendChild(opt);
  }

  // Prefer saved > current > first available
  const saved = ps.selectedMidiInput;
  if (saved && midiInputs.has(saved)) midiSelect.value = saved;
  else if (currentValue && midiInputs.has(currentValue)) midiSelect.value = currentValue;
  else if (midiInputs.size > 0) midiSelect.value = midiInputs.keys().next().value!;

  ps.selectedMidiInput = midiSelect.value || null;
}

function handleMIDIMessage(event: MIDIMessageEvent) {
  const [status, noteNum, velocity] = event.data!;
  const cmd = status & 0xf0;
  const noteName = midiToNoteName(noteNum);

  if (cmd === 0x90 && velocity > 0) {
    ps.activeNotes.add(noteName);
    checkNoteMatch(noteName);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    ps.activeNotes.delete(noteName);
  }
}

function checkNoteMatch(playedNote: string) {
  if (!ps.isPlaying || ps.isCountingOff) return;

  const notation = document.getElementById('notation')!;
  const normalized = normalizeNoteName(playedNote);
  const currentEls = notation.querySelectorAll('.note.current');
  let matched = false;

  // Check current notes
  currentEls.forEach((el) => {
    const data = getNoteDataFromElement(el as SVGElement);
    if (data && normalizeNoteName(data) === normalized) {
      el.classList.add('correct');
      el.classList.remove('wrong');
      matched = true;
    }
  });

  // Check upcoming notes (forgiving of early plays)
  if (!matched && ps.beatIndex < ps.visualGroups.length) {
    for (const el of ps.visualGroups[ps.beatIndex].elements) {
      if (el.classList.contains('note')) {
        const data = getNoteDataFromElement(el);
        if (data && normalizeNoteName(data) === normalized) {
          el.setAttribute('data-early-correct', 'true');
          matched = true;
        }
      }
    }
  }

  if (!matched && currentEls.length > 0) {
    currentEls.forEach((el) => {
      if (!el.classList.contains('correct')) {
        el.classList.add('wrong');
        ps.hadMistake = true;
      }
    });
  }
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
    ps.bpm = parseInt(bpmInput.value) || 30;
    setBpm(ps.bpm);
  });

  metronomeCheckbox.addEventListener('change', () => {
    ps.metronomeEnabled = metronomeCheckbox.checked;
    const btn = document.getElementById('metronomeToggle');
    if (btn) {
      btn.classList.toggle('active', ps.metronomeEnabled);
      btn.setAttribute('aria-pressed', String(ps.metronomeEnabled));
    }
  });

  const metronomeToggle = document.getElementById('metronomeToggle');
  if (metronomeToggle) {
    metronomeToggle.addEventListener('click', () => {
      ps.metronomeEnabled = metronomeToggle.classList.toggle('active');
      metronomeToggle.setAttribute('aria-pressed', String(ps.metronomeEnabled));
      metronomeCheckbox.checked = ps.metronomeEnabled;
    });
  }

  const metronomeVolumeSlider = document.getElementById('metronomeVolume') as HTMLInputElement;
  if (metronomeVolumeSlider) {
    metronomeVolumeSlider.addEventListener('input', () => {
      ps.metronomeVolume = (parseInt(metronomeVolumeSlider.value) / 100) * 40 - 40;
    });
  }

  // Level jump selector
  const levelJumpSelect = document.getElementById('levelJump') as HTMLSelectElement;
  if (levelJumpSelect) {
    levelJumpSelect.addEventListener('change', () => {
      const newLevel = parseInt(levelJumpSelect.value);
      if (newLevel >= 1) {
        if (ps.isPlaying) stop();
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
      if (ps.isPlaying) stop();
      setKeyOverride(keySelect.value || null);
      generateAndRender();
    });
  }

  // Hand mode override selector
  const handModeSelect = document.getElementById('handMode') as HTMLSelectElement;
  if (handModeSelect) {
    handModeSelect.addEventListener('change', () => {
      if (ps.isPlaying) stop();
      setHandModeOverride((handModeSelect.value as 'right' | 'left' | 'both') || null);
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
    ps.selectedMidiInput = midiSelect.value || null;
  });

  // Auto tempo ramp checkbox
  const autoTempoRampCheckbox = document.getElementById('autoTempoRamp') as HTMLInputElement;
  if (autoTempoRampCheckbox) {
    autoTempoRampCheckbox.addEventListener('change', () => {
      autoTempoRamp = autoTempoRampCheckbox.checked;
    });
  }

  levelUpBtn?.addEventListener('click', () => {
    if (currentPieceStudy) { nextSegment(); return; }
    if (shouldIncreaseTempo()) {
      increaseTempo();
      ps.bpm = getCurrentBpm();
      (document.getElementById('bpm') as HTMLInputElement).value = String(ps.bpm);
      updateLevelDisplay();
    } else {
      if (ps.isPlaying) stop();
      incrementLevel();
      generateAndRender();
      updateLevelDisplay();
    }
  });

  levelDownBtn?.addEventListener('click', () => {
    if (currentPieceStudy) { previousSegment(); return; }
    if (getLevel() > 1) {
      if (ps.isPlaying) stop();
      setLevel(getLevel() - 1);
      generateAndRender();
      updateLevelDisplay();
    }
  });

  playPauseBtn.addEventListener('click', async () => {
    ps.isPlaying ? stop() : await start();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      ps.isPlaying ? stop() : await start();
    }
    if (currentPieceStudy) {
      if (e.code === 'ArrowRight') { e.preventDefault(); nextSegment(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); previousSegment(); }
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

      if (ps.isPlaying) stop();

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
  if (musicData.metadata.suggestedBpm) {
    ps.bpm = musicData.metadata.suggestedBpm;
    (document.getElementById('bpm') as HTMLInputElement).value = String(ps.bpm);
    setBpm(ps.bpm);
  }

  // Show segment navigation
  updateSegmentDisplay();
}

// Load the current segment from piece study lesson
function loadCurrentSegment() {
  if (!currentPieceStudy) return;

  const step = currentPieceStudy.getCurrentStep();
  const music = step.musicSource.getMusic();

  ps.rightHandNotes = music.rightHandNotes;
  ps.leftHandNotes = music.leftHandNotes;
  ps.timeSig = music.timeSignature;
  ps.pieceXml = buildMusicXML(ps.rightHandNotes, ps.leftHandNotes, {
    key: music.key,
    timeSignature: ps.timeSig,
    startMeasure: music.metadata.startMeasure,
  });
  ps.lessonDescription = `${currentPieceStudy.getTitle()} — ${step.explanation}`;

  renderCurrentMusic();
}

// Update segment display in UI
function updateSegmentDisplay() {
  if (!currentPieceStudy) return;
  const step = currentPieceStudy.getCurrentStep();
  const el = (id: string) => document.getElementById(id);

  if (el('lessonInfo')) el('lessonInfo')!.textContent = ps.lessonDescription;
  if (el('levelDisplay')) el('levelDisplay')!.textContent = '♪';
  if (el('levelIndicator')) el('levelIndicator')!.textContent = step.explanation;
  if (el('progressInfo')) {
    el('progressInfo')!.textContent = currentPieceStudy.isSlidingMode
      ? `→ to advance (${step.total} measures total)`
      : `Use ← → to navigate measures`;
  }
}

function nextSegment() {
  if (!currentPieceStudy) return;
  if (ps.isPlaying) stop();
  if (currentPieceStudy.nextStep()) { loadCurrentSegment(); updateSegmentDisplay(); }
}

function previousSegment() {
  if (!currentPieceStudy) return;
  if (ps.isPlaying) stop();
  if (currentPieceStudy.previousStep()) { loadCurrentSegment(); updateSegmentDisplay(); }
}

async function start() {
  await initAudio();
  ps.startPlayback();

  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.classList.add('playing');
  playPauseBtn.setAttribute('aria-label', 'Stop');

  groupNotesByPosition();

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  scheduledEvents = [];
  transport.position = 0;
  transport.bpm.value = ps.bpm;

  scheduleMusic(ps.timeSig.beats);
  transport.start();
}

function scheduleMusic(countoffTotal: number) {
  const events = ps.timingEvents;
  const lastEvent = events[events.length - 1];
  const totalDuration = lastEvent ? lastEvent.time + lastEvent.duration : 0;
  const totalSubdivisions = Math.ceil((countoffTotal + totalDuration) * 4);

  // Schedule metronome clicks and countoff
  for (let sub = 0; sub < totalSubdivisions; sub++) {
    const beat = Math.floor(sub / 4);
    const subInBeat = sub % 4;
    const eventId = Tone.getTransport().schedule(() => {
      playMetronomeClick(subInBeat);
      if (subInBeat === 0 && beat < countoffTotal) {
        updateCountoffDisplay(countoffTotal - beat);
        ps.countoffBeats = beat + 1;
        if (ps.countoffBeats >= countoffTotal) {
          ps.finishCountoff();
          setTimeout(() => updateCountoffDisplay(0), 200);
        }
      }
    }, `0:${beat}:${subInBeat}`);
    scheduledEvents.push(eventId);
  }

  // Schedule note events
  for (const event of events) {
    const eventId = Tone.getTransport().schedule(() => advanceBeat(), beatsToSeconds(countoffTotal + event.time, ps.bpm));
    scheduledEvents.push(eventId);
  }

  // Schedule end
  const endId = Tone.getTransport().schedule(() => onPieceComplete(), beatsToSeconds(countoffTotal + totalDuration, ps.bpm));
  scheduledEvents.push(endId);
}

function onPieceComplete() {
  if (!ps.isPlaying) return;

  // Mark last notes as past
  document.getElementById('notation')!.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  // Reset transport
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().seconds = 0;

  currentPieceStudy ? onPieceStudySegmentComplete() : onSightReadingComplete();
}

function onPieceStudySegmentComplete() {
  if (!currentPieceStudy) return;

  if (currentPieceStudy.nextStep()) {
    loadCurrentSegment();
    updateSegmentDisplay();
    ps.startPlayback();
    scheduleMusic(ps.timeSig.beats);
    Tone.getTransport().start();
  } else {
    stop();
    const el = document.getElementById('progressInfo');
    if (el) el.textContent = 'Complete! Use ← to review.';
  }
}

function onSightReadingComplete() {
  const noteCount = ps.rightHandNotes.filter(n => !n.isRest).length + ps.leftHandNotes.filter(n => !n.isRest).length;
  recordAttempt(getLevel(), getSubLevel(), noteCount, ps.hadMistake ? 1 : 0);

  if (!ps.hadMistake) {
    incrementLevel();
    if (autoTempoRamp && ps.bpm < 180) {
      ps.bpm += 5;
      setBpm(ps.bpm);
      (document.getElementById('bpm') as HTMLInputElement).value = String(ps.bpm);
      Tone.getTransport().bpm.value = ps.bpm;
    }
  }

  generateAndRender();
  ps.startPlayback();
  scheduleMusic(ps.timeSig.beats);
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
  ps.stopPlayback();
  const playPauseBtn = document.getElementById('playPause')!;
  playPauseBtn.classList.remove('playing');
  playPauseBtn.setAttribute('aria-label', 'Start');
  updateCountoffDisplay(0);

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  Tone.getTransport().seconds = 0;

  document.getElementById('notation')!.querySelectorAll('.note, .rest').forEach((el) => {
    el.classList.remove('current', 'correct', 'wrong', 'past');
  });
}

function advanceBeat() {
  if (!ps.shouldAdvanceBeat()) return;

  const notation = document.getElementById('notation')!;
  notation.querySelectorAll('.note.current, .rest.current').forEach((el) => {
    el.classList.remove('current');
    el.classList.add('past');
  });

  if (ps.beatIndex >= ps.visualGroups.length) return;

  const currentGroup = ps.visualGroups[ps.beatIndex];
  currentGroup.elements.forEach((el) => {
    el.classList.add('current');
    if (el.getAttribute('data-early-correct') === 'true') {
      el.classList.add('correct');
      el.removeAttribute('data-early-correct');
    }

    if (el.classList.contains('note')) {
      const pitch = getNoteDataFromElement(el) ?? 'C4';
      if (pitch && sampler?.loaded) sampler.triggerAttackRelease(pitch, '2n');
    }
  });
  ps.beatIndex++;
}

// Start the app
init().catch(console.error);
