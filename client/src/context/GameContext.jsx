import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [games, setGames] = useState([]);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerIdRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all games
  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games');
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data.games || []);

      // Set current game to default or first game
      if (!currentGameId && data.defaultGameId) {
        setCurrentGameId(data.defaultGameId);
      } else if (!currentGameId && data.games?.length > 0) {
        setCurrentGameId(data.games[0].id);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentGameId]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Create a new game
  const createGame = async (name, betAmount, prizeDistribution = null) => {
    try {
      const body = { name, betAmount };
      if (prizeDistribution) {
        body.prizeDistribution = prizeDistribution;
      }

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const data = await response.json();
      await fetchGames();
      return data.game;
    } catch (err) {
      console.error('Error creating game:', err);
      throw err;
    }
  };

  // Delete a game
  const deleteGame = async (gameId) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete game');
      }

      const data = await response.json();

      // If we deleted the current game, switch to the new default
      if (gameId === currentGameId) {
        setCurrentGameId(data.newDefault);
      }

      await fetchGames();
      return data;
    } catch (err) {
      console.error('Error deleting game:', err);
      throw err;
    }
  };

  // Update game settings
  const updateGame = async (gameId, settings) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update game');
      }

      await fetchGames();
      return await response.json();
    } catch (err) {
      console.error('Error updating game:', err);
      throw err;
    }
  };

  // Player selection - persisted per game in localStorage
  const selectPlayer = useCallback((playerId) => {
    setSelectedPlayerIdRaw(playerId);
    if (currentGameId) {
      if (playerId) {
        localStorage.setItem(`selectedPlayer_${currentGameId}`, playerId);
      } else {
        localStorage.removeItem(`selectedPlayer_${currentGameId}`);
      }
    }
  }, [currentGameId]);

  // Restore selected player when game changes
  useEffect(() => {
    if (currentGameId) {
      const stored = localStorage.getItem(`selectedPlayer_${currentGameId}`);
      setSelectedPlayerIdRaw(stored || null);
    }
  }, [currentGameId]);

  // Switch to a different game
  const switchGame = (gameId) => {
    setCurrentGameId(gameId);
  };

  // Get current game info from the list
  const currentGame = games.find(g => g.id === currentGameId) || null;

  const value = {
    games,
    currentGameId,
    currentGame,
    selectedPlayerId,
    selectPlayer,
    loading,
    error,
    createGame,
    deleteGame,
    updateGame,
    switchGame,
    refreshGames: fetchGames
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
