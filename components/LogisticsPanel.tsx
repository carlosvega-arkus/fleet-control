'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Delivery, LocationsGeoJson } from '@/lib/types';

interface LogisticsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationsGeoJson | null;
  deliveries: Delivery[];
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function LogisticsPanel({ open, onOpenChange, locations, deliveries, onStart, onCancel }: LogisticsPanelProps) {
  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    (locations?.features || []).forEach((f) => {
      map[f.properties.id] = f.properties.name;
    });
    return map;
  }, [locations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Logistics</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-[13px]">{d.id}</TableCell>
                  <TableCell className="text-[13px]">{d.vehicleId}</TableCell>
                  <TableCell className="text-[13px]">{nameById[d.pickupWarehouseId]} → {nameById[d.dropStoreId]}</TableCell>
                  <TableCell className="text-[13px]">{d.items.map((i) => `${i.sku} x${i.qty}`).join(', ')}</TableCell>
                  <TableCell className="text-[13px] capitalize">{d.status.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {d.status === 'pending' && (
                      <Button size="sm" onClick={() => onStart(d.id)}>Start</Button>
                    )}
                    {d.status === 'en_route' && (
                      <Button size="sm" variant="outline" onClick={() => onCancel(d.id)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {deliveries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[13px] text-muted-foreground">No deliveries.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}



