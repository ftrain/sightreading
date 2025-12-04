/**
 * Lessons Module
 *
 * Different types of lessons for music learning.
 *
 * @module curriculum/lessons
 */

// Sight reading
export { SightReadingLesson, createSightReadingLesson } from './sight-reading';

// Piece study
export { PieceStudyLesson, createPieceStudyLesson } from './piece-study';
export type { PieceStudyConfig } from './piece-study';
