'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GeoAutocomplete from '@/components/GeoAutocomplete';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Navigation, Loader as Loader2, Crosshair } from 'lucide-react';

interface RoutePlannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin: string;
  stops: string[];
  destination: string;
  onOriginChange: (value: string) => void;
  onStopChange: (index: number, value: string) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onDestinationChange: (value: string) => void;
  onRequestRoute: (origin: string, stops: string[], destination: string) => void;
  isRouting: boolean;
  optimize: boolean;
  onToggleOptimize: () => void;
  routeSummary?: { distanceKm: number; durationMin: number } | null;
  onPickField: (field: { kind: 'origin' | 'destination' | 'stop'; index?: number }) => void;
  onSaveRoute?: (name: string) => void;
}

export default function RoutePlannerModal(props: RoutePlannerModalProps) {
  const {
    open,
    onOpenChange,
    origin,
    stops,
    destination,
    onOriginChange,
    onStopChange,
    onAddStop,
    onRemoveStop,
    onDestinationChange,
    onRequestRoute,
    isRouting,
    optimize,
    onToggleOptimize,
    routeSummary,
    onPickField,
  } = props;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination && !isRouting) {
      onRequestRoute(origin, stops, destination);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Route Planning</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="origin" className="text-xs font-medium text-fleet-text-primary">
                Origin (address, place or lon, lat)
              </Label>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" onClick={() => onPickField({ kind: 'origin' })}>
                <Crosshair className="h-3.5 w-3.5 mr-1" /> Pick on map
              </Button>
            </div>
            <GeoAutocomplete
              value={origin}
              onChange={onOriginChange}
              onSelect={(lng, lat, label) => onOriginChange(`${lng}, ${lat}`)}
              placeholder="e.g. Avenida Revolución or -117.0382, 32.5149"
              disabled={isRouting}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-fleet-text-primary">Stops (address/place or lon, lat)</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" onClick={onAddStop}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add stop
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {stops.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <GeoAutocomplete
                    value={s}
                    onChange={(val) => onStopChange(idx, val)}
                    onSelect={(lng, lat) => onStopChange(idx, `${lng}, ${lat}`)}
                    placeholder="e.g. Plaza Rio or -117.04, 32.52"
                    disabled={isRouting}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => onPickField({ kind: 'stop', index: idx })} aria-label={`Pick stop ${idx + 1} on map`}>
                    <Crosshair className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveStop(idx)} aria-label={`Remove stop ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="destination" className="text-xs font-medium text-fleet-text-primary">
                Destination (address, place or lon, lat)
              </Label>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" onClick={() => onPickField({ kind: 'destination' })}>
                <Crosshair className="h-3.5 w-3.5 mr-1" /> Pick on map
              </Button>
            </div>
            <GeoAutocomplete
              value={destination}
              onChange={onDestinationChange}
              onSelect={(lng, lat) => onDestinationChange(`${lng}, ${lat}`)}
              placeholder="e.g. CETYS or -117.0570, 32.5265"
              disabled={isRouting}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
            type="submit"
            disabled={!origin || !destination || isRouting}
            className="w-full rounded-md bg-fleet-primary hover:bg-fleet-primary/90 text-white text-[13px]"
            aria-label="Calculate route"
            >
            {isRouting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Calculate Route
              </>
            )}
            </Button>
            <Button type="button" variant="outline" className="rounded-md text-[13px]" onClick={() => {
              const name = prompt('Route name');
              if (name && name.trim()) {
                onSaveRoute?.(name.trim());
              }
            }}>Save</Button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-fleet-text-primary">
              <input type="checkbox" checked={optimize} onChange={onToggleOptimize} className="h-3.5 w-3.5" />
              Optimize stops
            </label>
            {routeSummary && (
              <div className="text-[12px] text-fleet-text-secondary">
                {routeSummary.distanceKm.toFixed(1)} km · {Math.round(routeSummary.durationMin)} min
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


