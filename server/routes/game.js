import { Router } from 'express';
import { getGameData, claimSquare, unclaimSquare, bulkClaimSquares, findWinnerForScores, getPlayerStats, addPlayer, removePlayer, getPlayers, placeBet, getBets, settleBet, cancelBet, bulkSettleBets, getBetStats } from '../services/dataService.js';

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

// POST /api/game/unclaim - Unclaim a square
router.post('/unclaim', (req, res) => {
  try {
    const { squareIndex, playerName, gameId } = req.body;

    if (squareIndex === undefined || !playerName) {
      return res.status(400).json({ error: 'squareIndex and playerName required' });
    }

    const data = unclaimSquare(parseInt(squareIndex), playerName, gameId);
    res.json(data);
  } catch (error) {
    console.error('Error unclaiming square:', error);
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

    // Allow empty/null initialsList — dataService will auto-use registered players
    const result = bulkClaimSquares(initialsList || [], gameId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk claiming squares:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Player Management ---

// GET /api/game/players - Get all players for current game
router.get('/players', (req, res) => {
  try {
    const gameId = req.query.gameId;
    const players = getPlayers(gameId);
    res.json({ players });
  } catch (error) {
    console.error('Error getting players:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/players - Add a player to the game
router.post('/players', (req, res) => {
  try {
    const { firstName, lastName, gameId } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const player = addPlayer(firstName, lastName, gameId);
    res.status(201).json({ player });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/game/players/:playerId - Remove a player from the game
router.delete('/players/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const gameId = req.query.gameId;
    const removed = removePlayer(playerId, gameId);
    res.json({ removed });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Bet Management ---

// POST /api/game/bets - Place a bet
router.post('/bets', (req, res) => {
  try {
    const { gameId, playerId, type, description, selection, wager, legs } = req.body;
    if (!playerId || !type || !wager) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (type === 'parlay' && (!legs || legs.length < 2)) {
      return res.status(400).json({ error: 'Parlay requires at least 2 legs' });
    }
    if (type !== 'parlay' && !selection) {
      return res.status(400).json({ error: 'Missing selection for straight bet' });
    }
    const bet = placeBet(gameId, playerId, { type, description, selection, wager, legs });
    res.status(201).json({ bet });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/game/bets - Get bets (optionally filtered by playerId)
router.get('/bets', (req, res) => {
  try {
    const { gameId, playerId } = req.query;
    const bets = getBets(gameId, playerId || null);
    res.json({ bets });
  } catch (error) {
    console.error('Error getting bets:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/game/bets/stats - Get bet statistics for admin
router.get('/bets/stats', (req, res) => {
  try {
    const { gameId } = req.query;
    const stats = getBetStats(gameId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting bet stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/bets/:betId/settle - Settle a single bet
router.post('/bets/:betId/settle', (req, res) => {
  try {
    const { betId } = req.params;
    const { gameId, outcome } = req.body;
    if (!['won', 'lost', 'push', 'void'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be won, lost, push, or void' });
    }
    const bet = settleBet(gameId, betId, outcome);
    res.json({ bet });
  } catch (error) {
    console.error('Error settling bet:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/game/bets/:betId/cancel - Cancel a pending bet
router.post('/bets/:betId/cancel', (req, res) => {
  try {
    const { betId } = req.params;
    const { gameId, playerId } = req.body;
    const bet = cancelBet(gameId, betId, playerId);
    res.json({ bet });
  } catch (error) {
    console.error('Error cancelling bet:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/game/bets/bulk-settle - Settle all pending bets
router.post('/bets/bulk-settle', (req, res) => {
  try {
    const { gameId, outcome } = req.body;
    if (!['won', 'lost', 'push', 'void'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be won, lost, push, or void' });
    }
    const result = bulkSettleBets(gameId, outcome);
    res.json(result);
  } catch (error) {
    console.error('Error bulk settling bets:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
