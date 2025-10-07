'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSavedRoutes, deleteRoute, updateRouteName, SavedRoute } from '@/lib/storage';

interface RoutesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RoutesPanel({ open, onOpenChange }: RoutesPanelProps) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  const refresh = () => setRoutes(getSavedRoutes());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Saved Routes</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Name</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="w-[10rem] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <input
                      defaultValue={r.name}
                      className="border rounded-md px-2 py-1 text-[13px] w-full"
                      onBlur={(e) => {
                        const name = e.target.value.trim();
                        if (name && name !== r.name) {
                          updateRouteName(r.id, name);
                          refresh();
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-[12px]">{r.origin}</TableCell>
                  <TableCell className="text-[12px]">{r.stops.length}</TableCell>
                  <TableCell className="text-[12px]">{r.destination}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { deleteRoute(r.id); refresh(); }}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[13px] text-muted-foreground">
                    No saved routes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}


