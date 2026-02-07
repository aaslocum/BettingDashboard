import { useState, useEffect, useCallback } from 'react';

export function useGameData(refreshInterval = 5000, gameId = null) {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const url = gameId ? `/api/game?gameId=${gameId}` : '/api/game';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch game data');
      const data = await response.json();
      setGameData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const claimSquare = async (squareIndex, playerName) => {
    const response = await fetch('/api/game/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squareIndex, playerName, gameId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setGameData(data);
    return data;
  };

  const addPlayer = async (firstName, lastName) => {
    const response = await fetch('/api/game/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, gameId })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    const data = await response.json();
    // Refresh game data to get updated players list
    await fetchData();
    return data.player;
  };

  const removePlayer = async (playerId) => {
    const url = gameId
      ? `/api/game/players/${playerId}?gameId=${gameId}`
      : `/api/game/players/${playerId}`;
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    const data = await response.json();
    await fetchData();
    return data.removed;
  };

  const placeBet = async (playerId, betData) => {
    const response = await fetch('/api/game/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...betData, playerId, gameId })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error);
    }

    return (await response.json()).bet;
  };

  return { gameData, loading, error, refetch: fetchData, claimSquare, addPlayer, removePlayer, placeBet };
}

export function useOddsData(refreshInterval = 30000) {
  const [oddsData, setOddsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/odds');
      if (!response.ok) throw new Error('Failed to fetch odds');
      const data = await response.json();
      setOddsData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { oddsData, loading, error, refetch: fetchData };
}

export function usePlayerProps(refreshInterval = 60000) {
  const [propsData, setPropsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/odds/props');
      if (!response.ok) throw new Error('Failed to fetch player props');
      const data = await response.json();
      setPropsData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { propsData, loading, error, refetch: fetchData };
}

export function useTeamStats(refreshInterval = 15000) {
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/odds/team-stats');
      if (!response.ok) throw new Error('Failed to fetch team stats');
      const data = await response.json();
      setTeamStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { teamStats, loading, error, refetch: fetchData };
}

export function usePlayerGameStats(refreshInterval = 15000) {
  const [playerGameStats, setPlayerGameStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/odds/player-stats');
      if (!response.ok) throw new Error('Failed to fetch player stats');
      const data = await response.json();
      setPlayerGameStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { playerGameStats, loading, error, refetch: fetchData };
}

export function useBets(refreshInterval = 10000, gameId = null, playerId = null) {
  const [bets, setBets] = useState([]);
  const [betStats, setBetStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (gameId) params.append('gameId', gameId);
      if (playerId) params.append('playerId', playerId);
      const response = await fetch(`/api/game/bets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBets(data.bets || []);
      }
    } catch (err) { /* silent */ }
    finally { setLoading(false); }
  }, [gameId, playerId]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (gameId) params.append('gameId', gameId);
      const response = await fetch(`/api/game/bets/stats?${params}`);
      if (response.ok) {
        setBetStats(await response.json());
      }
    } catch (err) { /* silent */ }
  }, [gameId]);

  useEffect(() => {
    fetchBets();
    fetchStats();
    const interval = setInterval(() => {
      fetchBets();
      fetchStats();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchBets, fetchStats, refreshInterval]);

  return { bets, betStats, loading, refetchBets: fetchBets, refetchStats: fetchStats };
}
