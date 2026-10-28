// FeedOne API server: Express + PostgreSQL.
// Run from the server folder:  npm run dev   (or: npm start)
// The server starts even when DATABASE_URL is missing. In that case
// /api/health still answers, and every other endpoint returns a clear
// JSON error instead of crashing.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { scoreMatch } = require('./matching');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Only create a database pool when a connection string is set.
// Without one, the API stays up and explains what is missing.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

function requireDb(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: 'Database is not configured. Set DATABASE_URL in server/.env and restart the server.',
    });
  }
  return next();
}

// A listing left Available past its expiry time is Expired when read.
// No cron job is needed for this; the check happens on every read.
function effectiveStatus(listing) {
  if (
    listing.status === 'Available' &&
    listing.expires_at &&
    new Date(listing.expires_at).getTime() < Date.now()
  ) {
    return 'Expired';
  }
  return listing.status;
}

function withEffectiveStatus(listing) {
  return { ...listing, status: effectiveStatus(listing) };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: pool ? 'configured' : 'not configured',
    time: new Date().toISOString(),
  });
});

// Organisations: donors and NGOs/volunteers.
app.get('/api/organizations', requireDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not list organisations.', detail: err.message });
  }
});

app.post('/api/organizations', requireDb, async (req, res) => {
  const { name, type, area, address, phone } = req.body || {};
  if (!name || !type || !area) {
    return res.status(400).json({ error: 'name, type and area are required.' });
  }
  if (type !== 'donor' && type !== 'ngo') {
    return res.status(400).json({ error: "type must be 'donor' or 'ngo'." });
  }
  try {
    const result = await pool.query(
      'INSERT INTO organizations (name, type, area, address, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, area, address || null, phone || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not create organisation.', detail: err.message });
  }
});

// Listings. Filters: ?status=Available&area=Dundigal
// Add ?ngo_area=Dundigal&ngo_people_served=40 to include a match
// score and a plain-English explanation on each listing.
app.get('/api/listings', requireDb, async (req, res) => {
  try {
    const { status, area, ngo_area: ngoArea, ngo_people_served: ngoPeopleServed } = req.query;
    const conditions = [];
    const values = [];
    if (area) {
      values.push(area);
      conditions.push(`l.area = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT l.*, o.name AS organization_name, o.type AS organization_type, o.area AS organization_area
       FROM listings l
       JOIN organizations o ON o.id = l.organization_id
       ${where}
       ORDER BY l.expires_at ASC`,
      values,
    );

    let listings = result.rows.map(withEffectiveStatus);

    // Apply the status filter after the expired-on-read check, so an
    // Available listing past expiry is found by ?status=Expired.
    if (status) {
      listings = listings.filter((listing) => listing.status === status);
    }

    if (ngoArea) {
      const ngo = { area: ngoArea, peopleServed: Number(ngoPeopleServed) || undefined };
      listings = listings.map((listing) => {
        const match = scoreMatch(listing, ngo);
        return { ...listing, match_score: match.score, match_explanation: match.explanation };
      });
    }

    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Could not list listings.', detail: err.message });
  }
});

app.post('/api/listings', requireDb, async (req, res) => {
  const {
    organization_id: organizationId,
    title,
    description,
    food_type: foodType,
    servings,
    weight_kg: weightKg,
    area,
    address,
    latitude,
    longitude,
    expires_at: expiresAt,
    photo_url: photoUrl,
  } = req.body || {};

  if (!organizationId || !title || !area || !expiresAt) {
    return res.status(400).json({ error: 'organization_id, title, area and expires_at are required.' });
  }
  if (!Number.isInteger(Number(servings)) || Number(servings) <= 0) {
    return res.status(400).json({ error: 'servings must be a whole number greater than 0.' });
  }
  if (Number.isNaN(Number(weightKg)) || Number(weightKg) < 0) {
    return res.status(400).json({ error: 'weight_kg must be 0 or more.' });
  }
  if (foodType && !['veg', 'non-veg', 'mixed'].includes(foodType)) {
    return res.status(400).json({ error: "food_type must be 'veg', 'non-veg' or 'mixed'." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO listings
        (organization_id, title, description, food_type, servings, weight_kg, area, address, latitude, longitude, expires_at, status, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Available', $12)
       RETURNING *`,
      [
        organizationId,
        title,
        description || null,
        foodType || 'veg',
        Number(servings),
        Number(weightKg),
        area,
        address || null,
        latitude === '' || latitude == null ? null : Number(latitude),
        longitude === '' || longitude == null ? null : Number(longitude),
        expiresAt,
        photoUrl || null,
      ],
    );
    const listing = inserted.rows[0];
    await client.query(
      'INSERT INTO status_history (listing_id, status, changed_by, note) VALUES ($1, $2, $3, $4)',
      [listing.id, 'Available', null, 'Listing created.'],
    );
    await client.query('COMMIT');
    res.status(201).json(withEffectiveStatus(listing));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Could not create listing.', detail: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/listings/:id', requireDb, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, o.name AS organization_name, o.type AS organization_type, o.area AS organization_area
       FROM listings l
       JOIN organizations o ON o.id = l.organization_id
       WHERE l.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const history = await pool.query(
      'SELECT * FROM status_history WHERE listing_id = $1 ORDER BY created_at ASC, id ASC',
      [req.params.id],
    );
    res.json({ ...withEffectiveStatus(result.rows[0]), history: history.rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not load listing.', detail: err.message });
  }
});

// Shared status-change logic: check the current status, update it,
// and record the change in status_history, all in one transaction.
async function changeStatus(req, res, allowedFrom, toStatus) {
  const { changed_by: changedBy, note } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const listing = withEffectiveStatus(current.rows[0]);
    if (!allowedFrom.includes(listing.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot move a ${listing.status} listing to ${toStatus}.`,
      });
    }
    const updated = await client.query(
      'UPDATE listings SET status = $1 WHERE id = $2 RETURNING *',
      [toStatus, req.params.id],
    );
    await client.query(
      'INSERT INTO status_history (listing_id, status, changed_by, note) VALUES ($1, $2, $3, $4)',
      [req.params.id, toStatus, changedBy || null, note || null],
    );
    await client.query('COMMIT');
    res.json(withEffectiveStatus(updated.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Could not update listing status.', detail: err.message });
  } finally {
    client.release();
  }
}

app.post('/api/listings/:id/claim', requireDb, (req, res) =>
  changeStatus(req, res, ['Available'], 'Claimed'),
);
app.post('/api/listings/:id/pickup', requireDb, (req, res) =>
  changeStatus(req, res, ['Claimed'], 'Picked Up'),
);
app.post('/api/listings/:id/complete', requireDb, (req, res) =>
  changeStatus(req, res, ['Picked Up'], 'Completed'),
);
app.post('/api/listings/:id/expire', requireDb, (req, res) =>
  changeStatus(req, res, ['Available', 'Claimed'], 'Expired'),
);

// Dashboard totals, computed from the user's own records.
app.get('/api/dashboard', requireDb, async (req, res) => {
  try {
    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(servings) FILTER (WHERE status = 'Completed'), 0) AS meals_served,
         COALESCE(SUM(weight_kg) FILTER (WHERE status = 'Completed'), 0) AS kg_saved,
         COUNT(*) FILTER (WHERE status = 'Completed') AS rescued_count,
         COUNT(*) FILTER (WHERE status = 'Expired' OR (status = 'Available' AND expires_at < NOW())) AS lost_count,
         COUNT(*) FILTER (WHERE status = 'Available') AS available_count
       FROM listings`,
    );
    const dailyResult = await pool.query(
      `SELECT DATE(sh.created_at) AS day, COALESCE(SUM(l.servings), 0) AS servings
       FROM status_history sh
       JOIN listings l ON l.id = sh.listing_id
       WHERE sh.status = 'Completed'
         AND sh.created_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(sh.created_at)
       ORDER BY day ASC`,
    );

    // Fill in all 7 days, including days with no completed servings.
    const byDay = {};
    dailyResult.rows.forEach((row) => {
      byDay[new Date(row.day).toISOString().slice(0, 10)] = Number(row.servings);
    });
    const daily = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      daily.push({ date: key, servings: byDay[key] || 0 });
    }

    const row = totals.rows[0];
    res.json({
      meals_served: Number(row.meals_served),
      kg_saved: Number(row.kg_saved),
      rescued_count: Number(row.rescued_count),
      lost_count: Number(row.lost_count),
      available_count: Number(row.available_count),
      daily,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load dashboard.', detail: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`FeedOne server running at http://localhost:${PORT}`);
  if (!pool) {
    // eslint-disable-next-line no-console
    console.log('DATABASE_URL is not set. Set it in server/.env to use the database.');
  }
});
