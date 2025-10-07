'use client';

import { Card } from '@/components/ui/card';
import { Activity, Navigation, Pause, WifiOff } from 'lucide-react';
import { KpiData } from '@/lib/types';

interface KpiCardsProps {
  data: KpiData;
}

export default function KpiCards({ data }: KpiCardsProps) {
  const kpis = [
    {
      label: 'Active Vehicles',
      value: data.activeVehicles,
      icon: Activity,
      color: 'text-fleet-success',
      bgColor: 'bg-fleet-success/10',
    },
    {
      label: 'Trips in Progress',
      value: data.tripsInProgress,
      icon: Navigation,
      color: 'text-fleet-primary',
      bgColor: 'bg-fleet-primary/10',
    },
    {
      label: 'Idle Vehicles',
      value: data.idleVehicles,
      icon: Pause,
      color: 'text-fleet-secondary',
      bgColor: 'bg-fleet-secondary/10',
    },
    {
      label: 'Offline',
      value: data.offlineVehicles,
      icon: WifiOff,
      color: 'text-fleet-error',
      bgColor: 'bg-fleet-error/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-4 py-3 md:px-6 bg-fleet-background">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.label}
            className="p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-fleet-text-secondary truncate">
                  {kpi.label}
                </p>
                <p className="text-xl md:text-2xl font-bold text-fleet-text-primary">
                  {kpi.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
