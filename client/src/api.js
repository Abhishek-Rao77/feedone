// Fetch helpers for the FeedOne API.
// The API runs at http://localhost:5000 (see server/index.js).
const API_BASE = 'http://localhost:5000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

export function getHealth() {
  return request('/api/health');
}

export function getOrganizations() {
  return request('/api/organizations');
}

export function createOrganization(payload) {
  return request('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getListings(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/listings${query ? `?${query}` : ''}`);
}

export function createListing(payload) {
  return request('/api/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getListing(id) {
  return request(`/api/listings/${id}`);
}

export function claimListing(id, payload = {}) {
  return request(`/api/listings/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function pickupListing(id, payload = {}) {
  return request(`/api/listings/${id}/pickup`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function completeListing(id, payload = {}) {
  return request(`/api/listings/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function expireListing(id, payload = {}) {
  return request(`/api/listings/${id}/expire`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDashboard() {
  return request('/api/dashboard');
}
