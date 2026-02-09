import { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

function SellSquareModal({ squareIndex, sellerPlayer, players, gridLocked, onCreateOffer, onUnclaim, onClose }) {
  const [stage, setStage] = useState('choose'); // 'choose' | 'sell' | 'confirm'
  const [recipientId, setRecipientId] = useState('');
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const otherPlayers = players.filter(p => p.id !== sellerPlayer.id);
  const recipient = otherPlayers.find(p => p.id === recipientId);

  const handleUnclaim = async () => {
    if (!confirm(`Unclaim square ${squareIndex + 1}? This will remove your claim.`)) return;
    setSubmitting(true);
    setError('');
    try {
      await onUnclaim();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleCreateOffer = async () => {
    if (stage === 'sell') {
      if (!recipientId) {
        setError('Select a player');
        return;
      }
      setError('');
      setStage('confirm');
      return;
    }

    // Confirm stage
    setSubmitting(true);
    setError('');
    try {
      await onCreateOffer(recipientId, price);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      setStage('sell');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <h2 className="text-sm font-bold tracking-wider uppercase mb-4" style={{ color: 'var(--nbc-gold)' }}>
          {stage === 'choose' && `Square #${squareIndex + 1}`}
          {stage === 'sell' && 'Sell Square'}
          {stage === 'confirm' && 'Confirm Offer'}
        </h2>

        {/* Square Info */}
        <div className="rounded p-3 mb-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Square #{squareIndex + 1}</div>
              <div className="text-xs text-gray-400">Owned by {sellerPlayer.firstName} {sellerPlayer.lastName} ({sellerPlayer.initials})</div>
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-green-700">
              {sellerPlayer.initials}
            </div>
          </div>
        </div>

        {/* Stage: Choose */}
        {stage === 'choose' && (
          <div className="space-y-2">
            <button
              onClick={() => setStage('sell')}
              disabled={otherPlayers.length === 0}
              className="w-full py-3 rounded font-bold text-sm transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg, var(--nbc-blue-accent) 0%, #152a45 100%)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              Sell to Another Player
            </button>
            {otherPlayers.length === 0 && (
              <div className="text-[10px] text-gray-500 text-center">No other players to sell to</div>
            )}
            {!gridLocked && (
              <button
                onClick={handleUnclaim}
                disabled={submitting}
                className="w-full py-2.5 rounded font-bold text-sm bg-red-600/50 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Removing...' : 'Unclaim Square'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-2 rounded text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Stage: Sell Form */}
        {stage === 'sell' && (
          <div>
            {/* Recipient Picker */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Sell to</label>
              <select
                value={recipientId}
                onChange={(e) => { setRecipientId(e.target.value); setError(''); }}
                className="w-full rounded px-3 py-2 text-white text-sm focus:outline-none"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <option value="">Select a player...</option>
                {otherPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.initials})
                  </option>
                ))}
              </select>
            </div>

            {/* Price Input */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Sale Price</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="flex-1 rounded px-3 py-2 text-white text-lg font-bold focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2, 5].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setPrice(amt)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${
                      price === amt ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {amt === 0 ? 'Free' : formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => { setStage('choose'); setError(''); }}
                className="flex-1 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateOffer}
                disabled={!recipientId}
                className="flex-1 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg, #1a6b35 0%, #0f4422 100%)', border: '1px solid rgba(74,222,128,0.3)' }}
              >
                Create Offer
              </button>
            </div>
          </div>
        )}

        {/* Stage: Confirm */}
        {stage === 'confirm' && recipient && (
          <div>
            <div className="rounded p-3 mb-4 space-y-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Selling to</span>
                <span className="text-white font-semibold">{recipient.firstName} {recipient.lastName} ({recipient.initials})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price</span>
                <span className="font-bold" style={{ color: price > 0 ? '#4ade80' : 'var(--nbc-gold)' }}>
                  {price > 0 ? formatCurrency(price) : 'Free'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 mb-4 text-center">
              {recipient.firstName} will need to accept this offer before the transfer completes.
            </div>

            {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => { setStage('sell'); setError(''); }}
                disabled={submitting}
                className="flex-1 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateOffer}
                disabled={submitting}
                className="flex-1 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg, #1a6b35 0%, #0f4422 100%)', border: '1px solid rgba(74,222,128,0.3)' }}
              >
                {submitting ? 'Sending...' : 'Confirm Offer'}
              </button>
            </div>
          </div>
        )}

        {/* Close for sell/confirm stages */}
        {stage !== 'choose' ? null : null}
      </div>
    </div>
  );
}

export default SellSquareModal;
