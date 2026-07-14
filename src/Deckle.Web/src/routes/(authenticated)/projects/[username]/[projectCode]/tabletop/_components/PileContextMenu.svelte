<script lang="ts">
  // Thin shell over the pure action table: pileActions decides what the menu
  // shows, applyPileAction executes the choice inside a single store commit.
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import type { PileAction } from '$lib/tabletop';
  import {
    applyPileAction,
    getTabletopApi,
    movePileToZone,
    moveTargetZones,
    pileActions
  } from '$lib/tabletop';

  let {
    pileId,
    x,
    y,
    onClose
  }: {
    pileId: string;
    x: number;
    y: number;
    onClose: () => void;
  } = $props();

  const { store } = getTabletopApi();

  const LABELS: Record<PileAction, string> = {
    flip: 'Flip (F)',
    roll: 'Roll (S)',
    rotate: 'Rotate 90° (R)',
    shuffle: 'Shuffle (S)',
    'flip-top': 'Flip Top Card',
    lock: 'Lock',
    unlock: 'Unlock',
    'send-front': 'Send to Front',
    'send-back': 'Send to Back'
  };

  /** Menu groups; a divider separates consecutive non-empty groups. */
  const GROUPS: PileAction[][] = [
    ['flip', 'roll', 'rotate', 'shuffle', 'flip-top'],
    ['lock', 'unlock'],
    ['send-front', 'send-back']
  ];

  const items = $derived.by((): ContextMenuItem[] => {
    const applicable = pileActions(store.state, store.templates, pileId);
    const result: ContextMenuItem[] = [];
    for (const group of GROUPS) {
      const actions = group.filter((action) => applicable.includes(action));
      if (actions.length === 0) continue;
      if (result.length > 0) result.push({ divider: true });
      for (const action of actions) {
        result.push({
          label: LABELS[action],
          // Shuffle plays the riffle animation (deferred commit); everything
          // else is a plain single commit.
          action:
            action === 'shuffle'
              ? () => store.shufflePilesAnimated([pileId])
              : () => store.commit((s) => applyPileAction(s, store.templates, pileId, action))
        });
      }
    }
    // "Move to <zone>": a menu move that goes through the drop resolver, so
    // it behaves exactly like dragging the pile to the zone's centre. Locked
    // piles (only Unlock applicable) don't move; locked zones aren't offered.
    if (!applicable.includes('unlock')) {
      const targets = moveTargetZones(store.state, pileId);
      if (targets.length > 0) {
        if (result.length > 0) result.push({ divider: true });
        result.push({
          label: 'Move to',
          submenu: targets.map((zone) => ({
            label: zone.name,
            action: () => store.commit((s) => movePileToZone(s, store.templates, pileId, zone.id))
          }))
        });
      }
    }
    return result;
  });
</script>

{#if items.length > 0}
  <ContextMenu {x} {y} {items} {onClose} />
{/if}
