import { useState, useEffect } from 'react';

function PlayerGameStats({ displayMode = false }) {
  const [playerStats, setPlayerStats] = useState(null);
  const [activeCategory, setActiveCategory] = useState('passing');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/odds/player-stats');
        if (response.ok) {
          const data = await response.json();
          setPlayerStats(data);
        }
      } catch (error) {
        console.error('Error fetching player stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate categories in display mode
  useEffect(() => {
    if (!displayMode) return;

    const categories = ['passing', 'rushing', 'receiving'];
    let idx = 0;

    const rotateInterval = setInterval(() => {
      idx = (idx + 1) % categories.length;
      setActiveCategory(categories[idx]);
    }, 8000);

    return () => clearInterval(rotateInterval);
  }, [displayMode]);

  if (!playerStats) return null;

  // If no real data available, show waiting state
  if (playerStats.noData) {
    return (
      <div className="nbc-panel">
        <div className="nbc-panel-header">
          <span className="nbc-header-accent"></span>
          <h3 className="nbc-panel-title">PLAYER STATS</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="text-2xl mb-2">⏳</span>
          <span className="text-xs text-gray-500">Stats available at kickoff</span>
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'passing', label: 'PASSING' },
    { key: 'rushing', label: 'RUSHING' },
    { key: 'receiving', label: 'RECEIVING' },
  ];

  return (
    <div className="nbc-panel">
      <div className="nbc-panel-header">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">PLAYER STATS</h3>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-700">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-1 py-2 text-xs font-bold tracking-wider transition-colors
              ${activeCategory === cat.key
                ? 'nbc-tab-active'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Stats Content */}
      <div className="p-3">
        {activeCategory === 'passing' && (
          <PassingStats players={playerStats.passing} />
        )}
        {activeCategory === 'rushing' && (
          <RushingStats players={playerStats.rushing} />
        )}
        {activeCategory === 'receiving' && (
          <ReceivingStats players={playerStats.receiving} />
        )}
      </div>
    </div>
  );
}

function PassingStats({ players }) {
  if (!players?.length) return <EmptyState />;

  return (
    <div className="space-y-1">
      <div className="nbc-stat-table-header">
        <span className="flex-1">PLAYER</span>
        <span className="w-16 text-center">C/A</span>
        <span className="w-14 text-center">YDS</span>
        <span className="w-10 text-center">TD</span>
        <span className="w-12 text-center">RTG</span>
      </div>
      {players.map((player, idx) => (
        <div key={player.name} className={`nbc-stat-table-row ${idx === 0 ? 'nbc-leader-row' : ''}`}>
          <div className="flex-1 flex items-center gap-2">
            <span className="nbc-team-badge">{player.team}</span>
            <span className="font-semibold">{player.name}</span>
          </div>
          <span className="w-16 text-center text-gray-300">{player.comp}/{player.att}</span>
          <span className="w-14 text-center font-bold">{player.yards}</span>
          <span className="w-10 text-center text-nbc-gold">{player.td}</span>
          <span className="w-12 text-center text-gray-400">{player.rating}</span>
        </div>
      ))}
    </div>
  );
}

function RushingStats({ players }) {
  if (!players?.length) return <EmptyState />;

  return (
    <div className="space-y-1">
      <div className="nbc-stat-table-header">
        <span className="flex-1">PLAYER</span>
        <span className="w-12 text-center">CAR</span>
        <span className="w-14 text-center">YDS</span>
        <span className="w-12 text-center">AVG</span>
        <span className="w-10 text-center">TD</span>
      </div>
      {players.slice(0, 4).map((player, idx) => (
        <div key={player.name} className={`nbc-stat-table-row ${idx === 0 ? 'nbc-leader-row' : ''}`}>
          <div className="flex-1 flex items-center gap-2">
            <span className="nbc-team-badge">{player.team}</span>
            <span className="font-semibold">{player.name}</span>
          </div>
          <span className="w-12 text-center text-gray-300">{player.carries}</span>
          <span className="w-14 text-center font-bold">{player.yards}</span>
          <span className="w-12 text-center text-gray-400">{player.avg}</span>
          <span className="w-10 text-center text-nbc-gold">{player.td}</span>
        </div>
      ))}
    </div>
  );
}

function ReceivingStats({ players }) {
  if (!players?.length) return <EmptyState />;

  return (
    <div className="space-y-1">
      <div className="nbc-stat-table-header">
        <span className="flex-1">PLAYER</span>
        <span className="w-12 text-center">REC</span>
        <span className="w-14 text-center">YDS</span>
        <span className="w-12 text-center">AVG</span>
        <span className="w-10 text-center">TD</span>
      </div>
      {players.slice(0, 4).map((player, idx) => (
        <div key={player.name} className={`nbc-stat-table-row ${idx === 0 ? 'nbc-leader-row' : ''}`}>
          <div className="flex-1 flex items-center gap-2">
            <span className="nbc-team-badge">{player.team}</span>
            <span className="font-semibold">{player.name}</span>
          </div>
          <span className="w-12 text-center text-gray-300">{player.rec}</span>
          <span className="w-14 text-center font-bold">{player.yards}</span>
          <span className="w-12 text-center text-gray-400">{player.avg}</span>
          <span className="w-10 text-center text-nbc-gold">{player.td}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-gray-500 py-4 text-sm">
      No stats available
    </div>
  );
}

export default PlayerGameStats;
