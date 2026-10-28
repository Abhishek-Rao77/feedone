import { useState } from 'react';
import { createListing } from '../api.js';

const EMPTY = {
  title: '',
  description: '',
  food_type: 'veg',
  servings: '',
  weight_kg: '',
  area: '',
  address: '',
  latitude: '',
  longitude: '',
  expires_at: '',
  photo_url: '',
};

export default function ListingForm({ organization, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await createListing({
        organization_id: organization.id,
        title: form.title,
        description: form.description,
        food_type: form.food_type,
        servings: Number(form.servings),
        weight_kg: Number(form.weight_kg),
        area: form.area,
        address: form.address,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        expires_at: form.expires_at,
        photo_url: form.photo_url || null,
      });
      setForm(EMPTY);
      setMessage('Listing added.');
      onCreated();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Add a surplus-food listing</h2>
      <p className="muted">Posting as {organization.name} ({organization.area}).</p>

      <label>
        Food title
        <input value={form.title} onChange={(e) => update('title', e.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows="3" />
      </label>
      <label>
        Food type
        <select value={form.food_type} onChange={(e) => update('food_type', e.target.value)}>
          <option value="veg">Veg</option>
          <option value="non-veg">Non-veg</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>
      <label>
        Servings
        <input type="number" min="1" value={form.servings} onChange={(e) => update('servings', e.target.value)} required />
      </label>
      <label>
        Weight (kg)
        <input type="number" min="0" step="0.1" value={form.weight_kg} onChange={(e) => update('weight_kg', e.target.value)} required />
      </label>
      <label>
        Area
        <input value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="Dundigal" required />
      </label>
      <label>
        Pickup address
        <input value={form.address} onChange={(e) => update('address', e.target.value)} />
      </label>
      <label>
        Latitude (optional, for the map)
        <input type="number" step="any" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} />
      </label>
      <label>
        Longitude (optional, for the map)
        <input type="number" step="any" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} />
      </label>
      <label>
        Expires at
        <input type="datetime-local" value={form.expires_at} onChange={(e) => update('expires_at', e.target.value)} required />
      </label>
      <label>
        Photo URL (optional)
        <input value={form.photo_url} onChange={(e) => update('photo_url', e.target.value)} placeholder="https://…" />
      </label>

      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add listing'}
      </button>
      {message && <p className="muted">{message}</p>}
    </form>
  );
}
