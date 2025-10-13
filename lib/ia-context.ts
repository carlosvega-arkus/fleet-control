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
  const fleetFeatures = vehiclesData?.features || [];
  const locationFeatures = locationsData?.features || [];
  const deliveryList = deliveriesData || [];

  // --- Fleet ---
  const total = fleetFeatures.length;
  const enRoute = fleetFeatures.filter(v => v.properties.state === "en_route").length;
  const idle = fleetFeatures.filter(v => v.properties.state === "idle").length;
  const offline = fleetFeatures.filter(v => v.properties.state === "offline").length;

  const lowBattery = fleetFeatures
    .filter(v => (v.properties.battery || 0) < 30)
    .map(v => `${v.properties.alias}:${v.properties.battery}%`)
    .join(", ");

  const fleetText = `Fleet: ${total} vehicles (En route: ${enRoute}, Idle: ${idle}, Offline: ${offline})${
    lowBattery ? ` | Low battery: ${lowBattery}` : ""
  }`;

  // --- Locations ---
  const warehouses = locationFeatures.filter(l => l.properties.type === "warehouse");
  const stores = locationFeatures.filter(l => l.properties.type === "store");

  const warehouseText = warehouses
    .map(w => {
      const inv = (w.properties.inventory || [])
        .map((i: any) => `${i.name}:${i.qty}`)
        .join(", ");
      return `${w.properties.name} (${inv || "no items"})`;
    })
    .join("; ");

  const locationText = `Warehouses: ${warehouses.length}${warehouseText ? ` (${warehouseText})` : ""} | Stores: ${stores.length}`;

  // --- Deliveries ---
  const enRouteDeliveries = deliveryList.filter(d => d.status === "en_route").length;
  const pendingDeliveries = deliveryList.filter(d => d.status === "pending").length;
  const completedDeliveries = deliveryList.filter(d => d.status === "delivered").length;

  const activeRoutes = deliveryList
    .slice(0, 8)
    .map(d => {
      const vehicle = fleetFeatures.find(v => v.properties.id === d.vehicleId);
      const pickup = warehouses.find(w => w.properties.id === d.pickupWarehouseId)?.properties.name;
      const drop = stores.find(s => s.properties.id === d.dropStoreId)?.properties.name;
      return `${d.id}: ${vehicle?.properties.alias || d.vehicleId} (from ${pickup || "?"} to ${drop || "?"}, status: ${d.status})`;
    })
    .join("; ");

  const deliveryText = `Deliveries: ${deliveryList.length} total (En route: ${enRouteDeliveries}, Pending: ${pendingDeliveries}, Completed: ${completedDeliveries})${
    activeRoutes ? ` | Active routes: ${activeRoutes}` : ""
  }`;

  // --- Full context text ---
  const contextText = [fleetText, deliveryText, locationText].filter(Boolean).join(" | ");
  return contextText;
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

  Respond ONLY with valid JSON (no extra text or markdown).
  
  Format:
  {
    "reply": "string",
    "intent": {
      "type": "${AIIntentTypes.join(" | ")}",
      "payload": {}
    } | null
  }

  Rules:
  - Detect user's language and reply in same.
  - Validate IDs against fleet context; if not found or multiple - > ask for clarification, intent: null.
  - Payloads:
    start_delivery/cancel_delivery/status_delivery: {"id": "delivery_id"}
    reroute_to_location: {"vehicleId": "vehicle_id", "locationId": "location_id"}
    show_vehicle_route: {"vehicleToken": "vehicle_token"}
    hide_all_routes: {}

  Fleet Context:
  ${fleetContext}

  Remember: only valid JSON.`;
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
