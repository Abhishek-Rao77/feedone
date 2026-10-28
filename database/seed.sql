-- SAMPLE DATA ONLY. This file is not real data.
-- Run it once, after schema.sql, on an empty database:
--   psql "$DATABASE_URL" -f database/seed.sql
-- It creates 2 donor organisations and 1 NGO in Hyderabad areas
-- (Dundigal, Gandi Maisamma, Kompally) and 3 sample listings:
-- one Available, one Claimed and one Completed, so the dashboard
-- shows numbers on first run. Delete these rows before real use.

INSERT INTO organizations (name, type, area, address, phone) VALUES
  ('Sample Campus Canteen', 'donor', 'Dundigal', 'Sample College Road, Dundigal, Hyderabad', '9000000001'),
  ('Sample Event Kitchen', 'donor', 'Kompally', 'Sample Hall Road, Kompally, Hyderabad', '9000000002'),
  ('Sample Food Helpers NGO', 'ngo', 'Gandi Maisamma', 'Sample Colony, Gandi Maisamma, Hyderabad', '9000000003');

INSERT INTO listings (organization_id, title, description, food_type, servings, weight_kg, area, address, latitude, longitude, expires_at, status, photo_url, created_at)
SELECT id, 'Veg Biryani', 'Freshly cooked veg biryani, packed in serving boxes.', 'veg', 40, 12.00, 'Dundigal', 'Sample College Road, Dundigal, Hyderabad', 17.5925, 78.4350, NOW() + INTERVAL '3 hours', 'Available', NULL, NOW() - INTERVAL '30 minutes'
FROM organizations WHERE name = 'Sample Campus Canteen';

INSERT INTO listings (organization_id, title, description, food_type, servings, weight_kg, area, address, latitude, longitude, expires_at, status, photo_url, created_at)
SELECT id, 'Mixed Meals', 'Mixed veg and non-veg meal packs from an event.', 'mixed', 25, 8.50, 'Kompally', 'Sample Hall Road, Kompally, Hyderabad', 17.5460, 78.4900, NOW() + INTERVAL '2 hours', 'Claimed', NULL, NOW() - INTERVAL '1 hour'
FROM organizations WHERE name = 'Sample Event Kitchen';

INSERT INTO listings (organization_id, title, description, food_type, servings, weight_kg, area, address, latitude, longitude, expires_at, status, photo_url, created_at)
SELECT id, 'Curd Rice and Curry', 'Curd rice and vegetable curry, already packed.', 'veg', 30, 9.00, 'Dundigal', 'Sample College Road, Dundigal, Hyderabad', 17.5925, 78.4350, NOW() - INTERVAL '1 hour', 'Completed', NULL, NOW() - INTERVAL '5 hours'
FROM organizations WHERE name = 'Sample Campus Canteen';

-- History for the sample listings. The Completed listing gets a
-- Completed history row today, so the 7-day dashboard chart shows it.
INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Available', 'Sample Campus Canteen', 'Listing created.', NOW() - INTERVAL '30 minutes'
FROM listings WHERE title = 'Veg Biryani';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Available', 'Sample Event Kitchen', 'Listing created.', NOW() - INTERVAL '1 hour'
FROM listings WHERE title = 'Mixed Meals';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Claimed', 'Sample Food Helpers NGO', 'Claimed by NGO.', NOW() - INTERVAL '40 minutes'
FROM listings WHERE title = 'Mixed Meals';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Available', 'Sample Campus Canteen', 'Listing created.', NOW() - INTERVAL '5 hours'
FROM listings WHERE title = 'Curd Rice and Curry';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Claimed', 'Sample Food Helpers NGO', 'Claimed by NGO.', NOW() - INTERVAL '4 hours'
FROM listings WHERE title = 'Curd Rice and Curry';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Picked Up', 'Sample Food Helpers NGO', 'Picked up.', NOW() - INTERVAL '3 hours'
FROM listings WHERE title = 'Curd Rice and Curry';

INSERT INTO status_history (listing_id, status, changed_by, note, created_at)
SELECT id, 'Completed', 'Sample Food Helpers NGO', 'Delivered and completed.', NOW() - INTERVAL '2 hours'
FROM listings WHERE title = 'Curd Rice and Curry';
