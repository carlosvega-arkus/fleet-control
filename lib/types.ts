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
  };
}

export interface RouteGeoJson {
  type: 'FeatureCollection';
  features: RouteFeature[];
}

export interface MapViewProps {
  vehiclesGeoJson: VehiclesGeoJson | null;
  routeGeoJson?: RouteGeoJson | null;
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
