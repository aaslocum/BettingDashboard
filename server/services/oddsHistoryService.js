import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HISTORY_DIR = join(__dirname, '../../data/odds-history');

// Track which events have been backfilled (in-memory flag per process)
const backfilledEvents = new Set();

// Ensure directory exists
function ensureHistoryDir() {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

// Get file path for an event
function getHistoryFilePath(eventId) {
  // Sanitize eventId for filesystem safety
  const safeId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(HISTORY_DIR, `${safeId}.json`);
}

// Load history file (or create empty)
function loadHistory(eventId) {
  ensureHistoryDir();
  const filePath = getHistoryFilePath(eventId);
  if (!existsSync(filePath)) {
    return { eventId, lines: {} };
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { eventId, lines: {} };
  }
}

// Save history file
function saveHistory(eventId, data) {
  ensureHistoryDir();
  const filePath = getHistoryFilePath(eventId);
  writeFileSync(filePath, JSON.stringify(data));
}

/**
 * Generate a unique key for an odds line
 * Game odds: "h2h__Seattle Seahawks"
 * Props: "player_pass_yds__Sam Darnold__Over"
 */
export function makeOddsKey(market, outcomeName, playerName = null) {
  if (playerName) {
    return `${market}__${playerName}__${outcomeName}`;
  }
  return `${market}__${outcomeName}`;
}

/**
 * Record a batch of odds snapshots
 * @param {string} eventId - Game event ID
 * @param {Array<{key, value, point, timestamp}>} entries - Odds data points
 */
export function recordOddsSnapshot(eventId, entries) {
  if (!eventId || !entries || entries.length === 0) return;

  try {
    const history = loadHistory(eventId);

    for (const entry of entries) {
      if (!history.lines[entry.key]) {
        history.lines[entry.key] = [];
      }

      const line = history.lines[entry.key];
      const ts = entry.timestamp || new Date().toISOString();

      // Skip duplicate if last entry has same value and point (avoid storing unchanged data)
      if (line.length > 0) {
        const last = line[line.length - 1];
        if (last.v === entry.value && last.p === (entry.point ?? null)) {
          continue;
        }
      }

      line.push({
        t: ts,
        v: entry.value,
        p: entry.point ?? null
      });

      // Cap at 5000 entries per line (safety valve for 2+ weeks of data)
      if (line.length > 5000) {
        history.lines[entry.key] = line.slice(-5000);
      }
    }

    saveHistory(eventId, history);
  } catch (err) {
    console.error('Error recording odds snapshot:', err.message);
  }
}

/**
 * Sort history entries by timestamp (needed after backfill inserts older data)
 */
function sortHistory(eventId) {
  try {
    const history = loadHistory(eventId);
    for (const key of Object.keys(history.lines)) {
      history.lines[key].sort((a, b) => new Date(a.t) - new Date(b.t));
    }
    saveHistory(eventId, history);
  } catch (err) {
    console.error('Error sorting history:', err.message);
  }
}

/**
 * Get history for a specific odds key
 * Returns array of { t, v, p } sorted by time
 */
export function getOddsHistory(eventId, oddsKey) {
  if (!eventId || !oddsKey) return [];

  try {
    const history = loadHistory(eventId);

    const line = history.lines[oddsKey];

    // If little/no data and this looks like a mock event, generate synthetic 2-week history
    if (!line || line.length < 5) {
      if (eventId.includes('mock') || eventId.includes('superbowl-lx')) {
        return generateMockHistory(oddsKey);
      }
      if (!line || line.length === 0) return [];
    }

    return line;
  } catch {
    return [];
  }
}

/**
 * Check if a backfill key needs historical data.
 * backfillKey can be a composite like "eventId__props" or "eventId__game",
 * or just an eventId for backwards compat.
 */
export function needsBackfill(backfillKey) {
  if (backfilledEvents.has(backfillKey)) return false;
  return true;
}

/**
 * Mark an event as backfilled
 */
export function markBackfilled(eventId) {
  backfilledEvents.add(eventId);
}

/**
 * Run backfill: record historical data and sort
 */
export function runBackfill(eventId, snapshots) {
  for (const snapshot of snapshots) {
    if (snapshot.eventId === eventId) {
      recordOddsSnapshot(eventId, snapshot.entries);
    }
  }
  // Sort all lines by timestamp after inserting historical data
  sortHistory(eventId);
  markBackfilled(eventId);
}

/**
 * Get all available keys for an event
 */
export function getAvailableKeys(eventId) {
  if (!eventId) return [];
  try {
    const history = loadHistory(eventId);
    return Object.keys(history.lines);
  } catch {
    return [];
  }
}

/**
 * Generate synthetic history for demo/mock mode
 * Creates 1 week of random walk data
 */
function generateMockHistory(oddsKey) {
  const baseOdds = getMockBaseOdds(oddsKey);
  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const intervalMs = 8 * 60 * 60 * 1000; // every 8 hours
  const numPoints = Math.floor(oneWeekMs / intervalMs);

  const points = [];
  let current = baseOdds;

  for (let i = numPoints; i >= 0; i--) {
    points.push({
      t: new Date(now - i * intervalMs).toISOString(),
      v: current,
      p: null
    });
    // Random walk: shift by 1-8 points
    const shift = Math.floor(Math.random() * 8) + 1;
    current += Math.random() > 0.5 ? shift : -shift;

    // Keep odds in reasonable ranges
    if (current > 0 && current < 100) current = 100;
    if (current < 0 && current > -100) current = -100;
  }

  return points;
}

/**
 * Derive a reasonable base odds value from a key name
 */
function getMockBaseOdds(oddsKey) {
  const key = oddsKey.toLowerCase();

  // Moneyline favorites
  if (key.includes('h2h') && key.includes('seahawk')) return -238;
  if (key.includes('h2h') && key.includes('patriot')) return 195;

  // Spreads
  if (key.includes('spreads')) return -110;

  // Totals
  if (key.includes('totals')) return -110;

  // Anytime TD
  if (key.includes('anytime_td')) {
    if (key.includes('walker')) return -195;
    if (key.includes('smith-njigba') || key.includes('njigba')) return -110;
    return 150;
  }

  // Player props default
  if (key.includes('over') || key.includes('under')) return -110;

  // Fallback
  return -115;
}
