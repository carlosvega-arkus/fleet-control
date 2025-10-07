import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TYPE_CODE: Record<string, string> = {
  cargo_van: 'CV',
  van: 'VN',
  pickup: 'PU',
  light_truck: 'LT',
  box_truck: 'BX',
  semi_truck: 'ST',
  motorcycle: 'MC',
  cargo_bike: 'CB',
};

export function generateAlias(
  cityCode: string,
  type: string,
  manufacturer?: string,
  model?: string,
  sequence?: number
) {
  const code = TYPE_CODE[type] || 'XX';
  const brand = (manufacturer || '').replace(/\s+/g, '');
  const mdl = (model || '').replace(/\s+/g, '');
  const seq = sequence ? String(sequence).padStart(2, '0') : '01';
  const parts = [cityCode, code, brand, mdl].filter(Boolean);
  return `${parts.join('-')}-${seq}`;
}
