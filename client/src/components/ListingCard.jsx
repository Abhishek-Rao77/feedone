import { useEffect, useState } from 'react';
import { claimListing, completeListing, expireListing, pickupListing } from '../api.js';

// Time left until expiry, refreshed while the card is on screen.
function timeLeftText(expiresAt, now) {
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 1) return `${hours}h ${rest}m left`;
  return `${minutes}m left`;
}

export default function ListingCard({ listing, showMatch, onChanged, actorName }) {
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action(listing.id, { changed_by: actorName || null });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const directionsUrl = listing.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.address}, ${listing.area}`)}`
    : null;

  return (
    <article className="card listing-card">
      <div className="card-top">
        <h3>{listing.title}</h3>
        <span className={`badge status-${listing.status.replaceAll(' ', '-').toLowerCase()}`}>
          {listing.status}
        </span>
      </div>
      <p className="muted">
        {listing.organization_name || 'Donor'} · {listing.area}
      </p>
      {listing.description && <p>{listing.description}</p>}
      <p>
        <strong>{listing.servings} servings</strong> · {Number(listing.weight_kg)} kg ·{' '}
        {listing.food_type}
      </p>
      <p className="muted">
        {listing.address || listing.area} · {timeLeftText(listing.expires_at, now)}
      </p>
      {listing.photo_url && (
        <img className="listing-photo" src={listing.photo_url} alt={listing.title} />
      )}
      {showMatch && listing.match_score != null && (
        <p className="match">
          Match {listing.match_score}/100 — {listing.match_explanation}
        </p>
      )}
      <div className="actions">
        {listing.status === 'Available' && (
          <button type="button" disabled={busy} onClick={() => run(claimListing)}>
            Claim
          </button>
        )}
        {listing.status === 'Claimed' && (
          <button type="button" disabled={busy} onClick={() => run(pickupListing)}>
            Mark picked up
          </button>
        )}
        {listing.status === 'Picked Up' && (
          <button type="button" disabled={busy} onClick={() => run(completeListing)}>
            Mark completed
          </button>
        )}
        {(listing.status === 'Available' || listing.status === 'Claimed') && (
          <button type="button" className="secondary" disabled={busy} onClick={() => run(expireListing)}>
            Mark expired
          </button>
        )}
        {directionsUrl && (
          <a className="button-link" href={directionsUrl} target="_blank" rel="noreferrer">
            Directions
          </a>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </article>
  );
}
