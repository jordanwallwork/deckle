// PROTOTYPE — throwaway (wayfinder ticket #105).
// Setup DSL types (per ticket #104) + sample program + shared vocab/helpers.

export type Facing = 'up' | 'down';
export type SeatRef = 'each' | 'current';
export type SeatZone = { seat: SeatRef; role: string };
export type ZoneRef = { zone: string | SeatZone | null };

export type ValueExpr =
  | { get: 'playerCount' }
  | { get: 'option'; name: string }
  | { get: 'count'; zone: ZoneRef };

export type CompareOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';
export type Comparison = { op: CompareOp; left: ValueExpr; right: number | boolean | string };
export type Condition = Comparison | { all: Condition[] } | { any: Condition[] } | { not: Condition };

export type Verb = 'placeSeats' | 'placeZone' | 'place' | 'shuffle' | 'deal' | 'move' | 'flip' | 'roll';

export type ActionStep = {
  do: Verb;
  blueprint?: string;
  component?: string | null;
  count?: number;
  from?: ZoneRef | null;
  to?: ZoneRef | null;
  zone?: ZoneRef | null;
  facing?: Facing;
  shuffled?: boolean;
  target?: 'top' | 'all';
};
export type WhenStep = { when: Condition; steps: Step[]; else?: Step[] };
export type ForEachStep = { forEach: 'seat'; steps: Step[] };
export type Step = ActionStep | WhenStep | ForEachStep;

export const isWhen = (s: Step): s is WhenStep => 'when' in s;
export const isForEach = (s: Step): s is ForEachStep => 'forEach' in s;
export const isAction = (s: Step): s is ActionStep => 'do' in s;
export const isComparison = (c: Condition): c is Comparison => 'op' in c;

// ---- Sample project vocabulary --------------------------------------------

export const tableZones = ['draw-pile', 'market', 'discard'];
export const seatRoles = ['hand', 'tableau'];
export const componentList = [
  { id: 'village-deck', name: 'Village Deck' },
  { id: 'expansion-deck', name: 'Expansion Deck' },
  { id: 'player-token', name: 'Player Token' }
];
export const optionDecls = [{ name: 'useExpansion', label: 'Use expansion', type: 'bool' }];

// ---- Sample program --------------------------------------------------------
// 2p: deal 4 each; else deal 3 each; flip top card to market.
// One step is deliberately invalid (expansion deck with no target zone) to
// exercise error affordances.

export function sampleProgram(): Step[] {
  return [
    { do: 'placeSeats' },
    { do: 'placeZone', blueprint: 'draw-pile' },
    { do: 'placeZone', blueprint: 'market' },
    { do: 'place', component: 'village-deck', to: { zone: 'draw-pile' }, facing: 'down', shuffled: true },
    {
      when: { op: 'eq', left: { get: 'playerCount' }, right: 2 },
      steps: [
        {
          do: 'deal',
          count: 4,
          from: { zone: 'draw-pile' },
          to: { zone: { seat: 'each', role: 'hand' } },
          facing: 'down'
        }
      ],
      else: [
        {
          do: 'deal',
          count: 3,
          from: { zone: 'draw-pile' },
          to: { zone: { seat: 'each', role: 'hand' } },
          facing: 'down'
        }
      ]
    },
    { do: 'move', count: 1, from: { zone: 'draw-pile' }, to: { zone: 'market' } },
    { do: 'flip', target: 'top', zone: { zone: 'market' } },
    {
      when: { op: 'eq', left: { get: 'option', name: 'useExpansion' }, right: true },
      steps: [{ do: 'place', component: 'expansion-deck', to: { zone: null }, facing: 'down', shuffled: true }]
    },
    {
      forEach: 'seat',
      steps: [{ do: 'place', component: 'player-token', to: { zone: { seat: 'current', role: 'tableau' } }, facing: 'up' }]
    }
  ];
}

// ---- Zone reference helpers ------------------------------------------------

export type ZoneChoice = { key: string; label: string; ref: ZoneRef };

function pretty(name: string): string {
  return name.replace(/-/g, ' ');
}

export function zoneChoices(inForEach: boolean): ZoneChoice[] {
  const choices: ZoneChoice[] = tableZones.map((z) => ({
    key: JSON.stringify(z),
    label: `the ${pretty(z)}`,
    ref: { zone: z }
  }));
  for (const role of seatRoles) {
    choices.push({
      key: JSON.stringify({ seat: 'each', role }),
      label: `each seat's ${role}`,
      ref: { zone: { seat: 'each', role } }
    });
  }
  if (inForEach) {
    for (const role of seatRoles) {
      choices.push({
        key: JSON.stringify({ seat: 'current', role }),
        label: `this seat's ${role}`,
        ref: { zone: { seat: 'current', role } }
      });
    }
  }
  return choices;
}

export function zoneKey(ref: ZoneRef | null | undefined): string {
  return JSON.stringify(ref?.zone ?? null);
}

export function refFromKey(key: string): ZoneRef {
  return { zone: JSON.parse(key) };
}

export function zoneLabel(ref: ZoneRef | null | undefined): string {
  const z = ref?.zone;
  if (!z) return '(no zone)';
  if (typeof z === 'string') return `the ${pretty(z)}`;
  return z.seat === 'each' ? `each seat's ${z.role}` : `this seat's ${z.role}`;
}

export function componentName(id: string | null | undefined): string {
  return componentList.find((c) => c.id === id)?.name ?? '(no component)';
}

// ---- Validation -------------------------------------------------------------

export function stepErrors(step: Step): string[] {
  if (isWhen(step) || isForEach(step)) return [];
  const errs: string[] = [];
  const needsZone = (ref: ZoneRef | null | undefined, name: string) => {
    if (!ref?.zone) errs.push(`Choose a ${name} zone`);
  };
  switch (step.do) {
    case 'placeZone':
      if (!step.blueprint) errs.push('Choose a zone blueprint');
      break;
    case 'place':
      if (!step.component) errs.push('Choose a component');
      needsZone(step.to, 'target');
      break;
    case 'shuffle':
      needsZone(step.zone, 'target');
      break;
    case 'deal':
      if (!step.count || step.count < 1) errs.push('Count must be at least 1');
      needsZone(step.from, 'source');
      needsZone(step.to, 'target');
      break;
    case 'move':
      if (!step.count || step.count < 1) errs.push('Count must be at least 1');
      needsZone(step.from, 'source');
      needsZone(step.to, 'target');
      break;
    case 'flip':
      needsZone(step.zone, 'target');
      break;
  }
  return errs;
}

export function treeErrorCount(steps: Step[]): number {
  let n = 0;
  for (const s of steps) {
    n += stepErrors(s).length;
    if (isWhen(s)) n += treeErrorCount(s.steps) + treeErrorCount(s.else ?? []);
    if (isForEach(s)) n += treeErrorCount(s.steps);
  }
  return n;
}

// ---- Display helpers ---------------------------------------------------------

export const opLabels: Record<CompareOp, string> = {
  eq: 'is',
  neq: 'is not',
  lt: 'is less than',
  lte: 'is at most',
  gt: 'is more than',
  gte: 'is at least'
};

export function valueExprLabel(v: ValueExpr): string {
  switch (v.get) {
    case 'playerCount':
      return 'player count';
    case 'option':
      return `option “${optionDecls.find((o) => o.name === v.name)?.label ?? v.name}”`;
    case 'count':
      return `cards in ${zoneLabel(v.zone)}`;
  }
}

export function conditionLabel(c: Condition): string {
  if (isComparison(c)) {
    const right = typeof c.right === 'boolean' ? (c.right ? 'on' : 'off') : String(c.right);
    return `${valueExprLabel(c.left)} ${opLabels[c.op]} ${right}`;
  }
  if ('all' in c) return c.all.map(conditionLabel).join(' and ');
  if ('any' in c) return c.any.map(conditionLabel).join(' or ');
  return `not (${conditionLabel(c.not)})`;
}

export const verbIcons: Record<Verb, string> = {
  placeSeats: '🪑',
  placeZone: '▦',
  place: '🂠',
  shuffle: '🔀',
  deal: '🃏',
  move: '➜',
  flip: '↻',
  roll: '🎲'
};

export function stepSummary(step: Step): string {
  if (isWhen(step)) return `If ${conditionLabel(step.when)}`;
  if (isForEach(step)) return 'For each seat, in turn';
  switch (step.do) {
    case 'placeSeats':
      return 'Place a seat for every player';
    case 'placeZone':
      return `Place the ${step.blueprint ? step.blueprint.replace(/-/g, ' ') : '…'} zone`;
    case 'place':
      return `Put ${componentName(step.component)} into ${zoneLabel(step.to)}`;
    case 'shuffle':
      return `Shuffle ${zoneLabel(step.zone)}`;
    case 'deal':
      return `Deal ${step.count ?? '…'} from ${zoneLabel(step.from)} to ${zoneLabel(step.to)}`;
    case 'move':
      return `Move ${step.count ?? '…'} from ${zoneLabel(step.from)} to ${zoneLabel(step.to)}`;
    case 'flip':
      return `Flip ${step.target === 'all' ? 'all cards' : 'the top card'} of ${zoneLabel(step.zone)}`;
    case 'roll':
      return 'Roll the dice';
  }
}

// ---- New-step presets ---------------------------------------------------------

export const newStepPresets: { label: string; make: () => Step }[] = [
  { label: 'Deal cards', make: () => ({ do: 'deal', count: 1, from: null, to: null, facing: 'down' }) },
  { label: 'Move cards', make: () => ({ do: 'move', count: 1, from: null, to: null }) },
  { label: 'Put a component in a zone', make: () => ({ do: 'place', component: null, to: null, facing: 'down', shuffled: false }) },
  { label: 'Shuffle a zone', make: () => ({ do: 'shuffle', zone: null }) },
  { label: 'Flip a card', make: () => ({ do: 'flip', target: 'top', zone: null }) },
  { label: 'Roll the dice', make: () => ({ do: 'roll' }) },
  {
    label: 'If … (conditional)',
    make: () => ({ when: { op: 'eq', left: { get: 'playerCount' }, right: 2 }, steps: [], else: [] })
  },
  { label: 'For each seat …', make: () => ({ forEach: 'seat', steps: [] }) }
];
