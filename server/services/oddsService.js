const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Cache for odds data
let oddsCache = {
  data: null,
  timestamp: null,
  ttl: 30000 // 30 seconds cache
};

// Cache for scores data
let scoresCache = {
  data: null,
  timestamp: null,
  ttl: 10000 // 10 seconds cache for live scores
};

// Cache for player props
let propsCache = {
  data: null,
  timestamp: null,
  ttl: 60000 // 60 seconds cache for props (they change less frequently)
};

// DraftKings bookmaker key
const DRAFTKINGS_KEY = 'draftkings';

// Fetch Super Bowl odds from The Odds API (DraftKings only)
export async function fetchSuperBowlOdds(apiKey) {
  // Check cache first
  if (oddsCache.data && oddsCache.timestamp && (Date.now() - oddsCache.timestamp < oddsCache.ttl)) {
    return { ...oddsCache.data, cached: true };
  }

  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }

  try {
    // NFL Championship/Super Bowl - sport key is 'americanfootball_nfl'
    const url = new URL(`${ODDS_API_BASE}/sports/americanfootball_nfl/odds`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', 'us');
    url.searchParams.append('markets', 'h2h,spreads,totals');
    url.searchParams.append('oddsFormat', 'american');
    url.searchParams.append('bookmakers', DRAFTKINGS_KEY); // DraftKings only

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Odds API error: ${response.status} - ${error}`);
    }

    const games = await response.json();

    // Filter to only DraftKings and format response
    const oddsData = {
      games: games.map(game => ({
        id: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        bookmakers: game.bookmakers
          ?.filter(b => b.key === DRAFTKINGS_KEY)
          ?.map(bookmaker => ({
            key: bookmaker.key,
            title: bookmaker.title,
            markets: bookmaker.markets?.map(market => ({
              key: market.key,
              outcomes: market.outcomes
            }))
          })) || []
      })),
      timestamp: new Date().toISOString(),
      remainingRequests: response.headers.get('x-requests-remaining'),
      usedRequests: response.headers.get('x-requests-used')
    };

    // Update cache
    oddsCache.data = oddsData;
    oddsCache.timestamp = Date.now();

    return oddsData;
  } catch (error) {
    console.error('Error fetching odds:', error);
    throw error;
  }
}

// Fetch player props from The Odds API (DraftKings only)
export async function fetchPlayerProps(apiKey, eventId = null) {
  // Check cache first
  if (propsCache.data && propsCache.timestamp && (Date.now() - propsCache.timestamp < propsCache.ttl)) {
    return { ...propsCache.data, cached: true };
  }

  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }

  try {
    // Player prop markets
    const propMarkets = [
      'player_pass_tds',
      'player_pass_yds',
      'player_rush_yds',
      'player_receptions',
      'player_reception_yds',
      'player_anytime_td'
    ].join(',');

    const url = new URL(`${ODDS_API_BASE}/sports/americanfootball_nfl/odds`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', 'us');
    url.searchParams.append('markets', propMarkets);
    url.searchParams.append('oddsFormat', 'american');
    url.searchParams.append('bookmakers', DRAFTKINGS_KEY);
    if (eventId) {
      url.searchParams.append('eventIds', eventId);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Props API error: ${response.status} - ${error}`);
    }

    const games = await response.json();

    // Process player props
    const propsData = {
      games: games.map(game => {
        const draftkings = game.bookmakers?.find(b => b.key === DRAFTKINGS_KEY);
        const props = [];

        draftkings?.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            props.push({
              market: market.key,
              marketName: formatPropMarketName(market.key),
              player: outcome.description || outcome.name,
              name: outcome.name,
              line: outcome.point,
              odds: outcome.price
            });
          });
        });

        return {
          id: game.id,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          props
        };
      }),
      timestamp: new Date().toISOString(),
      remainingRequests: response.headers.get('x-requests-remaining')
    };

    // Update cache
    propsCache.data = propsData;
    propsCache.timestamp = Date.now();

    return propsData;
  } catch (error) {
    console.error('Error fetching player props:', error);
    throw error;
  }
}

// Format prop market key to readable name
function formatPropMarketName(key) {
  const names = {
    'player_pass_tds': 'Passing TDs',
    'player_pass_yds': 'Passing Yards',
    'player_rush_yds': 'Rushing Yards',
    'player_receptions': 'Receptions',
    'player_reception_yds': 'Receiving Yards',
    'player_anytime_td': 'Anytime TD'
  };
  return names[key] || key;
}

// Fetch live scores from The Odds API
export async function fetchLiveScores(apiKey) {
  // Check cache first
  if (scoresCache.data && scoresCache.timestamp && (Date.now() - scoresCache.timestamp < scoresCache.ttl)) {
    return { ...scoresCache.data, cached: true };
  }

  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }

  try {
    const url = new URL(`${ODDS_API_BASE}/sports/americanfootball_nfl/scores`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('daysFrom', '1'); // Get scores from today

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scores API error: ${response.status} - ${error}`);
    }

    const games = await response.json();

    const scoresData = {
      games: games.map(game => ({
        id: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        completed: game.completed,
        scores: game.scores ? {
          home: game.scores.find(s => s.name === game.home_team)?.score ?? 0,
          away: game.scores.find(s => s.name === game.away_team)?.score ?? 0
        } : null,
        lastUpdate: game.last_update
      })),
      timestamp: new Date().toISOString(),
      remainingRequests: response.headers.get('x-requests-remaining'),
      usedRequests: response.headers.get('x-requests-used')
    };

    // Update cache
    scoresCache.data = scoresData;
    scoresCache.timestamp = Date.now();

    return scoresData;
  } catch (error) {
    console.error('Error fetching scores:', error);
    throw error;
  }
}

// Get mock scores for development/demo (simulates a live game)
let mockGameState = {
  quarter: 1,
  homeScore: 0,
  awayScore: 0,
  lastUpdate: Date.now()
};

export function getMockScores(simulateLive = false) {
  // If simulating live, occasionally update scores
  if (simulateLive && Date.now() - mockGameState.lastUpdate > 15000) {
    // Random chance to score
    if (Math.random() > 0.7) {
      const points = [3, 6, 7][Math.floor(Math.random() * 3)];
      if (Math.random() > 0.5) {
        mockGameState.homeScore += points;
      } else {
        mockGameState.awayScore += points;
      }
    }
    mockGameState.lastUpdate = Date.now();
  }

  return {
    games: [{
      id: 'superbowl-2025',
      sport: 'americanfootball_nfl',
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Philadelphia Eagles',
      commenceTime: new Date().toISOString(),
      completed: false,
      scores: {
        home: mockGameState.homeScore,
        away: mockGameState.awayScore
      },
      lastUpdate: new Date().toISOString()
    }],
    timestamp: new Date().toISOString(),
    mock: true
  };
}

// Reset mock game state
export function resetMockScores() {
  mockGameState = {
    quarter: 1,
    homeScore: 0,
    awayScore: 0,
    lastUpdate: Date.now()
  };
}

// Get mock data for development/demo (DraftKings only)
export function getMockOdds() {
  return {
    games: [{
      id: 'superbowl-2025',
      sport: 'americanfootball_nfl',
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Philadelphia Eagles',
      commenceTime: new Date().toISOString(),
      bookmakers: [
        {
          key: 'draftkings',
          title: 'DraftKings',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Kansas City Chiefs', price: -130 },
                { name: 'Philadelphia Eagles', price: +110 }
              ]
            },
            {
              key: 'spreads',
              outcomes: [
                { name: 'Kansas City Chiefs', price: -110, point: -2.5 },
                { name: 'Philadelphia Eagles', price: -110, point: 2.5 }
              ]
            },
            {
              key: 'totals',
              outcomes: [
                { name: 'Over', price: -110, point: 49.5 },
                { name: 'Under', price: -110, point: 49.5 }
              ]
            }
          ]
        }
      ]
    }],
    timestamp: new Date().toISOString(),
    mock: true
  };
}

// Get mock player props for development/demo
export function getMockPlayerProps() {
  return {
    games: [{
      id: 'superbowl-2025',
      homeTeam: 'Kansas City Chiefs',
      awayTeam: 'Philadelphia Eagles',
      props: [
        // Passing props
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Patrick Mahomes', name: 'Over', line: 274.5, odds: -115 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Patrick Mahomes', name: 'Under', line: 274.5, odds: -105 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Jalen Hurts', name: 'Over', line: 224.5, odds: -110 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Jalen Hurts', name: 'Under', line: 224.5, odds: -110 },
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Patrick Mahomes', name: 'Over', line: 1.5, odds: -150 },
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Jalen Hurts', name: 'Over', line: 1.5, odds: -120 },
        // Rushing props
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Isiah Pacheco', name: 'Over', line: 54.5, odds: -115 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Jalen Hurts', name: 'Over', line: 44.5, odds: -110 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Saquon Barkley', name: 'Over', line: 74.5, odds: -115 },
        // Receiving props
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Travis Kelce', name: 'Over', line: 64.5, odds: -115 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'A.J. Brown', name: 'Over', line: 74.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'DeVonta Smith', name: 'Over', line: 54.5, odds: -115 },
        // Anytime TD
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Travis Kelce', name: 'Yes', line: null, odds: -120 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Saquon Barkley', name: 'Yes', line: null, odds: -150 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'A.J. Brown', name: 'Yes', line: null, odds: +110 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Isiah Pacheco', name: 'Yes', line: null, odds: +120 },
      ]
    }],
    timestamp: new Date().toISOString(),
    mock: true
  };
}
