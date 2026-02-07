import { useState } from 'react';

function PlayerSelector({ players = [], selectedPlayerId, onSelect, onAddPlayer, betAmount = 1, compact = false }) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Both names are required');
      return;
    }

    setLoading(true);
    try {
      const player = await onAddPlayer(firstName.trim(), lastName.trim());
      onSelect(player.id);
      setFirstName('');
      setLastName('');
      setShowJoinForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compact mode for navbar
  if (compact) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <select
            value={selectedPlayerId || ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg text-sm px-3 py-2 text-white transition-colors"
            style={{ appearance: 'auto', maxWidth: '160px' }}
          >
            <option value="">Select Player</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>

          {!showJoinForm && (
            <button
              onClick={() => setShowJoinForm(true)}
              className="btn-success text-xs whitespace-nowrap"
              style={{ padding: '6px 10px' }}
            >
              + Join
            </button>
          )}
        </div>

        {/* Join Modal */}
        {showJoinForm && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => { setShowJoinForm(false); setError(''); }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <form
                onSubmit={handleJoin}
                className="w-full max-w-sm bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--nbc-gold)' }}>
                  Join Game
                </h2>
                <p className="text-xs text-gray-500 mb-4">Enter your name to start playing</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field w-full"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-xs mt-3">{error}</div>
                )}
                <div className="flex gap-3 mt-5">
                  <button
                    type="submit"
                    className="btn-success flex-1 py-2.5 text-sm font-bold"
                    disabled={loading || !firstName.trim() || !lastName.trim()}
                  >
                    {loading ? 'Joining...' : 'Join Game'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJoinForm(false); setError(''); }}
                    className="btn-secondary px-5 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full mode (original)
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        {/* Player Dropdown */}
        <div className="flex-1">
          <select
            value={selectedPlayerId || ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="input-field w-full text-sm"
            style={{ appearance: 'auto' }}
          >
            <option value="">Select Your Player</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.initials})
              </option>
            ))}
          </select>
        </div>

        {/* Join Game Button */}
        {!showJoinForm && (
          <button
            onClick={() => setShowJoinForm(true)}
            className="btn-success text-xs whitespace-nowrap"
            style={{ padding: '8px 12px' }}
          >
            + Join
          </button>
        )}
      </div>

      {/* Selected Player Info */}
      {selectedPlayer && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Playing as <span className="font-bold text-white">{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
          <span className="ml-1" style={{ color: 'var(--nbc-gold)' }}>({selectedPlayer.initials})</span>
          {' · '}Tap empty squares to claim ({betAmount > 0 ? `$${betAmount}/sq` : 'free'})
        </div>
      )}

      {!selectedPlayer && !showJoinForm && players.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Select your name to start claiming squares
        </div>
      )}

      {!selectedPlayer && !showJoinForm && players.length === 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          No players yet — click "+ Join" to register
        </div>
      )}

      {/* Join Form */}
      {showJoinForm && (
        <form onSubmit={handleJoin} className="mt-3 rounded p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="text-[10px] text-gray-500 font-semibold tracking-wider mb-2">JOIN GAME</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field flex-1 text-sm"
              autoFocus
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field flex-1 text-sm"
            />
          </div>
          {error && (
            <div className="text-red-400 text-xs mt-2">{error}</div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="btn-success text-xs flex-1"
              disabled={loading || !firstName.trim() || !lastName.trim()}
              style={{ padding: '6px 10px' }}
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button
              type="button"
              onClick={() => { setShowJoinForm(false); setError(''); }}
              className="btn-secondary text-xs"
              style={{ padding: '6px 10px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default PlayerSelector;
