import { Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider, useGameContext } from './context/GameContext';
import { useGameData } from './hooks/useGameData';
import PlayerSelector from './components/PlayerSelector';
import Scoreboard from './components/Scoreboard';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';

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
          <Route path="/admin" element={<AdminPage />} />
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
