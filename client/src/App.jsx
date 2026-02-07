import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import GameSelector from './components/GameSelector';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';

function AppContent() {
  const location = useLocation();
  const isDisplayMode = location.pathname === '/display';

  // Hide navigation in display mode for cleaner TV view
  if (isDisplayMode) {
    return <DisplayPage />;
  }

  const navLinks = [
    { to: '/', label: 'Play' },
    { to: '/admin', label: 'Admin' },
    { to: '/display', label: 'TV' },
  ];

  return (
    <div className="min-h-screen nbc-app-bg">
      {/* Navigation */}
      <nav className="nbc-nav">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-sm sm:text-lg font-extrabold tracking-widest nbc-nav-title">
                <span className="hidden sm:inline">SUPER BOWL PARTY</span>
                <span className="sm:hidden">SB PARTY</span>
              </span>
              <div className="flex gap-0.5">
                {navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`nbc-nav-link ${location.pathname === to ? 'nbc-nav-link-active' : ''}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <GameSelector compact showCreateButton={location.pathname === '/admin'} />
          </div>
        </div>
      </nav>

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
