import { Router } from 'express';
import { fetchSuperBowlOdds, getMockOdds } from '../services/oddsService.js';

const router = Router();

// GET /api/odds - Fetch current betting odds
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

// GET /api/odds/mock - Always return mock data (for testing)
router.get('/mock', (req, res) => {
  res.json(getMockOdds());
});

export default router;
