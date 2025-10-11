import { VehiclesGeoJson, LocationsGeoJson, Delivery } from "@/lib/types";
import { generateAIResponseRich, AIIntentTypes } from "@/lib/ai-responses";

/**
 * Parameters for building fleet context.
 * @property {VehiclesGeoJson | null} [vehiclesData] - GeoJSON data for fleet vehicles.
 * @property {LocationsGeoJson | null} [locationsData] - GeoJSON data for locations such as warehouses and stores.
 * @property {Delivery[] | null} [deliveriesData] - Array of delivery data.
 */
type FleetContextParams = {
  vehiclesData?: VehiclesGeoJson | null;
  locationsData?: LocationsGeoJson | null;
  deliveriesData?: Delivery[] | null;
};

/**
 * Builds a summary of the entire fleet to be used as a system prompt/context
 * for AI interactions. The summary includes key statistics and information about vehicles,
 * locations (warehouses and stores), and deliveries within the fleet.
 *
 * @param {FleetContextParams} params - Parameters containing fleet data.
 * @returns {string} The generated summary context for the fleet.
 */
function buildFleetContext({
  vehiclesData,
  locationsData,
  deliveriesData,
}: FleetContextParams): string {
  if (!vehiclesData && !locationsData && !deliveriesData) {
    return "No fleet context provided.";
  }

  // Vehicles summary
  const totalVehicles: number = vehiclesData?.features?.length || 0;
  const enRouteVehicles =
    vehiclesData?.features?.filter((v) => v.properties.state === "en_route") ||
    [];
  const idleVehicles =
    vehiclesData?.features?.filter((v) => v.properties.state === "idle") || [];
  const offlineVehicles =
    vehiclesData?.features?.filter((v) => v.properties.state === "offline") ||
    [];
  const lowBatteryVehicles = vehiclesData?.features
    ?.filter((v) => (v.properties.battery || 0) < 30)
    ?.map((v) => `${v.properties.alias}:${v.properties.battery}%`)
    ?.join(", ");

  const vehicleSummary =
    `Fleet: ${totalVehicles} vehicles (En route: ${enRouteVehicles.length}, Idle: ${idleVehicles.length}, Offline: ${offlineVehicles.length})` +
    (lowBatteryVehicles
      ? ` | Vehicles with low battery: ${lowBatteryVehicles}`
      : "");

  // Location (warehouse and store) summary
  const warehouses =
    locationsData?.features?.filter((l) => l.properties.type === "warehouse") ||
    [];
  const stores =
    locationsData?.features?.filter((l) => l.properties.type === "store") || [];

  const warehouseSummaries = warehouses.map((w) => {
    const inv = (w.properties.inventory || [])
      .map((i: any) => `${i.name}: ${i.qty}`)
      .join(", ");
    return `${w.properties.name} (${inv || "no items"})`;
  });

  const locationSummary =
    `Warehouses: ${warehouses.length}` +
    (warehouseSummaries.length ? ` (${warehouseSummaries.join("; ")})` : "") +
    ` | Stores: ${stores.length}`;

  // Deliveries summary
  const totalDeliveries: number = deliveriesData?.length || 0;
  const enRouteDeliveries =
    deliveriesData?.filter((d) => d.status === "en_route") || [];
  const pendingDeliveries =
    deliveriesData?.filter((d) => d.status === "pending") || [];
  const completedDeliveries =
    deliveriesData?.filter((d) => d.status === "delivered") || [];

  const routeSummaries = deliveriesData
    ?.slice(0, 8)
    .map((d) => {
      const vehicle = vehiclesData?.features.find(
        (v) => v.properties.id === d.vehicleId
      );
      const pickup = warehouses.find(
        (w) => w.properties.id === d.pickupWarehouseId
      )?.properties.name;
      const drop = stores.find((s) => s.properties.id === d.dropStoreId)
        ?.properties.name;
      return `${d.id}: ${vehicle?.properties.alias || d.vehicleId} (from ${
        pickup || "?"
      } to ${drop || "?"}, status: ${d.status})`;
    })
    ?.join("; ");

  const deliverySummary =
    `Deliveries: ${totalDeliveries} total (En route: ${enRouteDeliveries.length}, Pending: ${pendingDeliveries.length}, Completed: ${completedDeliveries.length})` +
    (routeSummaries ? ` | Active routes: ${routeSummaries}` : "");

  // Build and return the full context string
  return [vehicleSummary, deliverySummary, locationSummary]
    .filter(Boolean)
    .join(" | ");
}

/**
 * Returns a system prompt including a system preamble and the current fleet context.
 *
 * @param {FleetContextParams} params - Fleet data params for context.
 * @returns {string} The full system message for the AI system prompt.
 */
export function getContext({
  vehiclesData,
  locationsData,
  deliveriesData,
}: FleetContextParams): string {
  const fleetContext = buildFleetContext({
    vehiclesData,
    locationsData,
    deliveriesData,
  });

  return `You are a concise Fleet Operations Assistant.

  CRITICAL: You MUST respond ONLY with valid JSON. No extra text, no markdown.

  Response format:
  {
    "reply": "string",
    "intent": {
      "type": "${AIIntentTypes.join(" | ")}",
      "payload": {}
    } | null
  }

  LANGUAGE RULES:
  - Detect the user's language and respond in the SAME language
  - Supported languages: English, Spanish, French, German, Portuguese
  - If unsure, default to English

  VALIDATION RULES:
  - Validate ALL IDs/names against Fleet Context below
  - If entity not found → reply with error message and intent: null
  - If multiple matches → ask for clarification and intent: null

  PAYLOAD RULES:
  - start/cancel/status delivery: {"id": "delivery_id"}
  - reroute: {"vehicleId": "vehicle_id", "locationId": "location_id"}
  - show_vehicle_route: {"vehicleToken": "vehicle_token"}
  - hide_all_routes: {}

  Fleet Context:
  ${fleetContext}

  Example:
  User: "Envía el vehículo NV001 al Warehouse A"
  Response: {"reply": "Enviando NV001 a Warehouse A.", "intent": {"type": "reroute_to_location", "payload": {"vehicleId": "V001", "locationId": "WH1"}}}

  Remember: ONLY valid JSON, no additional text.`;
}

/**
 * Local fallback AI response function.
 *
 * Useful when a remote AI API is unavailable or in development.
 * Delegates to the local AI response generator for plausible, context-informed replies.
 *
 * @param {string} msg - The user message prompt.
 * @param {VehiclesGeoJson | null} vehiclesData - GeoJSON data for fleet vehicles.
 * @param {LocationsGeoJson | null} [locationsData] - GeoJSON data for locations, optional.
 * @param {Delivery[] | null} [deliveriesData] - Array of deliveries, optional.
 * @returns {object} AI response including provider metadata and fallback indicator.
 */
export const localFallback = (
  msg: string,
  vehiclesData: VehiclesGeoJson | null,
  locationsData?: LocationsGeoJson | null,
  deliveriesData?: Delivery[] | null
): object => {
  const rich = generateAIResponseRich(
    msg,
    vehiclesData,
    locationsData,
    deliveriesData
  );
  return { ...rich, provider: "local", usedFallback: true };
};
