'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { VehicleFeature } from '@/lib/types';

interface VehicleDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleFeature | null;
}

export default function VehicleDetails({ open, onOpenChange, vehicle }: VehicleDetailsProps) {
  const props = vehicle?.properties;
  const coords = (vehicle?.geometry?.type === 'Point' ? vehicle?.geometry?.coordinates : undefined) as
    | [number, number]
    | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">
            Vehicle Details
          </DialogTitle>
        </DialogHeader>

        {!vehicle ? (
          <div className="text-[13px] text-muted-foreground">No vehicle selected.</div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-fleet-text-primary leading-5">{props?.alias}</p>
              <p className="text-[11px] text-fleet-text-secondary">ID: {props?.id}</p>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-40 text-[12px] text-muted-foreground">Type</TableCell>
                    <TableCell className="text-[13px]">{String(props?.type || '').replace('_', ' ')}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">State</TableCell>
                    <TableCell className="text-[13px] capitalize">{String(props?.state || '').replace('_', ' ')}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">License plate</TableCell>
                    <TableCell className="text-[13px]">{props?.license_plate || '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">Capacity (kg)</TableCell>
                    <TableCell className="text-[13px]">{props?.capacity_kg ?? '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">Manufacturer</TableCell>
                    <TableCell className="text-[13px]">{props?.manufacturer || '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">Model</TableCell>
                    <TableCell className="text-[13px]">{props?.model || '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">Year</TableCell>
                    <TableCell className="text-[13px]">{props?.year ?? '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[12px] text-muted-foreground">Speed (km/h)</TableCell>
                    <TableCell className="text-[13px]">{props?.speed ?? 0}</TableCell>
                  </TableRow>
                  {/* Battery, heading and coordinates intentionally omitted for this modal */}
                </TableBody>
              </Table>
            </div>

            {props?.characteristics && Object.keys(props.characteristics).length > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-[12px] text-muted-foreground mb-2">Characteristics</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(props.characteristics).map(([k, v]) => (
                    <div key={k} className="text-[13px]">
                      <span className="text-muted-foreground mr-1">{k}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


