import { Router } from 'express';
import { fetchSuperBowlOdds, getMockOdds, fetchPlayerProps, getMockPlayerProps } from '../services/oddsService.js';
import { getTeamStats, getPlayerGameStats } from '../services/statsService.js';

const router = Router();

// GET /api/odds - Fetch current betting odds (DraftKings only)
router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.ODDS_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      console.log('No ODDS_API_KEY configured, returning mock data');
      return res.json(getMockOdds());
    }

    const odds = await fetchSuperBowlOdds(apiKey);
    res.json(odds);
  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({
      error: error.message,
      mock: true,
      ...getMockOdds()
    });
  }
});

// GET /api/odds/props - Fetch player prop odds (DraftKings only)
router.get('/props', async (req, res) => {
  try {
    const apiKey = process.env.ODDS_API_KEY;
    const { eventId } = req.query;

    // If no API key, return mock data
    if (!apiKey) {
      console.log('No ODDS_API_KEY configured, returning mock player props');
      return res.json(getMockPlayerProps());
    }

    const props = await fetchPlayerProps(apiKey, eventId);
    res.json(props);
  } catch (error) {
    console.error('Error fetching player props:', error);
    res.status(500).json({
      error: error.message,
      mock: true,
      ...getMockPlayerProps()
    });
  }
});

// GET /api/odds/mock - Always return mock data (for testing)
router.get('/mock', (req, res) => {
  res.json(getMockOdds());
});

// GET /api/odds/props/mock - Always return mock player props (for testing)
router.get('/props/mock', (req, res) => {
  res.json(getMockPlayerProps());
});

// GET /api/odds/team-stats - Get team game statistics
router.get('/team-stats', (req, res) => {
  try {
    const stats = getTeamStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/odds/player-stats - Get player game statistics
router.get('/player-stats', (req, res) => {
  try {
    const stats = getPlayerGameStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
