/**
 * Progressive Practice Session
 *
 * Manages the state and progression of a practice session.
 * Uses the step generation algorithm from steps.ts.
 *
 * @module upload/practice-session
 */

import type { NoteData, TimeSignature, KeyInfo } from '../core/types';
import type { ParsedMusicXML } from './parser';
import { getMeasures } from './parser';
import {
  generateSteps,
  getStepDescription,
  getStepTypeLabel,
  type PracticeStep,
  type StepType,
} from './steps';

// Re-export from steps module
export { generateSteps, getStepTypeLabel, type PracticeStep, type StepType };

// ============================================
// TYPES
// ============================================

export interface PracticeSegment {
  rightHand: NoteData[];
  leftHand: NoteData[];
  description: string;
  stepType: StepType;
}

export interface PracticeProgress {
  currentStep: number;
  totalSteps: number;
  percent: number;
  masteredSteps: number;
}

// ============================================
// PRACTICE SESSION CLASS
// ============================================

/**
 * Manages the state and progression of a practice session.
 */
export class ProgressivePracticeSession {
  private parsed: ParsedMusicXML;
  private steps: PracticeStep[];
  private currentStepIndex: number = 0;

  constructor(parsed: ParsedMusicXML) {
    this.parsed = parsed;
    this.steps = generateSteps(parsed.measures.length);
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Get the parsed music data.
   */
  getParsedMusic(): ParsedMusicXML {
    return this.parsed;
  }

  /**
   * Get the piece title.
   */
  getTitle(): string {
    return this.parsed.title ?? 'Uploaded Piece';
  }

  /**
   * Get the time signature.
   */
  getTimeSignature(): TimeSignature {
    return this.parsed.timeSignature;
  }

  /**
   * Get the key signature.
   */
  getKeySignature(): KeyInfo {
    return this.parsed.keySignature;
  }

  /**
   * Get total measure count.
   */
  getMeasureCount(): number {
    return this.parsed.measures.length;
  }

  /**
   * Get current step index (0-based).
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /**
   * Get the current practice step.
   */
  getCurrentStep(): PracticeStep {
    return this.steps[this.currentStepIndex];
  }

  /**
   * Get the notes and metadata for the current step.
   */
  getCurrentSegment(): PracticeSegment {
    const step = this.getCurrentStep();
    const { rightHand, leftHand } = getMeasures(this.parsed, step.measures);

    return {
      rightHand,
      leftHand,
      description: getStepDescription(step),
      stepType: step.type,
    };
  }

  /**
   * Get progress information.
   */
  getProgress(): PracticeProgress {
    const masteredSteps = this.steps.filter(s => s.mastered).length;

    return {
      currentStep: this.currentStepIndex + 1,
      totalSteps: this.steps.length,
      percent: Math.round((masteredSteps / this.steps.length) * 100),
      masteredSteps,
    };
  }

  /**
   * Check if session is complete (all steps mastered).
   */
  isComplete(): boolean {
    return this.steps.every(s => s.mastered);
  }

  /**
   * Check if at last step.
   */
  isAtEnd(): boolean {
    return this.currentStepIndex >= this.steps.length - 1;
  }

  /**
   * Check if at first step.
   */
  isAtStart(): boolean {
    return this.currentStepIndex === 0;
  }

  /**
   * Get all steps for building UI selectors.
   */
  getAllSteps(): PracticeStep[] {
    return this.steps;
  }

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Mark the current step as mastered.
   */
  markMastered(): void {
    this.steps[this.currentStepIndex].mastered = true;
  }

  /**
   * Advance to the next step.
   * @returns true if advanced, false if already at end
   */
  nextStep(): boolean {
    if (this.currentStepIndex >= this.steps.length - 1) {
      return false;
    }

    this.currentStepIndex++;
    return true;
  }

  /**
   * Go to previous step.
   * @returns true if moved back, false if already at start
   */
  previousStep(): boolean {
    if (this.currentStepIndex <= 0) {
      return false;
    }

    this.currentStepIndex--;
    return true;
  }

  /**
   * Jump to a specific step.
   * @returns true if jumped, false if invalid index
   */
  goToStep(index: number): boolean {
    if (index < 0 || index >= this.steps.length) {
      return false;
    }

    this.currentStepIndex = index;
    return true;
  }

  /**
   * Reset to start.
   */
  reset(): void {
    this.currentStepIndex = 0;
  }

  /**
   * Clear all mastery (start fresh).
   */
  clearMastery(): void {
    for (const step of this.steps) {
      step.mastered = false;
    }
    this.currentStepIndex = 0;
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a practice session from parsed MusicXML.
 */
export function createPracticeSession(parsed: ParsedMusicXML): ProgressivePracticeSession {
  return new ProgressivePracticeSession(parsed);
}
