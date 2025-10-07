export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

function parseCoord(s: string): [number, number] | null {
  if (!s) return null;
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!isFinite(lon) || !isFinite(lat)) return null;
  return [lon, lat];
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    origin?: string;
    stops?: string[];
    destination?: string;
  };

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
  }

  const origin = parseCoord(body?.origin || '');
  const destination = parseCoord(body?.destination || '');
  const stops = Array.isArray(body?.stops) ? body!.stops.map(parseCoord).filter(Boolean) as [number, number][] : [];

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Invalid origin or destination' }, { status: 400 });
  }

  const allPoints: [number, number][] = [origin, ...stops, destination];
  const coordsPath = allPoints.map((c) => `${c[0]},${c[1]}`).join(';');

  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordsPath}`);
  url.searchParams.set('alternatives', 'true');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('annotations', 'duration,distance,speed');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('language', 'en');
  url.searchParams.set('access_token', token);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Mapbox error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    const routes = Array.isArray(data?.routes) ? data.routes : [];

    const features = routes.map((r: any, idx: number) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        distance: r.distance,
        duration: r.duration,
        variant: idx === 0 ? 'primary' : 'alt',
      },
    }));

    const fc = { type: 'FeatureCollection', features };
    return NextResponse.json({ route: fc, raw: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Routing failed' }, { status: 500 });
  }
}


