import { Router } from 'express';
import {
  getGamesIndex,
  getGame,
  createGame,
  deleteGame,
  setDefaultGame,
  updateGameSettings
} from '../services/gamesService.js';

const router = Router();

// GET /api/games - List all games
router.get('/', (req, res) => {
  try {
    const index = getGamesIndex();
    res.json(index);
  } catch (error) {
    console.error('Error listing games:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/games/:gameId - Get specific game
router.get('/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = getGame(gameId);
    res.json(game);
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(404).json({ error: error.message });
  }
});

// POST /api/games - Create a new game
router.post('/', (req, res) => {
  try {
    const { name, betAmount } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const game = createGame({ name, betAmount: betAmount || 1 });
    res.status(201).json({ message: 'Game created', game });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/games/:gameId - Update game settings
router.put('/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const { name, betAmount } = req.body;

    const game = updateGameSettings(gameId, { name, betAmount });
    res.json({ message: 'Game updated', game });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/games/:gameId - Delete a game
router.delete('/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const result = deleteGame(gameId);
    res.json({ message: 'Game deleted', ...result });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/games/:gameId/default - Set game as default
router.post('/:gameId/default', (req, res) => {
  try {
    const { gameId } = req.params;
    const index = setDefaultGame(gameId);
    res.json({ message: 'Default game updated', defaultGameId: index.defaultGameId });
  } catch (error) {
    console.error('Error setting default game:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
