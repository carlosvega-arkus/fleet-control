import { VehiclesGeoJson, VehicleFeature, LocationsGeoJson, Delivery } from './types';

export interface AIIntent {
  type: 'start_delivery' | 'cancel_delivery' | 'status_delivery' | 'reroute_to_location' | 'show_vehicle_route' | 'hide_all_routes';
  payload: any;
}

export interface AIReplyRich {
  reply: string;
  intent?: AIIntent;
}

export function generateAIResponse(
  message: string,
  vehiclesData: VehiclesGeoJson | null,
  locationsData?: LocationsGeoJson | null,
  deliveriesData?: Delivery[] | null
): string {
  const lowerMessage = message.toLowerCase();

  if (!vehiclesData || !vehiclesData.features) {
    return "I'm still loading the fleet data. Please wait a moment and try again.";
  }

  const vehicles = vehiclesData.features;
  const enRouteVehicles = vehicles.filter((v) => v.properties.state === 'en_route');
  const idleVehicles = vehicles.filter((v) => v.properties.state === 'idle');
  const offlineVehicles = vehicles.filter((v) => v.properties.state === 'offline');

  if (lowerMessage.includes('en route') || lowerMessage.includes('moving') || lowerMessage.includes('driving')) {
    const vehicleList = enRouteVehicles
      .map((v) => `${v.properties.alias} (${v.properties.type})`)
      .join(', ');
    return `Currently, ${enRouteVehicles.length} vehicles are en route:\n${vehicleList}\n\nTotal fleet: ${vehicles.length} vehicles`;
  }

  if (lowerMessage.includes('offline') || lowerMessage.includes('disconnected')) {
    if (offlineVehicles.length === 0) {
      return 'Great news! All vehicles are currently online and operational.';
    }
    const vehicleList = offlineVehicles
      .map((v) => `${v.properties.alias} (${v.properties.id}) - Battery: ${v.properties.battery}%`)
      .join('\n');
    return `${offlineVehicles.length} vehicles are currently offline:\n${vehicleList}\n\nThese vehicles may need immediate attention.`;
  }

  if (lowerMessage.includes('idle') || lowerMessage.includes('parked')) {
    const vehicleList = idleVehicles
      .map((v) => `${v.properties.alias} (${v.properties.type})`)
      .join(', ');
    return `${idleVehicles.length} vehicles are currently idle:\n${vehicleList}\n\nThese vehicles are available for dispatch.`;
  }

  if (lowerMessage.includes('battery') || lowerMessage.includes('charge')) {
    const totalBattery = vehicles.reduce((sum, v) => sum + (v.properties.battery || 0), 0);
    const avgBattery = Math.round(totalBattery / vehicles.length);
    const lowBattery = vehicles.filter((v) => (v.properties.battery || 0) < 30);

    let response = `Average battery level: ${avgBattery}%\n`;

    if (lowBattery.length > 0) {
      const lowList = lowBattery
        .map((v) => `${v.properties.alias}: ${v.properties.battery}%`)
        .join(', ');
      response += `\n⚠️ ${lowBattery.length} vehicles have low battery:\n${lowList}`;
    } else {
      response += '\n✓ All vehicles have sufficient battery levels.';
    }

    return response;
  }

  if (lowerMessage.includes('speed') || lowerMessage.includes('fastest')) {
    const movingVehicles = enRouteVehicles.filter((v) => (v.properties.speed || 0) > 0);
    if (movingVehicles.length === 0) {
      return 'No vehicles are currently moving.';
    }

    const fastest = movingVehicles.reduce((max, v) =>
      (v.properties.speed || 0) > (max.properties.speed || 0) ? v : max
    );

    const avgSpeed =
      movingVehicles.reduce((sum, v) => sum + (v.properties.speed || 0), 0) / movingVehicles.length;

    return `Fastest vehicle: ${fastest.properties.alias} at ${fastest.properties.speed} km/h\nAverage speed of moving vehicles: ${Math.round(avgSpeed)} km/h`;
  }

  if (
    lowerMessage.includes('van') ||
    lowerMessage.includes('truck') ||
    lowerMessage.includes('motorcycle') ||
    lowerMessage.includes('bike') ||
    lowerMessage.includes('pickup') ||
    lowerMessage.includes('semi')
  ) {
    const typeMap: Record<string, string> = {
      'cargo van': 'cargo_van',
      'box truck': 'box_truck',
      'semi truck': 'semi_truck',
      pickup: 'pickup',
      truck: 'light_truck',
      van: 'van',
      motorcycle: 'motorcycle',
      bike: 'cargo_bike',
    };

    const requestedType = Object.keys(typeMap).find((key) => lowerMessage.includes(key));
    if (requestedType) {
      const type = typeMap[requestedType];
      const typeVehicles = vehicles.filter((v) => v.properties.type === type);
      const enRoute = typeVehicles.filter((v) => v.properties.state === 'en_route');

      return `${type.replace('_', ' ')} fleet status:\nTotal: ${typeVehicles.length}\nEn route: ${enRoute.length}\nIdle: ${typeVehicles.filter((v) => v.properties.state === 'idle').length}\nOffline: ${typeVehicles.filter((v) => v.properties.state === 'offline').length}`;
    }
  }

  if (lowerMessage.includes('status') || lowerMessage.includes('overview') || lowerMessage.includes('summary')) {
    return `Fleet Overview:\n\nTotal Vehicles: ${vehicles.length}\n✓ En Route: ${enRouteVehicles.length}\n⏸ Idle: ${idleVehicles.length}\n⚠️ Offline: ${offlineVehicles.length}\n\nAverage Battery: ${Math.round(vehicles.reduce((sum, v) => sum + (v.properties.battery || 0), 0) / vehicles.length)}%\n\nFleet is operating normally. How can I assist you further?`;
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm your Fleet AI Assistant. I can help you with:\n\n• Vehicle status and locations\n• Battery levels and charging\n• Speed and performance metrics\n• Fleet type breakdowns\n• Route planning assistance\n\nWhat would you like to know?`;
  }

  const responses = [
    `Based on current data, we have ${vehicles.length} vehicles in the fleet. ${enRouteVehicles.length} are currently en route.`,
    `I can help you with fleet information. Try asking about vehicle status, battery levels, or specific vehicle types.`,
    `The fleet is operating with ${vehicles.length} total vehicles. Would you like details about a specific aspect?`,
    `I have access to real-time fleet data. You can ask about vehicles, routes, battery levels, and more.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export function generateAIResponseRich(
  message: string,
  vehiclesData: VehiclesGeoJson | null,
  locationsData?: LocationsGeoJson | null,
  deliveriesData?: Delivery[] | null
): AIReplyRich {
  const base = generateAIResponse(message, vehiclesData, locationsData, deliveriesData);
  const lower = message.toLowerCase();

  // Intent: start delivery Dxxx
  const startMatch = lower.match(/start\s+delivery\s+(d\d{3,})/i);
  if (startMatch) {
    return { reply: `Starting delivery ${startMatch[1].toUpperCase()}...`, intent: { type: 'start_delivery', payload: { id: startMatch[1].toUpperCase() } } };
  }

  // Intent: status delivery Dxxx
  const statusMatch = lower.match(/status\s+delivery\s+(d\d{3,})/i);
  if (statusMatch && Array.isArray(deliveriesData)) {
    const id = statusMatch[1].toUpperCase();
    const d = deliveriesData.find((x) => x.id === id);
    if (d) {
      return { reply: `Delivery ${id} is ${d.status}. Vehicle ${d.vehicleId} from ${d.pickupWarehouseId} to ${d.dropStoreId}.`, intent: { type: 'status_delivery', payload: { id } } };
    }
    return { reply: `I could not find delivery ${id}.` };
  }

  // Intent: reroute vehicle to location (warehouse/store name or id)
  if ((/go to|ve al|ir al|send to/).test(lower) && locationsData && vehiclesData) {
    const vehMatch = lower.match(/(vehicle|carro|camion|camión)\s+([a-z0-9-]+)/i);
    const locMatch = lower.match(/(warehouse|almac[eé]n|store|tienda)\s+([a-z0-9-]+)/i);
    const vehicleToken = vehMatch?.[2];
    const locationToken = locMatch?.[2];
    if (vehicleToken && locationToken) {
      // Find vehicle by id or alias (case-insensitive)
      const v = vehiclesData.features.find((f) => f.properties.id.toLowerCase() === vehicleToken || f.properties.alias.toLowerCase().includes(vehicleToken));
      // Find location by id or name token
      const l = locationsData.features.find((f) => f.properties.id.toLowerCase() === locationToken || f.properties.name.toLowerCase().includes(locationToken));
      if (v && l) {
        return { reply: `Sending ${v.properties.alias} to ${l.properties.name}.`, intent: { type: 'reroute_to_location', payload: { vehicleId: v.properties.id, locationId: l.properties.id } } };
      }
    }
  }

  // Intent: cancel delivery Dxxx
  // Intent: show only this vehicle's route
  const showRouteMatch = lower.match(/(show|mostrar)\s+(route|trayecto)\s+(for\s+)?(vehicle|carro|camion|camión)\s+([a-z0-9-]+)/i);
  if (showRouteMatch) {
    const vehToken = showRouteMatch[5];
    return { reply: `Showing route for vehicle ${vehToken}.`, intent: { type: 'show_vehicle_route', payload: { vehicleToken: vehToken } } };
  }

  // Intent: hide all routes
  if (/(hide|ocultar)\s+(routes|trayectos)/.test(lower)) {
    return { reply: 'Hiding all routes.', intent: { type: 'hide_all_routes', payload: {} } };
  }
  const cancelMatch = lower.match(/cancel\s+delivery\s+(d\d{3,})/i);
  if (cancelMatch) {
    return { reply: `Cancelling delivery ${cancelMatch[1].toUpperCase()}...`, intent: { type: 'cancel_delivery', payload: { id: cancelMatch[1].toUpperCase() } } };
  }

  // Q&A: where is vehicle X
  if ((/where is|d[oó]nde est[aá]/).test(lower) && vehiclesData) {
    const m = lower.match(/(vehicle|carro|camion|camión)\s+([a-z0-9-]+)/i);
    if (m) {
      const token = m[2];
      const v = vehiclesData.features.find((f) => f.properties.id.toLowerCase() === token || f.properties.alias.toLowerCase().includes(token));
      if (v) {
        const [lon, lat] = v.geometry.coordinates;
        return { reply: `${v.properties.alias} is at ${lon.toFixed(5)}, ${lat.toFixed(5)} (state: ${v.properties.state}).` };
      }
    }
  }

  return { reply: base };
}
