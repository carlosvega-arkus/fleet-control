'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapViewProps, VehicleType } from '@/lib/types';

const VEHICLE_COLORS: Partial<Record<VehicleType, string>> = {
  van: '#2563EB',
  cargo_van: '#1D4ED8',
  pickup: '#0EA5E9',
  light_truck: '#64748B',
  box_truck: '#475569',
  semi_truck: '#334155',
  motorcycle: '#10B981',
  cargo_bike: '#8B5CF6',
};

export default function MapView({
  vehiclesGeoJson,
  routeGeoJson,
  locationsGeoJson,
  deliveryRoutesGeoJson,
  routesVersion,
  onMapLoaded,
  theme,
  pickMode,
  onMapPick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routesVisible, setRoutesVisible] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token is not configured');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:
        theme === 'day'
          ? 'mapbox://styles/mapbox/streets-v12'
          : 'mapbox://styles/mapbox/dark-v11',
      center: [-117.0382, 32.5149],
      zoom: 12,
    });

    map.current.on('load', () => {
      if (onMapLoaded) {
        onMapLoaded();
      }
      // Vehicles source/layer
      if (!map.current!.getSource('vehicles')) {
        map.current!.addSource('vehicles', {
          type: 'geojson',
          data: vehiclesGeoJson || { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.current!.getLayer('vehicles-points')) {
        map.current!.addLayer({
          id: 'vehicles-points',
          type: 'circle',
          source: 'vehicles',
          paint: {
            'circle-color': '#EF4444',
            'circle-radius': 5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        });
      }

      // Locations source/layers (warehouses/stores separated)
      if (!map.current!.getSource('locations')) {
        map.current!.addSource('locations', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.current!.getLayer('warehouses-points')) {
        map.current!.addLayer({
          id: 'warehouses-points',
          type: 'circle',
          source: 'locations',
          filter: ['==', ['get', 'type'], 'warehouse'],
          paint: {
            'circle-color': '#3B82F6',
            'circle-radius': 7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        });
      }
      if (!map.current!.getLayer('stores-points')) {
        map.current!.addLayer({
          id: 'stores-points',
          type: 'circle',
          source: 'locations',
          filter: ['==', ['get', 'type'], 'store'],
          paint: {
            'circle-color': '#10B981',
            'circle-radius': 6,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        });
      }
      // vehicle labels with alias for clarity
      if (!map.current!.getLayer('vehicles-labels')) {
        map.current!.addLayer({
          id: 'vehicles-labels',
          type: 'symbol',
          source: 'vehicles',
          layout: { 'text-field': ['get', 'alias'], 'text-size': 10, 'text-offset': [0, 1] },
          paint: { 'text-color': '#111827', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 },
        });
      }
      if (!map.current!.getLayer('locations-labels')) {
        map.current!.addLayer({
          id: 'locations-labels',
          type: 'symbol',
          source: 'locations',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
          },
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [theme]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    // Ensure sources exist even if load handler missed
    if (!map.current.getSource('vehicles')) {
      map.current.addSource('vehicles', { type: 'geojson', data: vehiclesGeoJson || { type: 'FeatureCollection', features: [] } });
      if (!map.current.getLayer('vehicles-points')) {
        map.current.addLayer({ id: 'vehicles-points', type: 'circle', source: 'vehicles', paint: { 'circle-color': '#EF4444', 'circle-radius': 5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } });
      }
      if (!map.current.getLayer('vehicles-labels')) {
        map.current.addLayer({ id: 'vehicles-labels', type: 'symbol', source: 'vehicles', layout: { 'text-field': ['get', 'alias'], 'text-size': 10, 'text-offset': [0, 1] }, paint: { 'text-color': '#111827', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });
      }
    }
    const vsrc = map.current.getSource('vehicles') as mapboxgl.GeoJSONSource;
    if (vsrc && vehiclesGeoJson) vsrc.setData(vehiclesGeoJson);

    if (!map.current.getSource('locations')) {
      map.current.addSource('locations', { type: 'geojson', data: locationsGeoJson || { type: 'FeatureCollection', features: [] } });
      if (!map.current.getLayer('warehouses-points')) {
        map.current.addLayer({ id: 'warehouses-points', type: 'circle', source: 'locations', filter: ['==', ['get', 'type'], 'warehouse'], paint: { 'circle-color': '#3B82F6', 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } });
      }
      if (!map.current.getLayer('stores-points')) {
        map.current.addLayer({ id: 'stores-points', type: 'circle', source: 'locations', filter: ['==', ['get', 'type'], 'store'], paint: { 'circle-color': '#10B981', 'circle-radius': 6, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } });
      }
      if (!map.current.getLayer('locations-labels')) {
        map.current.addLayer({ id: 'locations-labels', type: 'symbol', source: 'locations', layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2] }, paint: { 'text-color': '#111827', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });
      }
    }
    const lsrc = map.current.getSource('locations') as mapboxgl.GeoJSONSource;
    if (lsrc && locationsGeoJson) lsrc.setData(locationsGeoJson as any);
  }, [vehiclesGeoJson, locationsGeoJson]);

  useEffect(() => {
    if (!map.current) return;
    const handler = (e: mapboxgl.MapMouseEvent) => {
      if (!pickMode || !onMapPick) return;
      const { lng, lat } = e.lngLat;
      onMapPick(lng, lat);
    };
    map.current.on('click', handler);
    return () => {
      if (map.current) map.current.off('click', handler);
    };
  }, [pickMode, onMapPick]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const src = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (src) {
      src.setData(routeGeoJson || { type: 'FeatureCollection', features: [] } as any);
    } else if (routeGeoJson) {
      map.current.addSource('route', { type: 'geojson', data: routeGeoJson });
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'case', ['==', ['get', 'variant'], 'primary'], theme === 'day' ? '#2563EB' : '#60A5FA', theme === 'day' ? '#64748B' : '#94A3B8'
          ],
          'line-width': [
            'case', ['==', ['get', 'variant'], 'primary'], theme === 'day' ? 5 : 4, theme === 'day' ? 3 : 3
          ],
          'line-opacity': [
            'case', ['==', ['get', 'variant'], 'primary'], theme === 'day' ? 0.8 : 0.9, 0.5
          ],
        },
      });
      // Do not auto-fit on updates to avoid zoom jumps
    }
  }, [routeGeoJson, theme]);

  // Delivery routes overlay (multiple)
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    // Recreate source/layer to guarantee a clean slate on any version bump
    if (map.current.getSource('delivery-routes')) {
      if (map.current.getLayer('delivery-routes-line')) map.current.removeLayer('delivery-routes-line');
      map.current.removeSource('delivery-routes');
    }
    if (deliveryRoutesGeoJson && deliveryRoutesGeoJson.features && deliveryRoutesGeoJson.features.length > 0) {
      map.current.addSource('delivery-routes', { type: 'geojson', data: deliveryRoutesGeoJson });
      map.current.addLayer({
        id: 'delivery-routes-line',
        type: 'line',
        source: 'delivery-routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#F59E0B'],
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });
      map.current.setLayoutProperty('delivery-routes-line', 'visibility', routesVisible ? 'visible' : 'none');
    }
  }, [deliveryRoutesGeoJson, routesVisible, routesVersion]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainer}
        className="w-full h-full"
        role="application"
        aria-label="Fleet control map showing vehicle locations"
      />
      <div className="absolute top-2 left-2 bg-white/90 border rounded-md p-2 text-[12px] space-y-1 pointer-events-none">
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} /> Vehicles</div>
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#3B82F6' }} /> Warehouses</div>
        <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} /> Stores</div>
      </div>
      {/* Toggle delivery lines */}
      <button
        type="button"
        onClick={() => {
          if (!map.current) return;
          const next = !routesVisible;
          setRoutesVisible(next);
          if (map.current.getLayer('delivery-routes-line')) {
            map.current.setLayoutProperty('delivery-routes-line', 'visibility', next ? 'visible' : 'none');
          }
        }}
        className="absolute top-2 right-2 bg-white border rounded-md text-[12px] px-2 py-1 shadow"
        aria-label="Toggle delivery routes"
      >
        {routesVisible ? 'Hide routes' : 'Show routes'}
      </button>
    </div>
  );
}
