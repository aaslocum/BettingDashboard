import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider, useGameContext } from './context/GameContext';
import { useGameData } from './hooks/useGameData';
import PlayerSelector from './components/PlayerSelector';
import Scoreboard from './components/Scoreboard';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';

function AdminPinGate({ children }) {
  const { currentGameId } = useGameContext();
  const [pinRequired, setPinRequired] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  const checkPinStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (currentGameId) params.append('gameId', currentGameId);
      const response = await fetch(`/api/admin/pin/status?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPinRequired(data.hasPin);
        if (!data.hasPin) setPinVerified(true);
      }
    } catch (err) { /* silent */ }
    finally { setChecking(false); }
  }, [currentGameId]);

  useEffect(() => { checkPinStatus(); }, [checkPinStatus]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/admin/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, pin }),
      });
      if (response.ok) {
        setPinVerified(true);
      } else {
        setError('Invalid PIN');
        setPin('');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  if (checking) return null;

  if (pinRequired && !pinVerified) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="card w-full max-w-xs text-center">
          <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
            Admin Access
          </h2>
          <p className="text-xs text-gray-400 mb-4">Enter the admin PIN to continue</p>
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field w-full text-center text-lg tracking-widest"
              autoFocus
            />
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button type="submit" className="btn-primary w-full" disabled={!pin}>
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const isDisplayMode = location.pathname === '/display';
  const { currentGameId, selectedPlayerId, selectPlayer } = useGameContext();
  const { gameData, addPlayer } = useGameData(3000, currentGameId);

  // Hide header in display mode for cleaner TV view
  if (isDisplayMode) {
    return <DisplayPage />;
  }

  const players = gameData?.players || [];

  return (
    <div className="min-h-screen nbc-app-bg">
      {/* Header Scoreboard */}
      {gameData && (
        <header className="sticky top-0 z-30">
          <Scoreboard gameData={gameData} header>
            <PlayerSelector
              compact
              players={players}
              selectedPlayerId={selectedPlayerId}
              onSelect={selectPlayer}
              onAddPlayer={addPlayer}
              betAmount={gameData?.betAmount}
            />
          </Scoreboard>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Routes>
          <Route path="/" element={<PlayerPage />} />
          <Route path="/admin" element={<AdminPinGate><AdminPage /></AdminPinGate>} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
