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
import { resetMockScores } from '../services/oddsService.js';

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

export default router;
