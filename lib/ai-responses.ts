import { VehiclesGeoJson, VehicleFeature } from './types';

export function generateAIResponse(
  message: string,
  vehiclesData: VehiclesGeoJson | null
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
