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

// GET /api/games/settlement - Cross-game account settlement
// Aggregates squares (cost & winnings) + bets (wagers & payouts) per player across all games
router.get('/settlement', (req, res) => {
  try {
    const index = getGamesIndex();
    const playerMap = {}; // keyed by player initials

    for (const gameMeta of index.games) {
      let gameData;
      try {
        gameData = getGame(gameMeta.id);
      } catch {
        continue;
      }

      const gameName = gameData.name || gameMeta.name || gameMeta.id;
      const betAmount = gameData.betAmount || 1;

      // --- Squares ---
      const squareCounts = {};
      (gameData.grid?.squares || []).forEach(s => {
        if (s) squareCounts[s] = (squareCounts[s] || 0) + 1;
      });

      // Quarter winnings
      const quarterWinnings = {};
      if (gameData.quarters) {
        Object.entries(gameData.quarters).forEach(([qKey, q]) => {
          if (q.completed && q.winner?.player) {
            const p = q.winner.player;
            if (!quarterWinnings[p]) quarterWinnings[p] = 0;
            quarterWinnings[p] += q.prize || 0;
          }
        });
      }

      // Merge squares data into playerMap
      const squarePlayers = new Set([...Object.keys(squareCounts), ...Object.keys(quarterWinnings)]);
      for (const initials of squarePlayers) {
        if (!playerMap[initials]) {
          playerMap[initials] = { initials, games: {}, squaresCost: 0, squaresWon: 0, betsWagered: 0, betsWon: 0, betsLost: 0 };
        }
        const sq = squareCounts[initials] || 0;
        const cost = sq * betAmount;
        const won = quarterWinnings[initials] || 0;

        playerMap[initials].squaresCost += cost;
        playerMap[initials].squaresWon += won;

        if (!playerMap[initials].games[gameMeta.id]) {
          playerMap[initials].games[gameMeta.id] = { name: gameName, squaresCost: 0, squaresWon: 0, betsWagered: 0, betsWon: 0, betsLost: 0 };
        }
        playerMap[initials].games[gameMeta.id].squaresCost += cost;
        playerMap[initials].games[gameMeta.id].squaresWon += won;
      }

      // --- Bets ---
      const bets = gameData.bets || [];
      for (const bet of bets) {
        const initials = bet.playerInitials;
        if (!initials) continue;

        if (!playerMap[initials]) {
          playerMap[initials] = { initials, games: {}, squaresCost: 0, squaresWon: 0, betsWagered: 0, betsWon: 0, betsLost: 0 };
        }
        if (!playerMap[initials].games[gameMeta.id]) {
          playerMap[initials].games[gameMeta.id] = { name: gameName, squaresCost: 0, squaresWon: 0, betsWagered: 0, betsWon: 0, betsLost: 0 };
        }

        const wager = bet.wager || 0;
        playerMap[initials].betsWagered += wager;
        playerMap[initials].games[gameMeta.id].betsWagered += wager;

        if (bet.status === 'won') {
          const payout = bet.potentialPayout || 0;
          playerMap[initials].betsWon += payout;
          playerMap[initials].games[gameMeta.id].betsWon += payout;
        } else if (bet.status === 'lost') {
          playerMap[initials].betsLost += wager;
          playerMap[initials].games[gameMeta.id].betsLost += wager;
        }
        // pending/void/cancelled/push don't affect settlement yet
      }
    }

    // Build final settlement array
    const players = Object.values(playerMap).map(p => {
      // Net from squares: winnings - cost (negative means they owe, positive means they earned)
      const squaresNet = p.squaresWon - p.squaresCost;
      // Net from bets: winnings - losses (wagered amounts they lost)
      const betsNet = p.betsWon - p.betsLost;
      // Total net: positive = house owes player, negative = player owes house
      const totalNet = squaresNet + betsNet;

      const round = v => Math.round(v * 100) / 100;

      return {
        initials: p.initials,
        squaresCost: round(p.squaresCost),
        squaresWon: round(p.squaresWon),
        squaresNet: round(squaresNet),
        betsWagered: round(p.betsWagered),
        betsWon: round(p.betsWon),
        betsLost: round(p.betsLost),
        betsNet: round(betsNet),
        totalNet: round(totalNet),
        games: Object.entries(p.games).map(([id, g]) => ({
          id,
          name: g.name,
          squaresCost: round(g.squaresCost),
          squaresWon: round(g.squaresWon),
          squaresNet: round(g.squaresWon - g.squaresCost),
          betsWagered: round(g.betsWagered),
          betsWon: round(g.betsWon),
          betsLost: round(g.betsLost),
          betsNet: round(g.betsWon - g.betsLost),
          totalNet: round((g.squaresWon - g.squaresCost) + (g.betsWon - g.betsLost)),
        })),
      };
    });

    // Sort by totalNet ascending (most owed first, then most earning)
    players.sort((a, b) => a.totalNet - b.totalNet);

    // Totals
    const toCollect = players.filter(p => p.totalNet < 0).reduce((s, p) => s + Math.abs(p.totalNet), 0);
    const toPayOut = players.filter(p => p.totalNet > 0).reduce((s, p) => s + p.totalNet, 0);

    res.json({
      players,
      summary: {
        totalPlayers: players.length,
        toCollect: Math.round(toCollect * 100) / 100,
        toPayOut: Math.round(toPayOut * 100) / 100,
        houseBalance: Math.round((toCollect - toPayOut) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error computing settlement:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    const { name, betAmount, prizeDistribution, maxPayoutParlay, maxPayoutStraight } = req.body;

    const game = updateGameSettings(gameId, { name, betAmount, prizeDistribution, maxPayoutParlay, maxPayoutStraight });
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
