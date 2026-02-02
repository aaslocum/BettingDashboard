import { useState } from 'react';
import { useGameContext } from '../context/GameContext';
import CreateGameModal from './CreateGameModal';
import { formatCurrency } from '../utils/helpers';

function GameSelector({ showCreateButton = true, compact = false }) {
  const { games, currentGameId, currentGame, switchGame, loading } = useGameContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading games...</div>;
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <span className="text-yellow-400 font-semibold truncate max-w-[150px]">
            {currentGame?.name || 'Select Game'}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-1 right-0 w-64 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-20 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {games.map(game => (
                  <button
                    key={game.id}
                    onClick={() => {
                      switchGame(game.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                      game.id === currentGameId ? 'bg-gray-700 border-l-2 border-yellow-400' : ''
                    }`}
                  >
                    <div className="font-semibold text-white truncate">{game.name}</div>
                    <div className="text-sm text-gray-400">
                      {formatCurrency(game.betAmount)}/square · {formatCurrency(game.totalPool)} pool
                    </div>
                  </button>
                ))}
              </div>
              {showCreateButton && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full px-4 py-3 text-left text-green-400 hover:bg-gray-700 border-t border-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Party
                </button>
              )}
            </div>
          </>
        )}

        {showCreateModal && (
          <CreateGameModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    );
  }

  // Full display mode
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-yellow-400">Super Bowl Parties</h2>
        {showCreateButton && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-success text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Party
          </button>
        )}
      </div>

      <div className="space-y-2">
        {games.map(game => (
          <button
            key={game.id}
            onClick={() => switchGame(game.id)}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              game.id === currentGameId
                ? 'bg-yellow-500/20 border-2 border-yellow-500'
                : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg text-white">{game.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatCurrency(game.betAmount)}/square · {formatCurrency(game.totalPool)} total pool
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm px-2 py-1 rounded ${
                  game.gameStatus === 'completed' ? 'bg-green-600' :
                  game.gameStatus === 'active' ? 'bg-blue-600' :
                  'bg-gray-600'
                }`}>
                  {game.gameStatus === 'completed' ? 'Completed' :
                   game.gameStatus === 'active' ? 'In Progress' :
                   'Setup'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {game.squaresClaimed}/100 squares
                </div>
              </div>
            </div>
            {game.id === currentGameId && (
              <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Currently viewing
              </div>
            )}
          </button>
        ))}
      </div>

      {games.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="mb-4">No parties created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Your First Party
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateGameModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

export default GameSelector;
