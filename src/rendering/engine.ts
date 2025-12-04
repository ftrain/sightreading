/**
 * Rendering Engine
 *
 * High-level rendering management combining Verovio and highlighting.
 *
 * @module rendering/engine
 */

import type { NoteData, TimeSignature, KeyInfo, Finger } from '../core/types';
import { buildMusicXML, type MusicXMLOptions } from '../music/xml/builder';
import { VerovioRenderer, type VerovioConfig } from './verovio';
import {
  groupNotesByPosition,
  highlightCurrentBeat,
  clearAllHighlighting,
  setGroupState,
  applyEarlyCorrectToGroup,
  type VisualGroup,
} from './highlighter';

// ============================================
// TYPES
// ============================================

export interface RenderingConfig {
  /** Container element for SVG output */
  container: HTMLElement;
  /** Mobile mode (smaller scale) */
  mobileMode?: boolean;
  /** Custom Verovio options */
  verovioOptions?: VerovioConfig;
}

export interface RenderOptions {
  /** Key signature */
  key: KeyInfo;
  /** Time signature */
  timeSignature: TimeSignature;
  /** Right hand fingering */
  rightHandFingering?: Finger[];
  /** Left hand fingering */
  leftHandFingering?: Finger[];
}

// ============================================
// RENDERING ENGINE CLASS
// ============================================

/**
 * Rendering engine for music notation display.
 *
 * @example
 * const engine = new RenderingEngine({
 *   container: document.getElementById('notation')!
 * });
 * await engine.init();
 *
 * engine.render(rightHandNotes, leftHandNotes, {
 *   key: { name: 'C major', fifths: 0, scale: ['C','D','E','F','G','A','B'] },
 *   timeSignature: { beats: 4, beatType: 4 }
 * });
 */
export class RenderingEngine {
  private config: RenderingConfig;
  private renderer: VerovioRenderer | null = null;
  private visualGroups: VisualGroup[] = [];
  private currentXml: string = '';
  private isInitialized = false;

  constructor(config: RenderingConfig) {
    this.config = config;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the rendering engine.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.renderer = new VerovioRenderer();
    await this.renderer.init();
    this.updateVerovioOptions();
    this.isInitialized = true;
  }

  /**
   * Check if engine is initialized.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================
  // OPTIONS
  // ============================================

  /**
   * Update rendering options (e.g., on window resize).
   */
  updateOptions(config: Partial<RenderingConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateVerovioOptions();
  }

  /**
   * Set mobile mode.
   */
  setMobileMode(mobile: boolean): void {
    this.config.mobileMode = mobile;
    this.updateVerovioOptions();
  }

  private updateVerovioOptions(): void {
    if (!this.renderer) return;

    const containerWidth = Math.max(800, this.config.container.clientWidth - 20);
    const scale = this.config.mobileMode ? 35 : 42;

    this.renderer.setOptions({
      pageWidth: containerWidth,
      pageHeight: 800,
      scale,
      adjustPageHeight: true,
      spacingNonLinear: 0.55,
      spacingLinear: 0.3,
      spacingStaff: 6,
      spacingSystem: 4,
      ...this.config.verovioOptions,
    });
  }

  // ============================================
  // RENDERING
  // ============================================

  /**
   * Render notes to the container.
   */
  render(
    rightHandNotes: NoteData[],
    leftHandNotes: NoteData[],
    options: RenderOptions
  ): void {
    if (!this.renderer) return;

    // Build MusicXML
    const xmlOptions: MusicXMLOptions = {
      key: options.key,
      timeSignature: options.timeSignature,
      rightHandFingering: options.rightHandFingering,
      leftHandFingering: options.leftHandFingering,
    };

    this.currentXml = buildMusicXML(rightHandNotes, leftHandNotes, xmlOptions);

    // Render to SVG
    this.renderCurrentXml();
  }

  /**
   * Render from pre-built MusicXML.
   */
  renderXml(xml: string): void {
    if (!this.renderer) return;

    this.currentXml = xml;
    this.renderCurrentXml();
  }

  /**
   * Re-render the current music (e.g., after resize).
   */
  rerender(): void {
    if (!this.currentXml) return;
    this.renderCurrentXml();
  }

  private renderCurrentXml(): void {
    if (!this.renderer || !this.currentXml) return;

    this.updateVerovioOptions();
    this.renderer.loadData(this.currentXml);
    const svg = this.renderer.renderToSVG(1);
    this.config.container.innerHTML = svg;

    // Build visual groups for highlighting
    this.visualGroups = groupNotesByPosition(this.config.container);
  }

  // ============================================
  // HIGHLIGHTING
  // ============================================

  /**
   * Get visual groups (for external highlighting control).
   */
  getVisualGroups(): VisualGroup[] {
    return this.visualGroups;
  }

  /**
   * Highlight the current beat.
   */
  highlightBeat(beatIndex: number): void {
    highlightCurrentBeat(this.visualGroups, beatIndex);

    // Apply early correct markings
    if (beatIndex >= 0 && beatIndex < this.visualGroups.length) {
      applyEarlyCorrectToGroup(this.visualGroups[beatIndex]);
    }
  }

  /**
   * Mark beat as complete (past).
   */
  markBeatComplete(beatIndex: number): void {
    if (beatIndex >= 0 && beatIndex < this.visualGroups.length) {
      setGroupState(this.visualGroups[beatIndex], 'past');
    }
  }

  /**
   * Clear all highlighting.
   */
  clearHighlighting(): void {
    clearAllHighlighting(this.config.container);
  }

  // ============================================
  // NOTE DATA ACCESS
  // ============================================

  /**
   * Get note data from an SVG element.
   * Uses Verovio's element attribute API.
   */
  getNoteDataFromElement(element: SVGElement): string | null {
    if (!this.renderer) return null;

    const toolkit = this.renderer.getToolkit();
    if (!toolkit) return null;

    const id = element.getAttribute('id');
    if (!id) return null;

    try {
      const elemData = toolkit.getElementAttr(id);
      if (elemData && elemData.pname && elemData.oct) {
        let noteName = (elemData.pname as string).toUpperCase();
        if (elemData.accid === 's') noteName += '#';
        if (elemData.accid === 'f') noteName += 'b';
        return `${noteName}${elemData.oct}`;
      }
    } catch {
      // Element not found or invalid
    }

    return null;
  }

  /**
   * Get pitch string for a note element (for playback).
   */
  extractPitch(element: SVGElement): string | null {
    return this.getNoteDataFromElement(element);
  }

  // ============================================
  // STATE ACCESS
  // ============================================

  /**
   * Get the current MusicXML.
   */
  getCurrentXml(): string {
    return this.currentXml;
  }

  /**
   * Get the underlying Verovio renderer.
   */
  getVerovioRenderer(): VerovioRenderer | null {
    return this.renderer;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create and initialize a rendering engine.
 */
export async function createRenderingEngine(
  config: RenderingConfig
): Promise<RenderingEngine> {
  const engine = new RenderingEngine(config);
  await engine.init();
  return engine;
}
