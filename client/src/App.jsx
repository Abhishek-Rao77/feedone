import { useCallback, useEffect, useState } from 'react';
import { createOrganization, getListings, getOrganizations } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import ListingCard from './components/ListingCard.jsx';
import ListingForm from './components/ListingForm.jsx';
import MapView from './components/MapView.jsx';

export default function App() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [view, setView] = useState('browse');
  const [listings, setListings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [peopleServed, setPeopleServed] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // New-organisation form (simple profile selection, no login yet).
  const [newOrg, setNewOrg] = useState({ name: '', type: 'donor', area: '', address: '', phone: '' });

  const loadOrganizations = useCallback(async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const loadListings = useCallback(async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (areaFilter) params.area = areaFilter;
    // NGO matching: send the selected NGO's area so the server can
    // score and explain each listing for that NGO.
    if (selectedOrg && selectedOrg.type === 'ngo') {
      params.ngo_area = selectedOrg.area;
      if (peopleServed) params.ngo_people_served = peopleServed;
    }
    try {
      const data = await getListings(params);
      setListings(data);
    } catch (err) {
      setError(err.message);
    }
  }, [statusFilter, areaFilter, selectedOrg, peopleServed]);

  useEffect(() => {
    loadOrganizations().then(() => setLoading(false));
  }, [loadOrganizations]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  async function createOrg(event) {
    event.preventDefault();
    setError('');
    try {
      const created = await createOrganization(newOrg);
      const data = await loadOrganizations();
      setSelectedOrg(created);
      setNewOrg({ name: '', type: 'donor', area: '', address: '', phone: '' });
      if (data.length === 0) setOrganizations([created]);
    } catch (err) {
      setError(err.message);
    }
  }

  function pickOrg(id) {
    const org = organizations.find((item) => String(item.id) === String(id));
    setSelectedOrg(org || null);
  }

  const isNgo = selectedOrg && selectedOrg.type === 'ngo';
  const isDonor = selectedOrg && selectedOrg.type === 'donor';

  return (
    <main className="page">
      <header className="header">
        <h1>FeedOne</h1>
        <p>Surplus food, claimed nearby before it is wasted.</p>
      </header>

      <section className="card profile">
        <h2>Your profile</h2>
        <p className="muted">
          Pick or create an organisation. Donors add listings; NGOs see a match
          score for each listing. This is simple profile selection for the MVP —
          there is no login yet.
        </p>
        <label>
          Organisation
          <select value={selectedOrg ? selectedOrg.id : ''} onChange={(e) => pickOrg(e.target.value)}>
            <option value="">Choose an organisation…</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.type}, {org.area})
              </option>
            ))}
          </select>
        </label>
        {isNgo && (
          <label>
            People you serve each day (optional, used for matching)
            <input
              type="number"
              min="1"
              value={peopleServed}
              onChange={(e) => setPeopleServed(e.target.value)}
              placeholder="40"
            />
          </label>
        )}

        <form className="inline-form" onSubmit={createOrg}>
          <input
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
            placeholder="Organisation name"
            required
          />
          <select value={newOrg.type} onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}>
            <option value="donor">Donor (restaurant / hostel / event)</option>
            <option value="ngo">NGO / volunteer</option>
          </select>
          <input
            value={newOrg.area}
            onChange={(e) => setNewOrg({ ...newOrg, area: e.target.value })}
            placeholder="Area, e.g. Dundigal"
            required
          />
          <input
            value={newOrg.address}
            onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })}
            placeholder="Address (optional)"
          />
          <input
            value={newOrg.phone}
            onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
            placeholder="Phone (optional)"
          />
          <button type="submit">Create organisation</button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <nav className="tabs">
        <button type="button" className={view === 'browse' ? 'active' : ''} onClick={() => setView('browse')}>
          Browse listings
        </button>
        <button type="button" className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}>
          Add listing
        </button>
        <button type="button" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          Dashboard
        </button>
      </nav>

      {view === 'browse' && (
        <section>
          <div className="filters">
            <label>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Available">Available</option>
                <option value="Claimed">Claimed</option>
                <option value="Picked Up">Picked Up</option>
                <option value="Completed">Completed</option>
                <option value="Expired">Expired</option>
              </select>
            </label>
            <label>
              Area
              <input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="e.g. Dundigal" />
            </label>
          </div>

          <MapView listings={listings} />

          {listings.length === 0 ? (
            <p className="muted">No listings yet. Add one from the Add listing tab.</p>
          ) : (
            <div className="grid">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showMatch={Boolean(isNgo)}
                  actorName={selectedOrg ? selectedOrg.name : null}
                  onChanged={loadListings}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'add' && (
        <section>
          {isDonor ? (
            <ListingForm organization={selectedOrg} onCreated={() => { loadListings(); setView('browse'); }} />
          ) : (
            <p className="muted">
              Choose or create a donor organisation first, then you can add a listing.
              {selectedOrg ? ` You are currently viewing as ${selectedOrg.name} (${selectedOrg.type}).` : ''}
            </p>
          )}
        </section>
      )}

      {view === 'dashboard' && <Dashboard />}
    </main>
  );
}
