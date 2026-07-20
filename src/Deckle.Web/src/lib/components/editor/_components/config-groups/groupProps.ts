import type { TemplateElement } from '../../types';

/**
 * Shared contract for every capability group control (ADR-0001 D1).
 *
 * Controls accept an ARRAY of elements (multi-select-aware from the start — see
 * `groupModel.fieldState`). Phase 2 always passes a single-element array, so the
 * Mixed path is dormant but wired. `update` writes through the template store
 * (with an optional edit-session key for continuous gestures, ADR-0001 D7).
 */
export type GroupUpdate = (updates: Partial<TemplateElement>, sessionKey?: string) => void;

export interface GroupControlProps {
  elements: TemplateElement[];
  dpi: number;
  update: GroupUpdate;
  /**
   * Seal the current edit session (ADR-0001 D7) — call on blur / pointer-up so
   * the next keyed gesture starts a fresh undo step. Wraps
   * `templateStore.sealSession()`.
   */
  seal: () => void;
}
