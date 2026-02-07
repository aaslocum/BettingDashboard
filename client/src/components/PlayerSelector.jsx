import { useState } from 'react';

function PlayerSelector({ players = [], selectedPlayerId, onSelect, onAddPlayer, betAmount = 1 }) {
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
