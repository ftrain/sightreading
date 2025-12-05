/**
 * Performance Analytics - Track accuracy per level
 *
 * Stores practice history in localStorage and provides accuracy stats.
 */

const STORAGE_KEY = 'sightreading-analytics';

interface LevelStats {
  attempts: number;
  perfect: number; // No mistakes
  totalNotes: number;
  correctNotes: number;
  lastPracticed: number;
}

interface AnalyticsData {
  levels: Record<string, LevelStats>;
  totalSessions: number;
  lastSession: number;
}

function load(): AnalyticsData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { levels: {}, totalSessions: 0, lastSession: 0 };
  } catch {
    return { levels: {}, totalSessions: 0, lastSession: 0 };
  }
}

function save(data: AnalyticsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/** Record a practice attempt for a level */
export function recordAttempt(level: number, subLevel: number, noteCount: number, mistakes: number) {
  const data = load();
  const key = `${level}${['a', 'b', 'c', 'd'][subLevel]}`;
  const stats = data.levels[key] || { attempts: 0, perfect: 0, totalNotes: 0, correctNotes: 0, lastPracticed: 0 };

  stats.attempts++;
  stats.totalNotes += noteCount;
  stats.correctNotes += Math.max(0, noteCount - mistakes);
  if (mistakes === 0) stats.perfect++;
  stats.lastPracticed = Date.now();

  data.levels[key] = stats;
  data.totalSessions++;
  data.lastSession = Date.now();
  save(data);
}

/** Get accuracy for a specific level (0-100) */
export function getAccuracy(level: number, subLevel: number): number {
  const data = load();
  const key = `${level}${['a', 'b', 'c', 'd'][subLevel]}`;
  const stats = data.levels[key];
  if (!stats || stats.totalNotes === 0) return 0;
  return Math.round((stats.correctNotes / stats.totalNotes) * 100);
}

/** Get stats for a level */
export function getLevelStats(level: number, subLevel: number): LevelStats | null {
  const data = load();
  const key = `${level}${['a', 'b', 'c', 'd'][subLevel]}`;
  return data.levels[key] || null;
}

/** Get overall stats summary */
export function getSummary() {
  const data = load();
  const levels = Object.entries(data.levels);
  if (levels.length === 0) return null;

  let totalNotes = 0, correctNotes = 0, attempts = 0, perfect = 0;
  for (const [, stats] of levels) {
    totalNotes += stats.totalNotes;
    correctNotes += stats.correctNotes;
    attempts += stats.attempts;
    perfect += stats.perfect;
  }

  return {
    levelsPlayed: levels.length,
    totalAttempts: attempts,
    perfectRuns: perfect,
    overallAccuracy: totalNotes > 0 ? Math.round((correctNotes / totalNotes) * 100) : 0,
    totalSessions: data.totalSessions,
  };
}

/** Get weak areas (levels with <80% accuracy and at least 3 attempts) */
export function getWeakAreas(): Array<{ level: string; accuracy: number; attempts: number }> {
  const data = load();
  return Object.entries(data.levels)
    .filter(([, s]) => s.attempts >= 3 && (s.correctNotes / s.totalNotes) < 0.8)
    .map(([level, s]) => ({
      level,
      accuracy: Math.round((s.correctNotes / s.totalNotes) * 100),
      attempts: s.attempts,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
}

/** Reset all analytics */
export function resetAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}
