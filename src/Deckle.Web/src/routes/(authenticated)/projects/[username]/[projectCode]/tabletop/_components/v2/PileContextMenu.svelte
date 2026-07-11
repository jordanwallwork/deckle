<script lang="ts">
  // Thin shell over the pure action table: pileActions decides what the menu
  // shows, applyPileAction executes the choice inside a single store commit.
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import type { PileAction } from '$lib/tabletop/v2';
  import { applyPileAction, getTabletopApi, pileActions } from '$lib/tabletop/v2';

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
    ['flip', 'rotate', 'shuffle', 'flip-top'],
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
          action: () => store.commit((s) => applyPileAction(s, store.templates, pileId, action))
        });
      }
    }
    return result;
  });
</script>

{#if items.length > 0}
  <ContextMenu {x} {y} {items} {onClose} />
{/if}
