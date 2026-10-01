import { calculateQuantity, validateCalculation } from '@/domain/calculator';

describe('area × rate calculator', () => {
  it('matches the plan example: 120 m² at 25 g/m² is 3 kg', () => {
    const r = calculateQuantity({ areaM2: 120, rate: 25, unit: 'g/m2', source: 'user' });
    expect(r.baseAmount).toBe(3000);
    expect(r.text).toBe('3 kg');
    expect(r.workings).toBe('120 m² × 25 g per m²');
    expect(r.source).toBe('user');
  });

  it('converts per-100 m² label rates', () => {
    expect(calculateQuantity({ areaM2: 250, rate: 2.5, unit: 'kg/100m2', source: 'user' }).text).toBe('6.25 kg');
    expect(calculateQuantity({ areaM2: 85, rate: 40, unit: 'mL/100m2', source: 'user' }).text).toBe('34 mL');
    expect(calculateQuantity({ areaM2: 300, rate: 1.2, unit: 'L/100m2', source: 'user' }).text).toBe('3.6 L');
  });

  it('keeps small amounts precise and rounds large ones sensibly', () => {
    expect(calculateQuantity({ areaM2: 3, rate: 1.5, unit: 'mL/m2', source: 'user' }).text).toBe('4.5 mL');
    expect(calculateQuantity({ areaM2: 37, rate: 15, unit: 'g/m2', source: 'user' }).text).toBe('555 g');
    expect(calculateQuantity({ areaM2: 333, rate: 3.3, unit: 'g/m2', source: 'user' }).text).toBe('1.1 kg');
  });

  it('rejects missing or impossible inputs instead of guessing', () => {
    expect(validateCalculation({ areaM2: 0, rate: 25, unit: 'g/m2' })).toMatch(/area/);
    expect(validateCalculation({ areaM2: 100, rate: -1, unit: 'g/m2' })).toMatch(/rate/);
    expect(validateCalculation({ areaM2: 100, rate: 1 })).toMatch(/unit/);
    expect(() => calculateQuantity({ areaM2: Number.NaN, rate: 1, unit: 'g/m2', source: 'user' })).toThrow();
  });
});
