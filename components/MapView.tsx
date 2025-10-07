'use client';

import { useEffect, useRef } from 'react';
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
  onMapLoaded,
  theme,
  pickMode,
  onMapPick,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

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
      // Vehicle points/clusters intentionally not added per current requirements
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [theme, onMapLoaded]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource('vehicles') as mapboxgl.GeoJSONSource;
    if (source && vehiclesGeoJson) {
      source.setData(vehiclesGeoJson);
    }
  }, [vehiclesGeoJson]);

  useEffect(() => {
    if (!map.current) return;
    const handler = (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
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

    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }

    if (routeGeoJson && routeGeoJson.features.length > 0) {
      map.current.addSource('route', {
        type: 'geojson',
        data: routeGeoJson,
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'variant'], 'primary'],
            theme === 'day' ? '#2563EB' : '#60A5FA',
            theme === 'day' ? '#64748B' : '#94A3B8'
          ],
          'line-width': [
            'case',
            ['==', ['get', 'variant'], 'primary'],
            theme === 'day' ? 5 : 4,
            theme === 'day' ? 3 : 3
          ],
          'line-opacity': [
            'case',
            ['==', ['get', 'variant'], 'primary'],
            theme === 'day' ? 0.8 : 0.9,
            0.5
          ],
        },
      });

      const coordinates = routeGeoJson.features[0].geometry.coordinates;
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(
          coordinates[0] as [number, number],
          coordinates[0] as [number, number]
        )
      );

      map.current.fitBounds(bounds, {
        padding: 100,
        duration: 1000,
      });
    }
  }, [routeGeoJson, theme]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      role="application"
      aria-label="Fleet control map showing vehicle locations"
    />
  );
}
