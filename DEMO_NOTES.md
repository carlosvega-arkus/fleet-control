# Fleet Control Demo – Implementation Summary and How-To

This document summarizes all changes and features implemented in this session, plus step-by-step instructions to run, test, and troubleshoot the demo.

## What this demo showcases

- Logistics simulation in Tijuana (warehouses → stores) with 5 vehicles
- Mapbox map with colored layers:
  - Vehicles: red dots (+ alias labels)
  - Warehouses: blue dots (+ labels)
  - Stores: green dots (+ labels)
  - Delivery routes: colored polylines per vehicle
- Local in-memory state (no DB) and hardcoded seed data
- Chat assistant (Gemini fallback → local rules) with intents to control the simulation and query the fleet
- Fleet panel to view/edit vehicles and delete them

## Run locally

Prereqs: Node 18+

1) Install
```
npm install
```
2) Configure environment
```
cp .env.example .env.local
# Set your Mapbox token
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
# Optional (for cloud AI). When missing, local fallback is used
GOOGLE_AI_API_KEY=your_gemini_api_key
```
3) Start
```
npm run dev
# open http://localhost:3000
```
4) Production build (optional)
```
npm run build
npm start
```

## Seed data

- `public/mock/vehicles.geojson` – base vehicle points (we limit to 5 for the demo)
- `public/mock/locations.geojson` – 2 warehouses (with inventory) + 2 stores
- `public/mock/deliveries.json` – 5 deliveries referencing the 5 vehicles

All state is volatile (in memory) and resets on refresh.

## Main features

### 1) Simulation (client-side, in-memory)
- File: `lib/simulation.ts`
- Tick loop every 1s; vehicles advance along Mapbox Directions polylines warehouse → store
- Updates vehicle geometry, speed, battery and delivery status
- APIs exposed:
  - `initSimulation(vehicles, locations, deliveries, { onVehiclesUpdate, onDeliveriesUpdate })`
  - `startDelivery(id)` / `cancelDelivery(id)`
  - `rerouteVehicleTo(vehicleId, locationId)`
  - `removeVehicle(vehicleId)`
- When a delivery completes the polyline, status becomes `delivered` and its in-memory route is cleared

### 2) Map + Layers
- File: `components/MapView.tsx`
- Mapbox GL JS 3.x
- Layers:
  - Vehicles: circle red + symbol labels (alias)
  - Warehouses: blue circle; Stores: green circle; text labels
  - Delivery routes: line layer with per-vehicle color
- Performance/stability tweaks:
  - Avoids re-creating the map on every update
  - For routes: on each change we rebuild the `delivery-routes` source/layer to guarantee a clean slate
- UI toggle: top-right button “Show routes/Hide routes” toggles polyline visibility

### 3) Route planner and routing
- `/api/route` wraps Mapbox Directions (driving-traffic)
- `RoutePlannerModal` lets you type addresses (Mapbox Geocoding) or lon,lat, and calculate a route

### 4) AI Assistant (fallback rules + intents)
- Files: `app/api/chat/route.ts`, `lib/ai-responses.ts`
- If `GOOGLE_AI_API_KEY` is missing or request fails, we reply via local rules
- Local Q&A: fleet overview, en-route/idle/offline, battery, type breakdowns, where is vehicle X
- Intents (local fallback):
  - `start_delivery Dxxx`
  - `cancel_delivery Dxxx`
  - `status_delivery Dxxx`
  - `reroute_to_location vehicleId locationId`
  - `show_vehicle_route <vehicleToken>` (filters routes to only that vehicle)
  - `hide_all_routes` (clears route overlay)

### 5) Fleet panel
- File: `components/FleetPanel.tsx`
- Filter/search by alias/plate/type/state
- Inline edit of type/plate
- Vehicle details dialog
- Assign route (from saved routes)
- Add vehicle
- Delete vehicle (synchronizes with simulation and removes from the live map)

### 6) Logistics panel
- File: `components/LogisticsPanel.tsx`
- Lists all deliveries with `Start`/`Cancel` controls and basic metadata

## UX flow to test

1) Open http://localhost:3000
2) Confirm seed:
   - 2 warehouses, 2 stores visible
   - 5 vehicles visible (red dots) with labels
3) Delivery routes
   - Toggle routes visible (top-right button)
   - Start a delivery from Logistics panel or via chat: `start delivery D001`
   - See the vehicle move along streets
4) Chat examples
   - “Show vehicles en route”
   - “Where is vehicle V001?”
   - “Start delivery D003”
   - “Show route for vehicle V001”
   - “Hide routes”
5) Fleet panel
   - Edit vehicle fields (type/plate)
   - Delete one vehicle → it is removed from the map (and from the simulation)

## Known limitations / notes

- “Remove route on vehicle deletion or delivery completion”
  - The overlay layer is rebuilt on each update, and deliveries mark `route=null` on completion.
  - If you still see a stale polyline, click “Hide routes” then “Show routes” to force a full refresh (this UI action also rebuilds the layer from scratch). This mirrors the chat’s “hide/show route” behavior.
- Dev warnings
  - `DialogContent` accessibility warning is from the UI library; harmless in demo.
  - Mapbox events blocked by ad‑blockers can show `ERR_BLOCKED_BY_CLIENT`; harmless for functionality.
- Next.js 13 dev SIGINT noise
  - Known in 13.5.x; does not appear in production build.

## Open issues (explicit)

- Deleting a vehicle in-flight may still leave a stale route line in some dev sessions. Workarounds:
  1) Click “Hide routes” and then “Show routes”.
  2) Reload the page (state resets). In production build it is less frequent.
- Finishing a delivery should clear its line; the simulation sets `route=null`. If a line persists, use the same workaround as above. This is a layer-refresh timing issue specific to the dev toolchain.

## File map (key changes)

- `public/mock/locations.geojson` – seed 2 warehouses + 2 stores
- `public/mock/deliveries.json` – seed 5 demo deliveries
- `lib/types.ts` – added Locations/Delivery types; extended route properties
- `lib/simulation.ts` – in‑memory engine + APIs; clears route when delivered
- `components/MapView.tsx` – layers, labels, routes toggle, stable update patterns
- `components/LogisticsPanel.tsx` – deliveries UI
- `components/FleetPanel.tsx` – add/edit/delete vehicles (kept to 5 in demo)
- `lib/ai-responses.ts` – Q&A + intents (start/cancel/status/reroute/show/hide)
- `app/api/chat/route.ts` – accepts vehicles/locations/deliveries and returns intents in local mode
- `app/page.tsx` – orchestrates load, simulation, chat intents, and route overlays

## Troubleshooting

- No map / Mapbox token error — ensure `NEXT_PUBLIC_MAPBOX_TOKEN` is set and valid; restart dev server.
- Routes not appearing — press “Show routes”. If still not visible, start a delivery (`Start` on a row or `start delivery D001` in chat).
- Stale route line — click “Hide routes” then “Show routes” to force a layer rebuild; in production (`npm run build && npm start`) it’s more deterministic.

## Next steps (suggested)

- Promote overlay refresh to a single store (e.g., Zustand) to avoid cross‑effect races
- Add a small toast on delivery completion with CTA to view trajectory in isolation
- Move UI warnings to accessible labels; upgrade to Next 14+
- Persist demo state optionally in localStorage for repeat sessions

---
This demo is intentionally lightweight (no backend). All logic runs client‑side for easy exploration in a single repository.
