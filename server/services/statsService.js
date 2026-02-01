// Mock game statistics service
// In production, this would integrate with a live sports data API

let mockTeamStats = {
  home: {
    totalYards: 287,
    passingYards: 198,
    rushingYards: 89,
    firstDowns: 16,
    thirdDownPct: '5/11 (45%)',
    turnovers: 1,
    timeOfPossession: '18:24',
    sacks: 2,
    penalties: '4-35'
  },
  away: {
    totalYards: 312,
    passingYards: 241,
    rushingYards: 71,
    firstDowns: 19,
    thirdDownPct: '6/12 (50%)',
    turnovers: 0,
    timeOfPossession: '21:36',
    sacks: 1,
    penalties: '3-25'
  }
};

let mockPlayerStats = {
  passing: [
    { name: 'P. Mahomes', team: 'KC', comp: 18, att: 24, yards: 198, td: 2, int: 0, rating: 128.5 },
    { name: 'J. Hurts', team: 'PHI', comp: 21, att: 29, yards: 241, td: 1, int: 1, rating: 98.2 }
  ],
  rushing: [
    { name: 'I. Pacheco', team: 'KC', carries: 12, yards: 67, avg: 5.6, td: 1, long: 18 },
    { name: 'S. Barkley', team: 'PHI', carries: 14, yards: 58, avg: 4.1, td: 0, long: 12 },
    { name: 'J. Hurts', team: 'PHI', carries: 4, yards: 13, avg: 3.3, td: 1, long: 8 }
  ],
  receiving: [
    { name: 'T. Kelce', team: 'KC', rec: 7, targets: 9, yards: 89, avg: 12.7, td: 1, long: 24 },
    { name: 'A.J. Brown', team: 'PHI', rec: 6, targets: 8, yards: 102, avg: 17.0, td: 1, long: 34 },
    { name: 'D. Smith', team: 'PHI', rec: 5, targets: 7, yards: 67, avg: 13.4, td: 0, long: 22 },
    { name: 'R. Rice', team: 'KC', rec: 4, targets: 6, yards: 52, avg: 13.0, td: 1, long: 19 }
  ]
};

// Simulate live stat updates
let updateInterval = null;

function randomStatChange(value, maxChange) {
  const change = Math.floor(Math.random() * maxChange);
  return value + change;
}

export function startStatUpdates() {
  if (updateInterval) return;

  updateInterval = setInterval(() => {
    // Randomly update some stats to simulate live game
    if (Math.random() > 0.7) {
      const team = Math.random() > 0.5 ? 'home' : 'away';
      mockTeamStats[team].totalYards = randomStatChange(mockTeamStats[team].totalYards, 8);
      mockTeamStats[team].passingYards = randomStatChange(mockTeamStats[team].passingYards, 6);
      mockTeamStats[team].rushingYards = randomStatChange(mockTeamStats[team].rushingYards, 4);
    }
  }, 15000);
}

export function stopStatUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

export function getTeamStats() {
  return mockTeamStats;
}

export function getPlayerGameStats() {
  return mockPlayerStats;
}

export function resetStats() {
  mockTeamStats = {
    home: {
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      firstDowns: 0,
      thirdDownPct: '0/0 (0%)',
      turnovers: 0,
      timeOfPossession: '00:00',
      sacks: 0,
      penalties: '0-0'
    },
    away: {
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      firstDowns: 0,
      thirdDownPct: '0/0 (0%)',
      turnovers: 0,
      timeOfPossession: '00:00',
      sacks: 0,
      penalties: '0-0'
    }
  };

  mockPlayerStats = {
    passing: [],
    rushing: [],
    receiving: []
  };
}
