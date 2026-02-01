import { useState, useEffect, useCallback } from 'react';

export function useGameData(refreshInterval = 5000) {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/game');
      if (!response.ok) throw new Error('Failed to fetch game data');
      const data = await response.json();
      setGameData(data);
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

  const claimSquare = async (squareIndex, playerName) => {
    const response = await fetch('/api/game/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squareIndex, playerName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setGameData(data);
    return data;
  };

  return { gameData, loading, error, refetch: fetchData, claimSquare };
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
