import { useState } from 'react';

function ClaimModal({ squareIndex, onClaim, onClose }) {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setLoading(true);
    try {
      await onClaim(squareIndex, playerName.trim());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">
          Claim Square #{squareIndex + 1}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Enter Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field w-full"
              placeholder="Your name"
              maxLength={20}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-success flex-1"
              disabled={loading}
            >
              {loading ? 'Claiming...' : 'Claim for $1'}
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

export default ClaimModal;
