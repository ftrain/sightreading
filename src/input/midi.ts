/**
 * MIDI Input Handler
 *
 * Manages Web MIDI API for piano input.
 *
 * @module input/midi
 */

import { EventEmitter, type MidiInputEvent } from '../core/events';
import { midiToNoteName } from '../core/noteUtils';

// ============================================
// TYPES
// ============================================

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

// ============================================
// MIDI HANDLER CLASS
// ============================================

/**
 * Handles MIDI input from external devices.
 *
 * @example
 * const midi = new MidiHandler();
 * await midi.init();
 *
 * midi.onNoteOn.on((event) => {
 *   console.log('Note played:', event.noteName);
 * });
 *
 * // Select a device
 * const devices = midi.getDevices();
 * midi.selectDevice(devices[0].id);
 */
export class MidiHandler {
  private midiAccess: MIDIAccess | null = null;
  private inputs: Map<string, MIDIInput> = new Map();
  private selectedDeviceId: string | null = null;
  private isInitialized = false;

  // Events
  readonly onNoteOn = new EventEmitter<MidiInputEvent>();
  readonly onNoteOff = new EventEmitter<MidiInputEvent>();
  readonly onDevicesChanged = new EventEmitter<MidiDevice[]>();

  constructor() {
    // Load saved device preference
    this.selectedDeviceId = this.loadDevicePreference();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize Web MIDI access.
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI not supported');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.updateInputs();

      // Listen for device changes
      this.midiAccess.onstatechange = () => {
        this.updateInputs();
      };

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('MIDI access denied:', err);
      return false;
    }
  }

  /**
   * Check if MIDI is initialized.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================
  // DEVICE MANAGEMENT
  // ============================================

  /**
   * Update list of MIDI inputs.
   */
  private updateInputs(): void {
    if (!this.midiAccess) return;

    this.inputs.clear();

    for (const input of this.midiAccess.inputs.values()) {
      this.inputs.set(input.id, input);
      input.onmidimessage = (event) => this.handleMessage(event);
    }

    // Emit device change event
    this.onDevicesChanged.emit(this.getDevices());

    // Auto-select saved device or first available
    if (this.selectedDeviceId && this.inputs.has(this.selectedDeviceId)) {
      // Already selected
    } else if (this.inputs.size > 0) {
      const firstId = this.inputs.keys().next().value;
      if (firstId) this.selectDevice(firstId);
    }
  }

  /**
   * Get list of available MIDI devices.
   */
  getDevices(): MidiDevice[] {
    const devices: MidiDevice[] = [];

    for (const [id, input] of this.inputs) {
      devices.push({
        id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
      });
    }

    return devices;
  }

  /**
   * Select a MIDI device by ID.
   */
  selectDevice(deviceId: string | null): boolean {
    if (deviceId && !this.inputs.has(deviceId)) {
      return false;
    }

    this.selectedDeviceId = deviceId;
    this.saveDevicePreference(deviceId);
    return true;
  }

  /**
   * Get currently selected device ID.
   */
  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  /**
   * Handle incoming MIDI message.
   */
  private handleMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 3) return;

    const [status, noteNum, velocity] = data;
    const command = status & 0xf0;

    const midiEvent: MidiInputEvent = {
      noteName: midiToNoteName(noteNum),
      midiNumber: noteNum,
      velocity,
      isNoteOn: false,
    };

    // Note On
    if (command === 0x90 && velocity > 0) {
      midiEvent.isNoteOn = true;
      this.onNoteOn.emit(midiEvent);
    }
    // Note Off (or Note On with velocity 0)
    else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      midiEvent.isNoteOn = false;
      this.onNoteOff.emit(midiEvent);
    }
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private loadDevicePreference(): string | null {
    try {
      return localStorage.getItem('midiDeviceId');
    } catch {
      return null;
    }
  }

  private saveDevicePreference(deviceId: string | null): void {
    try {
      if (deviceId) {
        localStorage.setItem('midiDeviceId', deviceId);
      } else {
        localStorage.removeItem('midiDeviceId');
      }
    } catch {
      // Ignore storage errors
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Dispose of MIDI handler.
   */
  dispose(): void {
    this.inputs.clear();
    this.midiAccess = null;
    this.isInitialized = false;
    this.onNoteOn.clear();
    this.onNoteOff.clear();
    this.onDevicesChanged.clear();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create and initialize a MIDI handler.
 */
export async function createMidiHandler(): Promise<MidiHandler> {
  const handler = new MidiHandler();
  await handler.init();
  return handler;
}
