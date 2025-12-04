/**
 * Melodic and Harmonic Patterns
 *
 * Collections of patterns used in music generation, organized by type.
 * All patterns are arrays of scale degrees (1-8).
 *
 * @module music/generators/patterns
 */

// ============================================
// STEPWISE PATTERNS (Scale fragments)
// ============================================

/**
 * Simple stepwise melodic patterns.
 * Good for beginners learning to read consecutive notes.
 */
export const stepwisePatterns: number[][] = [
  [1, 2, 3],           // Do-Re-Mi
  [3, 2, 1],           // Mi-Re-Do
  [1, 2, 3, 2, 1],     // Up and back
  [5, 4, 3],           // Sol-Fa-Mi
  [3, 4, 5],           // Mi-Fa-Sol
  [1, 2, 3, 4, 5],     // Scale ascending
  [5, 4, 3, 2, 1],     // Scale descending
  [1, 2, 1],           // Neighbor tone
  [3, 2, 3],           // Upper neighbor
  [5, 6, 5],           // Sol-La-Sol
];

// ============================================
// TRIADIC PATTERNS (Arpeggios)
// ============================================

/**
 * Arpeggio-based patterns outlining triads.
 * Helps students recognize chord shapes.
 */
export const triadicPatterns: number[][] = [
  [1, 3, 5],           // C-E-G (major triad up)
  [5, 3, 1],           // G-E-C (major triad down)
  [1, 3, 5, 3],        // Up and back
  [5, 3, 1, 3],        // Down and up
  [1, 5, 3],           // C-G-E
  [3, 1, 5],           // E-C-G
];

// ============================================
// FOLK MELODY FRAGMENTS
// ============================================

/**
 * Patterns based on famous folk melodies.
 * Familiar patterns aid memorability.
 */
export const folkPatterns: number[][] = [
  // "Mary Had a Little Lamb" fragment
  [3, 2, 1, 2, 3, 3, 3],
  // "Twinkle Twinkle" opening
  [1, 1, 5, 5, 6, 6, 5],
  // "Hot Cross Buns"
  [3, 2, 1],
  // "Merrily We Roll Along"
  [3, 2, 1, 2, 3, 3, 3],
  // "Ode to Joy" fragment
  [3, 3, 4, 5, 5, 4, 3, 2],
  // "Au Clair de la Lune" fragment
  [1, 1, 1, 2, 3, 2, 1, 3, 2, 2, 1],
  // "Frère Jacques" fragment
  [1, 2, 3, 1],
  // "Row Row Row Your Boat" fragment
  [1, 1, 1, 2, 3],
  // "London Bridge" fragment
  [5, 4, 3, 4, 5, 5, 5],
];

// ============================================
// CLASSICAL PATTERNS
// ============================================

/**
 * Patterns from classical music idioms.
 * Introduces more sophisticated musical ideas.
 */
export const classicalPatterns: number[][] = [
  // Bach-style bass patterns
  [1, 5, 3, 5],
  [1, 3, 5, 3],
  // Mozart-style Alberti bass
  [1, 5, 3, 5, 1, 5, 3, 5],
  // Beethoven "Für Elise" fragment (simplified)
  [5, 4, 5, 4, 5, 2, 4, 3, 1],
  // Chopin nocturne bass
  [1, 5, 3],
  // Simple cadential pattern
  [5, 4, 3, 2, 1],
];

// ============================================
// WIDE INTERVAL PATTERNS
// ============================================

/**
 * Patterns with larger leaps (6ths, 7ths, octaves).
 * For more advanced students.
 */
export const wideIntervalPatterns: number[][] = [
  // 6ths
  [1, 6],
  [6, 1],
  [1, 6, 1],
  [3, 8],        // 6th from 3 to high 1
  [8, 3],
  // 7ths
  [1, 7],
  [7, 1],
  [2, 8],
  [1, 7, 5, 3, 1],
  // Octaves
  [1, 8],
  [8, 1],
  [1, 8, 1],
  [5, 5, 8, 8],  // Repeated then octave jump
  // Combined larger leaps
  [1, 5, 8],
  [8, 5, 3, 1],
  [1, 3, 5, 8, 5, 3, 1],  // Full octave arpeggio
];

// ============================================
// CHORD PATTERNS
// ============================================

/**
 * Basic intervals (2 notes together)
 */
export const basicIntervals: number[][] = [
  [1, 3],   // 3rd
  [1, 5],   // 5th
  [3, 5],   // 3rd to 5th
  [1, 8],   // Octave
];

/**
 * Triads (3 notes together)
 */
export const triadChords: number[][] = [
  [1, 3, 5],   // Root position triad
  [1, 3, 8],   // Open voicing
  [1, 5, 8],   // Power chord + octave
];

// ============================================
// PATTERN SELECTION HELPERS
// ============================================

/**
 * Get patterns appropriate for a given difficulty level.
 *
 * @param level - Difficulty level (1-20)
 * @param includeWideIntervals - Whether to include 6ths/7ths/octaves
 */
export function getPatternsForLevel(
  level: number,
  includeWideIntervals: boolean = false
): number[][] {
  let patterns: number[][] = [];

  // All levels get stepwise patterns
  patterns = [...stepwisePatterns];

  // Level 3+: Add triadic patterns
  if (level >= 3) {
    patterns = [...patterns, ...triadicPatterns];
  }

  // Level 5+: Add folk patterns
  if (level >= 5) {
    patterns = [...patterns, ...folkPatterns];
  }

  // Level 6+: Add classical patterns
  if (level >= 6) {
    patterns = [...patterns, ...classicalPatterns];
  }

  // Wide intervals only when explicitly requested
  if (includeWideIntervals) {
    patterns = [...patterns, ...wideIntervalPatterns];
  }

  return patterns;
}

/**
 * Get accompaniment patterns for left hand.
 *
 * @param level - Difficulty level
 */
export function getAccompanimentPatterns(level: number): number[][] {
  if (level <= 5) {
    // Simple harmonic patterns
    return [[1], [1, 5], [1, 3, 5], [1, 5, 1, 5], [1, 3, 5, 3]];
  } else if (level <= 6) {
    // More melodic bass lines
    return [
      [1, 2, 3, 2],
      [1, 3, 5, 3],
      [5, 4, 3, 2, 1],
      [1, 2, 3, 4, 5],
      ...classicalPatterns.slice(0, 3),
    ];
  } else {
    // Fully melodic bass with wider range
    return [
      ...stepwisePatterns.slice(0, 5),
      ...classicalPatterns,
      [1, 5, 8, 5],
      [8, 7, 6, 5],
    ];
  }
}

/**
 * Pick a random element from an array.
 */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
