<script lang="ts">
  import type { PageData } from './$types';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import { dataSourcesApi } from '$lib/api';
  import { isEditableComponent, hasDataSource, getComponentDisplayType } from '$lib/utils/componentTypes';
  import { parseDataRow } from '$lib/utils/mergeFields';
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

  // Stack ghost offset in canvas pixels (world-space, not rotated)
  const STACK_OFFSET = 5;

  interface PlacedInstance {
    instanceId: string;
    dataSourceRow: Record<string, string>;
    flipped: boolean;
    rotation: number;
  }

  // A group holds one or more instances stacked at the same canvas position.
  // instances[instances.length - 1] is the top (visible) card.
  interface PlacedGroup {
    groupId: string;
    component: GameComponent;
    x: number;
    y: number;
    loading: boolean;
    instances: PlacedInstance[];
  }

  // activeGroupId: which group is selected
  // activeInstanceId: which instance within that group (null = whole group selected)
  let activeGroupId = $state<string | null>(null);
  let activeInstanceId = $state<string | null>(null);

  let placedGroups = $state<PlacedGroup[]>([]);
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

    const groupId = `group-${nextId++}`;
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

    // Start with a single blank instance; replace with data rows once loaded
    const group: PlacedGroup = {
      groupId,
      component,
      x,
      y,
      loading: needsData,
      instances: [{ instanceId: `inst-${nextId++}`, dataSourceRow: {}, flipped: false, rotation: 0 }]
    };
    placedGroups.push(group);

    if (needsData) {
      const dataSource = (component as any).dataSource as { id: string };
      try {
        const result = await dataSourcesApi.getData(dataSource.id);
        const rows = result.data;
        let instances: PlacedInstance[];
        if (rows.length > 1) {
          const headers = rows[0];
          // One instance per data row — each carries its own row data
          instances = rows.slice(1).map((row) => {
            const record = parseDataRow(headers, row);
            return { instanceId: `inst-${nextId++}`, dataSourceRow: record, flipped: false, rotation: 0 };
          });
        } else {
          instances = [{ instanceId: `inst-${nextId++}`, dataSourceRow: {}, flipped: false, rotation: 0 }];
        }
        const idx = placedGroups.findIndex((g) => g.groupId === groupId);
        if (idx !== -1) {
          placedGroups[idx] = { ...placedGroups[idx], instances, loading: false };
        }
      } catch (err) {
        console.error('Failed to load data source data:', err);
        const idx = placedGroups.findIndex((g) => g.groupId === groupId);
        if (idx !== -1) {
          placedGroups[idx] = { ...placedGroups[idx], loading: false };
        }
      }
    }
  }

  function removeGroup(groupId: string) {
    if (activeGroupId === groupId) {
      activeGroupId = null;
      activeInstanceId = null;
    }
    placedGroups = placedGroups.filter((g) => g.groupId !== groupId);
  }

  // --- Bounds helpers for drag-to-merge detection ---

  function getGroupBounds(group: PlacedGroup): { x: number; y: number; w: number; h: number } {
    // Positions and dimensions are in logical (pre-zoom) canvas pixels
    let w = 100;
    let h = 140;
    if (isEditableComponent(group.component)) {
      const dims = group.component.dimensions;
      w = dims.widthMm * MM_SCALE;
      h = dims.heightMm * MM_SCALE;
    }
    return { x: group.x, y: group.y, w, h };
  }

  function boundsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // --- Canvas reposition drag state (pointer events, not HTML5 drag) ---

  let repositioningId = $state<string | null>(null);
  let pendingRepoId: string | null = null;
  let repoOffsetX = 0;
  let repoOffsetY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  // Tracks whether the last pointer interaction ended as a drag, so click handlers can suppress
  let lastInteractionWasDrag = false;
  const DRAG_THRESHOLD = 4; // px before drag activates
  // When a single instance is selected and a drag starts, we split it into its own group
  let pendingInstanceSplit = false;
  let splitGroupId: string | null = null; // id of the newly-created group after a split

  function handleItemPointerDown(event: PointerEvent, group: PlacedGroup) {
    if ((event.target as HTMLElement).closest('.remove-btn')) return;
    event.preventDefault();
    // Split unless the whole group is explicitly selected (double-click = group, anything else = single instance)
    pendingInstanceSplit = !(activeGroupId === group.groupId && activeInstanceId === null);
    splitGroupId = null;
    activeGroupId = group.groupId;
    pendingRepoId = group.groupId;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    // Store click offset in screen pixels; divided by zoom in move handler
    repoOffsetX = event.clientX - rect.left;
    repoOffsetY = event.clientY - rect.top;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    el.setPointerCapture(event.pointerId);
  }

  function handleItemPointerMove(event: PointerEvent, group: PlacedGroup) {
    if (pendingRepoId !== group.groupId || !canvasEl) return;
    // Activate drag only after moving past the threshold
    const alreadyDragging = repositioningId === group.groupId || (splitGroupId !== null && repositioningId === splitGroupId);
    if (!alreadyDragging) {
      const dx = event.clientX - pointerDownX;
      const dy = event.clientY - pointerDownY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      repositioningId = group.groupId;
    }

    // On first move past threshold: split the top instance into its own group if needed
    if (pendingInstanceSplit) {
      pendingInstanceSplit = false;
      const sourceIdx = placedGroups.findIndex((g) => g.groupId === group.groupId);
      if (sourceIdx !== -1 && placedGroups[sourceIdx].instances.length > 1) {
        const topInst = placedGroups[sourceIdx].instances[placedGroups[sourceIdx].instances.length - 1];
        placedGroups[sourceIdx].instances.splice(placedGroups[sourceIdx].instances.length - 1, 1);
        const newGroupId = `group-${nextId++}`;
        const newGroup: PlacedGroup = {
          groupId: newGroupId,
          component: group.component,
          x: placedGroups[sourceIdx].x,
          y: placedGroups[sourceIdx].y,
          loading: false,
          instances: [topInst]
        };
        placedGroups.push(newGroup);
        splitGroupId = newGroupId;
        repositioningId = newGroupId;
        activeGroupId = newGroupId;
        activeInstanceId = null;
      }
      // If only 1 instance, skip splitting — just drag the whole (single-instance) group
    }

    const canvasRect = canvasEl.getBoundingClientRect();
    // Positions are in zoomed-pixel space; divide by zoom to get logical canvas coords
    const scrolledX = event.clientX - canvasRect.left + canvasEl.scrollLeft;
    const scrolledY = event.clientY - canvasRect.top + canvasEl.scrollTop;
    const x = (scrolledX - repoOffsetX) / zoom;
    const y = (scrolledY - repoOffsetY) / zoom;
    const movingGroupId = splitGroupId ?? group.groupId;
    const idx = placedGroups.findIndex((g) => g.groupId === movingGroupId);
    if (idx !== -1) {
      placedGroups[idx].x = Math.max(0, x);
      placedGroups[idx].y = Math.max(0, y);
    }
  }

  function handleItemPointerUp(_event: PointerEvent, group: PlacedGroup) {
    if (pendingRepoId !== group.groupId) return;
    pendingRepoId = null;
    const wasDragging = repositioningId !== null;
    const movingGroupId = splitGroupId ?? group.groupId;
    repositioningId = null;
    splitGroupId = null;
    pendingInstanceSplit = false;
    lastInteractionWasDrag = wasDragging;

    if (!wasDragging) return;

    // Check if the dragged group overlaps another group of the same component — if so, merge them
    const draggedIdx = placedGroups.findIndex((g) => g.groupId === movingGroupId);
    if (draggedIdx === -1) return;

    const draggedGroup = placedGroups[draggedIdx];
    const draggedBounds = getGroupBounds(draggedGroup);

    // Find the topmost (last in array = highest z) overlapping group of the same component
    let targetGroupId: string | null = null;
    for (let i = placedGroups.length - 1; i >= 0; i--) {
      const g = placedGroups[i];
      if (g.groupId !== movingGroupId &&
          g.component.id === draggedGroup.component.id &&
          boundsOverlap(draggedBounds, getGroupBounds(g))) {
        targetGroupId = g.groupId;
        break;
      }
    }

    if (!targetGroupId) return;

    // Merge: move all instances from dragged group into target group
    const draggedInstances = [...draggedGroup.instances];
    placedGroups.splice(draggedIdx, 1);
    const newTargetIdx = placedGroups.findIndex((g) => g.groupId === targetGroupId);
    if (newTargetIdx !== -1) {
      placedGroups[newTargetIdx].instances.push(...draggedInstances);
      activeGroupId = targetGroupId;
      activeInstanceId = null; // whole group selected after merge
    }
  }

  // Single click: select top instance of group
  function handleGroupClick(_event: MouseEvent, group: PlacedGroup) {
    if (lastInteractionWasDrag) {
      lastInteractionWasDrag = false;
      return;
    }
    const topInst = group.instances[group.instances.length - 1];
    activeGroupId = group.groupId;
    activeInstanceId = topInst.instanceId;
  }

  // Double click: select entire group
  function handleGroupDblClick(_event: MouseEvent, group: PlacedGroup) {
    activeGroupId = group.groupId;
    activeInstanceId = null;
  }

  function clearCanvas() {
    activeGroupId = null;
    activeInstanceId = null;
    placedGroups = [];
  }

  function handleCanvasClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.placed-item')) {
      activeGroupId = null;
      activeInstanceId = null;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    if (event.key === 'Escape') {
      activeGroupId = null;
      activeInstanceId = null;
      return;
    }

    if (!activeGroupId) return;
    const idx = placedGroups.findIndex((g) => g.groupId === activeGroupId);
    if (idx === -1) return;

    const topInstIdx = placedGroups[idx].instances.length - 1;

    if (event.key === 'q') {
      event.preventDefault();
      if (activeInstanceId === null) {
        // Whole group: rotate all instances counter-clockwise
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, rotation: (inst.rotation - 90 + 360) % 360 }));
      } else {
        // Single instance: rotate only the top counter-clockwise
        placedGroups[idx].instances[topInstIdx].rotation =
          (placedGroups[idx].instances[topInstIdx].rotation - 90 + 360) % 360;
      }
    } else if (event.key === 'e') {
      event.preventDefault();
      if (activeInstanceId === null) {
        // Whole group: rotate all instances clockwise
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, rotation: (inst.rotation + 90) % 360 }));
      } else {
        // Single instance: rotate only the top clockwise
        placedGroups[idx].instances[topInstIdx].rotation =
          (placedGroups[idx].instances[topInstIdx].rotation + 90) % 360;
      }
    } else if (event.key === 'f') {
      event.preventDefault();
      if (activeInstanceId === null) {
        // Whole group selected: flip all instances and reverse order (A,B,C → C̄,B̄,Ā)
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, flipped: !inst.flipped }))
          .reverse();
      } else {
        // Single instance selected: flip only the top instance
        placedGroups[idx].instances[topInstIdx].flipped = !placedGroups[idx].instances[topInstIdx].flipped;
      }
    } else if (event.key === 'u') {
      event.preventDefault();
      if (idx > 0) {
        const [item] = placedGroups.splice(idx, 1);
        placedGroups.splice(idx - 1, 0, item);
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

    <div class="sidebar-setup">
      <a
        href="/projects/{data.project.ownerUsername}/{data.project.code}/tabletop/game-setup"
        class="setup-btn"
      >
        Configure Game Setup
      </a>
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

    {#if placedGroups.length > 0}
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
    {#if placedGroups.length === 0}
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
        {#each placedGroups as group (group.groupId)}
          {@const topInst = group.instances[group.instances.length - 1]}
          {@const trimW = isEditableComponent(group.component) ? Math.round(group.component.dimensions.widthMm * MM_SCALE * zoom) : 100}
          {@const trimH = isEditableComponent(group.component) ? Math.round(group.component.dimensions.heightMm * MM_SCALE * zoom) : 140}
          {@const numGhosts = group.instances.length > 1 ? Math.min(group.instances.length - 1, 2) : 0}
          {@const rotRad = (topInst.rotation * Math.PI) / 180}
          {@const boundW = Math.round(trimW * Math.abs(Math.cos(rotRad)) + trimH * Math.abs(Math.sin(rotRad)))}
          {@const boundH = Math.round(trimW * Math.abs(Math.sin(rotRad)) + trimH * Math.abs(Math.cos(rotRad)))}
          {@const placedW = boundW + numGhosts * STACK_OFFSET}
          {@const placedH = boundH + numGhosts * STACK_OFFSET}
          <div
            class="placed-item"
            class:repositioning={repositioningId === group.groupId}
            class:active={activeGroupId === group.groupId}
            class:group-selected={activeGroupId === group.groupId && activeInstanceId === null}
            style="position: absolute; left: {group.x * zoom}px; top: {group.y * zoom}px; width: {placedW}px; height: {placedH}px;"
            onpointerdown={(e) => handleItemPointerDown(e, group)}
            onpointermove={(e) => handleItemPointerMove(e, group)}
            onpointerup={(e) => handleItemPointerUp(e, group)}
            onclick={(e) => handleGroupClick(e, group)}
            ondblclick={(e) => handleGroupDblClick(e, group)}
          >
            <!-- Ghost cards: world-space orientation (not rotated), always stack to top-left -->
            {#if numGhosts >= 2}
              <div
                class="ghost-card"
                style="position: absolute; top: 0; left: 0; width: {boundW}px; height: {boundH}px;"
              ></div>
            {/if}
            {#if numGhosts >= 1}
              <div
                class="ghost-card"
                style="position: absolute; top: {STACK_OFFSET}px; left: {STACK_OFFSET}px; width: {boundW}px; height: {boundH}px;"
              ></div>
            {/if}

            <!-- UI chrome: not rotated -->
            <button
              class="remove-btn"
              onclick={() => removeGroup(group.groupId)}
              title="Remove"
              aria-label="Remove {group.component.name}"
            >
              ×
            </button>
            {#if group.instances.length > 1}
              <div class="count-badge">{group.instances.length}</div>
            {/if}

            <!-- Card visual: rotated, centered in the rotated bounding box area -->
            <div
              class="rotating-wrapper"
              style="left: {numGhosts * STACK_OFFSET + boundW / 2}px; top: {numGhosts * STACK_OFFSET + boundH / 2}px; transform: translate(-50%, -50%) rotate({topInst.rotation}deg);"
            >
              <PlacedComponentGroup
                component={group.component}
                loading={group.loading}
                topDataSourceRow={topInst.dataSourceRow}
                topFlipped={topInst.flipped}
                projectId={data.project.id}
                mmScale={MM_SCALE * zoom}
              />
            </div>
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

  .sidebar-setup {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .setup-btn {
    display: block;
    width: 100%;
    padding: 0.4375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    text-decoration: none;
    text-align: center;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }

  .setup-btn:hover {
    background: #e0f2fe;
    color: #0369a1;
    border-color: #bae6fd;
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
  }

  .placed-item.repositioning {
    cursor: grabbing;
    z-index: 100;
  }

  /* Ghost cards: world-space orientation, always stack to top-left regardless of card rotation */
  .ghost-card {
    position: absolute;
    background: #d1d5db;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  /* Card visual wrapper: rotated, centered in bounding box */
  .rotating-wrapper {
    position: absolute;
  }

  .placed-item.active {
    outline: 2px solid #3b82f6;
    outline-offset: 4px;
    border-radius: 4px;
  }

  /* Whole-group selection gets a distinct green outline */
  .placed-item.active.group-selected {
    outline: 2px solid #10b981;
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

  .count-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #3b82f6;
    color: white;
    font-size: 11px;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    z-index: 10;
  }
</style>
