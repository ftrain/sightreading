/**
 * Verovio Adapter
 *
 * Wraps the Verovio library for MusicXML rendering.
 *
 * @module rendering/verovio
 */

import type { VerovioToolkit } from 'verovio/esm';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit as VerovioToolkitClass } from 'verovio/esm';

// Verovio options type (not exported from verovio/esm)
type VerovioOptions = Record<string, unknown>;

// ============================================
// TYPES
// ============================================

export interface VerovioConfig {
  /** Page width in pixels */
  pageWidth?: number;
  /** Page height in pixels */
  pageHeight?: number;
  /** Scale percentage (default: 42) */
  scale?: number;
  /** Adjust page height to content */
  adjustPageHeight?: boolean;
  /** Spacing between notes (non-linear) */
  spacingNonLinear?: number;
  /** Spacing between notes (linear) */
  spacingLinear?: number;
  /** Spacing between staves */
  spacingStaff?: number;
  /** Spacing between systems */
  spacingSystem?: number;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: Partial<VerovioOptions> = {
  pageHeight: 800,
  scale: 42,
  adjustPageHeight: true,
  footer: 'none',
  header: 'none',
  breaks: 'none',
  staffLabelMode: 'none',
  spacingNonLinear: 0.55,
  spacingLinear: 0.3,
  spacingStaff: 6,
  spacingSystem: 4,
};

// ============================================
// VEROVIO RENDERER CLASS
// ============================================

/**
 * Verovio renderer for MusicXML to SVG conversion.
 */
export class VerovioRenderer {
  private toolkit: VerovioToolkit | null = null;
  private isInitialized = false;
  private currentXml: string = '';

  /**
   * Initialize Verovio (async, loads WASM module).
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    const VerovioModule = await createVerovioModule();
    this.toolkit = new VerovioToolkitClass(VerovioModule);
    this.isInitialized = true;
  }

  /**
   * Check if renderer is initialized.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the underlying toolkit (for advanced operations).
   */
  getToolkit(): VerovioToolkit | null {
    return this.toolkit;
  }

  /**
   * Set rendering options.
   */
  setOptions(config: VerovioConfig): void {
    if (!this.toolkit) return;

    const options: Partial<VerovioOptions> = {
      ...DEFAULT_OPTIONS,
      pageWidth: config.pageWidth ?? 800,
      scale: config.scale ?? 42,
    };

    if (config.pageHeight !== undefined) options.pageHeight = config.pageHeight;
    if (config.adjustPageHeight !== undefined) options.adjustPageHeight = config.adjustPageHeight;
    if (config.spacingNonLinear !== undefined) options.spacingNonLinear = config.spacingNonLinear;
    if (config.spacingLinear !== undefined) options.spacingLinear = config.spacingLinear;
    if (config.spacingStaff !== undefined) options.spacingStaff = config.spacingStaff;
    if (config.spacingSystem !== undefined) options.spacingSystem = config.spacingSystem;

    this.toolkit.setOptions(options);
  }

  /**
   * Load MusicXML data.
   */
  loadData(xml: string): boolean {
    if (!this.toolkit) return false;

    this.currentXml = xml;
    return this.toolkit.loadData(xml);
  }

  /**
   * Render to SVG string.
   *
   * @param page - Page number (1-indexed)
   */
  renderToSVG(page: number = 1): string {
    if (!this.toolkit) return '';
    return this.toolkit.renderToSVG(page);
  }

  /**
   * Get element attributes by ID.
   */
  getElementAttr(id: string): Record<string, unknown> {
    if (!this.toolkit) return {};
    const attr = this.toolkit.getElementAttr(id);
    return attr || {};
  }

  /**
   * Get the currently loaded MusicXML.
   */
  getCurrentXml(): string {
    return this.currentXml;
  }

  /**
   * Get page count.
   */
  getPageCount(): number {
    if (!this.toolkit) return 0;
    return this.toolkit.getPageCount();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create and initialize a Verovio renderer.
 */
export async function createVerovioRenderer(): Promise<VerovioRenderer> {
  const renderer = new VerovioRenderer();
  await renderer.init();
  return renderer;
}
