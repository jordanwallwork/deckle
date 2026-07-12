<script lang="ts">
  // Thin shell for the v2 engine: creates the store + viewport + interaction
  // reducer, publishes the tabletop context/api, and lays out the toolbar,
  // sidebar, canvas and context menus. All behaviour lives below the pure
  // seam ($lib/tabletop/v2) or in the co-located controllers: keyboard
  // shortcuts (tabletopKeyboard), context-menu state (tabletopMenus) and the
  // canvas/viewport wiring (tabletopCanvas).
  import type { GameComponent } from '$lib/types';
  import type { TabletopState, Templates } from '$lib/tabletop/v2';
  import {
    createInteraction,
    createTabletopStore,
    createViewport,
    setTabletopApi
  } from '$lib/tabletop/v2';
  import { setContext } from 'svelte';
  import ComponentSidebar from './ComponentSidebar.svelte';
  import TabletopCanvasView from './TabletopCanvasView.svelte';
  import { createTabletopCanvas } from './tabletopCanvas.svelte';
  import TabletopContextMenus from './TabletopContextMenus.svelte';
  import { handleTabletopKeydown } from './tabletopKeyboard';
  import { createTabletopMenus } from './tabletopMenus.svelte';
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
  const viewport = createViewport();
  const interaction = createInteraction(store, viewport);

  setContext('projectId', projectId);
  setContext('tabletopComponents', components);

  // Element refs stay here so the template can bind them; the canvas controller
  // reads them back through accessors.
  let canvasEl = $state<HTMLDivElement | null>(null);
  let sidebarEl = $state<HTMLElement | null>(null);
  let sidebarCollapsed = $state(false);

  const menus = createTabletopMenus(store);
  const canvas = createTabletopCanvas({
    store,
    interaction,
    viewport,
    menus,
    getCanvasEl: () => canvasEl,
    getSidebarEl: () => sidebarEl
  });

  setTabletopApi({
    store,
    interaction,
    clientToWorld: canvas.clientToWorld,
    openPileContextMenu: menus.openPile,
    openZoneContextMenu: menus.openZone,
    get dropHint() {
      return canvas.dropHint;
    },
    get dropTargetZoneId() {
      return canvas.dropTargetZoneId;
    },
    setTemplateDrag: canvas.setTemplateDrag
  });

  // A sensible default view once the canvas is measurable (story 52).
  $effect(() => {
    canvas.maybeInitialFit();
  });

  function handleKeydown(e: KeyboardEvent) {
    handleTabletopKeydown(e, {
      store,
      interaction,
      hasOpenMenu: menus.hasOpen,
      closeMenus: menus.close,
      clearSidebarHover: canvas.clearSidebarHover
    });
  }
</script>

<svelte:window
  onkeydown={handleKeydown}
  onpointermove={canvas.handleWindowPointerMove}
  onpointerup={canvas.handleWindowPointerUp}
  onpointercancel={canvas.handleWindowPointerCancel}
/>

<div class="tabletop-container">
  <Toolbar zoom={viewport.zoom} onZoomChange={canvas.zoomToLevel} onFitView={canvas.fitView} />

  <div class="tabletop-body">
    <ComponentSidebar
      {components}
      bind:collapsed={sidebarCollapsed}
      bind:el={sidebarEl}
      removeTarget={canvas.pileOverSidebar}
    />

    <TabletopCanvasView {canvas} {viewport} bind:canvasEl />
  </div>

  <TabletopContextMenus {menus} />
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
</style>
