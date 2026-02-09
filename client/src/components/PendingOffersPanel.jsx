import { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

function PendingOffersPanel({ offers, players, currentPlayerId, onAccept, onDeny, onCancel, onOffersChanged }) {
  const [actionLoading, setActionLoading] = useState(null); // offerId being acted on
  const [error, setError] = useState('');

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const incoming = pendingOffers.filter(o => o.recipientPlayerId === currentPlayerId);
  const outgoing = pendingOffers.filter(o => o.sellerPlayerId === currentPlayerId);

  if (incoming.length === 0 && outgoing.length === 0) return null;

  const getPlayerName = (playerId) => {
    const p = players.find(pl => pl.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : '???';
  };

  const handleAction = async (action, offerId) => {
    setActionLoading(offerId);
    setError('');
    try {
      await action(offerId, currentPlayerId);
      if (onOffersChanged) onOffersChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="card-header-accent"></span>
        <h3 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--nbc-gold)' }}>
          Square Offers
        </h3>
        {incoming.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-600 text-black">
            {incoming.length}
          </span>
        )}
      </div>

      {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

      {/* Incoming Offers */}
      {incoming.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1.5">
            Incoming
          </div>
          <div className="space-y-1.5">
            {incoming.map(offer => (
              <div key={offer.id} className="rounded px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white font-medium">
                      <span style={{ color: 'var(--nbc-gold)' }}>{offer.sellerInitials}</span>
                      {' '}wants to sell you <span className="font-bold">Square #{offer.squareIndex + 1}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      From {getPlayerName(offer.sellerPlayerId)} for{' '}
                      <span className={offer.price > 0 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                        {offer.price > 0 ? formatCurrency(offer.price) : 'free'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleAction(onAccept, offer.id)}
                      disabled={actionLoading === offer.id}
                      className="px-2.5 py-1 rounded text-[10px] font-bold transition-colors disabled:opacity-50"
                      style={{ background: 'linear-gradient(180deg, #1a6b35 0%, #0f4422 100%)', border: '1px solid rgba(74,222,128,0.3)' }}
                    >
                      {actionLoading === offer.id ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleAction(onDeny, offer.id)}
                      disabled={actionLoading === offer.id}
                      className="px-2.5 py-1 rounded text-[10px] font-bold bg-red-600/50 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Offers */}
      {outgoing.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
            Outgoing
          </div>
          <div className="space-y-1.5">
            {outgoing.map(offer => (
              <div key={offer.id} className="rounded px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-300">
                      <span className="font-bold">Square #{offer.squareIndex + 1}</span>
                      {' '}offered to{' '}
                      <span style={{ color: 'var(--nbc-gold)' }}>{offer.recipientInitials}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      To {getPlayerName(offer.recipientPlayerId)} for{' '}
                      <span className={offer.price > 0 ? 'text-green-400' : 'text-gray-400'}>
                        {offer.price > 0 ? formatCurrency(offer.price) : 'free'}
                      </span>
                      {' · Waiting for response'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(onCancel, offer.id)}
                    disabled={actionLoading === offer.id}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-gray-600/50 hover:bg-gray-600 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {actionLoading === offer.id ? '...' : 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingOffersPanel;
