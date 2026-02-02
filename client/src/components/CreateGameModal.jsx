import { useState } from 'react';
import { useGameContext } from '../context/GameContext';
import { formatCurrency } from '../utils/helpers';

const DEFAULT_DISTRIBUTION = { q1: 15, q2: 30, q3: 15, q4: 40 };

// Common payout presets
const PAYOUT_PRESETS = [
  { label: 'Standard', value: { q1: 15, q2: 30, q3: 15, q4: 40 }, description: '15/30/15/40' },
  { label: 'Even Split', value: { q1: 25, q2: 25, q3: 25, q4: 25 }, description: '25/25/25/25' },
  { label: 'Final Heavy', value: { q1: 10, q2: 20, q3: 10, q4: 60 }, description: '10/20/10/60' },
  { label: 'Halftime Heavy', value: { q1: 15, q2: 40, q3: 15, q4: 30 }, description: '15/40/15/30' },
];

function CreateGameModal({ onClose }) {
  const { createGame, switchGame } = useGameContext();
  const [name, setName] = useState('');
  const [betAmount, setBetAmount] = useState(1);
  const [distribution, setDistribution] = useState(DEFAULT_DISTRIBUTION);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common bet amount presets
  const betPresets = [
    { label: '$1', value: 1 },
    { label: '$2', value: 2 },
    { label: '$5', value: 5 },
    { label: '$10', value: 10 },
    { label: '$20', value: 20 },
    { label: '$50', value: 50 },
  ];

  const totalPool = betAmount * 100;
  const distributionTotal = distribution.q1 + distribution.q2 + distribution.q3 + distribution.q4;
  const isValidDistribution = Math.abs(distributionTotal - 100) < 0.01;

  const prizes = {
    q1: Math.round(totalPool * (distribution.q1 / 100)),
    q2: Math.round(totalPool * (distribution.q2 / 100)),
    q3: Math.round(totalPool * (distribution.q3 / 100)),
    q4: Math.round(totalPool * (distribution.q4 / 100))
  };

  const handleDistributionChange = (quarter, value) => {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setDistribution(prev => ({ ...prev, [quarter]: numValue }));
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

    if (!isValidDistribution) {
      setError(`Prize percentages must sum to 100% (currently ${distributionTotal}%)`);
      return;
    }

    setLoading(true);
    try {
      const prizeDistribution = {
        q1: distribution.q1 / 100,
        q2: distribution.q2 / 100,
        q3: distribution.q3 / 100,
        q4: distribution.q4 / 100
      };
      const game = await createGame(name.trim(), betAmount, prizeDistribution);
      switchGame(game.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl my-4">
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
              {betPresets.map(preset => (
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

          {/* Prize Distribution */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-2"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Customize Prize Distribution
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
                {/* Payout Presets */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PAYOUT_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDistribution(preset.value)}
                        className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                          JSON.stringify(distribution) === JSON.stringify(preset.value)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Percentages */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'q1', label: 'Q1' },
                    { key: 'q2', label: 'Halftime' },
                    { key: 'q3', label: 'Q3' },
                    { key: 'q4', label: 'Final' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={distribution[key]}
                          onChange={(e) => handleDistributionChange(key, e.target.value)}
                          min="0"
                          max="100"
                          step="1"
                          className="w-full px-2 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-yellow-500"
                        />
                        <span className="text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution Total */}
                <div className={`text-sm text-center py-2 rounded ${
                  isValidDistribution ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  Total: {distributionTotal}% {isValidDistribution ? '✓' : '(must equal 100%)'}
                </div>
              </div>
            )}
          </div>

          {/* Prize Pool Preview */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Prize Pool Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Q1 ({distribution.q1}%):</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Half ({distribution.q2}%):</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Q3 ({distribution.q3}%):</span>
                <span className="text-green-400 font-semibold">{formatCurrency(prizes.q3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Final ({distribution.q4}%):</span>
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
              disabled={loading || !isValidDistribution}
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
