// Canvas controller for the tabletop: viewport wiring (pointer-anchored
// zoom, middle-drag pan, fit-view), the pointer plumbing that forwards
// world-space events to the drag reducer, the sidebar-as-removal-target
// hit-test, and the HTML5 sidebar-drop feedback + spawn. Pulled out of the
// shell so the component only binds the canvas element and hangs these
// handlers on it. The element refs stay in the component (for bind:this /
// bind:el) and are read back through the accessor deps.
import {
  applyDropPlan,
  dropTargetZoneAt,
  resolveDrop,
  spreadInsertHint,
  tableBoundingBox,
  type Point,
  type SpreadInsertHint,
  type TabletopInteraction,
  type TabletopStore,
  type TabletopViewport
} from '$lib/tabletop';
import type { TabletopMenus } from './tabletopMenus.svelte';

export interface TabletopCanvasDeps {
  store: TabletopStore;
  interaction: TabletopInteraction;
  viewport: TabletopViewport;
  menus: TabletopMenus;
  /** The bound canvas element (owned by the component for bind:this). */
  getCanvasEl: () => HTMLDivElement | null;
  /** The bound sidebar element (owned by the component for bind:el). */
  getSidebarEl: () => HTMLElement | null;
}

export function createTabletopCanvas(deps: TabletopCanvasDeps) {
  const { store, interaction, viewport, menus, getCanvasEl, getSidebarEl } = deps;

  let pileOverSidebar = $state(false);
  let isDropTarget = $state(false);

  // Pointer drags derive their hint/hover in the interaction shell; HTML5
  // sidebar drags derive them here on dragover (getData is sealed until the
  // drop, so the sidebar reports the dragged template through the api).
  let templateDragId = $state<string | null>(null);
  let templateHint = $state.raw<SpreadInsertHint | null>(null);
  let templateHoverZoneId = $state<string | null>(null);

  let didInitialFit = false;

  // Screen coordinates are canvas-relative — the anchor the world↔screen maths
  // use.
  function clientToScreen(clientX: number, clientY: number): Point {
    const canvasEl = getCanvasEl();
    if (!canvasEl) return { x: clientX, y: clientY };
    const rect = canvasEl.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function clientToWorld(clientX: number, clientY: number): Point {
    return viewport.screenToWorld(clientToScreen(clientX, clientY));
  }

  /** Frame everything on the table — zones and loose piles — in the canvas. */
  function fitView() {
    const canvasEl = getCanvasEl();
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    viewport.fit(tableBoundingBox(store.state, store.templates), {
      width: rect.width,
      height: rect.height
    });
  }

  /** A sensible default view once the canvas is measurable (story 52). */
  function maybeInitialFit() {
    if (didInitialFit || !getCanvasEl()) return;
    didInitialFit = true;
    fitView();
  }

  /** Toolbar zoom buttons anchor on the canvas centre. */
  function zoomToLevel(level: number) {
    const canvasEl = getCanvasEl();
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    viewport.zoomTo({ x: rect.width / 2, y: rect.height / 2 }, level);
  }

  function setTemplateDrag(templateId: string | null) {
    templateDragId = templateId;
    if (templateId === null) {
      templateHint = null;
      templateHoverZoneId = null;
    }
  }

  const dropHint = $derived(interaction.insertHint ?? templateHint);
  const dropTargetZoneId = $derived(interaction.dropZoneId ?? templateHoverZoneId);

  const draggingRemovable = $derived(
    interaction.draggingPileIds.length > 0 || interaction.draggingZoneId !== null
  );

  function pointerOverSidebar(e: PointerEvent): boolean {
    const sidebarEl = getSidebarEl();
    if (!sidebarEl) return false;
    const rect = sidebarEl.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
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

  function handleWindowPointerMove(e: PointerEvent) {
    if (!interaction.isDragging) return;
    interaction.move(clientToWorld(e.clientX, e.clientY), clientToScreen(e.clientX, e.clientY));
    pileOverSidebar = draggingRemovable && pointerOverSidebar(e);
  }

  function handleWindowPointerUp(e: PointerEvent) {
    if (!interaction.isDragging) return;
    const overSidebar = draggingRemovable && pointerOverSidebar(e);
    pileOverSidebar = false;
    interaction.up(
      clientToWorld(e.clientX, e.clientY),
      overSidebar,
      clientToScreen(e.clientX, e.clientY)
    );
  }

  function handleWindowPointerCancel() {
    if (!interaction.isDragging) return;
    pileOverSidebar = false;
    interaction.cancel();
  }

  // Pointer-down reaching the canvas is a background press (piles stop
  // propagation): left starts a marquee/deselect; middle starts a viewport pan
  // (piles/zones ignore non-left buttons, so it reaches here over them too).
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

  function handleCanvasContextMenu(e: MouseEvent) {
    e.preventDefault();
    menus.close();
    if (store.state.editingZoneId !== null) return;
    const world = clientToWorld(e.clientX, e.clientY);
    menus.openCanvas(e.clientX, e.clientY, world.x, world.y);
  }

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

  return {
    get pileOverSidebar() {
      return pileOverSidebar;
    },
    get isDropTarget() {
      return isDropTarget;
    },
    get dropHint() {
      return dropHint;
    },
    get dropTargetZoneId() {
      return dropTargetZoneId;
    },
    clientToWorld,
    fitView,
    zoomToLevel,
    setTemplateDrag,
    maybeInitialFit,
    clearSidebarHover: () => (pileOverSidebar = false),
    handleWheel,
    handleWindowPointerMove,
    handleWindowPointerUp,
    handleWindowPointerCancel,
    handleCanvasPointerDown,
    handleCanvasContextMenu,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop
  };
}

export type TabletopCanvas = ReturnType<typeof createTabletopCanvas>;
