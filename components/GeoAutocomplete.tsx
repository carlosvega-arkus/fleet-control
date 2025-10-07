'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { addRecentPlace, getRecentPlaces, type RecentPlace } from '@/lib/storage';

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

interface GeoAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (lng: number, lat: number, label: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function GeoAutocomplete({ value, onChange, onSelect, placeholder, disabled }: GeoAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [recents, setRecents] = useState<RecentPlace[]>([] as any);
  const controllerRef = useRef<AbortController | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const search = useCallback(async (q: string) => {
    if (!token || !q || q.length < 3) {
      setItems([]);
      return;
    }
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setLoading(true);
    try {
      const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
      url.searchParams.set('autocomplete', 'true');
      url.searchParams.set('limit', '5');
      url.searchParams.set('language', 'en');
      // Bias to Tijuana (but do not limit results)
      url.searchParams.set('proximity', '-117.0382,32.5149');
      url.searchParams.set('country', 'mx,us');
      url.searchParams.set('types', 'address,place,poi');
      url.searchParams.set('access_token', token);
      const res = await fetch(url.toString(), { signal: ctrl.signal });
      if (!res.ok) throw new Error('geocoding failed');
      const data = await res.json();
      const feats = Array.isArray(data?.features) ? data.features : [];
      const mapped: Suggestion[] = feats.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center }));

      // Sort so that Tijuana and nearby cities appear first
      const bias: [number, number] = [-117.0382, 32.5149];
      const nearbyKeywords = ['tijuana', 'rosarito', 'tecate', 'ensenada', 'san diego', 'chula vista', 'otay'];
      const dist = (a: [number, number], b: [number, number]) => {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.hypot(dx, dy);
      };
      const scored = mapped.map((m) => {
        const d = dist(m.center, bias);
        const name = m.place_name.toLowerCase();
        let boost = 0;
        if (name.includes('tijuana')) boost -= 1.0;
        else if (nearbyKeywords.some((k) => name.includes(k))) boost -= 0.5;
        return { m, score: d + boost };
      });
      scored.sort((a, b) => a.score - b.score);
      setItems(scored.map((s) => s.m));
      setOpen(true);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setItems([]);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Debounce input
  useEffect(() => {
    setRecents(getRecentPlaces());
    const h = setTimeout(() => {
      const trimmed = value.trim();
      // If user enters lon,lat directly, don't query API
      if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(trimmed)) {
        setItems([]);
        setOpen(false);
        return;
      }
      search(trimmed);
    }, 250);
    return () => clearTimeout(h);
  }, [value, search]);

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
        className="rounded-md text-[13px]"
      />
      {open && (items.length > 0 || recents.length > 0) && (
        <div className="absolute z-40 mt-1 w-full rounded-md border bg-white shadow-sm">
          <ul className="max-h-56 overflow-auto py-1">
            {recents.length > 0 && (
              <li className="px-3 py-1 text-[11px] text-muted-foreground">Recent</li>
            )}
            {recents.map((r) => (
              <li
                key={`r-${r.id}`}
                className="px-3 py-2 text-[13px] hover:bg-fleet-background cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(r.lng, r.lat, r.label);
                  setOpen(false);
                }}
              >
                {r.label}
              </li>
            ))}
            {items.map((s) => (
              <li
                key={s.id}
                className="px-3 py-2 text-[13px] hover:bg-fleet-background cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const [lng, lat] = s.center;
                  onSelect(lng, lat, s.place_name);
                  addRecentPlace(s.place_name, lng, lat);
                  setOpen(false);
                }}
              >
                {s.place_name}
              </li>
            ))}
            {loading && (
              <li className="px-3 py-2 text-[13px] text-muted-foreground">Searching…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


