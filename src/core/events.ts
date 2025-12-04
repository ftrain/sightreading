/**
 * Event System for Decoupling Components
 *
 * A lightweight typed event emitter that allows components to communicate
 * without direct dependencies. Used for playback events, UI updates, etc.
 *
 * @module core/events
 *
 * @example
 * // Create typed emitter
 * const onBeat = new EventEmitter<BeatEvent>();
 *
 * // Subscribe
 * const unsubscribe = onBeat.on((event) => {
 *   console.log('Beat:', event.beatIndex);
 * });
 *
 * // Emit
 * onBeat.emit({ beatIndex: 0, timeInSeconds: 0, activeNotes: [] });
 *
 * // Cleanup
 * unsubscribe();
 */

/**
 * Type-safe event emitter for single event type.
 * Each event type gets its own emitter instance.
 */
export class EventEmitter<T> {
  private listeners: Set<(data: T) => void> = new Set();

  /**
   * Subscribe to events.
   * @param listener - Callback to invoke when event fires
   * @returns Unsubscribe function
   */
  on(listener: (data: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe for a single event only.
   * Automatically unsubscribes after first invocation.
   */
  once(listener: (data: T) => void): () => void {
    const wrapper = (data: T) => {
      this.listeners.delete(wrapper);
      listener(data);
    };
    this.listeners.add(wrapper);
    return () => this.listeners.delete(wrapper);
  }

  /**
   * Emit an event to all subscribers.
   * @param data - Event data to send
   */
  emit(data: T): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Remove all subscribers.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get current subscriber count.
   */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Application-wide event types.
 * Central registry of all events for documentation.
 */

/** Emitted on each beat during playback */
export interface PlaybackBeatEvent {
  beatIndex: number;
  timeInSeconds: number;
  isCountoff: boolean;
  countoffRemaining?: number;
}

/** Emitted when playback state changes */
export interface PlaybackStateEvent {
  state: 'stopped' | 'playing' | 'paused' | 'counting-off';
  previousState: 'stopped' | 'playing' | 'paused' | 'counting-off';
}

/** Emitted when a piece completes */
export interface PieceCompleteEvent {
  hadMistakes: boolean;
  notesPlayed: number;
  correctNotes: number;
}

/** Emitted when user plays a MIDI note */
export interface MidiInputEvent {
  noteName: string;
  midiNumber: number;
  velocity: number;
  isNoteOn: boolean;
}

/** Emitted when note match result is determined */
export interface NoteMatchEvent {
  playedNote: string;
  expectedNotes: string[];
  result: 'correct' | 'wrong' | 'early';
}

/** Emitted when level/progress changes */
export interface ProgressEvent {
  level: number;
  subLevel: number;
  action: 'advance' | 'reset' | 'jump';
}

/**
 * Create a set of application events.
 * Call once at app initialization.
 */
export function createAppEvents() {
  return {
    /** Playback beat events */
    onBeat: new EventEmitter<PlaybackBeatEvent>(),
    /** Playback state changes */
    onPlaybackState: new EventEmitter<PlaybackStateEvent>(),
    /** Piece completion */
    onPieceComplete: new EventEmitter<PieceCompleteEvent>(),
    /** MIDI input */
    onMidiInput: new EventEmitter<MidiInputEvent>(),
    /** Note matching results */
    onNoteMatch: new EventEmitter<NoteMatchEvent>(),
    /** Progress changes */
    onProgress: new EventEmitter<ProgressEvent>(),
  };
}

export type AppEvents = ReturnType<typeof createAppEvents>;
