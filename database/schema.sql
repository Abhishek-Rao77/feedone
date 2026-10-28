-- FeedOne database schema.
-- Run this once against an empty PostgreSQL database:
--   psql "$DATABASE_URL" -f database/schema.sql
-- For Neon or Supabase, run it in the SQL editor of the dashboard.

-- Organisations: donors (restaurants, hostels, events) and NGOs/volunteers.
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('donor', 'ngo')),
  area TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surplus-food listings posted by a donor organisation.
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  food_type TEXT NOT NULL CHECK (food_type IN ('veg', 'non-veg', 'mixed')),
  servings INTEGER NOT NULL CHECK (servings > 0),
  weight_kg NUMERIC(8, 2) NOT NULL CHECK (weight_kg >= 0),
  area TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available'
    CHECK (status IN ('Available', 'Claimed', 'Picked Up', 'Completed', 'Expired')),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every status change for a listing, so pickup history is kept.
CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('Available', 'Claimed', 'Picked Up', 'Completed', 'Expired')),
  changed_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_area ON listings (area);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings (expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_organization_id ON listings (organization_id);
CREATE INDEX IF NOT EXISTS idx_status_history_listing_id ON status_history (listing_id);
