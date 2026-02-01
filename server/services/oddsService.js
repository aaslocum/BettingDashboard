const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Cache for odds data
let oddsCache = {
  data: null,
  timestamp: null,
  ttl: 30000 // 30 seconds cache
};

// Fetch Super Bowl odds from The Odds API
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

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Odds API error: ${response.status} - ${error}`);
    }

    const games = await response.json();

    // Look for Super Bowl game (championship game)
    // The Super Bowl is typically marked or we can filter by team names
    // For now, return all NFL games and let frontend filter
    const oddsData = {
      games: games.map(game => ({
        id: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: game.commence_time,
        bookmakers: game.bookmakers?.map(bookmaker => ({
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

// Get mock data for development/demo
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
        },
        {
          key: 'fanduel',
          title: 'FanDuel',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Kansas City Chiefs', price: -128 },
                { name: 'Philadelphia Eagles', price: +108 }
              ]
            },
            {
              key: 'spreads',
              outcomes: [
                { name: 'Kansas City Chiefs', price: -108, point: -2.5 },
                { name: 'Philadelphia Eagles', price: -112, point: 2.5 }
              ]
            },
            {
              key: 'totals',
              outcomes: [
                { name: 'Over', price: -108, point: 49.5 },
                { name: 'Under', price: -112, point: 49.5 }
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
