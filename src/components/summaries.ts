import type { Activity, Area, Series } from '@/data/types';
import { rateUnitLabel } from '@/domain/calculator';
import { formatTime } from '@/domain/format';
import { intervalLabel } from '@/domain/schedule';

export function scheduleSummary(s: Series): string {
  const at = `at ${formatTime(s.reminderTime)}`;
  if (s.mode === 'once') return `One-off, ${at}`;
  const every = intervalLabel(s.intervalDays!);
  return s.mode === 'fixed' ? `Set dates, ${every}, ${at}` : `${every[0].toUpperCase()}${every.slice(1)} after it’s done, ${at}`;
}

export function activityLine(a: Activity, areas: Area[]): string {
  const area = areas.find((x) => x.id === a.areaId)?.name;
  const bits = [
    area,
    a.productName,
    a.quantityValue != null ? `${a.quantityValue} ${a.quantityUnit ?? ''}`.trim() : null,
    a.rateValue != null && a.rateUnit ? `${a.rateValue} ${rateUnitLabel(a.rateUnit)}` : null,
    a.mowHeightMm != null ? `${a.mowHeightMm} mm` : null,
  ].filter(Boolean);
  return bits.join(' · ');
}
