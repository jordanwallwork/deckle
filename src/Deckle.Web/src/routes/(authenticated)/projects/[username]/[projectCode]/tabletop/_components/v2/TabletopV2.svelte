<script lang="ts">
  // Thin shell for the v2 engine: wires the store + interaction reducer to
  // DOM events and renders root piles. All behaviour lives in
  // $lib/tabletop/v2 below the pure-function seam.
  import type { GameComponent } from '$lib/types';
  import type { SpreadInsertHint, TabletopState, Templates } from '$lib/tabletop/v2';
  import {
    applyDropPlan,
    createInteraction,
    createTabletopStore,
    createViewport,
    dropTargetZoneAt,
    flipPiles,
    flippablePiles,
    isPileSelected,
    resolveDrop,
    rollablePiles,
    rotatablePiles,
    rotateAllInZone,
    rotatePiles,
    selectedPileIds,
    setTabletopApi,
    shufflablePiles,
    shuffleOrRollablePiles,
    shuffleOrRollPiles,
    shuffleZoneContents,
    spreadInsertHint,
    tableBoundingBox,
    zoneActions
  } from '$lib/tabletop/v2';
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import { setContext } from 'svelte';
  import ComponentSidebar from './ComponentSidebar.svelte';
  import PileContextMenu from './PileContextMenu.svelte';
  import PileRenderer from './PileRenderer.svelte';
  import Toolbar from './Toolbar.svelte';
  import ZoneContextMenu from './ZoneContextMenu.svelte';
  import ZoneRenderer from './ZoneRenderer.svelte';

  let {
    initialState,
    templates,
    components,
    projectId
  }: {
    initialState: TabletopState;
    templates: Templates;
    components: GameComponent[];
    projectId: string;
  } = $props();

  const store = createTabletopStore(initialState, templates);
  const viewport = createViewport();
  const interaction = createInteraction(store, viewport);

  setContext('projectId', projectId);
  setContext('tabletopComponents', components);

  // ─── Viewport (pointer-anchored zoom, middle-drag pan, fit-view) ──────────
  // The transform lives in the pure viewport module (viewport.svelte.ts); this
  // shell only converts client coordinates and wires the gestures. Screen
  // coordinates are canvas-relative — the anchor the world↔screen maths use.
  let canvasEl: HTMLDivElement | null = $state(null);

  function clientToScreen(clientX: number, clientY: number): { x: number; y: number } {
    if (!canvasEl) return { x: clientX, y: clientY };
    const rect = canvasEl.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
    return viewport.screenToWorld(clientToScreen(clientX, clientY));
  }

  /** Frame everything on the table — zones and loose piles — in the canvas. */
  function fitView() {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    viewport.fit(tableBoundingBox(store.state, store.templates), {
      width: rect.width,
      height: rect.height
    });
  }

  /** A sensible default view once the canvas is measurable (story 52). */
  let didInitialFit = false;
  $effect(() => {
    if (didInitialFit || !canvasEl) return;
    didInitialFit = true;
    fitView();
  });

  /** Toolbar zoom buttons anchor on the canvas centre. */
  function zoomToLevel(level: number) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    viewport.zoomTo({ x: rect.width / 2, y: rect.height / 2 }, level);
  }

  // ─── Context menus (pile / zone / canvas) ─────────────────────────────────
  let pileMenu = $state<{ pileId: string; x: number; y: number } | null>(null);
  let zoneMenu = $state<{ zoneId: string; x: number; y: number } | null>(null);
  let canvasMenu = $state<{ x: number; y: number; worldX: number; worldY: number } | null>(null);

  function closeMenus() {
    pileMenu = null;
    zoneMenu = null;
    canvasMenu = null;
  }

  function openPileContextMenu(pileId: string, clientX: number, clientY: number) {
    closeMenus();
    // Right-click selects the pile too, unless it's already in the selection.
    if (!isPileSelected(store.state, pileId)) {
      store.setSelection({ kind: 'piles', pileIds: [pileId] });
    }
    pileMenu = { pileId, x: clientX, y: clientY };
  }

  function openZoneContextMenu(zoneId: string, clientX: number, clientY: number) {
    closeMenus();
    store.setSelection({ kind: 'zone', zoneId });
    zoneMenu = { zoneId, x: clientX, y: clientY };
  }

  // Right-click on the open table: the canvas menu (zone creation lives here).
  function handleCanvasContextMenu(e: MouseEvent) {
    e.preventDefault();
    closeMenus();
    if (store.state.editingZoneId !== null) return;
    const world = clientToWorld(e.clientX, e.clientY);
    canvasMenu = { x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y };
  }

  const canvasMenuItems = $derived.by((): ContextMenuItem[] => {
    if (!canvasMenu) return [];
    const { worldX, worldY } = canvasMenu;
    return [
      { label: 'Add Zone', action: () => store.createZoneAndEdit(worldX, worldY) },
      { label: 'Add Spread', action: () => store.createZoneAndEdit(worldX, worldY, 'spread') },
      { label: 'Add Grid', action: () => store.createZoneAndEdit(worldX, worldY, 'grid') },
      { label: 'Add Group', action: () => store.createZoneAndEdit(worldX, worldY, 'group') }
    ];
  });

  // ─── Drop feedback (ticket 08) ────────────────────────────────────────────
  // Pointer drags derive their hint/hover in the interaction shell; HTML5
  // sidebar drags derive them here on dragover (getData is sealed until the
  // drop, so the sidebar reports the dragged template through the api). The
  // renderers read the composed values off the api.
  let templateDragId = $state<string | null>(null);
  let templateHint = $state.raw<SpreadInsertHint | null>(null);
  let templateHoverZoneId = $state<string | null>(null);

  function setTemplateDrag(templateId: string | null) {
    templateDragId = templateId;
    if (templateId === null) {
      templateHint = null;
      templateHoverZoneId = null;
    }
  }

  const dropHint = $derived(interaction.insertHint ?? templateHint);
  const dropTargetZoneId = $derived(interaction.dropZoneId ?? templateHoverZoneId);

  setTabletopApi({
    store,
    interaction,
    clientToWorld,
    openPileContextMenu,
    openZoneContextMenu,
    get dropHint() {
      return dropHint;
    },
    get dropTargetZoneId() {
      return dropTargetZoneId;
    },
    setTemplateDrag
  });

  let sidebarCollapsed = $state(false);

  // ─── Sidebar as a removal target for pile and zone drags ─────────────────
  // These drags are pointer-based (no HTML5 drop events), so the shell does a
  // geometric hit-test against the sidebar and tells the reducer on release.
  let sidebarEl = $state<HTMLElement | null>(null);
  let pileOverSidebar = $state(false);

  const draggingRemovable = $derived(
    interaction.draggingPileIds.length > 0 || interaction.draggingZoneId !== null
  );

  function pointerOverSidebar(e: PointerEvent): boolean {
    if (!sidebarEl) return false;
    const rect = sidebarEl.getBoundingClientRect();
    return (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    );
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      // Pointer-anchored zoom: the world point under the cursor stays put.
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.01);
      viewport.zoomBy(clientToScreen(e.clientX, e.clientY), factor);
    } else {
      // Trackpad two-finger scroll keeps panning.
      viewport.panBy(-e.deltaX, -e.deltaY);
    }
  }

  // ─── Pointer plumbing: forward world-space events to the drag reducer ────
  function handleWindowPointerMove(e: PointerEvent) {
    if (!interaction.isDragging) return;
    interaction.move(clientToWorld(e.clientX, e.clientY), clientToScreen(e.clientX, e.clientY));
    pileOverSidebar = draggingRemovable && pointerOverSidebar(e);
  }

  function handleWindowPointerUp(e: PointerEvent) {
    if (!interaction.isDragging) return;
    const overSidebar = draggingRemovable && pointerOverSidebar(e);
    pileOverSidebar = false;
    interaction.up(clientToWorld(e.clientX, e.clientY), overSidebar, clientToScreen(e.clientX, e.clientY));
  }

  function handleWindowPointerCancel() {
    if (!interaction.isDragging) return;
    pileOverSidebar = false;
    interaction.cancel();
  }

  // Pointer-down reaching the canvas is a background press (piles stop
  // propagation): left starts a marquee/deselect; middle starts a viewport
  // pan (piles/zones ignore non-left buttons, so it reaches here over them too).
  function handleCanvasPointerDown(e: PointerEvent) {
    if (e.button === 1) {
      e.preventDefault();
      interaction.panDown(clientToScreen(e.clientX, e.clientY));
      return;
    }
    if (e.button !== 0) return;
    interaction.backgroundDown(clientToWorld(e.clientX, e.clientY), {
      ctrl: e.ctrlKey || e.metaKey
    });
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const modKey = e.ctrlKey || e.metaKey;

    // A zone-edit session swallows everything except Escape (cancel the whole
    // session): undo/redo would fight the open transaction, and F/R/S have no
    // business inside an edit.
    if (store.state.editingZoneId !== null) {
      if (e.key === 'Escape') {
        e.preventDefault();
        pileOverSidebar = false;
        interaction.cancel(); // abort a mid-flight resize drag first
        store.endZoneEdit(false);
      }
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

    if (e.key === 'Escape') {
      if (interaction.isDragging) {
        e.preventDefault();
        pileOverSidebar = false;
        interaction.cancel();
      } else if (pileMenu || zoneMenu || canvasMenu) {
        closeMenus();
      } else {
        store.setSelection({ kind: 'none' });
      }
      return;
    }

    // F/R/S act on the whole selection as one undo step each. The
    // applicability check runs first so an inert selection (all dice for F,
    // all single cards for S…) records nothing in history.
    if (modKey || e.altKey) return;

    // A selected zone maps F/R/S to its zone-wide actions (story 44):
    // flip-all, rotate-all, and the behaviour-table shuffle.
    if (store.state.selection.kind === 'zone') {
      const zoneId = store.state.selection.zoneId;
      const applicable = zoneActions(store.state, store.templates, zoneId);
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (applicable.includes('flip-all')) {
          store.flipAllInZoneAnimated(zoneId);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (applicable.includes('rotate-all')) {
          store.commit((s) => rotateAllInZone(s, zoneId, 90));
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (applicable.includes('shuffle')) {
          store.commit((s) => shuffleZoneContents(s, store.templates, zoneId));
        }
      }
      return;
    }

    const selected = selectedPileIds(store.state);
    if (selected.length === 0) return;

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (flippablePiles(store.state, store.templates, selected).length > 0) {
        store.commit((s) => flipPiles(s, store.templates, selected));
      }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (rotatablePiles(store.state, selected).length > 0) {
        store.commit((s) => rotatePiles(s, selected, 90));
      }
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      // S is shuffle-or-roll: dice roll, multi-card piles shuffle. A pure
      // shuffle plays the riffle animation (deferred batch commit, one undo
      // step); a selection that also rolls dice commits instantly as one step
      // (the roll has nothing to animate), so the whole action stays atomic.
      if (shuffleOrRollablePiles(store.state, store.templates, selected).length === 0) return;
      if (rollablePiles(store.state, store.templates, selected).length > 0) {
        store.commit((s) => shuffleOrRollPiles(s, store.templates, selected));
      } else {
        store.shufflePilesAnimated(shufflablePiles(store.state, selected));
      }
    }
  }

  // ─── Drop: spawn from sidebar ─────────────────────────────────────────────
  let isDropTarget = $state(false);

  function handleCanvasDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('application/x-deckle-template')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    isDropTarget = true;
    if (templateDragId !== null) {
      const world = clientToWorld(e.clientX, e.clientY);
      const payload = { kind: 'template', templateId: templateDragId } as const;
      templateHint = spreadInsertHint(store.state, store.templates, payload, world);
      templateHoverZoneId = dropTargetZoneAt(store.state, world);
    }
  }

  function handleCanvasDragLeave(e: DragEvent) {
    if (e.target === e.currentTarget) {
      isDropTarget = false;
      templateHint = null;
      templateHoverZoneId = null;
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    isDropTarget = false;
    templateHint = null;
    templateHoverZoneId = null;
    const templateId = e.dataTransfer?.getData('application/x-deckle-template');
    if (!templateId) return;
    e.preventDefault();

    // Route through the shared drop resolver: it dedups cards against what is
    // already placed, and turns board/mat containers into freeform regions.
    const world = clientToWorld(e.clientX, e.clientY);
    const plan = resolveDrop(store.state, store.templates, { kind: 'template', templateId }, world);
    if (plan.kind === 'none') return;
    store.commit((s) => applyDropPlan(s, store.templates, plan));
  }
</script>

<svelte:window
  onkeydown={handleKeydown}
  onpointermove={handleWindowPointerMove}
  onpointerup={handleWindowPointerUp}
  onpointercancel={handleWindowPointerCancel}
/>

<div class="tabletop-container">
  <Toolbar zoom={viewport.zoom} onZoomChange={zoomToLevel} onFitView={fitView} />

  <div class="tabletop-body">
    <ComponentSidebar
      {components}
      bind:collapsed={sidebarCollapsed}
      bind:el={sidebarEl}
      removeTarget={pileOverSidebar}
    />

    <div
      bind:this={canvasEl}
      class="canvas"
      class:drop-target={isDropTarget}
      onpointerdown={handleCanvasPointerDown}
      oncontextmenu={handleCanvasContextMenu}
      onwheel={handleWheel}
      ondragover={handleCanvasDragOver}
      ondragleave={handleCanvasDragLeave}
      ondrop={handleCanvasDrop}
      role="application"
      aria-label="Tabletop sandbox (v2)"
    >
      <div
        class="canvas-surface"
        style="transform: translate({viewport.panX}px, {viewport.panY}px) scale({viewport.zoom}); transform-origin: 0 0;"
      >
        <!-- Zones render beneath root piles; each renders its own piles. -->
        {#each store.state.zoneOrder as zoneId (zoneId)}
          {@const zone = store.state.zones[zoneId]}
          {#if zone}
            <ZoneRenderer {zone} />
          {/if}
        {/each}
        {#each store.state.rootPileIds as pileId (pileId)}
          {@const pile = store.state.piles[pileId]}
          {#if pile}
            <PileRenderer {pile} />
          {/if}
        {/each}
        {#if interaction.marqueeRect}
          {@const r = interaction.marqueeRect}
          <div
            class="marquee"
            style="left: {r.x}px; top: {r.y}px; width: {r.width}px; height: {r.height}px;"
          ></div>
        {/if}
      </div>
    </div>
  </div>

  {#if pileMenu}
    <PileContextMenu
      pileId={pileMenu.pileId}
      x={pileMenu.x}
      y={pileMenu.y}
      onClose={() => (pileMenu = null)}
    />
  {/if}
  {#if zoneMenu}
    <ZoneContextMenu
      zoneId={zoneMenu.zoneId}
      x={zoneMenu.x}
      y={zoneMenu.y}
      onClose={() => (zoneMenu = null)}
    />
  {/if}
  {#if canvasMenu}
    <ContextMenu
      x={canvasMenu.x}
      y={canvasMenu.y}
      items={canvasMenuItems}
      onClose={() => (canvasMenu = null)}
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
    /* Pure transform anchor — piles render at any coordinate, clipped
       only by the viewport. */
    width: 0;
    height: 0;
    overflow: visible;
  }

  .marquee {
    position: absolute;
    border: 1px solid #3b82f6;
    background: rgba(59, 130, 246, 0.12);
    pointer-events: none;
    z-index: 200;
  }
</style>
