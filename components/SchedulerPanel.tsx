'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehiclesGeoJson } from '@/lib/types';
import { getSavedRoutes, addPlannedAssignment, getPlannedAssignments, deletePlannedAssignment } from '@/lib/storage';

interface SchedulerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehiclesGeoJson | null;
}

export default function SchedulerPanel({ open, onOpenChange, vehicles }: SchedulerPanelProps) {
  const routes = getSavedRoutes();
  const [routeId, setRouteId] = useState<string>('');
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('08:00');
  const [notes, setNotes] = useState<string>('');
  const [planned, setPlanned] = useState(getPlannedAssignments());

  const vehiclesList = useMemo(() => vehicles?.features?.map((f) => ({ id: f.properties.id, alias: f.properties.alias })) || [], [vehicles]);

  const startEpoch = () => {
    if (!date) return Date.now();
    const d = new Date(`${date}T${time || '08:00'}:00`);
    return d.getTime();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Schedule Assignments</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Route</label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger className="rounded-md text-[13px]">
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1">Time</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-md text-[13px]" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[12px] text-muted-foreground mb-1">Vehicles</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {vehiclesList.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-[13px] border rounded-md px-2 py-1">
                  <input
                    type="checkbox"
                    checked={vehicleIds.includes(v.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setVehicleIds((prev) => checked ? [...prev, v.id] : prev.filter((id) => id !== v.id));
                    }}
                  />
                  {v.alias}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[12px] text-muted-foreground mb-1">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="rounded-md text-[13px]" />
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!routeId || vehicleIds.length === 0) return;
                addPlannedAssignment({ routeId, vehicleIds, startAt: startEpoch(), notes: notes || undefined });
                setPlanned(getPlannedAssignments());
                setVehicleIds([]);
                setNotes('');
              }}
            >
              Schedule
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planned.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-[13px]">{routes.find((r) => r.id === p.routeId)?.name || p.routeId}</TableCell>
                  <TableCell className="text-[13px]">{p.vehicleIds.length}</TableCell>
                  <TableCell className="text-[13px]">{new Date(p.startAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { deletePlannedAssignment(p.id); setPlanned(getPlannedAssignments()); }}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {planned.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[13px] text-muted-foreground">No scheduled assignments.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}


