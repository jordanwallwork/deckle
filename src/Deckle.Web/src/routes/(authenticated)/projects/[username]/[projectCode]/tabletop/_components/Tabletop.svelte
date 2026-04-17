<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import type { TabletopState, EntityTemplate } from '$lib/tabletop';
  import { createTabletopStore, setTabletopApi } from '$lib/tabletop';
  import { setContext } from 'svelte';
  import ZoneRenderer from './ZoneRenderer.svelte';
  import TabletopToolbar from './TabletopToolbar.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';

  let {
    initialState,
    templates,
    components,
    projectId
  }: {
    initialState: TabletopState;
    templates: Record<string, EntityTemplate>;
    components: GameComponent[];
    projectId: string;
  } = $props();

  const store = createTabletopStore(initialState, templates);
  setTabletopApi(store);
  setContext('projectId', projectId);
  setContext('tabletopComponents', components);

  // Canvas geometry shared with entity drag handlers. Exposed as getters so
  // consumers see live zoom / DOM-ref values without re-subscribing.
  let surfaceEl: HTMLDivElement | null = $state(null);
  setContext('tabletopCanvas', {
    get zoom() {
      return zoom;
    },
    get surfaceEl() {
      return surfaceEl;
    }
  });

  // ─── Context menu ──────────────────────────────────────────────────────
  let contextMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  function closeContextMenu() {
    contextMenu = null;
  }

  function handleCanvasContextMenu(e: MouseEvent) {
    e.preventDefault();
    closeContextMenu();

    const selectedId = store.state.selectedEntityId;
    const selectedZoneId = store.state.selectedZoneId;

    const items: ContextMenuItem[] = [];

    if (selectedId) {
      const entity = store.state.entities[selectedId];
      const zone = entity ? store.state.zones[entity.zoneId] : null;
      const template = entity ? store.templates[entity.templateId] : null;

      items.push({
        label: `Flip (F)`,
        action: () => store.flipEntity(selectedId)
      });
      items.push({
        label: `Rotate 90° (R)`,
        action: () => store.rotateEntity(selectedId, 90)
      });
      items.push({ divider: true });

      // Move to zone submenu
      const otherZones = store.state.zoneOrder
        .map((id) => store.state.zones[id])
        .filter((z) => z && z.id !== entity?.zoneId);

      if (otherZones.length > 0) {
        items.push({
          label: 'Move to...',
          submenu: otherZones.map((z) => ({
            label: z.name,
            action: () => store.moveEntityToZone(selectedId, z.id, { x: 20, y: 20 })
          }))
        });
      }

      if (zone?.type === 'freeform' && zone.entityIds.length > 1) {
        items.push({ divider: true });
        items.push({
          label: 'Send to Front',
          action: () => store.reorderInZone(selectedId, zone.entityIds.length - 1)
        });
        items.push({
          label: 'Send to Back',
          action: () => store.reorderInZone(selectedId, 0)
        });
      }
    } else if (selectedZoneId) {
      const zone = store.state.zones[selectedZoneId];
      if (zone?.type === 'stack') {
        items.push({
          label: `Shuffle (S)`,
          action: () => store.shuffleStack(selectedZoneId)
        });
        items.push({
          label: zone.faceDown ? 'Flip Stack Face-Up' : 'Flip Stack Face-Down',
          action: () => store.setStackFaceDown(selectedZoneId, !zone.faceDown)
        });
        // Draw to tableau
        if (zone.entityIds.length > 0) {
          items.push({ divider: true });
          items.push({
            label: 'Draw to Tableau',
            action: () => store.drawFromStack(selectedZoneId, 'zone-tableau', 40, 40)
          });
        }
      }
    }

    if (items.length === 0) {
      items.push({ label: 'No actions', disabled: true });
    }

    contextMenu = { x: e.clientX, y: e.clientY, items };
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    // Don't capture when focus is in an input
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Accept both Ctrl and Cmd for undo/redo — works on both platforms
    // without relying on deprecated navigator.platform detection.
    const modKey = e.ctrlKey || e.metaKey;

    if (modKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      store.undo();
      return;
    }
    if (modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      store.redo();
      return;
    }

    const selectedId = store.state.selectedEntityId;
    const selectedZoneId = store.state.selectedZoneId;

    if (selectedId) {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        store.flipEntity(selectedId);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        store.rotateEntity(selectedId, 90);
      } else if (e.key === 'Escape') {
        store.selectEntity(null);
      }
    } else if (selectedZoneId) {
      const zone = store.state.zones[selectedZoneId];
      if ((e.key === 's' || e.key === 'S') && zone?.type === 'stack') {
        e.preventDefault();
        store.shuffleStack(selectedZoneId);
      } else if (e.key === 'Escape') {
        store.selectZone(null);
      }
    } else if (e.key === 'Escape') {
      store.selectEntity(null);
      store.selectZone(null);
    }
  }

  // ─── Canvas panning ────────────────────────────────────────────────────
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoom = Math.max(0.25, Math.min(3, zoom + delta));
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  // Click on empty canvas = deselect
  function handleCanvasClick(e: MouseEvent) {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-surface')) {
      store.selectEntity(null);
      store.selectZone(null);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="tabletop-container">
  <TabletopToolbar {zoom} onZoomChange={(z) => (zoom = z)} />

  <div
    class="canvas"
    oncontextmenu={handleCanvasContextMenu}
    onclick={handleCanvasClick}
    onwheel={handleWheel}
    role="application"
    aria-label="Tabletop sandbox"
  >
    <div
      bind:this={surfaceEl}
      class="canvas-surface"
      style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
    >
      {#each store.state.zoneOrder as zoneId (zoneId)}
        {@const zone = store.state.zones[zoneId]}
        {#if zone}
          <ZoneRenderer {zone} />
        {/if}
      {/each}
    </div>
  </div>

  {#if contextMenu}
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      items={contextMenu.items}
      onClose={closeContextMenu}
    />
  {/if}
</div>

<style>
  .tabletop-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #2a2d3a;
  }

  .canvas {
    flex: 1;
    overflow: hidden;
    position: relative;
    cursor: default;
  }

  .canvas-surface {
    position: absolute;
    top: 0;
    left: 0;
    /* Large enough virtual space for the zones */
    width: 4000px;
    height: 4000px;
  }
</style>
