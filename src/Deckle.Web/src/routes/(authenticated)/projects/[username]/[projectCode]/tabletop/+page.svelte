<script lang="ts">
  import type { PageData } from './$types';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import { dataSourcesApi } from '$lib/api';
  import { isEditableComponent, hasDataSource, getComponentDisplayType } from '$lib/utils/componentTypes';
  import type { GameComponent } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { fontLoader } from '$lib/stores/fontLoader';
  import PlacedComponentGroup from './_components/PlacedComponentGroup.svelte';

  let { data }: { data: PageData } = $props();

  $effect(() => {
    setMaxScreen(true);
    return () => setMaxScreen(false);
  });

  // Physical scale: screen pixels per mm
  // 3.54 px/mm ≈ 90 DPI display, so all components render at the same physical scale
  // regardless of their source DPI
  const MM_SCALE = 3.54;

  interface PlacedItem {
    instanceId: string;
    component: GameComponent;
    x: number;
    y: number;
    loading: boolean;
    dataSourceRows: Record<string, string>[];
    rotation: number;
    flipped: boolean;
  }

  let activeInstanceId = $state<string | null>(null);

  let placedItems = $state<PlacedItem[]>([]);
  let nextId = 0;

  // Sidebar drag state
  let draggingId = $state<string | null>(null);

  function handleDragStart(event: DragEvent, component: GameComponent) {
    draggingId = component.id;
    event.dataTransfer!.setData('text/plain', component.id);
    event.dataTransfer!.effectAllowed = 'copy';
  }

  function handleDragEnd() {
    draggingId = null;
  }

  // Canvas drop state
  let isDragOver = $state(false);
  let canvasEl = $state<HTMLElement | null>(null);

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    // Only clear if leaving the canvas itself (not a child element)
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      isDragOver = false;
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    const componentId = event.dataTransfer?.getData('text/plain');
    if (!componentId) return;

    const component = data.components.find((c) => c.id === componentId);
    if (!component) return;

    // Calculate drop position relative to canvas, accounting for scroll and zoom
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left + el.scrollLeft) / zoom;
    const y = (event.clientY - rect.top + el.scrollTop) / zoom;

    const instanceId = `placed-${nextId++}`;
    const needsData = hasDataSource(component) && !!(component as any).dataSource;

    // Preload fonts if editable
    if (isEditableComponent(component) && component.frontDesign) {
      try {
        const design = JSON.parse(component.frontDesign) as ContainerElement;
        if (design.fonts?.length) {
          fontLoader.preloadTemplateFonts(design.fonts);
        }
      } catch {
        // ignore
      }
    }

    const item: PlacedItem = {
      instanceId,
      component,
      x,
      y,
      loading: needsData,
      dataSourceRows: [],
      rotation: 0,
      flipped: false
    };
    placedItems.push(item);

    if (needsData) {
      const dataSource = (component as any).dataSource as { id: string };
      try {
        const result = await dataSourcesApi.getData(dataSource.id);
        const rows = result.data;
        let dataRows: Record<string, string>[] = [];
        if (rows.length > 1) {
          const headers = rows[0];
          dataRows = rows.slice(1).map((row) => {
            const record: Record<string, string> = {};
            headers.forEach((h, i) => {
              record[h] = row[i] ?? '';
            });
            return record;
          });
        }
        const idx = placedItems.findIndex((p) => p.instanceId === instanceId);
        if (idx !== -1) {
          placedItems[idx] = { ...placedItems[idx], dataSourceRows: dataRows, loading: false };
        }
      } catch (err) {
        console.error('Failed to load data source data:', err);
        const idx = placedItems.findIndex((p) => p.instanceId === instanceId);
        if (idx !== -1) {
          placedItems[idx] = { ...placedItems[idx], loading: false };
        }
      }
    }
  }

  function removeItem(instanceId: string) {
    if (activeInstanceId === instanceId) activeInstanceId = null;
    placedItems = placedItems.filter((p) => p.instanceId !== instanceId);
  }

  // Canvas reposition drag state (pointer events, not HTML5 drag)
  let repositioningId = $state<string | null>(null);
  let pendingRepoId: string | null = null;
  let repoOffsetX = 0;
  let repoOffsetY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  const DRAG_THRESHOLD = 4; // px before drag activates

  function handleItemPointerDown(event: PointerEvent, item: PlacedItem) {
    if ((event.target as HTMLElement).closest('.remove-btn')) return;
    event.preventDefault();
    activeInstanceId = item.instanceId;
    pendingRepoId = item.instanceId;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    // Store click offset in screen pixels; divided by zoom in move handler
    repoOffsetX = event.clientX - rect.left;
    repoOffsetY = event.clientY - rect.top;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    el.setPointerCapture(event.pointerId);
  }

  function handleItemPointerMove(event: PointerEvent, item: PlacedItem) {
    if (pendingRepoId !== item.instanceId || !canvasEl) return;
    // Activate drag only after moving past the threshold
    if (repositioningId !== item.instanceId) {
      const dx = event.clientX - pointerDownX;
      const dy = event.clientY - pointerDownY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      repositioningId = item.instanceId;
    }
    const canvasRect = canvasEl.getBoundingClientRect();
    // Positions are in zoomed-pixel space; divide by zoom to get logical canvas coords
    const scrolledX = event.clientX - canvasRect.left + canvasEl.scrollLeft;
    const scrolledY = event.clientY - canvasRect.top + canvasEl.scrollTop;
    const x = (scrolledX - repoOffsetX) / zoom;
    const y = (scrolledY - repoOffsetY) / zoom;
    const idx = placedItems.findIndex((p) => p.instanceId === item.instanceId);
    if (idx !== -1) {
      placedItems[idx].x = Math.max(0, x);
      placedItems[idx].y = Math.max(0, y);
    }
  }

  function handleItemPointerUp(_event: PointerEvent, item: PlacedItem) {
    if (pendingRepoId === item.instanceId) {
      pendingRepoId = null;
      repositioningId = null;
    }
  }

  function clearCanvas() {
    activeInstanceId = null;
    placedItems = [];
  }

  function handleCanvasClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.placed-item')) {
      activeInstanceId = null;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    if (event.key === 'Escape') {
      activeInstanceId = null;
      return;
    }

    if (!activeInstanceId) return;
    const idx = placedItems.findIndex((p) => p.instanceId === activeInstanceId);
    if (idx === -1) return;

    if (event.key === 'q') {
      event.preventDefault();
      placedItems[idx].rotation = (placedItems[idx].rotation + 90) % 360;
    } else if (event.key === 'e') {
      event.preventDefault();
      placedItems[idx].rotation = ((placedItems[idx].rotation - 90) + 360) % 360;
    } else if (event.key === 'f') {
      event.preventDefault();
      placedItems[idx].flipped = !placedItems[idx].flipped;
    } else if (event.key === 'u') {
      event.preventDefault();
      if (idx > 0) {
        const item = placedItems.splice(idx, 1)[0];
        placedItems.splice(idx - 1, 0, item);
      }
    }
  }

  // Zoom state
  let zoom = $state(1);
  const minZoom = 0.25;
  const maxZoom = 4;
  const zoomStep = 0.25;

  const zoomPercentage = $derived(Math.round(zoom * 100));

  function zoomIn() {
    zoom = Math.min(zoom + zoomStep, maxZoom);
  }

  function zoomOut() {
    zoom = Math.max(zoom - zoomStep, minZoom);
  }

  function resetZoom() {
    zoom = 1;
  }

  // Ctrl+wheel zoom and pinch-to-zoom
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;

  function getTouchDistance(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  $effect(() => {
    const el = canvasEl;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const pixelDelta = e.deltaMode === 0 ? e.deltaY : e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY * 300;
      const factor = Math.pow(0.999, pixelDelta);
      zoom = Math.min(Math.max(zoom * factor, minZoom), maxZoom);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchStartDistance = getTouchDistance(e);
        pinchStartZoom = zoom;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e);
        zoom = Math.min(Math.max(pinchStartZoom * (dist / pinchStartDistance), minZoom), maxZoom);
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  });

  function getDimensionLabel(component: GameComponent): string {
    if (!isEditableComponent(component)) return '';
    const { widthMm, heightMm } = component.dimensions;
    return `${widthMm.toFixed(0)}×${heightMm.toFixed(0)}mm`;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<svelte:head>
  <title>Tabletop · {data.project.name} · Deckle</title>
</svelte:head>

<div class="tabletop-layout">
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>Components</h2>
    </div>

    <div class="component-list">
      {#if data.components.length === 0}
        <p class="empty">No components yet.</p>
      {:else}
        {#each data.components as component (component.id)}
          <div
            class="component-item"
            class:dragging={draggingId === component.id}
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="Drag {component.name} to canvas"
            ondragstart={(e) => handleDragStart(e, component)}
            ondragend={handleDragEnd}
          >
            <div class="component-info">
              <span class="component-name">{component.name}</span>
              <div class="component-meta">
                <span class="type-badge type-{component.type.toLowerCase()}"
                  >{getComponentDisplayType(component)}</span
                >
                {#if isEditableComponent(component)}
                  <span class="dim-label">{getDimensionLabel(component)}</span>
                {/if}
                {#if hasDataSource(component) && (component as any).dataSource}
                  <span class="ds-badge" title="Has data source">DS</span>
                {/if}
              </div>
            </div>
            <div class="drag-handle" aria-hidden="true">⠿</div>
          </div>
        {/each}
      {/if}
    </div>

    {#if placedItems.length > 0}
      <div class="sidebar-footer">
        <button class="clear-btn" onclick={clearCanvas}>Clear canvas</button>
      </div>
    {/if}
  </div>

  <!-- Canvas -->
  <div class="canvas-area" class:drag-over={isDragOver}>
    <!-- Zoom controls -->
    <div class="zoom-control">
      <button
        class="zoom-btn"
        onclick={zoomOut}
        disabled={zoom <= minZoom}
        title="Zoom out"
      >
        −
      </button>
      <button class="zoom-reset" onclick={resetZoom} title="Reset zoom to 100%">
        {zoomPercentage}%
      </button>
      <button
        class="zoom-btn"
        onclick={zoomIn}
        disabled={zoom >= maxZoom}
        title="Zoom in"
      >
        +
      </button>
    </div>
    {#if placedItems.length === 0}
      <div class="canvas-empty">
        <div class="canvas-empty-icon">⬛</div>
        <p>Drag components from the sidebar to place them here</p>
      </div>
    {/if}

    <div
      class="canvas-scroll"
      bind:this={canvasEl}
      role="region"
      aria-label="Tabletop canvas. Drag components from the sidebar to place them."
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={handleCanvasClick}
    >
      <div class="canvas-inner" style="min-width: {3000 * zoom}px; min-height: {3000 * zoom}px;">
        {#each placedItems as item (item.instanceId)}
          <div
            class="placed-item"
            class:repositioning={repositioningId === item.instanceId}
            class:active={activeInstanceId === item.instanceId}
            style="position: absolute; left: {item.x * zoom}px; top: {item.y * zoom}px; transform: rotate({item.rotation}deg);"
            onpointerdown={(e) => handleItemPointerDown(e, item)}
            onpointermove={(e) => handleItemPointerMove(e, item)}
            onpointerup={(e) => handleItemPointerUp(e, item)}
          >
            <button
              class="remove-btn"
              onclick={() => removeItem(item.instanceId)}
              title="Remove"
              aria-label="Remove {item.component.name}"
            >
              ×
            </button>
            <PlacedComponentGroup
              component={item.component}
              loading={item.loading}
              dataSourceRows={item.dataSourceRows}
              projectId={data.project.id}
              mmScale={MM_SCALE * zoom}
              flipped={item.flipped}
            />
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .tabletop-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e0e0e0;
    background: white;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .component-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem 0;
  }

  .component-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    cursor: grab;
    transition: background 0.1s ease;
    border-radius: 0;
    gap: 0.5rem;
  }

  .component-item:hover {
    background: #f9fafb;
  }

  .component-item.dragging {
    opacity: 0.4;
    cursor: grabbing;
  }

  .component-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .component-name {
    font-size: 0.8125rem;
    color: #111827;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .component-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .type-card { background: #dbeafe; color: #1d4ed8; }
  .type-dice { background: #fce7f3; color: #be185d; }
  .type-gameboard { background: #d1fae5; color: #065f46; }
  .type-playermat { background: #ede9fe; color: #5b21b6; }

  .dim-label {
    font-size: 0.6875rem;
    color: #9ca3af;
  }

  .ds-badge {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: #fef3c7;
    color: #92400e;
  }

  .drag-handle {
    color: #d1d5db;
    font-size: 1rem;
    flex-shrink: 0;
    cursor: grab;
  }

  .sidebar-footer {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .clear-btn {
    width: 100%;
    padding: 0.375rem;
    font-size: 0.8125rem;
    color: #6b7280;
    background: none;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .clear-btn:hover {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fca5a5;
  }

  /* Canvas */
  .canvas-area {
    flex: 1;
    position: relative;
    min-width: 0;
    min-height: 0;
    background:
      radial-gradient(circle, #d1d5db 1px, transparent 1px);
    background-size: 24px 24px;
    background-color: #f3f4f6;
  }

  .canvas-area.drag-over .canvas-scroll {
    outline: 3px dashed #3b82f6;
    outline-offset: -3px;
  }

  .canvas-area.drag-over {
    background-color: #eff6ff;
  }

  .canvas-scroll {
    position: absolute;
    inset: 0;
    overflow: auto;
  }

  .canvas-inner {
    position: relative;
  }

  /* Zoom controls */
  .zoom-control {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0.5rem;
    padding: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(8px);
    z-index: 10;
  }

  .zoom-btn,
  .zoom-reset {
    border: 1px solid #e2e8f0;
    background: white;
    color: #334155;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .zoom-btn:hover:not(:disabled),
  .zoom-reset:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .zoom-btn:active:not(:disabled),
  .zoom-reset:active {
    background: #f1f5f9;
  }

  .zoom-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-reset {
    min-width: 3.5rem;
    font-size: 0.875rem;
  }

  .canvas-empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    pointer-events: none;
    user-select: none;
  }

  .canvas-empty-icon {
    font-size: 2.5rem;
    opacity: 0.15;
  }

  .canvas-empty p {
    font-size: 0.9375rem;
    color: #9ca3af;
    text-align: center;
    max-width: 220px;
    line-height: 1.5;
  }

  /* Placed items */
  .placed-item {
    position: absolute;
    cursor: grab;
    touch-action: none;
    transform-origin: center center;
    /* Ensure count badge / remove btn can overflow */
  }

  .placed-item.repositioning {
    cursor: grabbing;
    z-index: 100;
  }

  .placed-item.active {
    outline: 2px solid #3b82f6;
    outline-offset: 4px;
    border-radius: 4px;
  }

  .remove-btn {
    position: absolute;
    top: -10px;
    left: -10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    border: none;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10;
    padding: 0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  .placed-item:hover .remove-btn {
    display: flex;
  }
</style>
