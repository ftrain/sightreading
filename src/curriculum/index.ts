/**
 * Curriculum Module
 *
 * Lessons, levels, and progress tracking for structured learning.
 *
 * @module curriculum
 */

// Types
export type {
  LessonType,
  LessonStepConfig,
  LessonConfig,
  LessonState,
  CurriculumConfig,
  CurriculumLevel,
  CurriculumProgress,
  MasteryConfig,
  StepChangeEvent,
  StepCompleteEvent,
  LessonCompleteEvent,
} from './types';

// Levels
export {
  LEVEL_DESCRIPTIONS,
  getLevelDescription,
  getSuggestedBpm,
  getLevelConfig,
  getAllLevelDescriptions,
  TOTAL_LEVELS,
  SUB_LEVELS_PER_LEVEL,
} from './levels';

// Progress
export { ProgressManager, createProgressManager } from './progress';

// Lessons
export * from './lessons';
