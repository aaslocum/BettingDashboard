import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';

function App() {
  const location = useLocation();
  const isDisplayMode = location.pathname === '/display';

  // Hide navigation in display mode for cleaner TV view
  if (isDisplayMode) {
    return <DisplayPage />;
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <span className="text-xl font-bold text-yellow-400">Super Bowl Party</span>
              <div className="flex space-x-2">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Play
                </Link>
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/admin'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
                <Link
                  to="/display"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/display'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  TV Display
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<PlayerPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
