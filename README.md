# Fleet Control Demo

Fleet operations demo built with Next.js (App Router), Mapbox, and a Gemini-powered assistant. Plan multi-stop routes in Tijuana, manage vehicles, save routes, and schedule assignments (demo/local only).

## Tech stack
- Next.js 13 + TypeScript
- Tailwind + shadcn/ui (Radix)
- Mapbox GL JS (map), Directions (routing), Geocoding (autocomplete)
- Google Gemini API (chat assistant) with local fallback
- Tabler Icons

## Quickstart
1) Install
```bash
npm install
```

2) Configure environment
- Copy the example and set your keys
```bash
cp .env.example .env.local
```
- Required variables:
  - NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
  - GOOGLE_AI_API_KEY=your_gemini_api_key

3) Run
```bash
npm run dev
```
Open http://localhost:3000

## Features
- Map + Routing
  - Driving-traffic with alternatives, distance/time summary
  - Primary and alternative route styles; day/night colors
- Route Planner (modal)
  - Addresses/places or lon,lat inputs with Mapbox Geocoding
  - “Pick on map” for origin/destination/stops
  - Multi-stop with client-side “optimize stops” (nearest-neighbor)
  - Save routes locally (localStorage)
- Fleet
  - View/edit vehicle metadata (type, plate, capacity) in memory
  - Per-type icons in list (Tabler)
- Routes Manager
  - View, rename, delete saved routes
- Scheduler (planning only)
  - Assign saved routes to one or more vehicles with date/time and notes
  - Stored locally (no backend)
- Chat Assistant
  - Gemini 1.5 Flash endpoint with fallback local rules

## Demo data and persistence
- Vehicles are loaded from `public/mock/vehicles.geojson` and enriched on load (aliases, brand/model, ensure a semi_truck).
- Saved routes, recents, assignments are stored in `localStorage` (demo only). Refresh keeps your saved data; clearing storage resets.

## Configuration notes
- Mapbox token is used client-side (map + geocoding) and server-side (directions). Keep limits in mind.
- Gemini is called from a server endpoint (`/api/chat`). If key is missing, the app falls back to local responses.

## Scripts
- `npm run dev` – start dev server
- `npm run build` – build
- `npm run start` – start production server

## Requirements
- Node.js 18+

## Security
- Do not commit API keys. `.gitignore` excludes env files by default.

## Troubleshooting
- Routing: ensure `NEXT_PUBLIC_MAPBOX_TOKEN` is valid and Directions API is enabled.
- Geocoding: ensure the token has access; inputs accept either places or `lon, lat`.
- Gemini: set `GOOGLE_AI_API_KEY`. If rate-limited, responses fall back to local logic.

## Roadmap
- Real-time telemetry modal (battery/heading/coordinates) when vehicles are en route
- Map markers per-vehicle with custom icons and clustering (re-enabled)
- Traffic layer indicator and profile selector (driving/cycling)
- Backend persistence (Supabase/Postgres) and auth
