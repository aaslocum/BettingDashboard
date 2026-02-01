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
