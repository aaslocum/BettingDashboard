import { useState, useEffect } from 'react';

function TeamStats({ gameData, displayMode = false }) {
  const [teamStats, setTeamStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/odds/team-stats');
        if (response.ok) {
          const data = await response.json();
          setTeamStats(data);
        }
      } catch (error) {
        console.error('Error fetching team stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!teamStats || !gameData) return null;

  const { teams } = gameData;
  const stats = [
    { label: 'TOTAL YARDS', home: teamStats.home.totalYards, away: teamStats.away.totalYards },
    { label: 'PASSING', home: teamStats.home.passingYards, away: teamStats.away.passingYards },
    { label: 'RUSHING', home: teamStats.home.rushingYards, away: teamStats.away.rushingYards },
    { label: 'FIRST DOWNS', home: teamStats.home.firstDowns, away: teamStats.away.firstDowns },
    { label: '3RD DOWN', home: teamStats.home.thirdDownPct, away: teamStats.away.thirdDownPct },
    { label: 'TURNOVERS', home: teamStats.home.turnovers, away: teamStats.away.turnovers, invertBar: true },
    { label: 'POSSESSION', home: teamStats.home.timeOfPossession, away: teamStats.away.timeOfPossession },
    { label: 'SACKS', home: teamStats.home.sacks, away: teamStats.away.sacks },
  ];

  return (
    <div className="nbc-panel">
      <div className="nbc-panel-header">
        <span className="nbc-header-accent"></span>
        <h3 className="nbc-panel-title">TEAM STATS</h3>
      </div>

      {/* Team Headers */}
      <div className="flex justify-between items-center px-4 py-2 nbc-team-header">
        <div className="flex items-center gap-2">
          <span className="nbc-team-abbr">{teams.away.abbreviation}</span>
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">vs</div>
        <div className="flex items-center gap-2">
          <span className="nbc-team-abbr">{teams.home.abbreviation}</span>
        </div>
      </div>

      {/* Stats Rows */}
      <div className="px-3 py-2 space-y-2">
        {stats.map((stat, idx) => (
          <StatRow
            key={stat.label}
            stat={stat}
            displayMode={displayMode}
          />
        ))}
      </div>
    </div>
  );
}

function StatRow({ stat, displayMode }) {
  const { label, home, away, invertBar } = stat;

  // Calculate bar widths for numeric values
  let homeWidth = 50;
  let awayWidth = 50;

  const homeNum = typeof home === 'number' ? home : parseInt(home) || 0;
  const awayNum = typeof away === 'number' ? away : parseInt(away) || 0;
  const total = homeNum + awayNum;

  if (total > 0) {
    homeWidth = Math.round((homeNum / total) * 100);
    awayWidth = 100 - homeWidth;
  }

  // Determine leader
  const homeLeads = invertBar ? homeNum < awayNum : homeNum > awayNum;
  const awayLeads = invertBar ? awayNum < homeNum : awayNum > homeNum;

  return (
    <div className="nbc-stat-row">
      <div className="flex justify-between items-center mb-1">
        <span className={`nbc-stat-value ${awayLeads ? 'nbc-stat-leader' : ''}`}>
          {away}
        </span>
        <span className="nbc-stat-label">{label}</span>
        <span className={`nbc-stat-value ${homeLeads ? 'nbc-stat-leader' : ''}`}>
          {home}
        </span>
      </div>

      {/* Progress bar */}
      {typeof home === 'number' && typeof away === 'number' && (
        <div className="nbc-stat-bar">
          <div
            className={`nbc-stat-bar-away ${awayLeads ? 'nbc-bar-leader' : ''}`}
            style={{ width: `${awayWidth}%` }}
          />
          <div
            className={`nbc-stat-bar-home ${homeLeads ? 'nbc-bar-leader' : ''}`}
            style={{ width: `${homeWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default TeamStats;
