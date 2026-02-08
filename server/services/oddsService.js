import { recordOddsSnapshot, makeOddsKey } from './oddsHistoryService.js';

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

    // Record odds history snapshot
    oddsData.games.forEach(game => {
      const entries = [];
      game.bookmakers?.forEach(bm => {
        bm.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            entries.push({
              key: makeOddsKey(market.key, outcome.name),
              value: outcome.price,
              point: outcome.point ?? null,
              timestamp: oddsData.timestamp
            });
          });
        });
      });
      if (entries.length > 0) {
        recordOddsSnapshot(game.id, entries);
      }
    });

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
    // Player prop markets - these require the per-event endpoint
    const propMarkets = [
      'player_pass_tds',
      'player_pass_yds',
      'player_rush_yds',
      'player_receptions',
      'player_reception_yds',
      'player_anytime_td'
    ].join(',');

    // If no eventId provided, fetch events first to get one
    let targetEventId = eventId;
    if (!targetEventId) {
      const eventsUrl = new URL(`${ODDS_API_BASE}/sports/americanfootball_nfl/odds`);
      eventsUrl.searchParams.append('apiKey', apiKey);
      eventsUrl.searchParams.append('regions', 'us');
      eventsUrl.searchParams.append('markets', 'h2h');
      eventsUrl.searchParams.append('bookmakers', DRAFTKINGS_KEY);
      const eventsResponse = await fetch(eventsUrl.toString());
      if (!eventsResponse.ok) {
        const error = await eventsResponse.text();
        throw new Error(`Events API error: ${eventsResponse.status} - ${error}`);
      }
      const events = await eventsResponse.json();
      if (events.length === 0) {
        throw new Error('No NFL events found');
      }
      // Use the first available event (Super Bowl)
      targetEventId = events[0].id;
    }

    // Use the per-event endpoint which supports player prop markets
    const url = new URL(`${ODDS_API_BASE}/sports/americanfootball_nfl/events/${targetEventId}/odds`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', 'us');
    url.searchParams.append('markets', propMarkets);
    url.searchParams.append('oddsFormat', 'american');
    url.searchParams.append('bookmakers', DRAFTKINGS_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Props API error: ${response.status} - ${error}`);
    }

    const game = await response.json();

    // Process player props - per-event endpoint returns a single event object
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

    const propsData = {
      games: [{
        id: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        props
      }],
      timestamp: new Date().toISOString(),
      remainingRequests: response.headers.get('x-requests-remaining')
    };

    // Update cache
    propsCache.data = propsData;
    propsCache.timestamp = Date.now();

    // Record props history snapshot
    propsData.games.forEach(game => {
      const entries = [];
      game.props?.forEach(prop => {
        entries.push({
          key: makeOddsKey(prop.market, prop.name, prop.player),
          value: prop.odds,
          point: prop.line,
          timestamp: propsData.timestamp
        });
      });
      if (entries.length > 0) {
        recordOddsSnapshot(game.id, entries);
      }
    });

    return propsData;
  } catch (error) {
    console.error('Error fetching player props:', error);
    throw error;
  }
}

/**
 * Fetch historical odds from The Odds API
 * Uses previous_timestamp from each response to walk backwards through snapshots.
 * 1 week of data, sampling every ~8 hours.
 *
 * Cost: 10 credits × 3 markets × 1 region = 30 per call
 * ~21 calls for 1 week at 8h intervals = ~630 quota
 */
export async function fetchHistoricalOdds(apiKey, daysBack = 7, intervalHours = 8) {
  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }

  const results = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  let currentDate = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);
  let callCount = 0;
  const maxCalls = Math.ceil((daysBack * 24) / intervalHours) + 2; // safety cap

  while (currentDate >= cutoff && callCount < maxCalls) {
    try {
      const url = new URL(`${ODDS_API_BASE}/historical/sports/americanfootball_nfl/odds`);
      url.searchParams.append('apiKey', apiKey);
      url.searchParams.append('regions', 'us');
      url.searchParams.append('markets', 'h2h,spreads,totals');
      url.searchParams.append('oddsFormat', 'american');
      url.searchParams.append('bookmakers', DRAFTKINGS_KEY);
      url.searchParams.append('date', currentDate.toISOString());

      const response = await fetch(url.toString());
      callCount++;

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Historical fetch failed at ${currentDate.toISOString()}: ${response.status} - ${errText}`);
        break;
      }

      const snapshot = await response.json();

      if (snapshot.data && snapshot.data.length > 0) {
        const snapshotTime = snapshot.timestamp || currentDate.toISOString();

        for (const game of snapshot.data) {
          const entries = [];
          const draftkings = game.bookmakers?.find(b => b.key === DRAFTKINGS_KEY);
          draftkings?.markets?.forEach(market => {
            market.outcomes?.forEach(outcome => {
              entries.push({
                key: makeOddsKey(market.key, outcome.name),
                value: outcome.price,
                point: outcome.point ?? null,
                timestamp: snapshotTime
              });
            });
          });
          if (entries.length > 0) {
            results.push({ eventId: game.id, entries });
          }
        }
      }

      // Jump backwards by interval
      currentDate = new Date(currentDate.getTime() - intervalHours * 60 * 60 * 1000);

      // Rate-limit delay
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error('Historical odds fetch error:', err.message);
      break;
    }
  }

  console.log(`Historical backfill: ${callCount} API calls, ${results.length} snapshots over ${daysBack} days`);
  return results;
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
      id: 'superbowl-lx-2026',
      sport: 'americanfootball_nfl',
      homeTeam: 'Seattle Seahawks',
      awayTeam: 'New England Patriots',
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

// Get mock data for development/demo (Super Bowl LX - DraftKings only)
export function getMockOdds() {
  const data = {
    games: [{
      id: 'superbowl-lx-2026',
      sport: 'americanfootball_nfl',
      homeTeam: 'Seattle Seahawks',
      awayTeam: 'New England Patriots',
      commenceTime: new Date().toISOString(),
      bookmakers: [
        {
          key: 'draftkings',
          title: 'DraftKings',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Seattle Seahawks', price: -238 },
                { name: 'New England Patriots', price: +195 }
              ]
            },
            {
              key: 'spreads',
              outcomes: [
                { name: 'Seattle Seahawks', price: -110, point: -4.5 },
                { name: 'New England Patriots', price: -110, point: 4.5 }
              ]
            },
            {
              key: 'totals',
              outcomes: [
                { name: 'Over', price: -110, point: 45.5 },
                { name: 'Under', price: -110, point: 45.5 }
              ]
            }
          ]
        }
      ]
    }],
    timestamp: new Date().toISOString(),
    mock: true
  };

  // Record mock odds history
  data.games.forEach(game => {
    const entries = [];
    game.bookmakers?.forEach(bm => {
      bm.markets?.forEach(market => {
        market.outcomes?.forEach(outcome => {
          entries.push({
            key: makeOddsKey(market.key, outcome.name),
            value: outcome.price,
            point: outcome.point ?? null,
            timestamp: data.timestamp
          });
        });
      });
    });
    if (entries.length > 0) {
      recordOddsSnapshot(game.id, entries);
    }
  });

  return data;
}

// Get mock player props for development/demo (Super Bowl LX - Seahawks vs Patriots)
export function getMockPlayerProps() {
  const data = {
    games: [{
      id: 'superbowl-lx-2026',
      homeTeam: 'Seattle Seahawks',
      awayTeam: 'New England Patriots',
      props: [
        // Passing Yards
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Sam Darnold', name: 'Over', line: 228.5, odds: -110 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Sam Darnold', name: 'Under', line: 228.5, odds: -110 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Drake Maye', name: 'Over', line: 220.5, odds: -110 },
        { market: 'player_pass_yds', marketName: 'Passing Yards', player: 'Drake Maye', name: 'Under', line: 220.5, odds: -110 },
        // Passing TDs
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Sam Darnold', name: 'Over', line: 1.5, odds: -140 },
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Sam Darnold', name: 'Under', line: 1.5, odds: +120 },
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Drake Maye', name: 'Over', line: 1.5, odds: -120 },
        { market: 'player_pass_tds', marketName: 'Passing TDs', player: 'Drake Maye', name: 'Under', line: 1.5, odds: +100 },
        // Rushing Yards
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Kenneth Walker III', name: 'Over', line: 71.5, odds: -113 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Kenneth Walker III', name: 'Under', line: 71.5, odds: -107 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Rhamondre Stevenson', name: 'Over', line: 49.5, odds: -115 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Rhamondre Stevenson', name: 'Under', line: 49.5, odds: -105 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Drake Maye', name: 'Over', line: 36.5, odds: -102 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'Drake Maye', name: 'Under', line: 36.5, odds: -118 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'TreVeyon Henderson', name: 'Over', line: 18.5, odds: -110 },
        { market: 'player_rush_yds', marketName: 'Rushing Yards', player: 'TreVeyon Henderson', name: 'Under', line: 18.5, odds: -110 },
        // Receptions
        { market: 'player_receptions', marketName: 'Receptions', player: 'Jaxon Smith-Njigba', name: 'Over', line: 6.5, odds: -147 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Jaxon Smith-Njigba', name: 'Under', line: 6.5, odds: +120 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Stefon Diggs', name: 'Over', line: 4.5, odds: -125 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Stefon Diggs', name: 'Under', line: 4.5, odds: +105 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Cooper Kupp', name: 'Over', line: 3.5, odds: -115 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Cooper Kupp', name: 'Under', line: 3.5, odds: -105 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Hunter Henry', name: 'Over', line: 3.5, odds: -110 },
        { market: 'player_receptions', marketName: 'Receptions', player: 'Hunter Henry', name: 'Under', line: 3.5, odds: -110 },
        // Receiving Yards
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Jaxon Smith-Njigba', name: 'Over', line: 94.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Jaxon Smith-Njigba', name: 'Under', line: 94.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Stefon Diggs', name: 'Over', line: 43.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Stefon Diggs', name: 'Under', line: 43.5, odds: -113 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Cooper Kupp', name: 'Over', line: 38.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Cooper Kupp', name: 'Under', line: 38.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Rashid Shaheed', name: 'Over', line: 35.5, odds: -115 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Rashid Shaheed', name: 'Under', line: 35.5, odds: -105 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Hunter Henry', name: 'Over', line: 32.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Hunter Henry', name: 'Under', line: 32.5, odds: -110 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'AJ Barner', name: 'Over', line: 24.5, odds: -115 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'AJ Barner', name: 'Under', line: 24.5, odds: -105 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Kenneth Walker III', name: 'Over', line: 20.5, odds: -145 },
        { market: 'player_reception_yds', marketName: 'Receiving Yards', player: 'Kenneth Walker III', name: 'Under', line: 20.5, odds: +120 },
        // Anytime TD
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Kenneth Walker III', name: 'Yes', line: null, odds: -195 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Jaxon Smith-Njigba', name: 'Yes', line: null, odds: -110 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Rhamondre Stevenson', name: 'Yes', line: null, odds: +140 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Sam Darnold', name: 'Yes', line: null, odds: +170 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Drake Maye', name: 'Yes', line: null, odds: +180 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Stefon Diggs', name: 'Yes', line: null, odds: +190 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Cooper Kupp', name: 'Yes', line: null, odds: +260 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Hunter Henry', name: 'Yes', line: null, odds: +280 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'AJ Barner', name: 'Yes', line: null, odds: +300 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'TreVeyon Henderson', name: 'Yes', line: null, odds: +310 },
        { market: 'player_anytime_td', marketName: 'Anytime TD', player: 'Rashid Shaheed', name: 'Yes', line: null, odds: +320 },
      ]
    }],
    timestamp: new Date().toISOString(),
    mock: true
  };

  // Record mock props history
  data.games.forEach(game => {
    const entries = [];
    game.props?.forEach(prop => {
      entries.push({
        key: makeOddsKey(prop.market, prop.name, prop.player),
        value: prop.odds,
        point: prop.line,
        timestamp: data.timestamp
      });
    });
    if (entries.length > 0) {
      recordOddsSnapshot(game.id, entries);
    }
  });

  return data;
}
