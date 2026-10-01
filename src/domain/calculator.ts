/**
 * Area × rate arithmetic. The rate always comes from the user (or, later, a reviewed
 * label entry), and the result carries that provenance. This module never suggests a rate.
 */

export type RateUnit = 'g/m2' | 'kg/100m2' | 'mL/m2' | 'mL/100m2' | 'L/100m2';

export const RATE_UNITS: readonly { unit: RateUnit; label: string; measure: 'mass' | 'volume' }[] = [
  { unit: 'g/m2', label: 'g per m²', measure: 'mass' },
  { unit: 'kg/100m2', label: 'kg per 100 m²', measure: 'mass' },
  { unit: 'mL/m2', label: 'mL per m²', measure: 'volume' },
  { unit: 'mL/100m2', label: 'mL per 100 m²', measure: 'volume' },
  { unit: 'L/100m2', label: 'L per 100 m²', measure: 'volume' },
];

export type RateSource = 'user';

export function isRateUnit(value: unknown): value is RateUnit {
  return RATE_UNITS.some((u) => u.unit === value);
}

export function rateUnitLabel(unit: RateUnit): string {
  return RATE_UNITS.find((u) => u.unit === unit)!.label;
}

export interface CalculationInput {
  areaM2: number;
  rate: number;
  unit: RateUnit;
  source: RateSource;
}

export interface CalculationResult {
  /** Grams or millilitres before display rounding. */
  baseAmount: number;
  measure: 'mass' | 'volume';
  /** Rounded display value and unit, e.g. 3 and "kg". */
  value: number;
  displayUnit: 'g' | 'kg' | 'mL' | 'L';
  text: string;
  workings: string;
  source: RateSource;
}

export function validateCalculation(input: Partial<CalculationInput>): string | null {
  if (input.areaM2 == null || !Number.isFinite(input.areaM2) || input.areaM2 <= 0) return 'Enter the lawn area in m².';
  if (input.areaM2 > 100_000) return 'That area is larger than 10 hectares. Check the number.';
  if (input.rate == null || !Number.isFinite(input.rate) || input.rate <= 0) return 'Enter the rate from your product label.';
  if (!input.unit || !isRateUnit(input.unit)) return 'Choose the rate unit shown on the label.';
  return null;
}

function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function trim(value: number): string {
  return value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
}

/** Total product needed for an area at a label rate. */
export function calculateQuantity(input: CalculationInput): CalculationResult {
  const error = validateCalculation(input);
  if (error) throw new Error(error);
  const { areaM2, rate, unit } = input;

  const perM2Base: Record<RateUnit, number> = {
    'g/m2': rate,
    'kg/100m2': (rate * 1000) / 100,
    'mL/m2': rate,
    'mL/100m2': rate / 100,
    'L/100m2': (rate * 1000) / 100,
  };
  const measure = RATE_UNITS.find((u) => u.unit === unit)!.measure;
  const baseAmount = areaM2 * perM2Base[unit];

  let value: number;
  let displayUnit: CalculationResult['displayUnit'];
  if (baseAmount >= 1000) {
    value = roundTo(baseAmount / 1000, 2);
    displayUnit = measure === 'mass' ? 'kg' : 'L';
  } else {
    value = baseAmount < 10 ? roundTo(baseAmount, 1) : Math.round(baseAmount);
    displayUnit = measure === 'mass' ? 'g' : 'mL';
  }

  return {
    baseAmount,
    measure,
    value,
    displayUnit,
    text: `${trim(value)} ${displayUnit}`,
    workings: `${trim(areaM2)} m² × ${trim(rate)} ${rateUnitLabel(unit)}`,
    source: input.source,
  };
}
