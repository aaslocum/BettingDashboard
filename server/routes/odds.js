import { Router } from 'express';
import { fetchSuperBowlOdds, getMockOdds, fetchPlayerProps, getMockPlayerProps } from '../services/oddsService.js';
import { getTeamStats, getPlayerGameStats } from '../services/statsService.js';
import { getGameData, updateTeams } from '../services/dataService.js';
import { getDefaultGameId } from '../services/gamesService.js';
import { getTeamAbbreviation } from '../services/syncService.js';

const router = Router();

// Auto-populate game teams from odds data if still using placeholders
function autoPopulateTeams(oddsData) {
  try {
    const game = oddsData?.games?.[0];
    if (!game?.homeTeam || !game?.awayTeam) return;

    const gameId = getDefaultGameId();
    if (!gameId) return;

    const data = getGameData(gameId);
    const isPlaceholder = data.teams.home.name === 'Team A' || data.teams.home.name === 'Team B'
      || data.teams.home.abbreviation === 'TMA' || data.teams.away.abbreviation === 'TMB';

    if (isPlaceholder) {
      const home = { name: game.homeTeam, abbreviation: getTeamAbbreviation(game.homeTeam) };
      const away = { name: game.awayTeam, abbreviation: getTeamAbbreviation(game.awayTeam) };
      updateTeams(home, away, gameId);
      console.log(`Auto-populated teams from odds: ${away.abbreviation} @ ${home.abbreviation}`);
    }
  } catch (err) {
    // Silent - don't break odds response if team update fails
  }
}

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
    autoPopulateTeams(odds);
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

// GET /api/odds/team-stats - Get team game statistics (ESPN or mock)
router.get('/team-stats', async (req, res) => {
  try {
    const stats = await getTeamStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/odds/player-stats - Get player game statistics (ESPN or mock)
router.get('/player-stats', async (req, res) => {
  try {
    const stats = await getPlayerGameStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
