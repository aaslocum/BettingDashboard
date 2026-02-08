import { useState, useCallback } from 'react';

export function useOddsHistory() {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (eventId, oddsKey) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ eventId, key: oddsKey });
      const response = await fetch(`/api/odds/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch odds history');
      const data = await response.json();
      setHistoryData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryData(null);
    setError(null);
  }, []);

  return { historyData, loading, error, fetchHistory, clearHistory };
}
