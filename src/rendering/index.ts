/**
 * Rendering Module
 *
 * Music notation rendering and visual highlighting.
 *
 * @module rendering
 */

// Engine
export { RenderingEngine, createRenderingEngine } from './engine';
export type { RenderingConfig, RenderOptions } from './engine';

// Verovio adapter
export { VerovioRenderer, createVerovioRenderer } from './verovio';
export type { VerovioConfig } from './verovio';

// Highlighter
export {
  groupNotesByPosition,
  setNoteState,
  setGroupState,
  clearAllHighlighting,
  highlightCurrentBeat,
  markEarlyCorrect,
  wasEarlyCorrect,
  applyEarlyCorrect,
  applyEarlyCorrectToGroup,
} from './highlighter';
export type { VisualGroup, NoteState } from './highlighter';
