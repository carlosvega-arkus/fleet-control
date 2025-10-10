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
  const context = buildFleetContext({
    vehiclesData,
    locationsData,
    deliveriesData,
  });
  const systemPreamble =
    "You are a concise, helpful Fleet Operations Assistant. Respond in clear, plain English. If asked about fleet metrics, use the provided context. Keep answers short and actionable.";

  const systemResponse = `Always respond in the following JSON format:
  {
    "reply": "string", 
    "intent": {
        "type": ${AIIntentTypes.join(" | ")},
        "payload": { "relevant keys per intent" }
    } | null
  }
    
  You must strictly validate all data references using the provided "Fleet context" before creating an intent:

  - If a vehicle, warehouse, store, or delivery ID/name mentioned by the user does **not** exist in the fleet context, DO NOT create an intent.
  - Instead, reply clearly stating that the entity was not found. Example:
    {
      "reply": "Vehicle 'TJ-VN-Nissan-NV200-34564' was not found in the current fleet.",
      "intent": null
    }

  - If multiple matches exist, mention that and ask for clarification, e.g.:
    {
      "reply": "There are multiple stores named 'Warehouse A'. Please specify which one.",
      "intent": null
    }

  Payload rules:
  - For start/cancel/status delivery: payload must include "id" of an existing delivery.
  - For reroute: payload must include "vehicleId" and "locationId" of existing entities.
  - For show_vehicle_route: payload must include a valid "vehicleToken" that matches a known vehicle.
  - For hide_all_routes: payload is empty {}.
  `;

  const exampleResponse = `
  User message: "Send vehicle NV001 to Warehouse A"
  Response:
  {
    "reply": "Sending NV001 to Warehouse A.",
    "intent": {
      "type": "reroute_to_location",
      "payload": {
        "vehicleId": "V001",
        "locationId": "WH1"
      }
    }
  }`;

  return `
    ${systemPreamble}
    ${systemResponse}
    Fleet context: ${context} 

    Example: ${exampleResponse}
    
    Respond ONLY in JSON, do not add extra text.
  `;
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
