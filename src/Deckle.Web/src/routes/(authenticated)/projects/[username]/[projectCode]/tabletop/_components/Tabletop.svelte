<script lang="ts">
  import type { GameComponent, DiceComponent } from '$lib/types';
  import type { TabletopState, EntityTemplate } from '$lib/tabletop';
  import { createTabletopStore, setTabletopApi } from '$lib/tabletop';
  import { setContext } from 'svelte';
  import ZoneRenderer from './ZoneRenderer.svelte';
  import TabletopToolbar from './TabletopToolbar.svelte';
  import ComponentSidebar from './ComponentSidebar.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import * as ops from '$lib/tabletop/operations';
  import { getTemplateDisplaySize } from '$lib/tabletop/initialization';

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

  console.log('%c[tabletop] Press Shift+Alt+D to toggle debug mode (command log)', 'color: #888');
  setContext('tabletopComponents', components);

  // Canvas geometry shared with entity drag handlers. Exposed as getters so
  // consumers see live zoom / DOM-ref values without re-subscribing.
  let surfaceEl: HTMLDivElement | null = $state(null);
  let sidebarEl: HTMLElement | null = $state(null);
  setContext('tabletopCanvas', {
    get zoom() {
      return zoom;
    },
    get surfaceEl() {
      return surfaceEl;
    },
    get sidebarEl() {
      return sidebarEl;
    }
  });

  let sidebarCollapsed = $state(false);

  // ─── Context menu ──────────────────────────────────────────────────────
  let contextMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  function closeContextMenu() {
    contextMenu = null;
  }

  function getWorldPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!surfaceEl) return null;
    const rect = surfaceEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  /** Default size for a freshly created zone; user resizes in edit mode. */
  const NEW_ZONE_WIDTH = 300;
  const NEW_ZONE_HEIGHT = 200;
  const NEW_SPREAD_WIDTH = 400;
  const NEW_SPREAD_HEIGHT = 220;

  const MAX_FACES: Record<string, number> = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20 };

  function getDiceMaxFaces(templateId: string): number {
    const comp = components.find((c) => c.id === templateId) as DiceComponent | undefined;
    return MAX_FACES[comp?.diceType ?? ''] ?? 6;
  }

  function createZoneAt(clientX: number, clientY: number) {
    const world = getWorldPoint(clientX, clientY);
    if (!world) return;
    store.createFreeformZone(
      world.x - NEW_ZONE_WIDTH / 2,
      world.y - NEW_ZONE_HEIGHT / 2,
      NEW_ZONE_WIDTH,
      NEW_ZONE_HEIGHT
    );
  }

  function createSpreadZoneAt(clientX: number, clientY: number) {
    const world = getWorldPoint(clientX, clientY);
    if (!world) return;
    store.createSpreadZone(
      world.x - NEW_SPREAD_WIDTH / 2,
      world.y - NEW_SPREAD_HEIGHT / 2,
      NEW_SPREAD_WIDTH,
      NEW_SPREAD_HEIGHT,
      'row',
      40
    );
  }

  function createGroupZoneAt(clientX: number, clientY: number) {
    const world = getWorldPoint(clientX, clientY);
    if (!world) return;
    store.createGroupZone(
      world.x - NEW_ZONE_WIDTH / 2,
      world.y - NEW_ZONE_HEIGHT / 2,
      NEW_ZONE_WIDTH,
      NEW_ZONE_HEIGHT
    );
  }

  function handleCanvasContextMenu(e: MouseEvent) {
    e.preventDefault();
    closeContextMenu();

    // Don't open a menu while the user is mid-edit — the edit UI already
    // has its own affordances (Done, Delete, etc).
    if (store.state.editingZoneId) return;

    // Right-click on empty canvas (not a zone or entity) — deselect so the
    // "Create Zone" menu shows instead of an unrelated selection's menu.
    const target = e.target as HTMLElement;
    if (
      target === e.currentTarget ||
      target.classList.contains('canvas-surface')
    ) {
      store.selectEntity(null);
      store.selectZone(null);
    }

    const selectedId = store.state.selectedEntityId;
    const selectedZoneId = store.state.selectedZoneId;

    const items: ContextMenuItem[] = [];

    if (selectedId) {
      const entity = store.state.entities[selectedId];
      const zone = entity ? store.state.zones[entity.zoneId] : null;
      const entityTemplate = entity ? templates[entity.templateId] : null;
      const isDie = entityTemplate?.type === 'Dice';

      if (isDie && entity) {
        items.push({
          label: `Roll (S)`,
          action: () => store.rollDie(selectedId, getDiceMaxFaces(entity.templateId))
        });
        items.push({ divider: true });
      }

      items.push({
        label: `Flip (F)`,
        action: () => store.flipEntity(selectedId)
      });
      items.push({
        label: `Rotate 90° (R)`,
        action: () => {
          const rotateEntity = store.state.entities[selectedId];
          const rotateZone = rotateEntity ? store.state.zones[rotateEntity.zoneId] : null;
          if (rotateZone?.type === 'stack') {
            store.rotateStack(rotateZone.id, 90);
          } else {
            store.rotateEntity(selectedId, 90);
          }
        }
      });
      items.push({ divider: true });
      items.push({
        label: entity?.locked ? 'Unlock' : 'Lock',
        action: () => store.setEntityLocked(selectedId, !entity?.locked)
      });

      // Move to zone submenu — non-stackable entities can only move to freeform zones
      const entityStackable = entityTemplate ? ops.isStackable(entityTemplate) : true;
      const otherZones = store.state.zoneOrder
        .map((id) => store.state.zones[id])
        .filter((z) => z && z.id !== entity?.zoneId && (entityStackable || z.type === 'freeform' || z.type === 'group'));

      if (otherZones.length > 0) {
        items.push({ divider: true });
        items.push({
          label: 'Move to...',
          submenu: otherZones.map((z) => ({
            label: z.name,
            action: () => store.moveEntityToZone(selectedId, z.id, { x: 20, y: 20 })
          }))
        });
      }

      if ((zone?.type === 'freeform' || zone?.type === 'group') && zone.entityIds.length > 1) {
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
      if (zone) {
        if (zone.type === 'spread') {
          items.push({
            label: zone.direction === 'row' ? 'Direction: Row' : 'Direction: Column',
            action: () =>
              store.setSpreadDirection(selectedZoneId, zone.direction === 'row' ? 'column' : 'row')
          });
          items.push({ divider: true });
        }
        if (zone.type === 'stack') {
          items.push({
            label: `Shuffle (S)`,
            action: () => store.shuffleStack(selectedZoneId)
          });
          items.push({
            label: zone.faceDown ? 'Flip Stack Face-Up (F)' : 'Flip Stack Face-Down (F)',
            action: () => store.setStackFaceDown(selectedZoneId, !zone.faceDown)
          });
          items.push({
            label: `Rotate 90° (R)`,
            action: () => store.rotateStack(selectedZoneId, 90)
          });
          items.push({
            label: zone.persistent ? 'Persistent ✓' : 'Persistent',
            action: () => store.setStackPersistent(selectedZoneId, !zone.persistent)
          });
          if (zone.entityIds.length > 0) {
            const playArea = store.state.zoneOrder
              .map((id) => store.state.zones[id])
              .find((z) => z && z.id !== selectedZoneId && z.type === 'freeform');
            if (playArea) {
              items.push({ divider: true });
              items.push({
                label: `Draw to ${playArea.name}`,
                action: () => store.drawFromStack(selectedZoneId, playArea.id, 40, 40)
              });
            }
          }
          items.push({ divider: true });
        }
        if ((zone.type === 'spread' || zone.type === 'grid' || zone.type === 'group') && zone.entityIds.length > 0) {
          items.push({
            label: `Shuffle (S)`,
            action: () => store.shuffleZoneEntities(selectedZoneId)
          });
          items.push({
            label: `Flip All (F)`,
            action: () => store.flipZoneEntities(selectedZoneId)
          });
          items.push({
            label: `Rotate 90° (R)`,
            action: () => store.rotateZoneEntities(selectedZoneId, 90)
          });
          items.push({ divider: true });
        }
        if (zone.type === 'freeform') {
          items.push({
            label: 'Add Zone',
            disabled: zone.locked,
            action: () => {
              const childWidth = 200;
              const childHeight = 150;
              store.createFreeformZone(
                (zone.width - childWidth) / 2,
                (zone.height - childHeight) / 2,
                childWidth,
                childHeight,
                'New Zone',
                zone.id
              );
            }
          });
          items.push({ divider: true });
        }
        items.push({
          label: 'Edit Zone',
          disabled: zone.locked,
          action: () => store.setEditingZone(selectedZoneId)
        });
        items.push({
          label: zone.locked ? 'Unlock' : 'Lock',
          action: () => store.setZoneLocked(selectedZoneId, !zone.locked)
        });
        items.push({
          label: 'Delete Zone',
          variant: 'danger',
          disabled: zone.locked,
          action: () => store.deleteZone(selectedZoneId)
        });
      }
    } else {
      const { clientX, clientY } = e;
      items.push({
        label: 'Create Zone',
        action: () => createZoneAt(clientX, clientY)
      });
      items.push({
        label: 'Create Spread Zone',
        action: () => createSpreadZoneAt(clientX, clientY)
      });
      items.push({
        label: 'Create Group Zone',
        action: () => createGroupZoneAt(clientX, clientY)
      });
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

    if (e.shiftKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      store.toggleDebugMode();
      return;
    }

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

    // Edit mode: Escape exits without cancelling the edits in progress.
    // (Use Undo after exit to roll back the whole edit session.)
    if (store.state.editingZoneId && e.key === 'Escape') {
      e.preventDefault();
      store.setEditingZone(null);
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
        const entityForRotate = store.state.entities[selectedId];
        const zoneForRotate = entityForRotate ? store.state.zones[entityForRotate.zoneId] : null;
        if (zoneForRotate?.type === 'stack') {
          store.rotateStack(zoneForRotate.id, 90);
        } else {
          store.rotateEntity(selectedId, 90);
        }
      } else if (e.key === 's' || e.key === 'S') {
        const entity = store.state.entities[selectedId];
        const entityTemplate = entity ? templates[entity.templateId] : null;
        if (entityTemplate?.type === 'Dice' && entity) {
          e.preventDefault();
          store.rollDie(selectedId, getDiceMaxFaces(entity.templateId));
        } else {
          // The top card of a stack is the only clickable surface, so a selected
          // entity in a stack is usually the user's proxy for the stack itself.
          const zone = entity ? store.state.zones[entity.zoneId] : null;
          if (zone?.type === 'stack') {
            e.preventDefault();
            store.shuffleStack(zone.id);
          }
        }
      } else if (e.key === 'Escape') {
        store.selectEntity(null);
      }
    } else if (selectedZoneId) {
      const zone = store.state.zones[selectedZoneId];
      if (e.key === 's' || e.key === 'S') {
        if (zone?.type === 'stack') {
          e.preventDefault();
          store.shuffleStack(selectedZoneId);
        } else if (zone?.type === 'spread' || zone?.type === 'grid' || zone?.type === 'group') {
          e.preventDefault();
          store.shuffleZoneEntities(selectedZoneId);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (zone?.type === 'stack') {
          e.preventDefault();
          store.setStackFaceDown(selectedZoneId, !zone.faceDown);
        } else if (zone?.type === 'spread' || zone?.type === 'grid' || zone?.type === 'group') {
          e.preventDefault();
          store.flipZoneEntities(selectedZoneId);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (zone?.type === 'stack') {
          e.preventDefault();
          store.rotateStack(selectedZoneId, 90);
        } else if (zone?.type === 'spread' || zone?.type === 'grid' || zone?.type === 'group') {
          e.preventDefault();
          store.rotateZoneEntities(selectedZoneId, 90);
        }
      } else if (e.key === 'Escape') {
        store.selectZone(null);
      }
    } else if (e.key === 'Escape') {
      store.selectEntity(null);
      store.selectZone(null);
    }
  }

  // ─── Canvas panning ────────────────────────────────────────────────────
  let canvasEl: HTMLDivElement | null = $state(null);
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);

  function fitView() {
    if (!canvasEl) return;
    const zones = store.state.zoneOrder.map((id) => store.state.zones[id]).filter(Boolean);
    if (zones.length === 0) {
      zoom = 1;
      panX = 0;
      panY = 0;
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const zone of zones) {
      if (zone.x < minX) minX = zone.x;
      if (zone.y < minY) minY = zone.y;
      if (zone.x + zone.width > maxX) maxX = zone.x + zone.width;
      if (zone.y + zone.height > maxY) maxY = zone.y + zone.height;
    }

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    const rect = canvasEl.getBoundingClientRect();
    const padding = 40;
    const availableWidth = Math.max(1, rect.width - padding * 2);
    const availableHeight = Math.max(1, rect.height - padding * 2);

    const fitZoom = Math.min(availableWidth / bboxWidth, availableHeight / bboxHeight);
    zoom = Math.max(0.25, Math.min(3, fitZoom));
    panX = rect.width / 2 - (minX + bboxWidth / 2) * zoom;
    panY = rect.height / 2 - (minY + bboxHeight / 2) * zoom;
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.01);
      zoom = Math.max(0.25, Math.min(3, zoom * factor));
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

  // ─── Drop: spawn from sidebar ──────────────────────────────────────────
  let isDropTarget = $state(false);

  function handleCanvasDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('application/x-deckle-template')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    isDropTarget = true;
  }

  function handleCanvasDragLeave(e: DragEvent) {
    // Only clear when leaving the canvas itself, not a child.
    if (e.target === e.currentTarget) {
      isDropTarget = false;
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    isDropTarget = false;
    const templateId = e.dataTransfer?.getData('application/x-deckle-template');
    if (!templateId || !surfaceEl) return;
    e.preventDefault();

    const rect = surfaceEl.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / zoom;
    const worldY = (e.clientY - rect.top) / zoom;

    const template = store.templates[templateId];
    if (!template) return;

    // GameBoard and PlayerMat become freeform container zones rather than entities.
    if (ops.isContainerTemplate(template)) {
      const { width: displayW, height: displayH } = getTemplateDisplaySize(template);
      store.spawnBoardZone(templateId, worldX, worldY, displayW, displayH);
      return;
    }

    // Only spawn the instances that aren't already on the tabletop — no duplicates.
    const unplaced = ops.getUnplacedInstances(store.state, template);
    if (unplaced.length === 0) return;

    const stackable = ops.isStackable(template);

    const droppedOnZone = ops.findZoneAtPoint(store.state, worldX, worldY)
      ?? store.state.zones[store.state.zoneOrder[0]];
    if (!droppedOnZone) return;

    // Non-stackable entities (Dice etc.) can only live in freeform or group zones
    // — redirect the drop if the user aimed at a stack/spread/grid.
    const targetZone = (!stackable && droppedOnZone.type !== 'freeform' && droppedOnZone.type !== 'group')
      ? (Object.values(store.state.zones).find(z => z.type === 'freeform' || z.type === 'group') ?? droppedOnZone)
      : droppedOnZone;

    const { width: displayW, height: displayH } = getTemplateDisplaySize(template);

    // Multi-instance non-stackable templates (e.g. a Dice set) land as a group
    // zone so all instances are visible as a loose cluster rather than a heap.
    if (!stackable && unplaced.length > 1) {
      const result = store.spawnGroupZoneFromTemplate(templateId, worldX, worldY, displayW, displayH, unplaced);
      if (result) store.selectZone(result.zoneId);
      return;
    }

    // Multi-instance stackable templates (e.g. a card backed by a data source)
    // land as a real stack zone rather than a heap of overlapping entities —
    // unless the user dropped onto a zone with its own insertion semantics
    // (stack, spread), in which case feed the instances into that zone.
    if (
      stackable &&
      unplaced.length > 1 &&
      targetZone.type !== 'stack' &&
      targetZone.type !== 'spread'
    ) {
      const result = store.spawnStackZoneFromTemplate(templateId, worldX, worldY, displayW, displayH, unplaced);
      if (result) store.selectZone(result.zoneId);
      return;
    }

    const targetZoneWorldPos = ops.getZoneWorldPos(store.state, targetZone.id);

    if (stackable && targetZone.type === 'spread') {
      // Insert at the pointer — bridge between the two cards the user
      // dropped between. An empty spread falls back to index 0.
      const insertIndex = ops.computeSpreadInsertIndex(
        targetZone,
        worldX - targetZoneWorldPos.x,
        worldY - targetZoneWorldPos.y
      );
      store.spawnFromTemplate(templateId, targetZone.id, 0, 0, unplaced, insertIndex);
      return;
    }

    // Center the entity on the drop point (freeform/grid); stack zones ignore xy.
    const localX = worldX - targetZoneWorldPos.x - displayW / 2;
    const localY = worldY - targetZoneWorldPos.y - displayH / 2;

    store.spawnFromTemplate(templateId, targetZone.id, localX, localY, unplaced);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="tabletop-container">
  <TabletopToolbar {zoom} onZoomChange={(z) => (zoom = z)} onFitView={fitView} />

  <div class="tabletop-body">
    <div class="sidebar-wrapper" bind:this={sidebarEl}>
      <ComponentSidebar {components} bind:collapsed={sidebarCollapsed} />
    </div>

    <div
      bind:this={canvasEl}
      class="canvas"
      class:drop-target={isDropTarget}
      oncontextmenu={handleCanvasContextMenu}
      onclick={handleCanvasClick}
      onwheel={handleWheel}
      ondragover={handleCanvasDragOver}
      ondragleave={handleCanvasDragLeave}
      ondrop={handleCanvasDrop}
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

  .tabletop-body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .sidebar-wrapper {
    display: flex;
    flex-shrink: 0;
  }

  .canvas {
    flex: 1;
    overflow: hidden;
    position: relative;
    cursor: default;
    transition: box-shadow 0.15s;
  }

  .canvas.drop-target {
    box-shadow: inset 0 0 0 2px #3b82f6;
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
