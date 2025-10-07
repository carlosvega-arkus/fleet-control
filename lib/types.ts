export type VehicleType =
  | 'van'
  | 'cargo_van'
  | 'light_truck'
  | 'box_truck'
  | 'semi_truck'
  | 'pickup'
  | 'motorcycle'
  | 'cargo_bike';

export type VehicleState = 'idle' | 'en_route' | 'offline';

export type MapTheme = 'day' | 'night';

export interface VehicleProperties {
  id: string;
  alias: string;
  type: VehicleType;
  heading: number;
  state: VehicleState;
  speed?: number;
  battery?: number;
  license_plate?: string;
  capacity_kg?: number;
  characteristics?: Record<string, string | number | boolean>;
  manufacturer?: string;
  model?: string;
  year?: number;
}

export interface VehicleFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: VehicleProperties;
}

export interface VehiclesGeoJson {
  type: 'FeatureCollection';
  features: VehicleFeature[];
}

export interface RouteFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    distance?: number;
    duration?: number;
    variant?: 'primary' | 'alt';
    vehicleId?: string;
    deliveryId?: string;
  };
}

export interface RouteGeoJson {
  type: 'FeatureCollection';
  features: RouteFeature[];
}

// Logistics locations (warehouses and stores)
export type LocationType = 'warehouse' | 'store';

export interface InventoryItem {
  sku: string;
  name?: string;
  qty: number;
}

export interface LocationProperties {
  id: string;
  name: string;
  type: LocationType;
  inventory?: InventoryItem[];
}

export interface LocationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: LocationProperties;
}

export interface LocationsGeoJson {
  type: 'FeatureCollection';
  features: LocationFeature[];
}

// Deliveries
export type DeliveryStatus = 'pending' | 'picking' | 'en_route' | 'delivered' | 'cancelled';

export interface DeliveryItem {
  sku: string;
  qty: number;
}

export interface Delivery {
  id: string;
  vehicleId: string;
  pickupWarehouseId: string;
  dropStoreId: string;
  items: DeliveryItem[];
  status: DeliveryStatus;
  // Optional runtime fields for simulation
  route?: RouteGeoJson | null;
  progress?: number; // 0..1 along primary route
  etaMs?: number;
}

export interface MapViewProps {
  vehiclesGeoJson: VehiclesGeoJson | null;
  routeGeoJson?: RouteGeoJson | null;
  locationsGeoJson?: LocationsGeoJson | null;
  deliveryRoutesGeoJson?: RouteGeoJson | null;
  routesVersion?: number;
  onMapLoaded?: () => void;
  theme: MapTheme;
  pickMode?: boolean;
  onMapPick?: (lng: number, lat: number) => void;
}

export interface ControlsPanelProps {
  origin: string;
  stops: string[];
  destination: string;
  onOriginChange: (value: string) => void;
  onStopChange: (index: number, value: string) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onDestinationChange: (value: string) => void;
  onRequestRoute: (origin: string, stops: string[], destination: string) => void;
  isRouting: boolean;
  optimize: boolean;
  onToggleOptimize: () => void;
  routeSummary?: {
    distanceKm: number;
    durationMin: number;
  } | null;
}

export interface Message {
  id: string;
  type: 'system' | 'user';
  content: string;
  timestamp: Date;
}

export interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export interface KpiData {
  activeVehicles: number;
  tripsInProgress: number;
  idleVehicles: number;
  offlineVehicles: number;
}

export interface ThemeToggleProps {
  theme: MapTheme;
  onToggle: () => void;
}
