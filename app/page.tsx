'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import Header from '@/components/Header';
import ControlsPanel from '@/components/ControlsPanel';
import ChatPanel from '@/components/ChatPanel';
import FleetPanel from '@/components/FleetPanel';
import RoutePlannerModal from '@/components/RoutePlannerModal';
import RoutesPanel from '@/components/RoutesPanel';
import LogisticsPanel from '@/components/LogisticsPanel';
import SchedulerPanel from '@/components/SchedulerPanel';
import { VehicleFeature } from '@/lib/types';
import {
  VehiclesGeoJson,
  RouteGeoJson,
  MapTheme,
  Message,
  LocationsGeoJson,
} from '@/lib/types';
import { initSimulation, start as startSim, stop as stopSim, startDelivery as simStartDelivery, cancelDelivery as simCancelDelivery, rerouteVehicleTo as simReroute, removeVehicle as simRemoveVehicle } from '@/lib/simulation';
import { generateAIResponseRich } from '@/lib/ai-responses';
import { generateAlias } from '@/lib/utils';
import { saveRoute, getSavedRoutes } from '@/lib/storage';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-fleet-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fleet-primary mx-auto mb-4" />
        <p className="text-fleet-text-secondary">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [vehiclesData, setVehiclesData] = useState<VehiclesGeoJson | null>(null);
  const vehiclesRef = useRef<VehiclesGeoJson | null>(null);
  const [routeData, setRouteData] = useState<RouteGeoJson | null>(null);
  const [locationsData, setLocationsData] = useState<LocationsGeoJson | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveryRoutes, setDeliveryRoutes] = useState<RouteGeoJson | null>(null);
  const [routesVersion, setRoutesVersion] = useState(0);
  const routeColors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<Set<string>>(new Set());
  const [isRouting, setIsRouting] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('day');
  const [origin, setOrigin] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [destination, setDestination] = useState('');
  const [optimizeStops, setOptimizeStops] = useState(true);
  const [routeSummary, setRouteSummary] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [savedRoutes, setSavedRoutes] = useState(() => getSavedRoutes());
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [isFleetOpen, setIsFleetOpen] = useState(false);
  const [isRoutesOpen, setIsRoutesOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(true);
  const [pickMode, setPickMode] = useState<{ active: boolean; field?: { kind: 'origin' | 'destination' | 'stop'; index?: number } }>({ active: false });

  useEffect(() => {
    const savedTheme = localStorage.getItem('fleet-theme') as MapTheme | null;
    if (savedTheme) {
      setMapTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    vehiclesRef.current = vehiclesData;
  }, [vehiclesData]);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch('/mock/vehicles.geojson');
        const data = await response.json();
        const source = (Array.isArray(data?.features) ? data.features.slice(0, 15) : []) as any[];
        const manufacturersByType: Record<string, { m: string; model: string }[]> = {
          cargo_van: [
            { m: 'Mercedes', model: 'Sprinter 2500' },
            { m: 'Ford', model: 'Transit' },
            { m: 'RAM', model: 'ProMaster' },
          ],
          van: [
            { m: 'Nissan', model: 'NV200' },
            { m: 'Chevrolet', model: 'Express' },
          ],
          pickup: [
            { m: 'Ford', model: 'F-150' },
            { m: 'Toyota', model: 'Hilux' },
          ],
          light_truck: [
            { m: 'Isuzu', model: 'N-Series' },
            { m: 'Hino', model: '300' },
          ],
          box_truck: [
            { m: 'Freightliner', model: 'M2 106' },
          ],
          semi_truck: [
            { m: 'Mercedes', model: 'Actros' },
            { m: 'Volvo', model: 'FH' },
          ],
          motorcycle: [
            { m: 'Honda', model: 'CB500' },
            { m: 'Yamaha', model: 'FZ-25' },
          ],
          cargo_bike: [
            { m: 'Urban Arrow', model: 'Cargo' },
          ],
        };

        let arr = source.map((f, idx) => {
          const t = f.properties?.type || 'van';
          const options = manufacturersByType[t] || [{ m: 'Generic', model: 'Model' }];
          const pick = options[idx % options.length];
          const alias = generateAlias('TJ', t, pick.m, pick.model, idx + 1);
          return {
            ...f,
            properties: {
              ...f.properties,
              alias,
              manufacturer: pick.m,
              model: pick.model,
              year: f.properties?.year || 2021 + ((idx % 4) as number),
            },
          } as any;
        });

        // Ensure we have at least one semi_truck for the demo
        if (!arr.some((it) => it.properties?.type === 'semi_truck') && arr.length > 0) {
          const idx = arr.findIndex((it) => it.properties?.type === 'light_truck');
          const targetIdx = idx >= 0 ? idx : 0;
          const pick = manufacturersByType['semi_truck'][0];
          const base = arr[targetIdx];
          const alias = generateAlias('TJ', 'semi_truck', pick.m, pick.model, targetIdx + 1);
          arr[targetIdx] = {
            ...base,
            properties: {
              ...base.properties,
              type: 'semi_truck',
              alias,
              manufacturer: pick.m,
              model: pick.model,
              capacity_kg: base.properties?.capacity_kg ?? 20000,
            },
          };
        }

        // Limit to 5 demo vehicles that are referenced by deliveries
        try {
          const dres = await fetch('/mock/deliveries.json');
          const ddata = await dres.json();
          setDeliveries(ddata);
          const idSet = new Set((Array.isArray(ddata) ? ddata : []).map((d: any) => d.vehicleId));
          const picked = arr.filter((f: any) => idSet.has(f.properties?.id)).slice(0, 5);
          const limited = { ...data, features: picked } as VehiclesGeoJson;
          setVehiclesData(limited);
        } catch {
          const limited = { ...data, features: arr.slice(0, 5) } as VehiclesGeoJson;
          setVehiclesData(limited);
        }
      } catch (error) {
        console.error('Failed to load vehicles data:', error);
      }
    }

    async function loadLocations() {
      try {
        const res = await fetch('/mock/locations.geojson');
        const data = (await res.json()) as LocationsGeoJson;
        setLocationsData(data);
      } catch (e) {
        console.error('Failed to load locations:', e);
      }
    }

    loadVehicles();
    loadLocations();
  }, []);

  useEffect(() => {
    if (!vehiclesData || !locationsData || deliveries.length === 0) return;
    (async () => {
      await initSimulation(vehiclesData, locationsData, deliveries, {
        onVehiclesUpdate: (v) => setVehiclesData({ ...v }),
        onDeliveriesUpdate: (d) => {
          console.log('[deliveriesUpdate] total:', d.length);
          setDeliveries([...d]);
          // build a combined feature collection for active deliveries' routes
          const currentVehicles = vehiclesRef.current?.features || [];
          const vehicleIds = new Set(currentVehicles.map((f) => f.properties.id));
          console.log('[deliveriesUpdate] vehicleIds:', Array.from(vehicleIds));
          // stable color per vehicle
          const vehicleList = currentVehicles.map((f) => f.properties.id);
          const colorByVehicle: Record<string, string> = {};
          vehicleList.forEach((id, idx) => (colorByVehicle[id] = routeColors[idx % routeColors.length]));

          const features = d
            .filter((x: any) => x?.status !== 'cancelled')
            .filter((x: any) => x?.route?.features?.length)
            .filter((x: any) => vehicleIds.has(x.vehicleId) && !hiddenVehicleIds.has(x.vehicleId))
            .flatMap((x: any) =>
              x.route.features.map((f: any) => ({
                ...f,
                properties: {
                  ...(f.properties || {}),
                  variant: 'primary',
                  vehicleId: x.vehicleId,
                  deliveryId: x.id,
                  color: colorByVehicle[x.vehicleId] || '#F59E0B',
                },
              }))
            );
          console.log('[deliveriesUpdate] features after filter:', features.length);
          setDeliveryRoutes(features.length ? { type: 'FeatureCollection', features } : null);
          setRoutesVersion((v) => v + 1);
        },
      });
      startSim();
      // Auto-start a few deliveries so vehicles move by default
      try {
        const toStart = (deliveries || []).filter((d: any) => d.status === 'pending').slice(0, 3);
        for (const d of toStart) {
          await simStartDelivery(d.id);
        }
      } catch {}
    })();
    return () => {
      stopSim();
    };
  }, [vehiclesData && locationsData && deliveries.length > 0]);

  const handleRequestRoute = async (originCoords: string, stopsList: string[], destCoords: string) => {
    setIsRouting(true);
    setRouteSummary(null);

    try {
      const parse = (s: string) => {
        const parts = s.split(',').map((p) => p.trim());
        if (parts.length !== 2) return null;
        const lon = Number(parts[0]);
        const lat = Number(parts[1]);
        if (!isFinite(lon) || !isFinite(lat)) return null;
        return [lon, lat] as [number, number];
      };
      let ordered = stopsList;
      if (optimizeStops) {
        const originPt = parse(originCoords);
        const pts = stopsList.map(parse).filter(Boolean) as [number, number][];
        if (originPt && pts.length > 1) {
          const remaining = [...pts];
          const orderedPts: [number, number][] = [];
          let current = originPt;
          const dist = (a: [number, number], b: [number, number]) => {
            const dx = a[0] - b[0];
            const dy = a[1] - b[1];
            return Math.hypot(dx, dy);
          };
          while (remaining.length) {
            let bestIdx = 0;
            let bestD = Infinity;
            for (let i = 0; i < remaining.length; i++) {
              const d = dist(current, remaining[i]);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            const next = remaining.splice(bestIdx, 1)[0];
            orderedPts.push(next);
            current = next;
          }
          ordered = orderedPts.map((p) => `${p[0]}, ${p[1]}`);
        }
      }

      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: originCoords, stops: ordered, destination: destCoords }),
      });
      const data = await response.json();
      if (data?.route) {
        setRouteData(data.route);
        const primary = data?.route?.features?.find((f: any) => f?.properties?.variant === 'primary');
        const dist = primary?.properties?.distance ?? 0;
        const dur = primary?.properties?.duration ?? 0;
        setRouteSummary({ distanceKm: dist / 1000, durationMin: dur / 60 });
      } else {
        console.error('Routing error:', data?.error || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to load route data:', error);
    } finally {
      setIsRouting(false);
    }
  };

  const handleThemeToggle = () => {
    const newTheme: MapTheme = mapTheme === 'day' ? 'night' : 'day';
    setMapTheme(newTheme);
    localStorage.setItem('fleet-theme', newTheme);
  };

  /**
   * Handles AI intent actions received from chat or API responses.
   *
   * Dispatches simulation state changes or UI updates based on the detected intent type.
   *
   * @param {object} intent - The AI intent object, containing type and payload.
   * @param {string} intent.type - Intent type (e.g., 'start_delivery', 'reroute_to_location').
   * @param {object} intent.payload - Intent payload, varies by type.
   */
  const handleIntent = (intent: any) => {
    if (!intent) return;
    switch (intent?.type) {
      case 'start_delivery':
        simStartDelivery(intent.payload.id);
        break;
      case 'cancel_delivery':
        simCancelDelivery(intent.payload.id);
        break;
      case 'reroute_to_location':
        simReroute(intent.payload.vehicleId, intent.payload.locationId);
        break;
      case 'show_vehicle_route': {
        /** Extracts and matches routes for the given vehicle token, and updates the delivery routes shown on the map. */
        const token = (intent.payload.vehicleToken as string).toLowerCase();
        const all = (deliveries || [])
          .filter((d: any) => d?.route?.features?.length)
          .flatMap((d: any) => d.route.features);
        const filtered = all.filter((f: any) =>
          String(f?.properties?.vehicleId || '').toLowerCase().includes(token)
        );
        setDeliveryRoutes(
          filtered.length
            ? { type: 'FeatureCollection', features: filtered }
            : null
        );
        break;
      }
      case 'hide_all_routes':
        setDeliveryRoutes(null);
        break;
      default:
        break;
    }
  };

  /**
   * Handles sending a user message to the AI assistant, updating the chat message state,
   * and processing the AI's response (including intent handling).
   *
   * 1. Appends the user's message to chat.
   * 2. Sets loading state.
   * 3. Sends the full updated message history and fleet context (vehicles, locations, deliveries) to the `/api/chat` endpoint.
   * 4. Handles AI API response:
   *    - Processes any detected intent with `handleIntent`.
   *    - Adds the assistant's reply as a new message to the chat.
   * 5. If the API call fails, falls back to local AI logic (`generateAIResponseRich`).
   * 6. Resets loading state.
   *
   * @param {string} content - The text of the user message to send.
   * @returns {Promise<void>} Resolves when operation completes.
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    /** Assemble the user's message object */
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date(),
    };
    /** Create updated message history including new user message */
    const updatedMessages = [...chatMessages, userMessage];

    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    /**
     * Helper to construct an assistant message object for UI state.
     * @param {string} reply - AI's reply content.
     * @returns {Message} Assistant message object.
     */
    const createAssistantMessage = (reply: string): Message => ({
      id: `msg-${Date.now()}-ai`,
      type: 'assistant',
      content: reply,
      timestamp: new Date(),
    });

    try {
      // Send message + context to API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          vehiclesData,
          locationsData,
          deliveriesData: deliveries,
        }),
      });
      const data = await res.json();

      // If intent is returned from the backend, process with handleIntent
      handleIntent(data.intent);

      setChatMessages((prev) => [
        ...prev,
        createAssistantMessage(data?.reply || 'Sorry, I could not generate a response.'),
      ]);
    } catch (e) {
      // If server/AI is unavailable, fall back to local AI response
      const rich = generateAIResponseRich(
        content,
        vehiclesData,
        locationsData,
        deliveries
      );
      handleIntent(rich.intent);

      setChatMessages((prev) => [
        ...prev,
        createAssistantMessage(rich.reply),
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleUpdateVehicle = (updated: VehicleFeature) => {
    setVehiclesData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        features: prev.features.map((f) => (f.properties.id === updated.properties.id ? updated : f)),
      } as VehiclesGeoJson;
      return next;
    });
  };

  const handleAddVehicle = (vehicle: VehicleFeature) => {
    setVehiclesData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, features: [vehicle, ...prev.features] } as VehiclesGeoJson;
      // Keep only 5 in demo
      next.features = next.features.slice(0, 5);
      return next;
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    console.log('[deleteVehicle] request id:', vehicleId);
    setVehiclesData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, features: prev.features.filter((f) => f.properties.id !== vehicleId) } as VehiclesGeoJson;
      // update ref immediately to avoid race with callbacks
      vehiclesRef.current = next;
      console.log('[deleteVehicle] vehicles after delete:', next.features.map((f) => f.properties.id));
      return next;
    });
    // keep simulation in sync
    simRemoveVehicle(vehicleId);
    // Recompute overlay immediately without this vehicle
    setDeliveryRoutes(() => {
      const currentVehicles = vehiclesRef.current?.features || [];
      const idSet = new Set(currentVehicles.map((f) => f.properties.id));
      const vehicleList = currentVehicles.map((f) => f.properties.id);
      const colorByVehicle: Record<string, string> = {};
      vehicleList.forEach((id, idx) => (colorByVehicle[id] = routeColors[idx % routeColors.length]));
      const feats = (deliveries || [])
        .filter((x: any) => x?.status !== 'cancelled')
        .filter((x: any) => x?.route?.features?.length)
        .filter((x: any) => idSet.has(x.vehicleId) && x.vehicleId !== vehicleId)
        .flatMap((x: any) =>
          x.route.features.map((f: any) => ({
            ...f,
            properties: { ...(f.properties || {}), variant: 'primary', vehicleId: x.vehicleId, deliveryId: x.id, color: colorByVehicle[x.vehicleId] || '#F59E0B' },
          }))
        );
      console.log('[deleteVehicle] recomputed overlay features:', feats.length);
      return feats.length ? { type: 'FeatureCollection', features: feats } : null;
    });
    // ensure future updates also exclude it by vehicle id and alias
    const removedAliases = vehiclesRef.current?.features
      ?.filter((f) => f.properties.id === vehicleId)
      .map((f) => f.properties.alias.toLowerCase()) || [];
    setHiddenVehicleIds((prev) => new Set([...Array.from(prev), vehicleId, ...removedAliases]));
    setRoutesVersion((v) => v + 1);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-fleet-background">
      <Header
        theme={mapTheme}
        onThemeToggle={handleThemeToggle}
        onRoutePlanningClick={() => setIsRoutePanelOpen((v) => !v)}
        onFleetClick={() => setIsFleetOpen(true)}
        onRoutesClick={() => setIsRoutesOpen(true)}
        onSchedulerClick={() => setIsSchedulerOpen(true)}
      />

      <div className="flex-1 relative flex w-full overflow-hidden">
        <div className="flex-1 relative">
          <MapView
            vehiclesGeoJson={vehiclesData}
            routeGeoJson={routeData}
            locationsGeoJson={locationsData}
            deliveryRoutesGeoJson={deliveryRoutes}
            routesVersion={routesVersion}
            theme={mapTheme}
            onMapLoaded={() => console.log('Map loaded successfully')}
            pickMode={pickMode.active}
            onMapPick={(lng, lat) => {
              if (!pickMode.active || !pickMode.field) return;
              const coord = `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
              if (pickMode.field.kind === 'origin') setOrigin(coord);
              else if (pickMode.field.kind === 'destination') setDestination(coord);
              else if (pickMode.field.kind === 'stop' && pickMode.field.index != null) {
                setStops((prev) => prev.map((s, idx) => (idx === pickMode.field!.index ? coord : s)));
              }
              setPickMode({ active: false });
              setIsRoutePanelOpen(true);
            }}
          />

          {isRoutePanelOpen && (
            <></>
          )}
        </div>

        <div className="border-l bg-white flex flex-col h-full overflow-hidden">
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            isOpen={true}
            onToggle={() => {}}
          />
        </div>
      </div>

      <FleetPanel
        open={isFleetOpen}
        onOpenChange={setIsFleetOpen}
        vehicles={vehiclesData}
        onUpdateVehicle={(v: VehicleFeature) => handleUpdateVehicle(v)}
        onAddVehicle={(v: VehicleFeature) => handleAddVehicle(v)}
        onDeleteVehicle={(id: string) => handleDeleteVehicle(id)}
      />

      <RoutesPanel open={isRoutesOpen} onOpenChange={setIsRoutesOpen} />
      <SchedulerPanel open={isSchedulerOpen} onOpenChange={setIsSchedulerOpen} vehicles={vehiclesData} />
      <LogisticsPanel
        open={isLogisticsOpen}
        onOpenChange={setIsLogisticsOpen}
        locations={locationsData}
        deliveries={deliveries as any}
        onStart={(id) => simStartDelivery(id)}
        onCancel={(id) => {}}
      />

      <RoutePlannerModal
        open={isRoutePanelOpen}
        onOpenChange={setIsRoutePanelOpen}
        origin={origin}
        stops={stops}
        destination={destination}
        onOriginChange={setOrigin}
        onStopChange={(i, v) => setStops((prev) => prev.map((s, idx) => (idx === i ? v : s)))}
        onAddStop={() => setStops((prev) => [...prev, ''])}
        onRemoveStop={(i) => setStops((prev) => prev.filter((_, idx) => idx !== i))}
        onDestinationChange={setDestination}
        onRequestRoute={handleRequestRoute}
        isRouting={isRouting}
        optimize={optimizeStops}
        onToggleOptimize={() => setOptimizeStops((v) => !v)}
        routeSummary={routeSummary}
        onPickField={(field) => {
          setPickMode({ active: true, field });
        }}
        onSaveRoute={(name) => {
          const saved = saveRoute({ name, origin, stops, destination });
          setSavedRoutes((prev) => [saved, ...prev]);
        }}
      />
    </div>
  );
}
