'use client';

import { Truck, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ThemeToggle from '@/components/ThemeToggle';
import { MapTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Navigation, Settings, Map as MapIcon, CalendarClock } from 'lucide-react';

interface HeaderProps {
  theme: MapTheme;
  onThemeToggle: () => void;
  onRoutePlanningClick: () => void;
  onFleetClick: () => void;
  onRoutesClick: () => void;
  onSchedulerClick: () => void;
}

export default function Header({ theme, onThemeToggle, onRoutePlanningClick, onFleetClick, onRoutesClick, onSchedulerClick }: HeaderProps) {
  return (
    <header className="bg-fleet-background border-b border-border sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="px-4 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 md:h-5 md:w-5 text-fleet-primary" />
              <h1 className="text-lg md:text-xl font-semibold tracking-tight text-fleet-text-primary">
                Fleet Control
              </h1>
            </div>
            <div className="hidden sm:flex items-center text-xs text-fleet-text-secondary">
              <MapPin className="h-3 w-3 mr-1" />
              Tijuana Operations
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFleetClick}
              className="rounded-md"
              aria-label="Open Fleet Configuration"
            >
              <Settings className="h-3.5 w-3.5 mr-2" />
              Fleet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRoutesClick}
              className="rounded-md"
              aria-label="Open Routes"
            >
              <MapIcon className="h-3.5 w-3.5 mr-2" />
              Routes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSchedulerClick}
              className="rounded-md"
              aria-label="Open Scheduler"
            >
              <CalendarClock className="h-3.5 w-3.5 mr-2" />
              Scheduler
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRoutePlanningClick}
              className="rounded-md"
              aria-label="Open Route Planning"
            >
              <Navigation className="h-3.5 w-3.5 mr-2" />
              Route Planning
            </Button>
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          </div>
        </div>
      </div>
    </header>
  );
}
