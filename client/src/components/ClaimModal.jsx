import { useState } from 'react';

function ClaimModal({ squareIndex, onClaim, onClose }) {
  const [initials, setInitials] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInitialsChange = (e) => {
    // Auto-uppercase and only allow letters
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    setInitials(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = initials.trim();

    if (!trimmed) {
      setError('Please enter your initials');
      return;
    }

    if (trimmed.length < 2) {
      setError('Enter at least 2 characters');
      return;
    }

    if (trimmed.length > 4) {
      setError('Maximum 4 characters');
      return;
    }

    setLoading(true);
    try {
      await onClaim(squareIndex, trimmed);
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
              Enter Your Initials (2-4 letters)
            </label>
            <input
              type="text"
              value={initials}
              onChange={handleInitialsChange}
              className="input-field w-full text-center text-2xl tracking-widest uppercase"
              placeholder="ABC"
              maxLength={4}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              e.g., JD, ABC, MIKE
            </p>
          </div>

          {error && (
            <div className="mb-4 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-success flex-1"
              disabled={loading || initials.length < 2}
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
