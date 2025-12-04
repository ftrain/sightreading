/**
 * MusicSource Interface
 *
 * Abstraction for any source of music data. Implementations can be:
 * - Procedural (random generation)
 * - Imported (from MusicXML files)
 * - Predefined (curated lessons)
 *
 * @module music/sources/types
 */

import type { NoteData, TimeSignature, KeyInfo } from '../../core/types';

/**
 * Metadata about a piece of music
 */
export interface MusicMetadata {
  /** Human-readable description */
  description: string;
  /** Suggested tempo in BPM */
  suggestedBpm: number;
  /** Level (if applicable) */
  level?: number;
  /** Sub-level (if applicable) */
  subLevel?: number;
  /** Additional info for display */
  tags?: string[];
}

/**
 * Complete music data for a piece
 */
export interface MusicData {
  /** Notes for right hand */
  rightHandNotes: NoteData[];
  /** Notes for left hand */
  leftHandNotes: NoteData[];
  /** Time signature */
  timeSignature: TimeSignature;
  /** Key signature */
  key: KeyInfo;
  /** Piece metadata */
  metadata: MusicMetadata;
}

/**
 * Abstract interface for any source of music.
 * All music sources implement this interface.
 */
export interface MusicSource {
  /** Get the music data */
  getMusic(): MusicData;

  /** Generate new music (for procedural sources) */
  regenerate?(): MusicData;

  /** Check if this source can generate new variations */
  readonly canRegenerate: boolean;

  /** Get source type identifier */
  readonly sourceType: MusicSourceType;
}

/**
 * Types of music sources
 */
export type MusicSourceType =
  | 'procedural'    // Randomly generated
  | 'imported'      // From MusicXML/MIDI file
  | 'predefined';   // Curated/hardcoded

/**
 * Configuration for procedural music generation
 */
export interface ProceduralConfig {
  /** Level number (1-20) */
  level: number;
  /** Sub-level (0-3) */
  subLevel: number;
  /** Number of measures to generate */
  numMeasures: number;
  /** Override key (null = use level default) */
  keyOverride?: string | null;
  /** Include fingering in output */
  includeFingering?: boolean;
}

/**
 * Factory function type for creating music sources
 */
export type MusicSourceFactory = (config: unknown) => MusicSource;
