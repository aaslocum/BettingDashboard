import { useState } from 'react';
import { useGameContext } from '../context/GameContext';
import { formatCurrency } from '../utils/helpers';

function CreateGameModal({ onClose }) {
  const { createGame, switchGame } = useGameContext();
  const [name, setName] = useState('');
  const [betAmount, setBetAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common bet amount presets
  const presets = [
    { label: '$1', value: 1 },
    { label: '$2', value: 2 },
    { label: '$5', value: 5 },
    { label: '$10', value: 10 },
    { label: '$20', value: 20 },
    { label: '$50', value: 50 },
  ];

  const totalPool = betAmount * 100;
  const prizes = {
    q1: Math.round(totalPool * 0.15),
    q2: Math.round(totalPool * 0.30),
    q3: Math.round(totalPool * 0.15),
    q4: Math.round(totalPool * 0.40)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a party name');
      return;
    }

    if (betAmount <= 0) {
      setError('Bet amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const game = await createGame(name.trim(), betAmount);
      switchGame(game.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">Create New Party</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Party Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Party Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith Family Super Bowl"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              autoFocus
            />
          </div>

          {/* Bet Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cost Per Square
            </label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {presets.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBetAmount(preset.value)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    betAmount === preset.value
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0.01, parseFloat(e.target.value) || 0))}
                min="0.01"
                step="0.01"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
              <span className="text-gray-400">per square</span>
            </div>
          </div>

          {/* Prize Pool Preview */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Prize Pool Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Q1:</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Halftime:</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Q3:</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Final:</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q4)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600 flex justify-between">
              <span className="font-semibold text-white">Total Pool:</span>
              <span className="font-bold text-xl text-yellow-400">{formatCurrency(totalPool)}</span>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGameModal;
