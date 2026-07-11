<script lang="ts">
  // Thin shell over the pure zoneActions table: it decides what the menu
  // shows; each choice runs through the store (edit opens the transactional
  // session; lock/delete are single commits).
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import type { ZoneAction } from '$lib/tabletop/v2';
  import { getTabletopApi, removeZone, setZoneLocked, zoneActions } from '$lib/tabletop/v2';

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
    const applicable = zoneActions(store.state, zoneId);
    const result: ContextMenuItem[] = [];
    const push = (action: ZoneAction, item: ContextMenuItem) => {
      if (applicable.includes(action)) result.push(item);
    };
    push('edit', { label: 'Edit Zone', action: () => store.startZoneEdit(zoneId) });
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
