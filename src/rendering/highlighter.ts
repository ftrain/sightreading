/**
 * SVG Highlighter
 *
 * Manages visual highlighting of notes during playback.
 * Works with the SVG output from Verovio.
 *
 * @module rendering/highlighter
 */

// ============================================
// TYPES
// ============================================

/**
 * A group of SVG elements at the same beat position.
 */
export interface VisualGroup {
  /** SVG elements (notes/rests) at this position */
  elements: SVGElement[];
  /** X position for sorting */
  xPosition?: number;
}

/**
 * Note match state for visual feedback
 */
export type NoteState = 'default' | 'current' | 'correct' | 'wrong' | 'past';

// ============================================
// VISUAL GROUP BUILDING
// ============================================

/**
 * Group note/rest elements by their X position in the SVG.
 * Elements at the same X position are considered simultaneous.
 *
 * @param container - Container element with rendered SVG
 * @param tolerance - X position tolerance for grouping (default: 5px)
 */
export function groupNotesByPosition(
  container: Element,
  tolerance: number = 5
): VisualGroup[] {
  const elements = container.querySelectorAll('.note, .rest');
  const containerRect = container.getBoundingClientRect();

  // Find staff line positions for system detection
  const staffLines = container.querySelectorAll('.staff');
  const systemYRanges: { top: number; bottom: number }[] = [];

  // Group staff lines into systems (2 staves per grand staff)
  for (let i = 0; i < staffLines.length; i += 2) {
    const staff1Rect = staffLines[i]?.getBoundingClientRect();
    const staff2Rect = staffLines[i + 1]?.getBoundingClientRect();
    if (staff1Rect && staff2Rect) {
      systemYRanges.push({
        top: Math.min(staff1Rect.top, staff2Rect.top) - containerRect.top,
        bottom: Math.max(staff1Rect.bottom, staff2Rect.bottom) - containerRect.top,
      });
    }
  }

  // Collect elements with positions
  interface NotePosition {
    el: SVGElement;
    x: number;
    sortKey: number; // For ordering
  }

  const notePositions: NotePosition[] = [];

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;

    const relativeY = rect.top - containerRect.top;
    const relativeX = rect.left - containerRect.left;

    // Determine which system this note is in
    let systemIndex = 0;
    for (let i = 0; i < systemYRanges.length; i++) {
      if (relativeY >= systemYRanges[i].top && relativeY <= systemYRanges[i].bottom) {
        systemIndex = i;
        break;
      }
      if (relativeY > systemYRanges[i].bottom) {
        systemIndex = i + 1;
      }
    }

    notePositions.push({
      el: el as SVGElement,
      x: relativeX,
      sortKey: systemIndex * 10000 + relativeX, // System first, then X
    });
  });

  // Sort by system then X position
  notePositions.sort((a, b) => a.sortKey - b.sortKey);

  // Group by X position
  const positionMap = new Map<number, SVGElement[]>();

  notePositions.forEach(({ el, x }) => {
    let foundKey: number | null = null;
    for (const key of positionMap.keys()) {
      if (Math.abs(key - x) < tolerance) {
        foundKey = key;
        break;
      }
    }

    if (foundKey !== null) {
      positionMap.get(foundKey)!.push(el);
    } else {
      positionMap.set(x, [el]);
    }
  });

  // Build groups in order
  const seenKeys = new Set<number>();
  const groups: VisualGroup[] = [];

  notePositions.forEach(({ x }) => {
    let key: number | null = null;
    for (const k of positionMap.keys()) {
      if (Math.abs(k - x) < tolerance) {
        key = k;
        break;
      }
    }

    if (key !== null && !seenKeys.has(key)) {
      seenKeys.add(key);
      groups.push({
        elements: positionMap.get(key)!,
        xPosition: key,
      });
    }
  });

  return groups;
}

// ============================================
// HIGHLIGHTING FUNCTIONS
// ============================================

/**
 * CSS classes for note states.
 */
const STATE_CLASSES: Record<NoteState, string> = {
  default: '',
  current: 'current',
  correct: 'correct',
  wrong: 'wrong',
  past: 'past',
};

/**
 * Set the visual state of a note element.
 */
export function setNoteState(element: SVGElement, state: NoteState): void {
  // Remove all state classes
  element.classList.remove('current', 'correct', 'wrong', 'past');

  // Add new state class
  const className = STATE_CLASSES[state];
  if (className) {
    element.classList.add(className);
  }
}

/**
 * Set the visual state of all elements in a group.
 */
export function setGroupState(group: VisualGroup, state: NoteState): void {
  for (const element of group.elements) {
    setNoteState(element, state);
  }
}

/**
 * Clear all highlighting from a container.
 */
export function clearAllHighlighting(container: Element): void {
  const elements = container.querySelectorAll('.note, .rest');
  elements.forEach((el) => {
    el.classList.remove('current', 'correct', 'wrong', 'past');
  });
}

/**
 * Mark the current beat and update previous beats to "past".
 *
 * @param groups - All visual groups
 * @param currentIndex - Index of current beat
 */
export function highlightCurrentBeat(
  groups: VisualGroup[],
  currentIndex: number
): void {
  // Mark all previous as past
  for (let i = 0; i < currentIndex; i++) {
    setGroupState(groups[i], 'past');
  }

  // Mark current
  if (currentIndex >= 0 && currentIndex < groups.length) {
    setGroupState(groups[currentIndex], 'current');
  }
}

// ============================================
// EARLY CORRECT TRACKING
// ============================================

/**
 * Mark a note as played correctly early (before its beat).
 */
export function markEarlyCorrect(element: SVGElement): void {
  element.setAttribute('data-early-correct', 'true');
}

/**
 * Check if a note was marked as early correct.
 */
export function wasEarlyCorrect(element: SVGElement): boolean {
  return element.getAttribute('data-early-correct') === 'true';
}

/**
 * Apply early correct marking when note becomes current.
 */
export function applyEarlyCorrect(element: SVGElement): void {
  if (wasEarlyCorrect(element)) {
    element.classList.add('correct');
    element.removeAttribute('data-early-correct');
  }
}

/**
 * Apply early correct to all elements in a group.
 */
export function applyEarlyCorrectToGroup(group: VisualGroup): void {
  for (const element of group.elements) {
    applyEarlyCorrect(element);
  }
}
