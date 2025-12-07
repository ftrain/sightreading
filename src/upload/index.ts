/**
 * Upload Module
 *
 * Exports for MusicXML upload and progressive practice functionality.
 *
 * @module upload
 */

export {
  parseMusicXML,
  getMeasureRange,
  getMeasures,
  type ParsedMusicXML,
  type MeasureData,
  type TimedNote,
} from './parser';

export {
  generateSteps,
  getStepTypeLabel,
  getStepDescription,
  type PracticeStep,
  type StepType,
} from './steps';

export {
  ProgressivePracticeSession,
  createPracticeSession,
  type PracticeSegment,
  type PracticeProgress,
} from './practice-session';

export {
  parseMidi,
  isMidiFile,
} from './midi-parser';
