/**
 * Music Sources Module
 *
 * Different sources of music data for the application.
 *
 * @module music/sources
 */

// Types
export type { MusicSource, MusicData, MusicMetadata, ProceduralConfig, MusicSourceType, MusicSourceFactory } from './types';

// Procedural source
export { ProceduralMusicSource, createProceduralSource } from './procedural';
