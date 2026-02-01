import { Router } from 'express';
import { getGameData, claimSquare, findWinnerForScores } from '../services/dataService.js';

const router = Router();

// GET /api/game - Get current game state
router.get('/', (req, res) => {
  try {
    const data = getGameData();
    res.json(data);
  } catch (error) {
    console.error('Error getting game data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/claim - Claim a square
router.post('/claim', (req, res) => {
  try {
    const { squareIndex, playerName } = req.body;

    if (squareIndex === undefined || !playerName) {
      return res.status(400).json({ error: 'squareIndex and playerName required' });
    }

    if (playerName.trim().length === 0) {
      return res.status(400).json({ error: 'Player name cannot be empty' });
    }

    if (playerName.length > 20) {
      return res.status(400).json({ error: 'Player name too long (max 20 chars)' });
    }

    const data = claimSquare(parseInt(squareIndex), playerName.trim());
    res.json(data);
  } catch (error) {
    console.error('Error claiming square:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/game/winner - Get current potential winner based on scores
router.get('/winner', (req, res) => {
  try {
    const data = getGameData();
    const winner = findWinnerForScores(data.scores.home, data.scores.away);
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

export default router;
