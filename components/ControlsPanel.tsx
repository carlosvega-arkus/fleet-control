'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Navigation, Loader as Loader2, X, Plus, Trash2, Gauge } from 'lucide-react';
import { ControlsPanelProps } from '@/lib/types';

export default function ControlsPanel({
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
}: ControlsPanelProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination && !isRouting) {
      onRequestRoute(origin, stops, destination);
    }
  };

  const handleClear = () => {
    onOriginChange('');
    onDestinationChange('');
  };

  return (
    <Card className="absolute top-4 right-4 z-10 p-3 bg-white/95 backdrop-blur-sm shadow-md w-80 max-w-[calc(100vw-2rem)] md:w-96 border border-border rounded-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-fleet-primary" />
            <h2 className="text-sm font-medium text-fleet-text-primary tracking-tight">Route Planning</h2>
          </div>
          {(origin || destination) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
              aria-label="Clear inputs"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="origin" className="text-xs font-medium text-fleet-text-primary">
            Origin (lon, lat)
          </Label>
          <Input
            id="origin"
            type="text"
            placeholder="-117.0382, 32.5149"
            value={origin}
            onChange={(e) => onOriginChange(e.target.value)}
            disabled={isRouting}
            className="rounded-md text-[13px]"
            aria-label="Origin coordinates"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-fleet-text-primary">Stops (lon, lat)</Label>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" onClick={onAddStop}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add stop
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {stops.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="-117.04, 32.52"
                  value={s}
                  onChange={(e) => onStopChange(idx, e.target.value)}
                  disabled={isRouting}
                  className="rounded-md text-[13px]"
                  aria-label={`Stop ${idx + 1}`}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveStop(idx)} aria-label={`Remove stop ${idx + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destination" className="text-xs font-medium text-fleet-text-primary">
            Destination (lon, lat)
          </Label>
          <Input
            id="destination"
            type="text"
            placeholder="-117.0570, 32.5265"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            disabled={isRouting}
            className="rounded-md text-[13px]"
            aria-label="Destination coordinates"
          />
        </div>

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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px] text-fleet-text-primary">
            <input type="checkbox" checked={optimize} onChange={onToggleOptimize} className="h-3.5 w-3.5" />
            Optimize stops
          </label>
          {routeSummary && (
            <div className="flex items-center gap-2 text-[12px] text-fleet-text-secondary">
              <Gauge className="h-3.5 w-3.5" />
              <span>{routeSummary.distanceKm.toFixed(1)} km · {Math.round(routeSummary.durationMin)} min</span>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
