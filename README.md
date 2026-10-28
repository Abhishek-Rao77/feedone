# FeedOne

FeedOne is an AI-powered surplus food coordination platform. Restaurants,
hostels and events list surplus food instead of throwing it away. NGOs and
volunteers nearby can see the listing, claim it, pick it up, and the
dashboard shows how much food was saved.

Author: Dasari Abhishek Rao

## What it does

- Donors (restaurants, hostels, events) create surplus-food listings with
  servings, weight, veg type, area, address and an expiry time.
- NGOs and volunteers browse nearby listings. Listings are scored by area,
  servings and time left before expiry, with a plain-English explanation
  for each match.
- A listing moves through: Available -> Claimed -> Picked Up -> Completed,
  or Expired. Every status change is recorded in the pickup history.
- The dashboard shows meals served, kilograms of food saved, food rescued
  and food lost, plus a 7-day chart of completed servings.

This is an MVP. It uses simple role/profile selection and has no real
login yet. Production use would need password hashing and real
authentication before anyone trusts it with real accounts.

The map uses Leaflet with OpenStreetMap tiles, which are free. No paid
Google Maps API key is needed. The Directions link on each listing is a
plain Google Maps search URL built from the typed address, and it needs
no API key either.

## Prerequisites

1. Node.js 18 or newer. Check with `node --version`.
2. PostgreSQL, either:
   - PostgreSQL installed locally, or
   - a free Neon or Supabase PostgreSQL database (both have free tiers).
3. Git, if you want to clone this repository.

## Setup

1. Install the server dependencies:

   ```bash
   cd server
   npm install
   ```

2. Install the client dependencies:

   ```bash
   cd ../client
   npm install
   cd ..
   ```

3. Create the server environment file from the example:

   ```bash
   cp server/.env.example server/.env
   ```

4. Open `server/.env` and set `DATABASE_URL` to your PostgreSQL
   connection string. Examples:

   ```text
   DATABASE_URL=postgres://postgres:password@localhost:5432/feedone
   ```

   For Neon or Supabase, copy the connection string from your project
   dashboard and paste it as `DATABASE_URL`. Leave `PORT` as `5000`
   unless that port is already in use.

5. Create the tables. Run `database/schema.sql` against your database.
   With `psql`:

   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```

   If your database tool does not expand `$DATABASE_URL`, paste the
   connection string in its place, or open `schema.sql` in your database
   client and run it there.

6. (Optional) Load sample data so the app is not empty on first run:

   ```bash
   psql "$DATABASE_URL" -f database/seed.sql
   ```

   The seed file is clearly marked sample data only. It creates two
   donors and one NGO in Hyderabad, and three listings: one Available,
   one Claimed and one Completed.

## Run it

1. Start the server (from the `server` folder):

   ```bash
   npm run dev
   ```

   The API runs at `http://localhost:5000`. Check
   `http://localhost:5000/api/health` in a browser.

2. In a second terminal, start the client (from the `client` folder):

   ```bash
   npm run dev
   ```

   Open the address Vite prints, usually `http://localhost:5173`.

3. If `DATABASE_URL` is missing, the server still starts. The health
   endpoint answers, and the other API endpoints return a clear JSON
   error telling you the database is not configured, instead of
   crashing.

## Demo flow

1. On first run, create an organisation. Choose type `donor` and an
   area such as Dundigal.
2. Go to Add listing. Add a listing with servings, weight, veg type,
   area and an expiry time a few hours ahead.
3. Create or pick an NGO organisation in the same area, for example
   Gandi Maisamma or Dundigal.
4. On Browse listings, the listing shows a match score and an
   explanation, such as "Same area (Dundigal) and 3 hours left before
   expiry."
5. Claim the listing, then mark it picked up, then mark it completed.
6. Open the Dashboard. Meals served, kilograms saved and the 7-day
   chart update from the completed listing.
7. A listing left Available past its expiry time is shown as Expired
   when listings are read. You can also mark it expired by hand.

## Project structure

```text
feedone/
  README.md
  .gitignore
  database/
    schema.sql            tables, indexes and status rules
    seed.sql              sample data only
  server/
    package.json
    index.js              Express API
    matching.js           nearby-match scoring and explanation
    .env.example          DATABASE_URL and PORT
  client/
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx             profile selector, tabs and listing list
      App.css
      api.js              fetch helpers for the API
      components/
        ListingCard.jsx   card, countdown, status buttons, directions
        ListingForm.jsx   create-listing form
        Dashboard.jsx     totals and 7-day bar chart
        MapView.jsx       Leaflet + OpenStreetMap map
```

## API list

Base URL: `http://localhost:5000`

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/health` | Server and database status |
| GET | `/api/organizations` | List organisations |
| POST | `/api/organizations` | Create an organisation |
| GET | `/api/listings?status=&area=` | List listings, optional filters. Add `ngo_area=` and `ngo_people_served=` to include a match score and explanation |
| POST | `/api/listings` | Create a listing |
| GET | `/api/listings/:id` | One listing, with its status history |
| POST | `/api/listings/:id/claim` | Available -> Claimed |
| POST | `/api/listings/:id/pickup` | Claimed -> Picked Up |
| POST | `/api/listings/:id/complete` | Picked Up -> Completed |
| POST | `/api/listings/:id/expire` | Mark a listing Expired |

Every status change inserts a row into `status_history`, so the full
pickup history of a listing is kept.

Dashboard endpoint: `GET /api/dashboard`. It returns meals served
(sum of servings of Completed listings), kilograms saved (sum of
weight of Completed listings), rescued count, lost/expired count,
and daily completed servings for the last 7 days.

## Notes for future work

- Add real accounts: password hashing, login sessions, and only letting
  the claiming NGO change a listing it claimed.
- Add photo uploads with object storage instead of a photo URL.
- Add notifications when a nearby listing is posted.
- Replace the simple area matching with distance matching once every
  listing has trusted latitude and longitude values.
