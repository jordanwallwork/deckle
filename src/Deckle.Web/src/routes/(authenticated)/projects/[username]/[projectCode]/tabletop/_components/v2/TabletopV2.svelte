<script lang="ts">
  // Thin shell for the v2 engine: wires the store + interaction reducer to
  // DOM events and renders root piles. All behaviour lives in
  // $lib/tabletop/v2 below the pure-function seam.
  import type { GameComponent } from '$lib/types';
  import type { TabletopState, Templates } from '$lib/tabletop/v2';
  import {
    applyDropPlan,
    createInteraction,
    createTabletopStore,
    resolveDrop,
    setTabletopApi
  } from '$lib/tabletop/v2';
  import { setContext } from 'svelte';
  import ComponentSidebar from './ComponentSidebar.svelte';
  import PileRenderer from './PileRenderer.svelte';
  import Toolbar from './Toolbar.svelte';

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
  const interaction = createInteraction(store);

  setContext('projectId', projectId);
  setContext('tabletopComponents', components);

  // ─── Viewport (naive pan/zoom carried over from v1; ticket 14 replaces it) ─
  let surfaceEl: HTMLDivElement | null = $state(null);
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);

  function clientToWorld(clientX: number, clientY: number): { x: number; y: number } {
    if (!surfaceEl) return { x: clientX, y: clientY };
    const rect = surfaceEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  setTabletopApi({ store, interaction, clientToWorld });

  let sidebarCollapsed = $state(false);

  // ─── Sidebar as a removal target for pile drags ───────────────────────────
  // Pile drags are pointer-based (no HTML5 drop events), so the shell does a
  // geometric hit-test against the sidebar and tells the reducer on release.
  let sidebarEl = $state<HTMLElement | null>(null);
  let pileOverSidebar = $state(false);

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
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.01);
      zoom = Math.max(0.25, Math.min(3, zoom * factor));
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  // ─── Pointer plumbing: forward world-space events to the drag reducer ────
  function handleWindowPointerMove(e: PointerEvent) {
    if (!interaction.isDragging) return;
    interaction.move(clientToWorld(e.clientX, e.clientY));
    pileOverSidebar = interaction.draggingPileId !== null && pointerOverSidebar(e);
  }

  function handleWindowPointerUp(e: PointerEvent) {
    if (!interaction.isDragging) return;
    const overSidebar = interaction.draggingPileId !== null && pointerOverSidebar(e);
    pileOverSidebar = false;
    interaction.up(clientToWorld(e.clientX, e.clientY), overSidebar);
  }

  function handleWindowPointerCancel() {
    if (!interaction.isDragging) return;
    pileOverSidebar = false;
    interaction.cancel();
  }

  // Click on empty canvas = deselect (Ctrl/Meta reserved for multi-select).
  function handleCanvasClick(e: MouseEvent) {
    if (e.ctrlKey || e.metaKey) return;
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('canvas-surface')
    ) {
      store.setSelection({ kind: 'none' });
    }
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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

    if (e.key === 'Escape') {
      if (interaction.isDragging) {
        e.preventDefault();
        pileOverSidebar = false;
        interaction.cancel();
      } else {
        store.setSelection({ kind: 'none' });
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
  }

  function handleCanvasDragLeave(e: DragEvent) {
    if (e.target === e.currentTarget) {
      isDropTarget = false;
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    isDropTarget = false;
    const templateId = e.dataTransfer?.getData('application/x-deckle-template');
    if (!templateId) return;
    e.preventDefault();

    // Route through the shared drop resolver: it dedups against what is
    // already placed and refuses containers (boards arrive with ticket 11).
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
  <Toolbar {zoom} onZoomChange={(z) => (zoom = z)} />

  <div class="tabletop-body">
    <ComponentSidebar
      {components}
      bind:collapsed={sidebarCollapsed}
      bind:el={sidebarEl}
      removeTarget={pileOverSidebar}
    />

    <div
      class="canvas"
      class:drop-target={isDropTarget}
      onclick={handleCanvasClick}
      onwheel={handleWheel}
      ondragover={handleCanvasDragOver}
      ondragleave={handleCanvasDragLeave}
      ondrop={handleCanvasDrop}
      role="application"
      aria-label="Tabletop sandbox (v2)"
    >
      <div
        bind:this={surfaceEl}
        class="canvas-surface"
        style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
      >
        {#each store.state.rootPileIds as pileId (pileId)}
          {@const pile = store.state.piles[pileId]}
          {#if pile}
            <PileRenderer {pile} />
          {/if}
        {/each}
      </div>
    </div>
  </div>
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
</style>
