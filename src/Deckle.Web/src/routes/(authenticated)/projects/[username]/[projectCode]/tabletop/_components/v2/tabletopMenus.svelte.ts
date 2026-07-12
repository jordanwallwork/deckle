// Context-menu state for the v2 tabletop (pile / zone / open-canvas). Kept out
// of the shell so it only renders the menus and forwards positions. Opening a
// pile/zone menu also updates the selection to match the target.
import { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
import { isPileSelected, type TabletopStore } from '$lib/tabletop/v2';

interface PileMenu {
  pileId: string;
  x: number;
  y: number;
}
interface ZoneMenu {
  zoneId: string;
  x: number;
  y: number;
}
interface CanvasMenu {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
}

export function createTabletopMenus(store: TabletopStore) {
  let pile = $state<PileMenu | null>(null);
  let zone = $state<ZoneMenu | null>(null);
  let canvas = $state<CanvasMenu | null>(null);

  function close() {
    pile = null;
    zone = null;
    canvas = null;
  }

  function openPile(pileId: string, clientX: number, clientY: number) {
    close();
    // Right-click selects the pile too, unless it's already in the selection.
    if (!isPileSelected(store.state, pileId)) {
      store.setSelection({ kind: 'piles', pileIds: [pileId] });
    }
    pile = { pileId, x: clientX, y: clientY };
  }

  function openZone(zoneId: string, clientX: number, clientY: number) {
    close();
    store.setSelection({ kind: 'zone', zoneId });
    zone = { zoneId, x: clientX, y: clientY };
  }

  // Right-click on the open table: the canvas menu (zone creation lives here).
  function openCanvas(clientX: number, clientY: number, worldX: number, worldY: number) {
    close();
    canvas = { x: clientX, y: clientY, worldX, worldY };
  }

  const canvasItems = $derived.by((): ContextMenuItem[] => {
    if (!canvas) return [];
    const { worldX, worldY } = canvas;
    return [
      { label: 'Add Zone', action: () => store.createZoneAndEdit(worldX, worldY) },
      { label: 'Add Spread', action: () => store.createZoneAndEdit(worldX, worldY, 'spread') },
      { label: 'Add Grid', action: () => store.createZoneAndEdit(worldX, worldY, 'grid') },
      { label: 'Add Group', action: () => store.createZoneAndEdit(worldX, worldY, 'group') }
    ];
  });

  return {
    get pile() {
      return pile;
    },
    get zone() {
      return zone;
    },
    get canvas() {
      return canvas;
    },
    get canvasItems() {
      return canvasItems;
    },
    hasOpen: () => pile !== null || zone !== null || canvas !== null,
    openPile,
    openZone,
    openCanvas,
    close,
    closePile: () => (pile = null),
    closeZone: () => (zone = null),
    closeCanvas: () => (canvas = null)
  };
}

export type TabletopMenus = ReturnType<typeof createTabletopMenus>;
