import { Router } from 'express';
import { getGameData, claimSquare, bulkClaimSquares, findWinnerForScores, getPlayerStats } from '../services/dataService.js';

const router = Router();

// GET /api/game - Get current game state
router.get('/', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const data = getGameData(gameId);
    res.json(data);
  } catch (error) {
    console.error('Error getting game data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/claim - Claim a square with initials
router.post('/claim', (req, res) => {
  try {
    const { squareIndex, playerName, gameId } = req.body;

    if (squareIndex === undefined || !playerName) {
      return res.status(400).json({ error: 'squareIndex and initials required' });
    }

    // Clean and validate initials (2-4 letters only)
    const initials = playerName.trim().toUpperCase().replace(/[^A-Z]/g, '');

    if (initials.length < 2) {
      return res.status(400).json({ error: 'Initials must be at least 2 letters' });
    }

    if (initials.length > 4) {
      return res.status(400).json({ error: 'Initials must be at most 4 letters' });
    }

    const data = claimSquare(parseInt(squareIndex), initials, gameId);
    res.json(data);
  } catch (error) {
    console.error('Error claiming square:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/game/winner - Get current potential winner based on scores
router.get('/winner', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const data = getGameData(gameId);
    const winner = findWinnerForScores(data.scores.home, data.scores.away, gameId);
    res.json({
      winner,
      scores: data.scores,
      teams: data.teams
    });
  } catch (error) {
    console.error('Error finding winner:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/game/stats - Get player statistics (bets, winnings, net)
router.get('/stats', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const stats = getPlayerStats(gameId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting player stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/bulk-claim - Bulk assign remaining squares to participants
router.post('/bulk-claim', (req, res) => {
  try {
    const { initialsList, gameId } = req.body;

    if (!initialsList || !Array.isArray(initialsList) || initialsList.length === 0) {
      return res.status(400).json({ error: 'initialsList array required' });
    }

    const result = bulkClaimSquares(initialsList, gameId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk claiming squares:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
