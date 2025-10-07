import { Delivery, DeliveryStatus, LocationsGeoJson, VehiclesGeoJson, VehicleFeature, RouteGeoJson } from './types';

type TickCallbacks = {
  onVehiclesUpdate: (vehicles: VehiclesGeoJson) => void;
  onDeliveriesUpdate?: (deliveries: Delivery[]) => void;
};

interface SimulationState {
  running: boolean;
  intervalId: any;
  vehicles: VehiclesGeoJson;
  locations: LocationsGeoJson;
  deliveries: Delivery[];
  // deliveryId -> route coordinates
  routes: Record<string, [number, number][]>;
  // deliveryId -> current progress 0..1
  progress: Record<string, number>;
  // per-vehicle ad-hoc reroute
  vehicleRoutes: Record<string, [number, number][]>;
  vehicleProgress: Record<string, number>;
}

const TICK_MS = 1000;
const AVG_SPEED_MPS = 12; // ~43 km/h

let state: SimulationState | null = null;
let cbs: TickCallbacks | null = null;

function featureById(loc: LocationsGeoJson, id: string) {
  return loc.features.find((f) => f.properties.id === id) || null;
}

async function fetchRoute(origin: [number, number], dest: [number, number]): Promise<[number, number][]> {
  try {
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: `${origin[0]}, ${origin[1]}`, stops: [], destination: `${dest[0]}, ${dest[1]}` }),
    });
    const data = await res.json();
    const primary = data?.route?.features?.find((f: any) => f?.properties?.variant === 'primary');
    const coords = (primary?.geometry?.coordinates || []) as [number, number][];
    return coords;
  } catch {
    return [];
  }
}

function distance(a: [number, number], b: [number, number]) {
  const dx = (a[0] - b[0]) * 111320; // lon deg to meters approx at mid lat
  const dy = (a[1] - b[1]) * 110540; // lat deg to meters
  return Math.hypot(dx, dy);
}

function advanceAlongPolyline(poly: [number, number][], startIndex: number, startOffsetM: number, advanceM: number) {
  // Returns new index and offset, and coordinate
  let idx = Math.max(0, startIndex);
  let offset = Math.max(0, startOffsetM);
  let remaining = advanceM;
  let current = poly[idx];
  while (remaining > 0 && idx < poly.length - 1) {
    const next = poly[idx + 1];
    const segLen = distance(current, next);
    const avail = segLen - offset;
    if (remaining < avail) {
      const t = (offset + remaining) / segLen;
      const lon = current[0] + (next[0] - current[0]) * t;
      const lat = current[1] + (next[1] - current[1]) * t;
      offset += remaining;
      remaining = 0;
      return { idx, offset, coord: [lon, lat] as [number, number] };
    } else {
      remaining -= avail;
      idx += 1;
      offset = 0;
      current = poly[idx];
    }
  }
  return { idx, offset, coord: poly[poly.length - 1] };
}

export async function initSimulation(
  vehicles: VehiclesGeoJson,
  locations: LocationsGeoJson,
  deliveries: Delivery[],
  callbacks: TickCallbacks
) {
  // Deep copy minimal
  const vCopy: VehiclesGeoJson = {
    type: 'FeatureCollection',
    features: vehicles.features.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [...f.geometry.coordinates] as [number, number] },
      properties: { ...f.properties },
    })),
  };

  state = {
    running: false,
    intervalId: null,
    vehicles: vCopy,
    locations,
    deliveries: deliveries.map((d) => ({ ...d, progress: 0 })),
    routes: {},
    progress: {},
    vehicleRoutes: {},
    vehicleProgress: {},
  };
  cbs = callbacks;
}

export function start() {
  if (!state || state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, TICK_MS);
}

export function stop() {
  if (!state || !state.running) return;
  clearInterval(state.intervalId);
  state.running = false;
}

export async function startDelivery(id: string) {
  if (!state) return;
  const d = state.deliveries.find((x) => x.id === id);
  if (!d) return;
  const vehicle = state.vehicles.features.find((f) => f.properties.id === d.vehicleId);
  const wh = featureById(state.locations, d.pickupWarehouseId);
  const st = featureById(state.locations, d.dropStoreId);
  if (!vehicle || !wh || !st) return;
  // precompute route from vehicle -> warehouse -> store (two legs)
  const path1 = await fetchRoute(vehicle.geometry.coordinates, wh.geometry.coordinates);
  const path2 = await fetchRoute(wh.geometry.coordinates, st.geometry.coordinates);
  const poly = [...path1, ...path2.slice(1)];
  state.routes[d.id] = poly;
  state.progress[d.id] = 0;
  d.status = 'en_route';
  d.route = ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: poly },
        properties: { variant: 'primary', vehicleId: d.vehicleId, deliveryId: d.id },
      },
    ],
  } as unknown) as RouteGeoJson;
  if (cbs?.onDeliveriesUpdate) cbs.onDeliveriesUpdate(state.deliveries);
}

export function cancelDelivery(id: string) {
  if (!state) return;
  const d = state.deliveries.find((x) => x.id === id);
  if (!d) return;
  d.status = 'cancelled';
  delete state.routes[id];
  delete state.progress[id];
  if (cbs?.onDeliveriesUpdate) cbs.onDeliveriesUpdate(state.deliveries);
}

export async function rerouteVehicleTo(vehicleId: string, locationId: string) {
  if (!state) return;
  const vehicle = state.vehicles.features.find((f) => f.properties.id === vehicleId);
  const target = featureById(state.locations, locationId);
  if (!vehicle || !target) return;
  // cancel any active delivery for this vehicle
  const active = state.deliveries.find((d) => d.status === 'en_route' && d.vehicleId === vehicleId);
  if (active) {
    active.status = 'cancelled';
    delete state.routes[active.id];
    delete state.progress[active.id];
    if (cbs?.onDeliveriesUpdate) cbs.onDeliveriesUpdate(state.deliveries);
  }
  const path = await fetchRoute(vehicle.geometry.coordinates, target.geometry.coordinates);
  state.vehicleRoutes[vehicleId] = path;
  state.vehicleProgress[vehicleId] = 0;
}

function tick() {
  if (!state) return;
  let changed = false;
  for (const d of state.deliveries) {
    if (d.status !== 'en_route') continue;
    const poly = state.routes[d.id];
    if (!poly || poly.length < 2) continue;
    const vehicle = state.vehicles.features.find((f) => f.properties.id === d.vehicleId);
    if (!vehicle) continue;

    // Determine current segment by finding closest point index if first time, else use stored progress as path index approximation
    const progress = state.progress[d.id] ?? 0;
    // Interpret progress as meters from start along path
    // Compute total length; then advance by speed * dt
    let totalLen = 0;
    for (let i = 0; i < poly.length - 1; i++) totalLen += distance(poly[i], poly[i + 1]);
    const advance = AVG_SPEED_MPS * (TICK_MS / 1000);
    const newProgressM = Math.min(progress + advance, totalLen);

    // Walk along path to find coordinate
    let acc = 0;
    let coord = poly[0];
    let idx = 0;
    while (idx < poly.length - 1) {
      const seg = distance(poly[idx], poly[idx + 1]);
      if (acc + seg >= newProgressM) {
        const t = (newProgressM - acc) / seg;
        coord = [poly[idx][0] + (poly[idx + 1][0] - poly[idx][0]) * t, poly[idx][1] + (poly[idx + 1][1] - poly[idx][1]) * t] as [number, number];
        break;
      }
      acc += seg;
      idx++;
      coord = poly[idx];
    }

    state.progress[d.id] = newProgressM;
    vehicle.geometry.coordinates = coord;
    vehicle.properties.state = 'en_route';
    vehicle.properties.speed = Math.round(AVG_SPEED_MPS * 3.6);
    vehicle.properties.battery = Math.max(0, (vehicle.properties.battery ?? 80) - 0.5);
    changed = true;

    if (newProgressM >= totalLen - 1) {
      d.status = 'delivered';
      // clear route so UI overlay can drop it immediately
      d.route = null;
      vehicle.properties.state = 'idle';
      vehicle.properties.speed = 0;
      if (cbs?.onDeliveriesUpdate) cbs.onDeliveriesUpdate(state.deliveries);
    }
  }

  // Advance ad-hoc vehicle routes
  for (const vehicleId of Object.keys(state.vehicleRoutes)) {
    const poly = state.vehicleRoutes[vehicleId];
    if (!poly || poly.length < 2) continue;
    const vehicle = state.vehicles.features.find((f) => f.properties.id === vehicleId);
    if (!vehicle) continue;
    const progress = state.vehicleProgress[vehicleId] ?? 0;
    let totalLen = 0;
    for (let i = 0; i < poly.length - 1; i++) totalLen += distance(poly[i], poly[i + 1]);
    const advance = AVG_SPEED_MPS * (TICK_MS / 1000);
    const newProgressM = Math.min(progress + advance, totalLen);
    let acc = 0;
    let coord = poly[0];
    let idx = 0;
    while (idx < poly.length - 1) {
      const seg = distance(poly[idx], poly[idx + 1]);
      if (acc + seg >= newProgressM) {
        const t = (newProgressM - acc) / seg;
        coord = [poly[idx][0] + (poly[idx + 1][0] - poly[idx][0]) * t, poly[idx][1] + (poly[idx + 1][1] - poly[idx][1]) * t] as [number, number];
        break;
      }
      acc += seg;
      idx++;
      coord = poly[idx];
    }
    state.vehicleProgress[vehicleId] = newProgressM;
    vehicle.geometry.coordinates = coord;
    vehicle.properties.state = 'en_route';
    vehicle.properties.speed = Math.round(AVG_SPEED_MPS * 3.6);
    vehicle.properties.battery = Math.max(0, (vehicle.properties.battery ?? 80) - 0.5);
    changed = true;
    if (newProgressM >= totalLen - 1) {
      delete state.vehicleRoutes[vehicleId];
      delete state.vehicleProgress[vehicleId];
      vehicle.properties.state = 'idle';
      vehicle.properties.speed = 0;
    }
  }

  if (changed && cbs) cbs.onVehiclesUpdate(state.vehicles);
}

export function getState() {
  return state;
}

export function removeVehicle(vehicleId: string) {
  if (!state) return;
  state.vehicles.features = state.vehicles.features.filter((f) => f.properties.id !== vehicleId);
  // cancel deliveries assigned to this vehicle
  for (const d of state.deliveries) {
    if (d.vehicleId === vehicleId && (d.status === 'en_route' || d.status === 'pending')) {
      d.status = 'cancelled';
      delete state.routes[d.id];
      delete state.progress[d.id];
      d.route = null;
    }
  }
  delete state.vehicleRoutes[vehicleId];
  delete state.vehicleProgress[vehicleId];
  if (cbs?.onDeliveriesUpdate) cbs.onDeliveriesUpdate(state.deliveries);
  if (cbs) cbs.onVehiclesUpdate(state.vehicles);
}


