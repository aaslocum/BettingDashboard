import { useState, useMemo } from 'react';

function BulkAssignModal({ remainingSquares, onAssign, onClose }) {
  const [initialsInput, setInitialsInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Parse initials from input
  const parsedInitials = useMemo(() => {
    if (!initialsInput.trim()) return [];

    // Split by comma, space, or newline and clean each entry
    const entries = initialsInput
      .toUpperCase()
      .split(/[\s,\n]+/)
      .map(s => s.replace(/[^A-Z]/g, '').trim())
      .filter(s => s.length >= 2 && s.length <= 4);

    return entries;
  }, [initialsInput]);

  // Calculate distribution
  const distribution = useMemo(() => {
    if (parsedInitials.length === 0) return null;

    const count = parsedInitials.length;
    const baseSquares = Math.floor(remainingSquares / count);
    const extraSquares = remainingSquares % count;

    // Distribute squares evenly, with some getting +1 for remainder
    return parsedInitials.map((initials, idx) => ({
      initials,
      count: baseSquares + (idx < extraSquares ? 1 : 0)
    }));
  }, [parsedInitials, remainingSquares]);

  const handleInputChange = (e) => {
    setInitialsInput(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parsedInitials.length === 0) {
      setError('Please enter at least one set of valid initials (2-4 letters each)');
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
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">
          Bulk Assign {remainingSquares} Remaining Squares
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Enter initials (2-4 letters each), separated by commas or spaces:
            </label>
            <textarea
              value={initialsInput}
              onChange={handleInputChange}
              className="input-field w-full h-24 font-mono uppercase"
              placeholder="JD, ABC, MIKE, BOB"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Squares will be randomly distributed evenly among these participants.
            </p>
          </div>

          {/* Preview Distribution */}
          {distribution && distribution.length > 0 && (
            <div className="mb-4 p-4 bg-gray-700 rounded">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                Distribution Preview:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {distribution.map(({ initials, count }) => (
                  <div key={initials} className="flex justify-between">
                    <span className="text-yellow-400 font-mono">{initials}</span>
                    <span className="text-gray-300">{count} squares (${count})</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Total participants:</span>
                  <span>{distribution.length}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Squares to assign:</span>
                  <span>{remainingSquares}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invalid entries warning */}
          {initialsInput.trim() && parsedInitials.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-900/30 rounded text-yellow-300 text-sm">
              No valid initials found. Each entry must be 2-4 letters only.
            </div>
          )}

          {error && (
            <div className="mb-4 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
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
