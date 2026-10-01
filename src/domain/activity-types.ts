/**
 * The kinds of lawn work the app can track. This is app behaviour, not advice:
 * nothing here recommends a product, rate or timing.
 */

export type ActivityKind =
  | 'mow'
  | 'fertilise_granular'
  | 'fertilise_liquid'
  | 'pre_emergent'
  | 'weed_control'
  | 'wetting_agent'
  | 'scarify'
  | 'dethatch'
  | 'aerate'
  | 'core'
  | 'topdress'
  | 'seed'
  | 'renovation'
  | 'other';

export type ActivityGroup = 'mowing' | 'product' | 'care';

export interface ActivityType {
  kind: ActivityKind;
  /** Noun form for tasks: "Granular fertiliser" */
  label: string;
  /** Past tense for history: "Applied granular fertiliser" */
  done: string;
  group: ActivityGroup;
  usesProduct: boolean;
  icon: { ios: string; android: string };
}

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  { kind: 'mow', label: 'Mow', done: 'Mowed', group: 'mowing', usesProduct: false, icon: { ios: 'scissors', android: 'content_cut' } },
  { kind: 'fertilise_granular', label: 'Granular fertiliser', done: 'Applied granular fertiliser', group: 'product', usesProduct: true, icon: { ios: 'circle.grid.3x3.fill', android: 'grain' } },
  { kind: 'fertilise_liquid', label: 'Liquid fertiliser', done: 'Applied liquid fertiliser', group: 'product', usesProduct: true, icon: { ios: 'drop.fill', android: 'water_drop' } },
  { kind: 'pre_emergent', label: 'Pre-emergent', done: 'Applied pre-emergent', group: 'product', usesProduct: true, icon: { ios: 'shield.fill', android: 'shield' } },
  { kind: 'weed_control', label: 'Weed control', done: 'Treated weeds', group: 'product', usesProduct: true, icon: { ios: 'xmark.shield.fill', android: 'block' } },
  { kind: 'wetting_agent', label: 'Wetting agent', done: 'Applied wetting agent', group: 'product', usesProduct: true, icon: { ios: 'humidity.fill', android: 'humidity_percentage' } },
  { kind: 'scarify', label: 'Scarify', done: 'Scarified', group: 'care', usesProduct: false, icon: { ios: 'line.3.horizontal', android: 'reorder' } },
  { kind: 'dethatch', label: 'Dethatch', done: 'Dethatched', group: 'care', usesProduct: false, icon: { ios: 'wind', android: 'air' } },
  { kind: 'aerate', label: 'Aerate', done: 'Aerated', group: 'care', usesProduct: false, icon: { ios: 'circle.dotted', android: 'blur_on' } },
  { kind: 'core', label: 'Core', done: 'Cored', group: 'care', usesProduct: false, icon: { ios: 'smallcircle.filled.circle', android: 'adjust' } },
  { kind: 'topdress', label: 'Topdress', done: 'Topdressed', group: 'care', usesProduct: true, icon: { ios: 'square.3.layers.3d', android: 'layers' } },
  { kind: 'seed', label: 'Seed', done: 'Seeded', group: 'care', usesProduct: true, icon: { ios: 'leaf.fill', android: 'spa' } },
  { kind: 'renovation', label: 'Lawn renovation', done: 'Renovated lawn', group: 'care', usesProduct: false, icon: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' } },
  { kind: 'other', label: 'Other', done: 'Lawn job', group: 'care', usesProduct: false, icon: { ios: 'ellipsis.circle', android: 'more_horiz' } },
];

const BY_KIND = new Map(ACTIVITY_TYPES.map((t) => [t.kind, t]));

export function activityType(kind: string): ActivityType {
  return BY_KIND.get(kind as ActivityKind) ?? BY_KIND.get('other')!;
}

export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === 'string' && BY_KIND.has(value as ActivityKind);
}

export const GRASS_TYPES = ['Couch', 'Buffalo', 'Kikuyu', 'Zoysia', 'Fescue / ryegrass', 'Mixed / other'] as const;
