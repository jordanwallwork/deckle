<script lang="ts">
  // Thin shell over the pure zoneActions table: it decides what the menu
  // shows; each choice runs through the store (edit opens the transactional
  // session; lock/delete are single commits).
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import type { ZoneAction } from '$lib/tabletop/v2';
  import {
    getTabletopApi,
    removeZone,
    rotateAllInZone,
    selectAllInZone,
    setZoneLocked,
    shuffleZoneContents,
    zoneActions
  } from '$lib/tabletop/v2';

  let {
    zoneId,
    x,
    y,
    onClose
  }: {
    zoneId: string;
    x: number;
    y: number;
    onClose: () => void;
  } = $props();

  const { store } = getTabletopApi();

  const items = $derived.by((): ContextMenuItem[] => {
    const applicable = zoneActions(store.state, store.templates, zoneId);
    const result: ContextMenuItem[] = [];
    const push = (action: ZoneAction, item: ContextMenuItem) => {
      if (applicable.includes(action)) result.push(item);
    };
    push('edit', { label: 'Edit Zone', action: () => store.startZoneEdit(zoneId) });
    // Zone-wide actions (story 44). Select-all only rewrites the (ephemeral)
    // selection, so it skips history; the rest are single commits.
    push('select-all', {
      label: 'Select All',
      action: () => store.updateTransient((s) => selectAllInZone(s, zoneId))
    });
    push('flip-all', {
      label: 'Flip All',
      // Spreads and grids ripple the flip as a wave; the commit stays atomic.
      action: () => store.flipAllInZoneAnimated(zoneId)
    });
    push('rotate-all', {
      label: 'Rotate All',
      action: () => store.commit((s) => rotateAllInZone(s, zoneId, 90))
    });
    push('shuffle', {
      label: 'Shuffle',
      action: () => store.commit((s) => shuffleZoneContents(s, store.templates, zoneId))
    });
    push('lock', {
      label: 'Lock',
      action: () => store.commit((s) => setZoneLocked(s, zoneId, true))
    });
    push('unlock', {
      label: 'Unlock',
      action: () => store.commit((s) => setZoneLocked(s, zoneId, false))
    });
    if (applicable.includes('delete')) {
      result.push({ divider: true });
      result.push({
        label: 'Delete Zone',
        variant: 'danger',
        action: () => store.commit((s) => removeZone(s, zoneId))
      });
    }
    return result;
  });
</script>

{#if items.length > 0}
  <ContextMenu {x} {y} {items} {onClose} />
{/if}
