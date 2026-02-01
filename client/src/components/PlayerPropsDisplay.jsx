import { useState } from 'react';
import { formatOdds, getOddsColorClass } from '../utils/helpers';

function PlayerPropsDisplay({ propsData, displayMode = false }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!propsData?.games?.[0]?.props || propsData.games[0].props.length === 0) {
    if (displayMode) {
      return (
        <div className="nbc-panel h-full">
          <div className="nbc-panel-header">
            <span className="nbc-header-accent"></span>
            <h3 className="nbc-panel-title">PLAYER PROPS</h3>
          </div>
          <p className="text-gray-400 p-4 text-center text-sm">No player props available</p>
        </div>
      );
    }
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">Player Props</h2>
        <p className="text-gray-400">No player props available</p>
      </div>
    );
  }

  const props = propsData.games[0].props;

  // Get unique categories
  const categories = ['all', ...new Set(props.map(p => p.market))];

  // Filter props by category
  const filteredProps = selectedCategory === 'all'
    ? props
    : props.filter(p => p.market === selectedCategory);

  // Group by player for cleaner display
  const groupedByPlayer = {};
  filteredProps.forEach(prop => {
    if (!groupedByPlayer[prop.player]) {
      groupedByPlayer[prop.player] = [];
    }
    groupedByPlayer[prop.player].push(prop);
  });

  // Category labels
  const categoryLabels = {
    'all': 'All',
    'player_pass_yds': 'Pass Yds',
    'player_pass_tds': 'Pass TDs',
    'player_rush_yds': 'Rush Yds',
    'player_receptions': 'Rec',
    'player_reception_yds': 'Rec Yds',
    'player_anytime_td': 'Any TD'
  };

  if (displayMode) {
    return (
      <div className="nbc-panel h-full flex flex-col">
        <div className="nbc-panel-header">
          <span className="nbc-header-accent"></span>
          <h3 className="nbc-panel-title">PLAYER PROPS</h3>
          <span className="ml-auto text-xs text-gray-400">DraftKings</span>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-700/50">
          {categories.slice(0, 5).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded text-xs font-semibold tracking-wide transition-colors ${
                selectedCategory === cat
                  ? 'nbc-tab-active'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Props List - NBC Style */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.entries(groupedByPlayer).slice(0, 4).map(([player, playerProps]) => (
            <div key={player} className="bg-black/30 rounded p-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="nbc-team-badge">
                  {player.split(' ')[0][0]}.{player.split(' ').pop().slice(0,3).toUpperCase()}
                </span>
                <span className="font-semibold text-white text-sm">{player}</span>
              </div>
              <div className="space-y-1">
                {playerProps.slice(0, 2).map((prop, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                      {prop.line !== null ? `${prop.name} ${prop.line}` : prop.marketName}
                    </span>
                    <span className={`font-bold ${getOddsColorClass(prop.odds)}`}>
                      {formatOdds(prop.odds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular (non-display) mode
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-yellow-400">Player Props</h2>
        <span className="text-xs text-blue-400">via DraftKings</span>
      </div>

      {propsData.mock && (
        <div className="text-center text-yellow-500 text-xs mb-3">
          (Demo data - Add ODDS_API_KEY for live props)
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Props List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {Object.entries(groupedByPlayer).map(([player, playerProps]) => (
          <div key={player} className="bg-gray-700 rounded-lg p-3">
            <div className="font-semibold text-white mb-2 text-sm">
              {player}
            </div>
            <div className="space-y-1">
              {playerProps.map((prop, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">
                    {prop.marketName}
                    {prop.line !== null && (
                      <span className="ml-1">({prop.name} {prop.line})</span>
                    )}
                    {prop.line === null && prop.name !== 'Yes' && (
                      <span className="ml-1">({prop.name})</span>
                    )}
                  </span>
                  <span className={`font-bold ${getOddsColorClass(prop.odds)}`}>
                    {formatOdds(prop.odds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mt-3 text-center">
        Updated: {new Date(propsData.timestamp).toLocaleTimeString()}
        {propsData.cached && ' (cached)'}
      </div>
    </div>
  );
}

// Compact version for ticker/sidebar
export function PlayerPropsTicker({ propsData }) {
  if (!propsData?.games?.[0]?.props) return null;

  const props = propsData.games[0].props;

  // Get featured props (anytime TDs and key over/unders)
  const featured = props.filter(p =>
    p.market === 'player_anytime_td' ||
    (p.name === 'Over' && ['player_pass_yds', 'player_rush_yds', 'player_reception_yds'].includes(p.market))
  ).slice(0, 8);

  return (
    <div className="flex items-center space-x-6 text-sm">
      {featured.map((prop, idx) => (
        <span key={idx} className="whitespace-nowrap">
          <span className="text-gray-400">{prop.player}</span>
          <span className="mx-1 text-gray-600">|</span>
          <span className="text-white">
            {prop.market === 'player_anytime_td' ? 'TD' : `O${prop.line}`}
          </span>
          <span className={`ml-1 font-bold ${getOddsColorClass(prop.odds)}`}>
            {formatOdds(prop.odds)}
          </span>
        </span>
      ))}
    </div>
  );
}

export default PlayerPropsDisplay;
