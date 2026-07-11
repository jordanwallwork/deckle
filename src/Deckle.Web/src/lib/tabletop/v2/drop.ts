// The shared drop resolver: every drop path — sidebar template drops now;
// pointer drags, multi-drags and "Move to zone" in later tickets — resolves
// its payload + world point to a DropPlan here, and the plan is applied
// inside a store commit. Renderers and shells never decide placement.

import type { Point } from './geometry';
import type { TabletopState, Templates } from './types';
import { getUnplacedInstances, spawnPileFromTemplate } from './operations';

/** What is being dropped. Later tickets add pile payloads. */
export type DropPayload = { kind: 'template'; templateId: string };

/** What the drop will do when applied. */
export type DropPlan =
  | {
      kind: 'spawn-pile';
      templateId: string;
      instances: (Record<string, string> | null)[];
      /** World-space pile centre. */
      x: number;
      y: number;
    }
  | { kind: 'none' };

const NONE: DropPlan = { kind: 'none' };

/**
 * Resolve a drop against the current state. Template payloads spawn only the
 * instances not already on the table (dedup identity — see
 * getUnplacedInstances); a fully-placed component resolves to no-op.
 */
export function resolveDrop(
  state: TabletopState,
  templates: Templates,
  payload: DropPayload,
  world: Point
): DropPlan {
  switch (payload.kind) {
    case 'template': {
      const template = templates[payload.templateId];
      if (!template) return NONE;
      // Boards/mats spawn as container zones — that arrives with ticket 11.
      if (template.isContainer) return NONE;
      const instances = getUnplacedInstances(state, template);
      if (instances.length === 0) return NONE;
      return { kind: 'spawn-pile', templateId: template.id, instances, x: world.x, y: world.y };
    }
  }
}

/** Apply a resolved plan to the state. Call inside a store commit. */
export function applyDropPlan(state: TabletopState, templates: Templates, plan: DropPlan): void {
  switch (plan.kind) {
    case 'spawn-pile': {
      const template = templates[plan.templateId];
      if (!template) return;
      spawnPileFromTemplate(state, template, plan.instances, plan.x, plan.y);
      return;
    }
    case 'none':
      return;
  }
}
