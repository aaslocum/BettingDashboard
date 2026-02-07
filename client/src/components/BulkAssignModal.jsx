import { useState, useMemo } from 'react';

function BulkAssignModal({ remainingSquares, players = [], onAssign, onClose }) {
  const [mode, setMode] = useState(players.length > 0 ? 'players' : 'manual');
  const [initialsInput, setInitialsInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Parse initials from manual input
  const parsedInitials = useMemo(() => {
    if (mode === 'players') {
      return players.map(p => p.initials);
    }

    if (!initialsInput.trim()) return [];

    const entries = initialsInput
      .toUpperCase()
      .split(/[\s,\n]+/)
      .map(s => s.replace(/[^A-Z0-9]/g, '').trim())
      .filter(s => s.length >= 2 && s.length <= 4);

    return entries;
  }, [mode, players, initialsInput]);

  // Calculate distribution
  const distribution = useMemo(() => {
    if (parsedInitials.length === 0) return null;

    const count = parsedInitials.length;
    const baseSquares = Math.floor(remainingSquares / count);
    const extraSquares = remainingSquares % count;

    return parsedInitials.map((initials, idx) => {
      const player = players.find(p => p.initials === initials);
      return {
        initials,
        name: player ? `${player.firstName} ${player.lastName}` : null,
        count: baseSquares + (idx < extraSquares ? 1 : 0)
      };
    });
  }, [parsedInitials, remainingSquares, players]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parsedInitials.length === 0) {
      setError(mode === 'players'
        ? 'No registered players found. Add players first or switch to manual mode.'
        : 'Please enter at least one set of valid initials (2-4 letters each)');
      return;
    }

    setLoading(true);
    try {
      await onAssign(parsedInitials);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card w-full max-w-lg mx-4">
        <h2 className="nbc-section-header mb-0 pb-0 border-0 text-base">
          <span className="card-header-accent"></span>
          BULK ASSIGN {remainingSquares} SQUARES
        </h2>

        {/* Mode Toggle */}
        {players.length > 0 && (
          <div className="flex gap-1 mt-3 mb-3">
            <button
              type="button"
              onClick={() => setMode('players')}
              className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                mode === 'players' ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={mode !== 'players' ? { background: 'rgba(0,0,0,0.25)' } : {}}
            >
              Registered Players ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                mode === 'manual' ? 'nbc-tab-active' : 'text-gray-500 hover:text-gray-300'
              }`}
              style={mode !== 'manual' ? { background: 'rgba(0,0,0,0.25)' } : {}}
            >
              Enter Manually
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'manual' && (
            <div className="mb-3 mt-3">
              <label className="block text-xs text-gray-400 mb-2">
                Enter initials (2-4 letters each), separated by commas or spaces:
              </label>
              <textarea
                value={initialsInput}
                onChange={(e) => { setInitialsInput(e.target.value); setError(''); }}
                className="input-field w-full h-20 font-mono uppercase text-sm"
                placeholder="JD, ABC, MIKE, BOB"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Squares will be randomly distributed evenly among these participants.
              </p>
            </div>
          )}

          {mode === 'players' && players.length === 0 && (
            <div className="my-3 p-3 rounded text-sm text-gray-400 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
              No registered players. Add players on the Admin page or switch to manual mode.
            </div>
          )}

          {/* Preview Distribution */}
          {distribution && distribution.length > 0 && (
            <div className="mb-3 mt-3 p-3 rounded" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="text-[10px] text-gray-500 font-semibold tracking-wider mb-2">
                DISTRIBUTION PREVIEW
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {distribution.map(({ initials, name, count }) => (
                  <div key={initials} className="flex justify-between">
                    <span className="font-mono font-bold" style={{ color: 'var(--nbc-gold)' }}>
                      {initials}
                      {name && <span className="font-sans font-normal text-gray-400 ml-1 text-xs">{name}</span>}
                    </span>
                    <span className="text-gray-300">{count} sq</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Participants: {distribution.length}</span>
                  <span>Squares: {remainingSquares}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invalid entries warning (manual mode) */}
          {mode === 'manual' && initialsInput.trim() && parsedInitials.length === 0 && (
            <div className="mb-3 p-3 bg-yellow-900/30 rounded text-yellow-300 text-sm">
              No valid initials found. Each entry must be 2-4 letters only.
            </div>
          )}

          {error && (
            <div className="mb-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              className="btn-success flex-1"
              disabled={loading || parsedInitials.length === 0}
            >
              {loading ? 'Assigning...' : `Assign ${remainingSquares} Squares`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkAssignModal;
