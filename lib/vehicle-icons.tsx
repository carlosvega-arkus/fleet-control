import {
  IconTruck,
  IconTruckDelivery,
  IconTruckLoading,
  IconBike,
  IconMotorbike,
  IconCar,
  IconCarSuv,
} from '@tabler/icons-react';
import type { VehicleType } from '@/lib/types';

const vehicleIconComponentByType: Record<VehicleType, (props?: { size?: number; stroke?: number }) => JSX.Element> = {
  semi_truck: (p) => <IconTruck size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  box_truck: (p) => <IconTruckLoading size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  light_truck: (p) => <IconTruckDelivery size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  pickup: (p) => <IconCarSuv size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  motorcycle: (p) => <IconMotorbike size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  cargo_bike: (p) => <IconBike size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  cargo_van: (p) => <IconCar size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
  van: (p) => <IconCar size={p?.size ?? 16} stroke={p?.stroke ?? 1.75} />,
};

const vehicleIconAssetByType: Record<VehicleType, string> = {
  semi_truck: '/icons/vehicle/semi_truck.svg',
  box_truck: '/icons/vehicle/box_truck.svg',
  light_truck: '/icons/vehicle/light_truck.svg',
  pickup: '/icons/vehicle/pickup.svg',
  motorcycle: '/icons/vehicle/motorcycle.svg',
  cargo_bike: '/icons/vehicle/cargo_bike.svg',
  cargo_van: '/icons/vehicle/cargo_van.svg',
  van: '/icons/vehicle/van.svg',
};

export function getVehicleIconComponent(type: VehicleType, size = 16, stroke = 1.75) {
  const Comp = vehicleIconComponentByType[type] ?? vehicleIconComponentByType.van;
  return Comp({ size, stroke });
}

export function getVehicleIconAssetPath(type: VehicleType) {
  return vehicleIconAssetByType[type] ?? vehicleIconAssetByType.van;
}

export function formatVehicleType(type: VehicleType) {
  return String(type).replace(/_/g, ' ');
}


