export interface RecentPlace {
  id: string;
  label: string;
  lng: number;
  lat: number;
  ts: number;
}

export interface SavedRoute {
  id: string;
  name: string;
  origin: string;
  stops: string[];
  destination: string;
  createdAt: number;
}

export interface VehicleAssignment {
  vehicleId: string;
  routeId: string;
  assignedAt: number;
}

export interface PlannedAssignment {
  id: string;
  routeId: string;
  vehicleIds: string[];
  startAt: number; // epoch ms
  notes?: string;
}

const RECENTS_KEY = 'fleet_recents_v1';
const ROUTES_KEY = 'fleet_routes_v1';
const ASSIGN_KEY = 'fleet_assignments_v1';
const PLANNED_KEY = 'fleet_planned_v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getRecentPlaces(max = 10): RecentPlace[] {
  const items = readJson<RecentPlace[]>(RECENTS_KEY, []);
  return items.sort((a, b) => b.ts - a.ts).slice(0, max);
}

export function addRecentPlace(label: string, lng: number, lat: number) {
  const items = readJson<RecentPlace[]>(RECENTS_KEY, []);
  const id = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const now = Date.now();
  const filtered = items.filter((r) => r.id !== id);
  filtered.unshift({ id, label, lng, lat, ts: now });
  writeJson(RECENTS_KEY, filtered.slice(0, 20));
}

export function getSavedRoutes(): SavedRoute[] {
  return readJson<SavedRoute[]>(ROUTES_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveRoute(route: Omit<SavedRoute, 'id' | 'createdAt'>): SavedRoute {
  const items = readJson<SavedRoute[]>(ROUTES_KEY, []);
  const id = `R-${Date.now()}`;
  const saved: SavedRoute = { ...route, id, createdAt: Date.now() };
  items.unshift(saved);
  writeJson(ROUTES_KEY, items);
  return saved;
}

export function deleteRoute(routeId: string) {
  const items = readJson<SavedRoute[]>(ROUTES_KEY, []);
  writeJson(ROUTES_KEY, items.filter((r) => r.id !== routeId));
  // Remove assignments for this route
  const assigns = readJson<VehicleAssignment[]>(ASSIGN_KEY, []);
  writeJson(ASSIGN_KEY, assigns.filter((a) => a.routeId !== routeId));
}

export function updateRouteName(routeId: string, name: string) {
  const items = readJson<SavedRoute[]>(ROUTES_KEY, []);
  const next = items.map((r) => (r.id === routeId ? { ...r, name } : r));
  writeJson(ROUTES_KEY, next);
}

export function getAssignments(): VehicleAssignment[] {
  return readJson<VehicleAssignment[]>(ASSIGN_KEY, []);
}

export function assignRouteToVehicle(vehicleId: string, routeId: string) {
  const assigns = readJson<VehicleAssignment[]>(ASSIGN_KEY, []);
  const filtered = assigns.filter((a) => a.vehicleId !== vehicleId);
  filtered.unshift({ vehicleId, routeId, assignedAt: Date.now() });
  writeJson(ASSIGN_KEY, filtered);
}

export function getPlannedAssignments(): PlannedAssignment[] {
  return readJson<PlannedAssignment[]>(PLANNED_KEY, []).sort((a, b) => a.startAt - b.startAt);
}

export function addPlannedAssignment(input: Omit<PlannedAssignment, 'id'>): PlannedAssignment {
  const items = readJson<PlannedAssignment[]>(PLANNED_KEY, []);
  const id = `P-${Date.now()}`;
  const saved: PlannedAssignment = { ...input, id };
  items.push(saved);
  writeJson(PLANNED_KEY, items);
  return saved;
}

export function deletePlannedAssignment(id: string) {
  const items = readJson<PlannedAssignment[]>(PLANNED_KEY, []);
  writeJson(PLANNED_KEY, items.filter((p) => p.id !== id));
}


