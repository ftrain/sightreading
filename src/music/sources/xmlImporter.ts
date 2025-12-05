/**
 * MusicXML File Importer
 *
 * Handles both compressed (.mxl) and plain (.xml/.musicxml) MusicXML files.
 * Uses Verovio for .mxl decompression and extracts note data from XML.
 *
 * @module music/sources/xmlImporter
 */

import type { NoteData, TimeSignature, KeyInfo } from '../../core/types';
import type { MusicData, MusicSource, MusicSourceType, ImportResult } from './types';

/**
 * Options for MusicXML import
 */
export interface XmlImportOptions {
  /** Default key if not found in file */
  defaultKey?: KeyInfo;
  /** Maximum measures to import (0 = unlimited) */
  maxMeasures?: number;
}

const DEFAULT_KEY: KeyInfo = {
  name: 'C major',
  fifths: 0,
  scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
};

/**
 * Key signatures by fifths value
 */
const KEY_BY_FIFTHS: Record<string, KeyInfo> = {
  '-7': { name: 'Cb major', fifths: -7, scale: ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'] },
  '-6': { name: 'Gb major', fifths: -6, scale: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'] },
  '-5': { name: 'Db major', fifths: -5, scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  '-4': { name: 'Ab major', fifths: -4, scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  '-3': { name: 'Eb major', fifths: -3, scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  '-2': { name: 'Bb major', fifths: -2, scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  '-1': { name: 'F major', fifths: -1, scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
  '0': { name: 'C major', fifths: 0, scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  '1': { name: 'G major', fifths: 1, scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  '2': { name: 'D major', fifths: 2, scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  '3': { name: 'A major', fifths: 3, scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  '4': { name: 'E major', fifths: 4, scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  '5': { name: 'B major', fifths: 5, scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  '6': { name: 'F# major', fifths: 6, scale: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  '7': { name: 'C# major', fifths: 7, scale: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'] },
};

/**
 * Import a MusicXML file (plain or compressed)
 */
export async function importMusicXmlFile(
  file: File,
  options: XmlImportOptions = {}
): Promise<ImportResult<MusicData>> {
  try {
    const filename = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();

    // Check if it's a compressed MusicXML file
    if (filename.endsWith('.mxl')) {
      return importMxlBuffer(buffer, options, file.name);
    }

    // Plain MusicXML
    const text = new TextDecoder().decode(buffer);
    return importMusicXmlString(text, options, file.name);
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
        cause: e,
      },
    };
  }
}

/**
 * Import compressed MusicXML (.mxl) from ArrayBuffer
 * Uses JSZip-compatible approach since Verovio's loadZipDataBuffer has limitations
 */
export async function importMxlBuffer(
  buffer: ArrayBuffer,
  options: XmlImportOptions = {},
  filename?: string
): Promise<ImportResult<MusicData>> {
  try {
    // MXL files are ZIP archives - we need to extract the XML
    // Check for ZIP signature (PK)
    const view = new Uint8Array(buffer);
    if (view[0] !== 0x50 || view[1] !== 0x4b) {
      return {
        ok: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'File is not a valid MXL (ZIP) archive',
        },
      };
    }

    // Use the browser's native decompression via CompressionStream if available,
    // or fall back to manual ZIP parsing for simple cases
    const xmlContent = await extractXmlFromMxl(buffer);
    if (!xmlContent) {
      return {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Could not extract MusicXML from .mxl archive',
        },
      };
    }

    return importMusicXmlString(xmlContent, options, filename);
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to decompress MXL: ${e instanceof Error ? e.message : 'Unknown error'}`,
        cause: e,
      },
    };
  }
}

/**
 * Simple MXL extraction - finds and extracts the main XML file
 * MXL files have a predictable structure with META-INF/container.xml pointing to the root file
 */
async function extractXmlFromMxl(buffer: ArrayBuffer): Promise<string | null> {
  const view = new Uint8Array(buffer);

  // Simple ZIP parsing - find local file headers and extract XML
  // ZIP local file header signature: 0x04034b50 (PK\x03\x04)
  const files: Array<{ name: string; content: Uint8Array }> = [];
  let offset = 0;

  while (offset < view.length - 4) {
    // Check for local file header
    if (
      view[offset] === 0x50 &&
      view[offset + 1] === 0x4b &&
      view[offset + 2] === 0x03 &&
      view[offset + 3] === 0x04
    ) {
      // Parse local file header
      const compressionMethod = view[offset + 8] | (view[offset + 9] << 8);
      const compressedSize = view[offset + 18] | (view[offset + 19] << 8) |
        (view[offset + 20] << 16) | (view[offset + 21] << 24);
      // Skip bytes 22-25 (uncompressed size) - not needed
      const nameLength = view[offset + 26] | (view[offset + 27] << 8);
      const extraLength = view[offset + 28] | (view[offset + 29] << 8);

      const nameStart = offset + 30;
      const nameBytes = view.slice(nameStart, nameStart + nameLength);
      const name = new TextDecoder().decode(nameBytes);

      const dataStart = nameStart + nameLength + extraLength;
      const dataEnd = dataStart + compressedSize;

      if (compressionMethod === 0) {
        // Stored (uncompressed)
        files.push({ name, content: view.slice(dataStart, dataEnd) });
      } else if (compressionMethod === 8) {
        // Deflate - use DecompressionStream if available
        try {
          const compressedData = view.slice(dataStart, dataEnd);
          const decompressed = await decompressDeflate(compressedData);
          files.push({ name, content: decompressed });
        } catch {
          // Skip files we can't decompress
        }
      }

      offset = dataEnd;
    } else {
      offset++;
    }
  }

  // First try to find container.xml to get the root file path
  const containerFile = files.find((f) => f.name === 'META-INF/container.xml');
  if (containerFile) {
    const containerXml = new TextDecoder().decode(containerFile.content);
    const rootMatch = containerXml.match(/full-path="([^"]+)"/);
    if (rootMatch) {
      const rootPath = rootMatch[1];
      const rootFile = files.find((f) => f.name === rootPath);
      if (rootFile) {
        return new TextDecoder().decode(rootFile.content);
      }
    }
  }

  // Fallback: find any .xml file that looks like MusicXML
  for (const file of files) {
    if (file.name.endsWith('.xml') && !file.name.includes('META-INF')) {
      const content = new TextDecoder().decode(file.content);
      if (content.includes('score-partwise') || content.includes('score-timewise')) {
        return content;
      }
    }
  }

  return null;
}

/**
 * Decompress DEFLATE data using DecompressionStream
 */
async function decompressDeflate(data: Uint8Array): Promise<Uint8Array> {
  // DecompressionStream expects raw deflate, not zlib/gzip
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  // Cast to BufferSource to satisfy TypeScript
  writer.write(data as unknown as BufferSource);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Import MusicXML from string
 */
export function importMusicXmlString(
  xmlString: string,
  options: XmlImportOptions = {},
  filename?: string
): ImportResult<MusicData> {
  const { defaultKey = DEFAULT_KEY, maxMeasures = 0 } = options;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Invalid XML: ' + parseError.textContent?.slice(0, 100),
        },
      };
    }

    // Check for MusicXML root element
    const root = doc.querySelector('score-partwise, score-timewise');
    if (!root) {
      return {
        ok: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Not a valid MusicXML file (missing score-partwise or score-timewise)',
        },
      };
    }

    // Extract metadata
    const workTitle = doc.querySelector('work-title')?.textContent ?? filename ?? 'Imported';
    const composer = doc.querySelector('creator[type="composer"]')?.textContent;

    // Extract time signature
    const timeEl = doc.querySelector('time');
    const timeSignature: TimeSignature = {
      beats: parseInt(timeEl?.querySelector('beats')?.textContent ?? '4', 10),
      beatType: parseInt(timeEl?.querySelector('beat-type')?.textContent ?? '4', 10),
    };

    // Extract key signature
    const keyEl = doc.querySelector('key');
    const fifths = parseInt(keyEl?.querySelector('fifths')?.textContent ?? '0', 10);
    const key = KEY_BY_FIFTHS[String(fifths)] ?? defaultKey;

    // Extract tempo
    const tempoEl = doc.querySelector('sound[tempo]');
    const tempo = tempoEl ? parseFloat(tempoEl.getAttribute('tempo') ?? '120') : 120;

    // Parse parts - typically P1 for piano
    const parts = doc.querySelectorAll('part');
    const rightHandNotes: NoteData[] = [];
    const leftHandNotes: NoteData[] = [];

    for (const part of parts) {
      const measures = part.querySelectorAll('measure');
      let measureCount = 0;

      for (const measure of measures) {
        if (maxMeasures > 0 && measureCount >= maxMeasures) break;
        measureCount++;

        // Parse notes in this measure by staff
        const notes = measure.querySelectorAll('note');

        for (const note of notes) {
          const noteData = parseNoteElement(note);
          if (!noteData) continue;

          // Determine staff (1 = treble/right, 2 = bass/left)
          const staffNum = parseInt(note.querySelector('staff')?.textContent ?? '1', 10);

          if (staffNum === 1) {
            rightHandNotes.push(noteData);
          } else {
            leftHandNotes.push(noteData);
          }
        }
      }
    }

    // Ensure both hands have content
    if (rightHandNotes.length === 0 && leftHandNotes.length === 0) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'No notes found in MusicXML file',
        },
      };
    }

    // Fill empty hand with rests
    const totalDuration = Math.max(
      rightHandNotes.reduce((s, n) => s + n.duration, 0),
      leftHandNotes.reduce((s, n) => s + n.duration, 0)
    );

    if (rightHandNotes.length === 0) {
      rightHandNotes.push({ step: 'C', alter: 0, octave: 4, duration: totalDuration, isRest: true });
    }
    if (leftHandNotes.length === 0) {
      leftHandNotes.push({ step: 'C', alter: 0, octave: 3, duration: totalDuration, isRest: true });
    }

    const description = composer ? `${workTitle} - ${composer}` : workTitle;

    const musicData: MusicData = {
      rightHandNotes,
      leftHandNotes,
      timeSignature,
      key,
      metadata: {
        description,
        suggestedBpm: Math.round(tempo),
        tags: ['imported', 'musicxml'],
      },
    };

    return { ok: true, value: musicData };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to parse MusicXML: ${e instanceof Error ? e.message : 'Unknown error'}`,
        cause: e,
      },
    };
  }
}

/**
 * Parse a MusicXML <note> element to NoteData
 */
function parseNoteElement(noteEl: Element): NoteData | null {
  // Check if this is a chord tone (should be merged with previous)
  const isChord = noteEl.querySelector('chord') !== null;
  if (isChord) {
    // Chord notes are handled separately
    return null;
  }

  // Check for rest
  const isRest = noteEl.querySelector('rest') !== null;

  // Get duration
  const durationEl = noteEl.querySelector('duration');
  const divisions = parseInt(noteEl.closest('measure')?.querySelector('attributes divisions')?.textContent ??
    noteEl.ownerDocument?.querySelector('divisions')?.textContent ?? '1', 10);
  const durationDivisions = parseInt(durationEl?.textContent ?? String(divisions), 10);
  const duration = durationDivisions / divisions; // Duration in quarter notes

  if (isRest) {
    return {
      step: 'C',
      alter: 0,
      octave: 4,
      duration,
      isRest: true,
    };
  }

  // Get pitch
  const pitchEl = noteEl.querySelector('pitch');
  if (!pitchEl) return null;

  const step = pitchEl.querySelector('step')?.textContent ?? 'C';
  const alter = parseInt(pitchEl.querySelector('alter')?.textContent ?? '0', 10);
  const octave = parseInt(pitchEl.querySelector('octave')?.textContent ?? '4', 10);

  // Check for chord notes that follow
  const chordNotes: Array<{ step: string; alter: number; octave: number }> = [];
  let sibling = noteEl.nextElementSibling;
  while (sibling && sibling.tagName === 'note') {
    if (sibling.querySelector('chord')) {
      const sibPitch = sibling.querySelector('pitch');
      if (sibPitch) {
        chordNotes.push({
          step: sibPitch.querySelector('step')?.textContent ?? 'C',
          alter: parseInt(sibPitch.querySelector('alter')?.textContent ?? '0', 10),
          octave: parseInt(sibPitch.querySelector('octave')?.textContent ?? '4', 10),
        });
      }
    } else {
      break;
    }
    sibling = sibling.nextElementSibling;
  }

  const noteData: NoteData = {
    step,
    alter,
    octave,
    duration,
    isRest: false,
  };

  if (chordNotes.length > 0) {
    noteData.chordNotes = chordNotes;
  }

  return noteData;
}

/**
 * MusicSource implementation for imported MusicXML files
 */
export class XmlMusicSource implements MusicSource {
  private musicData: MusicData;
  private _sourceType: 'mxl-import' | 'xml-import';

  constructor(musicData: MusicData, isMxl: boolean = false) {
    this.musicData = musicData;
    this._sourceType = isMxl ? 'mxl-import' : 'xml-import';
  }

  getMusic(): MusicData {
    return this.musicData;
  }

  get canRegenerate(): boolean {
    return false;
  }

  get sourceType(): MusicSourceType {
    return this._sourceType;
  }
}

/**
 * Create an XmlMusicSource from a File
 */
export async function createXmlSource(
  file: File,
  options?: XmlImportOptions
): Promise<ImportResult<XmlMusicSource>> {
  const result = await importMusicXmlFile(file, options);
  if (result.ok) {
    const isMxl = file.name.toLowerCase().endsWith('.mxl');
    return { ok: true, value: new XmlMusicSource(result.value, isMxl) };
  }
  return result;
}
