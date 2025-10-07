'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehiclesGeoJson, VehicleFeature, VehicleType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import VehicleDetails from '@/components/VehicleDetails';
import { getSavedRoutes, assignRouteToVehicle, getAssignments } from '@/lib/storage';
import { Dialog as BaseDialog, DialogContent as BaseDialogContent, DialogHeader as BaseDialogHeader, DialogTitle as BaseDialogTitle } from '@/components/ui/dialog';
import { getVehicleIconComponent, formatVehicleType } from '@/lib/vehicle-icons';

interface FleetPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehiclesGeoJson | null;
  onUpdateVehicle?: (vehicle: VehicleFeature) => void;
  onAddVehicle?: (vehicle: VehicleFeature) => void;
}

export default function FleetPanel({ open, onOpenChange, vehicles, onUpdateVehicle, onAddVehicle }: FleetPanelProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('all');
  const [state, setState] = useState<string>('all');

  const items: VehicleFeature[] = vehicles?.features || [];
  const [selected, setSelected] = useState<VehicleFeature | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [routes, setRoutes] = useState(getSavedRoutes());
  const [assignments, setAssignments] = useState(getAssignments());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      const matchesQuery = !q
        ? true
        : [
            v.properties.alias,
            v.properties.id,
            v.properties.license_plate,
            v.properties.type,
            v.properties.state,
          ]
            .filter(Boolean)
            .some((val) => String(val).toLowerCase().includes(q));

      const matchesType = type === 'all' ? true : v.properties.type === (type as VehicleType);
      const matchesState = state === 'all' ? true : v.properties.state === state;
      return matchesQuery && matchesType && matchesState;
    });
  }, [items, query, type, state]);

  // Add Vehicle dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<string>('van');
  const [addAlias, setAddAlias] = useState('');
  const [addPlate, setAddPlate] = useState('');
  const [addCapacity, setAddCapacity] = useState<string>('');
  const [addManufacturer, setAddManufacturer] = useState('');
  const [addModel, setAddModel] = useState('');
  const [addYear, setAddYear] = useState<string>('');

  const renderTypeIcon = (t: string) => getVehicleIconComponent(t as any, 16, 1.75);
  const formatTypeLabel = (t: string) => formatVehicleType(t as any);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Fleet Configuration</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
          <Input
            placeholder="Search by alias, plate, ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-md text-[13px]"
            aria-label="Search vehicles"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="rounded-md text-[13px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="cargo_van">Cargo van</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
              <SelectItem value="light_truck">Light truck</SelectItem>
              <SelectItem value="box_truck">Box truck</SelectItem>
              <SelectItem value="semi_truck">Semi truck</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="cargo_bike">Cargo bike</SelectItem>
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="rounded-md text-[13px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="en_route">En route</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex sm:justify-end sm:col-span-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => setAddOpen(true)}
            >
              Add Vehicle
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-auto max-h-[58vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Alias</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead className="w-[8rem] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.properties.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <div className="mt-1">{renderTypeIcon(v.properties.type)}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-fleet-text-primary leading-5">{v.properties.alias}</span>
                        <span className="text-[11px] text-fleet-text-secondary">ID: {v.properties.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <Select
                      value={v.properties.type}
                      onValueChange={(val) =>
                        onUpdateVehicle?.({
                          ...v,
                          properties: { ...v.properties, type: val as VehicleType },
                        })
                      }
                    >
                      <SelectTrigger className="rounded-md text-[13px] h-8">
                        <div className="flex items-center gap-2">
                          {renderTypeIcon(v.properties.type)}
                          <span className="text-[13px] capitalize">{formatTypeLabel(v.properties.type)}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="van"><div className="flex items-center gap-2">{renderTypeIcon('van')}<span>Van</span></div></SelectItem>
                        <SelectItem value="cargo_van"><div className="flex items-center gap-2">{renderTypeIcon('cargo_van')}<span>Cargo van</span></div></SelectItem>
                        <SelectItem value="pickup"><div className="flex items-center gap-2">{renderTypeIcon('pickup')}<span>Pickup</span></div></SelectItem>
                        <SelectItem value="light_truck"><div className="flex items-center gap-2">{renderTypeIcon('light_truck')}<span>Light truck</span></div></SelectItem>
                        <SelectItem value="box_truck"><div className="flex items-center gap-2">{renderTypeIcon('box_truck')}<span>Box truck</span></div></SelectItem>
                        <SelectItem value="semi_truck"><div className="flex items-center gap-2">{renderTypeIcon('semi_truck')}<span>Semi truck</span></div></SelectItem>
                        <SelectItem value="motorcycle"><div className="flex items-center gap-2">{renderTypeIcon('motorcycle')}<span>Motorcycle</span></div></SelectItem>
                        <SelectItem value="cargo_bike"><div className="flex items-center gap-2">{renderTypeIcon('cargo_bike')}<span>Cargo bike</span></div></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <Input
                      value={v.properties.license_plate || ''}
                      onChange={(e) =>
                        onUpdateVehicle?.({
                          ...v,
                          properties: { ...v.properties, license_plate: e.target.value },
                        })
                      }
                      placeholder="ABC-123"
                      className="h-8 rounded-md text-[13px]"
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => onUpdateVehicle?.(v)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setSelected(v);
                        setOpenDetails(true);
                      }}
                    >
                      Details
                    </Button>
                    {routes.length > 0 && (
                      <select
                        className="border rounded-md text-[12px] h-8"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            assignRouteToVehicle(v.properties.id, val);
                            setAssignments(getAssignments());
                          }
                        }}
                      >
                        <option value="" disabled>Assign route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[13px] text-muted-foreground">
                    No vehicles match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          Demo data resets on refresh. No changes are persisted.
        </p>

        <VehicleDetails open={openDetails} onOpenChange={setOpenDetails} vehicle={selected} />
      </DialogContent>
    </Dialog>

    {/* Add Vehicle Modal */}
    <BaseDialog open={addOpen} onOpenChange={setAddOpen}>
      <BaseDialogContent className="sm:max-w-md">
        <BaseDialogHeader>
          <BaseDialogTitle className="text-base font-semibold tracking-tight">Add Vehicle</BaseDialogTitle>
        </BaseDialogHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {renderTypeIcon(addType)}
            <Select value={addType} onValueChange={setAddType}>
              <SelectTrigger className="rounded-md text-[13px] h-8">
                <div className="flex items-center gap-2">
                  {renderTypeIcon(addType)}
                  <span className="text-[13px] capitalize">{formatTypeLabel(addType)}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="cargo_van">Cargo van</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="light_truck">Light truck</SelectItem>
                <SelectItem value="box_truck">Box truck</SelectItem>
                <SelectItem value="semi_truck">Semi truck</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="cargo_bike">Cargo bike</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Alias" value={addAlias} onChange={(e) => setAddAlias(e.target.value)} className="h-8 rounded-md text-[13px]" />
          <Input placeholder="License plate" value={addPlate} onChange={(e) => setAddPlate(e.target.value)} className="h-8 rounded-md text-[13px]" />
          <Input placeholder="Capacity (kg)" type="number" value={addCapacity} onChange={(e) => setAddCapacity(e.target.value)} className="h-8 rounded-md text-[13px]" />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Brand" value={addManufacturer} onChange={(e) => setAddManufacturer(e.target.value)} className="h-8 rounded-md text-[13px] col-span-2" />
            <Input placeholder="Year" type="number" value={addYear} onChange={(e) => setAddYear(e.target.value)} className="h-8 rounded-md text-[13px]" />
          </div>
          <Input placeholder="Model" value={addModel} onChange={(e) => setAddModel(e.target.value)} className="h-8 rounded-md text-[13px]" />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                const id = `NEW-${Date.now()}`;
                const vehicle: VehicleFeature = {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [-117.0382, 32.5149] },
                  properties: {
                    id,
                    alias: addAlias || id,
                    type: addType as VehicleType,
                    heading: 0,
                    state: 'idle',
                    license_plate: addPlate || undefined,
                    capacity_kg: addCapacity ? Number(addCapacity) : undefined,
                    manufacturer: addManufacturer || undefined,
                    model: addModel || undefined,
                    year: addYear ? Number(addYear) : undefined,
                  },
                };
                onAddVehicle?.(vehicle);
                setAddOpen(false);
                setAddAlias('');
                setAddPlate('');
                setAddCapacity('');
                setAddManufacturer('');
                setAddModel('');
                setAddYear('');
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </BaseDialogContent>
    </BaseDialog>
    </>
  );
}


