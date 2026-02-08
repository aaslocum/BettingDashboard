import { Router } from 'express';
import {
  getGameData,
  resetGame,
  updateTeams,
  updateScores,
  lockAndRandomize,
  markQuarterWinner,
  unmarkQuarterWinner,
  getAuditLog,
  setAdminPin,
  verifyAdminPin,
  clearAdminPin,
  hasAdminPin
} from '../services/dataService.js';
import {
  getSyncStatus,
  startAutoSync,
  stopAutoSync,
  manualSync
} from '../services/syncService.js';
import { resetMockScores, fetchHistoricalOdds, fetchHistoricalPlayerProps } from '../services/oddsService.js';
import { recordOddsSnapshot, getAvailableKeys, getOddsHistory, sortAndDedupeHistory } from '../services/oddsHistoryService.js';

const router = Router();

// POST /api/admin/reset - Reset game to initial state
router.post('/reset', (req, res) => {
  try {
    const { gameId } = req.body;
    const data = resetGame(gameId);
    res.json({ message: 'Game reset successfully', data });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/teams - Update team information
router.post('/teams', (req, res) => {
  try {
    const { homeTeam, awayTeam, gameId } = req.body;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'homeTeam and awayTeam required' });
    }

    const data = updateTeams(homeTeam, awayTeam, gameId);
    res.json({ message: 'Teams updated', data });
  } catch (error) {
    console.error('Error updating teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/scores - Update current scores
router.post('/scores', (req, res) => {
  try {
    const { homeScore, awayScore, gameId } = req.body;

    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: 'homeScore and awayScore required' });
    }

    const data = updateScores(parseInt(homeScore), parseInt(awayScore), gameId);
    res.json({ message: 'Scores updated', data });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/lock - Lock grid and randomize numbers
router.post('/lock', (req, res) => {
  try {
    const { gameId } = req.body;
    const data = lockAndRandomize(gameId);
    res.json({ message: 'Grid locked and numbers randomized', data });
  } catch (error) {
    console.error('Error locking grid:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/admin/quarter - Mark a quarter as complete
router.post('/quarter', (req, res) => {
  try {
    const { quarter, gameId } = req.body;

    if (!quarter || !['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
      return res.status(400).json({ error: 'Valid quarter (q1, q2, q3, q4) required' });
    }

    const data = markQuarterWinner(quarter, gameId);
    res.json({ message: `Quarter ${quarter} marked complete`, data });
  } catch (error) {
    console.error('Error marking quarter:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/admin/sync/status - Get auto-sync status
router.get('/sync/status', (req, res) => {
  try {
    const status = getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/sync/start - Start auto-sync
router.post('/sync/start', (req, res) => {
  try {
    const apiKey = process.env.ODDS_API_KEY;
    const { gameId, interval } = req.body;

    const result = startAutoSync(apiKey, { gameId, interval });
    const status = getSyncStatus();

    res.json({ ...result, status });
  } catch (error) {
    console.error('Error starting sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/sync/stop - Stop auto-sync
router.post('/sync/stop', (req, res) => {
  try {
    const result = stopAutoSync();
    const status = getSyncStatus();

    res.json({ ...result, status });
  } catch (error) {
    console.error('Error stopping sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/sync/now - Trigger manual sync
router.post('/sync/now', async (req, res) => {
  try {
    const apiKey = process.env.ODDS_API_KEY;
    const status = await manualSync(apiKey);

    res.json({ message: 'Manual sync completed', status });
  } catch (error) {
    console.error('Error during manual sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/quarter/undo - Undo a quarter winner
router.post('/quarter/undo', (req, res) => {
  try {
    const { quarter, gameId } = req.body;

    if (!quarter || !['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
      return res.status(400).json({ error: 'Valid quarter (q1, q2, q3, q4) required' });
    }

    const data = unmarkQuarterWinner(quarter, gameId);
    res.json({ message: `Quarter ${quarter} winner undone`, data });
  } catch (error) {
    console.error('Error undoing quarter:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Admin PIN ---

// GET /api/admin/pin/status - Check if PIN is set
router.get('/pin/status', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const hasPIN = hasAdminPin(gameId);
    res.json({ hasPin: hasPIN });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/pin/verify - Verify admin PIN
router.post('/pin/verify', (req, res) => {
  try {
    const { gameId, pin } = req.body;
    const valid = verifyAdminPin(gameId, pin);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/pin/set - Set admin PIN
router.post('/pin/set', (req, res) => {
  try {
    const { gameId, pin } = req.body;
    const result = setAdminPin(gameId, pin);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/admin/pin/clear - Remove admin PIN
router.post('/pin/clear', (req, res) => {
  try {
    const { gameId } = req.body;
    const result = clearAdminPin(gameId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- Audit Log ---

// GET /api/admin/audit-log - Get audit log
router.get('/audit-log', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const log = getAuditLog(gameId);
    res.json({ log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/reset - Reset game to initial state (updated to also reset mock scores)
router.post('/reset-mock', (req, res) => {
  try {
    resetMockScores();
    res.json({ message: 'Mock scores reset' });
  } catch (error) {
    console.error('Error resetting mock scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Historical Odds Import ---

// Track running imports to prevent duplicates
let activeImport = null;

// GET /api/admin/odds-import/status - Get summary of stored historical data
router.get('/odds-import/status', (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const keys = getAvailableKeys(eventId);
    const gameKeys = keys.filter(k => k.split('__').length < 3);
    const propsKeys = keys.filter(k => k.split('__').length >= 3);

    // Sample data range from first available key
    let oldest = null;
    let newest = null;
    let totalPoints = 0;

    for (const key of keys) {
      const history = getOddsHistory(eventId, key);
      totalPoints += history.length;
      if (history.length > 0) {
        const first = history[0].t;
        const last = history[history.length - 1].t;
        if (!oldest || first < oldest) oldest = first;
        if (!newest || last > newest) newest = last;
      }
    }

    res.json({
      eventId,
      totalKeys: keys.length,
      gameOddsKeys: gameKeys.length,
      playerPropsKeys: propsKeys.length,
      totalDataPoints: totalPoints,
      oldestTimestamp: oldest,
      newestTimestamp: newest,
      isImporting: activeImport !== null,
      hasApiKey: !!process.env.ODDS_API_KEY,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/odds-import - SSE endpoint that streams import progress
router.get('/odds-import', async (req, res) => {
  const { eventId, type } = req.query;
  // type = 'game', 'props', or 'all' (default)
  const importType = type || 'all';

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'ODDS_API_KEY not configured' });
  }

  if (activeImport) {
    return res.status(409).json({ error: 'An import is already running' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (eventType, data) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let aborted = false;
  req.on('close', () => {
    aborted = true;
    activeImport = null;
  });

  activeImport = { eventId, type: importType, startedAt: new Date().toISOString() };

  try {
    send('status', { phase: 'starting', message: 'Starting historical odds import...' });

    // --- Game Odds ---
    if ((importType === 'all' || importType === 'game') && !aborted) {
      send('status', { phase: 'game_odds', message: 'Fetching 3 days of game odds (h2h, spreads, totals)...' });

      const now = new Date();
      const daysBack = 3;
      const intervalHours = 1;
      const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      let currentDate = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);
      let callCount = 0;
      let snapshotCount = 0;
      let pointsAdded = 0;
      const maxCalls = Math.ceil((daysBack * 24) / intervalHours) + 2;

      while (currentDate >= cutoff && callCount < maxCalls && !aborted) {
        try {
          const dateStr = currentDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
          const url = new URL('https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds');
          url.searchParams.append('apiKey', apiKey);
          url.searchParams.append('regions', 'us');
          url.searchParams.append('markets', 'h2h,spreads,totals');
          url.searchParams.append('oddsFormat', 'american');
          url.searchParams.append('bookmakers', 'draftkings');
          url.searchParams.append('date', dateStr);

          const response = await fetch(url.toString());
          callCount++;

          if (!response.ok) {
            const errText = await response.text();
            send('log', { level: 'warn', message: `Game odds call ${callCount}: HTTP ${response.status}`, detail: errText.slice(0, 200) });
            if (response.status === 422 || response.status === 404) {
              currentDate = new Date(currentDate.getTime() - intervalHours * 60 * 60 * 1000);
              await new Promise(r => setTimeout(r, 200));
              continue;
            }
            break;
          }

          const snapshot = await response.json();
          const remaining = response.headers.get('x-requests-remaining');

          if (snapshot.data && snapshot.data.length > 0) {
            const snapshotTime = snapshot.timestamp || dateStr;

            for (const game of snapshot.data) {
              const entries = [];
              const dk = game.bookmakers?.find(b => b.key === 'draftkings');
              dk?.markets?.forEach(market => {
                market.outcomes?.forEach(outcome => {
                  entries.push({
                    key: `${market.key}__${outcome.name}`,
                    value: outcome.price,
                    point: outcome.point ?? null,
                    timestamp: snapshotTime,
                  });
                });
              });
              if (entries.length > 0) {
                recordOddsSnapshot(game.id, entries);
                pointsAdded += entries.length;
                snapshotCount++;
              }
            }
          }

          send('progress', {
            phase: 'game_odds',
            call: callCount,
            totalCalls: maxCalls,
            pct: Math.round((callCount / maxCalls) * 100),
            timestamp: snapshot.timestamp || dateStr,
            pointsAdded,
            remaining,
          });

          currentDate = new Date(currentDate.getTime() - intervalHours * 60 * 60 * 1000);
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          send('log', { level: 'error', message: `Game odds error at call ${callCount}`, detail: err.message });
          break;
        }
      }

      send('log', {
        level: 'success',
        message: `Game odds complete: ${callCount} API calls, ${snapshotCount} snapshots, ${pointsAdded} data points`,
      });
    }

    // --- Player Props ---
    if ((importType === 'all' || importType === 'props') && !aborted) {
      send('status', { phase: 'player_props', message: 'Fetching 3 days of player props (6 markets)...' });

      const propMarkets = 'player_pass_tds,player_pass_yds,player_rush_yds,player_receptions,player_reception_yds,player_anytime_td';
      const now = new Date();
      const daysBack = 3;
      const intervalHours = 1;
      const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      let currentDate = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);
      let callCount = 0;
      let snapshotCount = 0;
      let pointsAdded = 0;
      const maxCalls = Math.ceil((daysBack * 24) / intervalHours) + 2;

      while (currentDate >= cutoff && callCount < maxCalls && !aborted) {
        try {
          const dateStr = currentDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
          const url = new URL(`https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events/${eventId}/odds`);
          url.searchParams.append('apiKey', apiKey);
          url.searchParams.append('regions', 'us');
          url.searchParams.append('markets', propMarkets);
          url.searchParams.append('oddsFormat', 'american');
          url.searchParams.append('bookmakers', 'draftkings');
          url.searchParams.append('date', dateStr);

          const response = await fetch(url.toString());
          callCount++;

          if (!response.ok) {
            const errText = await response.text();
            send('log', { level: 'warn', message: `Props call ${callCount}: HTTP ${response.status}`, detail: errText.slice(0, 200) });
            if (response.status === 422 || response.status === 404) {
              currentDate = new Date(currentDate.getTime() - intervalHours * 60 * 60 * 1000);
              await new Promise(r => setTimeout(r, 200));
              continue;
            }
            break;
          }

          const snapshot = await response.json();
          const remaining = response.headers.get('x-requests-remaining');
          const gameData = snapshot.data;

          if (gameData) {
            const snapshotTime = snapshot.timestamp || dateStr;
            const dk = gameData.bookmakers?.find(b => b.key === 'draftkings');
            const entries = [];

            dk?.markets?.forEach(market => {
              market.outcomes?.forEach(outcome => {
                const player = outcome.description || outcome.name;
                entries.push({
                  key: `${market.key}__${player}__${outcome.name}`,
                  value: outcome.price,
                  point: outcome.point ?? null,
                  timestamp: snapshotTime,
                });
              });
            });

            if (entries.length > 0) {
              recordOddsSnapshot(gameData.id || eventId, entries);
              pointsAdded += entries.length;
              snapshotCount++;
            }
          }

          send('progress', {
            phase: 'player_props',
            call: callCount,
            totalCalls: maxCalls,
            pct: Math.round((callCount / maxCalls) * 100),
            timestamp: snapshot.timestamp || dateStr,
            pointsAdded,
            remaining,
          });

          currentDate = new Date(currentDate.getTime() - intervalHours * 60 * 60 * 1000);
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          send('log', { level: 'error', message: `Props error at call ${callCount}`, detail: err.message });
          break;
        }
      }

      send('log', {
        level: 'success',
        message: `Player props complete: ${callCount} API calls, ${snapshotCount} snapshots, ${pointsAdded} data points`,
      });
    }

    // Sort and deduplicate all stored data for this event
    send('status', { phase: 'cleaning', message: 'Sorting and deduplicating data...' });
    sortAndDedupeHistory(eventId);
    send('log', { level: 'success', message: 'Data sorted chronologically and duplicates removed.' });

    send('status', { phase: 'done', message: 'Historical odds import complete.' });
    send('done', { success: true });
  } catch (err) {
    send('log', { level: 'error', message: 'Import failed', detail: err.message });
    send('done', { success: false, error: err.message });
  } finally {
    activeImport = null;
    res.end();
  }
});

export default router;
