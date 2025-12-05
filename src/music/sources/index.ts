/**
 * Music Sources Module
 *
 * Different sources of music data for the application.
 *
 * @module music/sources
 */

// Types
export type {
  MusicSource,
  MusicData,
  MusicMetadata,
  ProceduralConfig,
  MusicSourceType,
  MusicSourceFactory,
  ImportResult,
  ImportError,
} from './types';

// Procedural source
export { ProceduralMusicSource, createProceduralSource } from './procedural';

// MIDI import
export {
  MidiMusicSource,
  createMidiSource,
  importMidiFile,
  importMidiBuffer,
  type MidiImportOptions,
} from './midiImporter';

// MusicXML import (plain and compressed)
export {
  XmlMusicSource,
  createXmlSource,
  importMusicXmlFile,
  importMusicXmlString,
  importMxlBuffer,
  type XmlImportOptions,
} from './xmlImporter';
