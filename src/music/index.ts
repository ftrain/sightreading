/**
 * Music Module
 *
 * All music-related functionality: generation, sources, XML building.
 *
 * @module music
 */

// Sources (high-level music data providers)
export * from './sources';

// Generators (low-level music generation utilities)
export * from './generators';

// XML building
export { buildMusicXML, countMeasures } from './xml/builder';
export type { MusicXMLOptions } from './xml/builder';

// Fingering
export {
  generateFingering,
  formatFingeringDisplay,
  getSimpleFingering,
  fingerName,
  extractFingeringArrays,
} from './fingering';
