<script lang="ts">
  import type { PageData } from './$types';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import { dataSourcesApi } from '$lib/api';
  import { isEditableComponent, hasDataSource, getComponentDisplayType } from '$lib/utils/componentTypes';
  import { parseDataRow } from '$lib/utils/mergeFields';
  import type { GameComponent } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { fontLoader } from '$lib/stores/fontLoader';
  import { runGameSetup, type TabletopController, type ZoneDef } from '$lib/tabletop/evaluator';
  import { PRESET_ZONE_DEFS } from '$lib/tabletop/zones';
  import PlacedComponentGroup from './_components/PlacedComponentGroup.svelte';
  import PlayerCountDialog from './_components/PlayerCountDialog.svelte';
  import ChoosePlayerDialog from './_components/ChoosePlayerDialog.svelte';

  let { data }: { data: PageData } = $props();

  $effect(() => {
    setMaxScreen(true);
    return () => setMaxScreen(false);
  });

  const MM_SCALE = 3.54;
  const STACK_OFFSET = 5;
  const ZONE_PADDING = 48;
  const INTER_ZONE_GAP = 20;
  const ANIM_MS = 400;

  // ── Zone definitions ──────────────────────────────────────────────────────

  let zones = $state<ZoneDef[]>([...PRESET_ZONE_DEFS]);
  let playerCount = $state(0);

  // Compute effective zone positions and sizes together, preventing overlap both horizontally
  // (pushing right) and vertically (pushing rows down when upper rows grow).
  // Zones sharing the same initial y are treated as a single row.
  const zoneLayouts = $derived.by(() => {
    const result: Record<string, { x: number; y: number; width: number; height: number }> = {};

    // Stable initial position for each zone (PRESET_ZONE_DEFS take priority, others use zone coords)
    function getInitialX(zone: ZoneDef) { return PRESET_ZONE_DEFS.find((iz) => iz.id === zone.id)?.x ?? zone.x; }
    function getInitialY(zone: ZoneDef) { return PRESET_ZONE_DEFS.find((iz) => iz.id === zone.id)?.y ?? zone.y; }

    // Group zones into rows by their initial y
    const rowMap = new Map<number, ZoneDef[]>();
    for (const zone of zones) {
      const iy = getInitialY(zone);
      if (!rowMap.has(iy)) rowMap.set(iy, []);
      rowMap.get(iy)!.push(zone);
    }

    // Process rows top-to-bottom; each row is pushed below the previous row's bottom edge
    const rows = [...rowMap.entries()].sort(([ya], [yb]) => ya - yb);
    let rowBottomEdge = -Infinity;

    for (const [initialRowY, rowZones] of rows) {
      const effectiveRowY =
        rowBottomEdge === -Infinity ? initialRowY : Math.max(initialRowY, rowBottomEdge + INTER_ZONE_GAP);

      // Within the row, sort left-to-right and push zones right as needed
      const sortedRow = [...rowZones].sort((a, b) => getInitialX(a) - getInitialX(b));
      let rightEdge = -Infinity;
      let rowHeight = 0;

      for (const zone of sortedRow) {
        const ix = getInitialX(zone);
        const effectiveX =
          rightEdge === -Infinity ? zone.x : Math.max(ix, rightEdge + INTER_ZONE_GAP);

        let width = zone.minWidth;
        let height = zone.minHeight;
        for (const g of placedGroups) {
          if (g.zoneId !== zone.id) continue;
          const b = getGroupBounds(g);
          width = Math.max(width, g.x - effectiveX + b.w + ZONE_PADDING);
          height = Math.max(height, g.y - effectiveRowY + b.h + ZONE_PADDING);
        }

        result[zone.id] = { x: effectiveX, y: effectiveRowY, width, height };
        rightEdge = effectiveX + width;
        rowHeight = Math.max(rowHeight, height);
      }

      rowBottomEdge = effectiveRowY + rowHeight;
    }

    return result;
  });

  function getZoneLayout(zone: ZoneDef): { x: number; y: number; width: number; height: number } {
    return zoneLayouts[zone.id] ?? { x: zone.x, y: zone.y, width: zone.minWidth, height: zone.minHeight };
  }

  function getZoneAt(canvasX: number, canvasY: number): ZoneDef | null {
    for (const zone of zones) {
      const { x, y, width, height } = getZoneLayout(zone);
      if (canvasX >= x && canvasX <= x + width && canvasY >= y && canvasY <= y + height) {
        return zone;
      }
    }
    return null;
  }

  // ── Zone position tracking — move groups when their zone is pushed ────────

  // Maps zone id → last known { x, y } position. Plain (non-reactive) variable
  // so writes don't trigger reactivity; the effect depends on zoneLayouts instead.
  let prevZonePositions = new Map<string, { x: number; y: number }>();

  $effect(() => {
    // Snapshot current zone positions (reading zoneLayouts makes this effect
    // re-run whenever zone layouts change).
    const current = new Map<string, { x: number; y: number }>();
    for (const [id, layout] of Object.entries(zoneLayouts)) {
      current.set(id, { x: layout.x, y: layout.y });
    }

    // Apply position deltas to every group whose zone moved.
    for (const [id, pos] of current) {
      const prev = prevZonePositions.get(id);
      if (!prev) continue;
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (dx === 0 && dy === 0) continue;
      for (let i = 0; i < placedGroups.length; i++) {
        // Skip the group currently being dragged — pointer events own its position.
        if (placedGroups[i].groupId === repositioningId) continue;
        if (placedGroups[i].zoneId === id) {
          placedGroups[i].x += dx;
          placedGroups[i].y += dy;
        }
      }
    }

    prevZonePositions = current;
  });

  // ── Placed items ──────────────────────────────────────────────────────────

  interface PlacedInstance {
    instanceId: string;
    dataSourceRow: Record<string, string>;
    flipped: boolean;
    rotation: number;
  }

  interface PlacedGroup {
    groupId: string;
    component: GameComponent;
    zoneId: string;
    x: number;
    y: number;
    loading: boolean;
    instances: PlacedInstance[];
  }

  let activeGroupId = $state<string | null>(null);
  let activeInstanceId = $state<string | null>(null);
  let placedGroups = $state<PlacedGroup[]>([]);
  let nextId = 0;

  // Instances currently sitting in the Game Box (keyed by componentId).
  // Only populated after instances have been returned from the canvas.
  let boxInstances = $state<Record<string, PlacedInstance[]>>({});

  // A component appears in the Game Box if it has known box instances, or has
  // never been placed (so its instances are implicitly all in the box).
  const placedComponentIds = $derived(new Set(placedGroups.map((g) => g.component.id)));
  const gameBoxComponents = $derived(
    data.components.filter((c) => (c.id in boxInstances) || !placedComponentIds.has(c.id))
  );
  // How many instances of each component are currently in the box (undefined = unknown/full set)
  const boxInstanceCounts = $derived(
    Object.fromEntries(
      Object.entries(boxInstances).map(([id, insts]) => [id, insts.length])
    ) as Record<string, number>
  );

  // ── Animation ─────────────────────────────────────────────────────────────

  // Groups whose CSS transition is currently active
  let animatingGroupIds = $state(new Set<string>());

  /** Waits for two animation frames, ensuring the DOM has painted the current state. */
  function nextTwoFrames(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  // ── Sidebar drag ──────────────────────────────────────────────────────────

  let sidebarEl = $state<HTMLElement | null>(null);
  let draggingId = $state<string | null>(null);
  let dragOverZoneId = $state<string | null>(null);

  function handleDragStart(event: DragEvent, component: GameComponent) {
    draggingId = component.id;
    event.dataTransfer!.setData('text/plain', component.id);
    event.dataTransfer!.effectAllowed = 'copy';
  }

  function handleDragEnd() {
    draggingId = null;
    dragOverZoneId = null;
  }

  // ── Zone drop handlers ────────────────────────────────────────────────────

  function handleZoneDragOver(event: DragEvent, zone: ZoneDef) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    dragOverZoneId = zone.id;
  }

  function handleZoneDragLeave(event: DragEvent, _zone: ZoneDef) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      dragOverZoneId = null;
    }
  }

  async function handleZoneDrop(event: DragEvent, zone: ZoneDef) {
    event.preventDefault();
    dragOverZoneId = null;

    const componentId = event.dataTransfer?.getData('text/plain');
    if (!componentId) return;

    const component = data.components.find((c) => c.id === componentId);
    if (!component) return;

    const el = canvasEl!;
    const rect = el.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left + el.scrollLeft) / zoom;
    const canvasY = (event.clientY - rect.top + el.scrollTop) / zoom;

    const { x: zoneX, y: zoneY, width, height } = getZoneLayout(zone);
    const x = Math.max(zoneX + 10, Math.min(canvasX, zoneX + width - 10));
    const y = Math.max(zoneY + 32, Math.min(canvasY, zoneY + height - 10));

    // Preload fonts if applicable
    if (isEditableComponent(component) && component.frontDesign) {
      try {
        const design = JSON.parse(component.frontDesign) as ContainerElement;
        if (design.fonts?.length) fontLoader.preloadTemplateFonts(design.fonts);
      } catch { /* ignore */ }
    }

    const groupId = `group-${nextId++}`;

    // If we have instances sitting in the Game Box, reuse them directly
    const knownBoxInsts = boxInstances[componentId];
    if (knownBoxInsts && knownBoxInsts.length > 0) {
      delete boxInstances[componentId];
      placedGroups.push({ groupId, component, zoneId: zone.id, x, y, loading: false, instances: knownBoxInsts });
      return;
    }

    // First placement: load from data source (or create a blank instance)
    const needsData = hasDataSource(component) && !!component.dataSource;
    placedGroups.push({
      groupId,
      component,
      zoneId: zone.id,
      x,
      y,
      loading: needsData,
      instances: [{ instanceId: `inst-${nextId++}`, dataSourceRow: {}, flipped: false, rotation: 0 }]
    });

    if (needsData) {
      const loadedInstances = await loadComponentInstances(component);
      const idx = placedGroups.findIndex((g) => g.groupId === groupId);
      if (idx !== -1) {
        placedGroups[idx] = { ...placedGroups[idx], instances: loadedInstances, loading: false };
      }
    }
  }

  function returnGroupToBox(groupId: string) {
    const group = placedGroups.find((g) => g.groupId === groupId);
    if (group) {
      const existing = boxInstances[group.component.id] ?? [];
      boxInstances[group.component.id] = [...existing, ...group.instances];
    }
    if (activeGroupId === groupId) {
      activeGroupId = null;
      activeInstanceId = null;
    }
    placedGroups = placedGroups.filter((g) => g.groupId !== groupId);
  }

  function removeGroup(groupId: string) {
    returnGroupToBox(groupId);
  }

  // ── Data source loading ───────────────────────────────────────────────────

  /** Loads PlacedInstances from a component's data source, or returns a single blank instance. */
  async function loadComponentInstances(component: GameComponent): Promise<PlacedInstance[]> {
    if (hasDataSource(component) && component.dataSource) {
      try {
        const result = await dataSourcesApi.getData(component.dataSource.id);
        const rows = result.data;
        if (rows.length > 1) {
          const headers = rows[0];
          return rows.slice(1).map((row) => ({
            instanceId: `inst-${nextId++}`,
            dataSourceRow: parseDataRow(headers, row),
            flipped: false,
            rotation: 0,
          }));
        }
      } catch (err) {
        console.error('Failed to load data source data:', err);
      }
    }
    return [{ instanceId: `inst-${nextId++}`, dataSourceRow: {}, flipped: false, rotation: 0 }];
  }

  // ── Bounds helpers ────────────────────────────────────────────────────────

  function getGroupBounds(group: PlacedGroup): { x: number; y: number; w: number; h: number } {
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

  // ── TabletopController helpers ────────────────────────────────────────────

  async function moveSingleComponent(componentId: string, toZoneId: string): Promise<void> {
    const targetZone = toZoneId !== 'game_box' ? zones.find((z) => z.id === toZoneId) : null;
    const currentGroups = placedGroups.filter((g) => g.component.id === componentId);

    if (currentGroups.length === 0) {
      // ── Game Box → Canvas ──────────────────────────────────────────────
      if (!targetZone) return;

      // Gather instances: prefer known box instances, otherwise create fresh ones
      let instances: PlacedInstance[];
      const knownBoxInsts = boxInstances[componentId];

      if (knownBoxInsts && knownBoxInsts.length > 0) {
        instances = [...knownBoxInsts];
        delete boxInstances[componentId];
      } else {
        // Component has never been placed — may need data source
        const comp = data.components.find((c) => c.id === componentId);
        if (!comp) return;

        instances = await loadComponentInstances(comp);
      }

      const comp = data.components.find((c) => c.id === componentId);
      if (!comp) return;

      // Preload fonts
      if (isEditableComponent(comp) && comp.frontDesign) {
        try {
          const design = JSON.parse(comp.frontDesign) as ContainerElement;
          if (design.fonts?.length) fontLoader.preloadTemplateFonts(design.fonts);
        } catch { /* ignore */ }
      }

      const targetX = getZoneLayout(targetZone).x + 10;
      const targetY = getZoneLayout(targetZone).y + 32;
      const groupId = `group-${nextId++}`;

      // Spawn off-screen to the left with transition already active
      animatingGroupIds = new Set([...animatingGroupIds, groupId]);
      placedGroups.push({
        groupId,
        component: comp,
        zoneId: toZoneId,
        x: -600,
        y: targetY,
        loading: false,
        instances,
      });

      // Two frames: let initial off-screen position render, then slide to target
      await nextTwoFrames();
      const idx = placedGroups.findIndex((g) => g.groupId === groupId);
      if (idx !== -1) placedGroups[idx].x = targetX;

      await new Promise((r) => setTimeout(r, ANIM_MS + 20));
      animatingGroupIds = new Set([...animatingGroupIds].filter((id) => id !== groupId));

    } else if (toZoneId === 'game_box') {
      // ── Canvas → Game Box ────────────────────────────────────────────
      const sourceGroupIds = currentGroups.map((g) => g.groupId);

      animatingGroupIds = new Set([...animatingGroupIds, ...sourceGroupIds]);

      await nextTwoFrames();
      for (const gId of sourceGroupIds) {
        const idx = placedGroups.findIndex((g) => g.groupId === gId);
        if (idx !== -1) {
          const b = getGroupBounds(placedGroups[idx]);
          placedGroups[idx].x = -(b.w + 100);
        }
      }

      await new Promise((r) => setTimeout(r, ANIM_MS + 20));

      for (const gId of sourceGroupIds) returnGroupToBox(gId);
      animatingGroupIds = new Set([...animatingGroupIds].filter((id) => !sourceGroupIds.includes(id)));

    } else {
      // ── Canvas → Canvas ──────────────────────────────────────────────
      if (!targetZone) return;

      // Skip if already in the target zone
      const needToMove = currentGroups.filter((g) => g.zoneId !== toZoneId);
      if (needToMove.length === 0) return;

      const allInstances = needToMove.flatMap((g) => g.instances);
      const primaryGroupId = needToMove[0].groupId;
      const extraGroupIds = needToMove.slice(1).map((g) => g.groupId);

      for (const gId of extraGroupIds) {
        const idx = placedGroups.findIndex((g) => g.groupId === gId);
        if (idx !== -1) placedGroups.splice(idx, 1);
      }

      const targetX = getZoneLayout(targetZone).x + 10;
      const targetY = getZoneLayout(targetZone).y + 32;

      animatingGroupIds = new Set([...animatingGroupIds, primaryGroupId]);

      await nextTwoFrames();
      const primaryIdx = placedGroups.findIndex((g) => g.groupId === primaryGroupId);
      if (primaryIdx !== -1) {
        placedGroups[primaryIdx].instances = allInstances;
        placedGroups[primaryIdx].x = targetX;
        placedGroups[primaryIdx].y = targetY;
        placedGroups[primaryIdx].zoneId = toZoneId;
      }

      await new Promise((r) => setTimeout(r, ANIM_MS + 20));
      animatingGroupIds = new Set([...animatingGroupIds].filter((id) => id !== primaryGroupId));
    }
  }

  // ── TabletopController ────────────────────────────────────────────────────

  // Dialog state — each holds the promise resolve callback while the dialog is open
  let playerCountDialogState = $state<{ min: number; max: number; resolve: (n: number) => void } | null>(null);
  let choosePlayerDialogState = $state<{ playerCount: number; resolve: (n: number) => void } | null>(null);

  const tabletopController: TabletopController = {
    addZone(zone) {
      zones.push(zone);
    },
    getZones() {
      return zones;
    },
    setPlayerCount(count) {
      playerCount = count;
    },
    getPlayerCount() {
      return playerCount;
    },

    promptPlayerCount(min, max) {
      return new Promise<number>((resolve) => {
        playerCountDialogState = { min, max, resolve };
      });
    },

    promptChoosePlayer(count) {
      return new Promise<number>((resolve) => {
        choosePlayerDialogState = { playerCount: count, resolve };
      });
    },

    getComponentsInZone(componentId, zoneId) {
      const inZone = placedGroups.some(
        (g) => g.component.id === componentId && g.zoneId === zoneId
      );
      return inZone ? [componentId] : [];
    },

    async moveComponents(componentIds, toZoneId) {
      for (const componentId of componentIds) {
        await moveSingleComponent(componentId, toZoneId);
      }
    },

    zoomToFitAll() {
      const layouts = Object.values(zoneLayouts);
      if (layouts.length === 0) return;
      const minX = Math.min(...layouts.map((l) => l.x));
      const minY = Math.min(...layouts.map((l) => l.y));
      const maxX = Math.max(...layouts.map((l) => l.x + l.width));
      const maxY = Math.max(...layouts.map((l) => l.y + l.height));
      const viewW = canvasEl?.clientWidth ?? 800;
      const viewH = canvasEl?.clientHeight ?? 600;
      const MARGIN = 80;
      const fitZoom = Math.min((viewW - MARGIN) / (maxX - minX), (viewH - MARGIN) / (maxY - minY));
      animateZoom(Math.min(Math.max(fitZoom, minZoom), maxZoom));
    },

    zoomToFitZone(zoneId: string) {
      const layout = zoneLayouts[zoneId];
      if (!layout) return;
      const viewW = canvasEl?.clientWidth ?? 800;
      const viewH = canvasEl?.clientHeight ?? 600;
      const MARGIN = 80;
      const fitZoom = Math.min((viewW - MARGIN) / layout.width, (viewH - MARGIN) / layout.height);
      animateZoom(Math.min(Math.max(fitZoom, minZoom), maxZoom));
    },
  };

  // ── Run Setup ─────────────────────────────────────────────────────────────

  let setupRunning = $state(false);

  async function runSetup() {
    if (!data.gameSetup || setupRunning) return;
    setupRunning = true;
    clearCanvas();
    zones = [...PRESET_ZONE_DEFS];
    playerCount = 0;
    try {
      await runGameSetup(data.gameSetup, tabletopController);
    } finally {
      setupRunning = false;
    }
  }

  // ── Repositioning (pointer events) ────────────────────────────────────────

  let repositioningId = $state<string | null>(null);
  let repoOverZoneId = $state<string | null>(null);
  let repoOverSidebar = $state(false);
  let pendingRepoId: string | null = null;
  let repoOffsetX = 0;
  let repoOffsetY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let preRepoX = 0;
  let preRepoY = 0;
  let lastInteractionWasDrag = false;
  const DRAG_THRESHOLD = 4;
  let pendingInstanceSplit = false;
  let splitGroupId: string | null = null;

  function handleItemPointerDown(event: PointerEvent, group: PlacedGroup) {
    if ((event.target as HTMLElement).closest('.remove-btn')) return;
    event.preventDefault();
    pendingInstanceSplit = !(activeGroupId === group.groupId && activeInstanceId === null);
    splitGroupId = null;
    activeGroupId = group.groupId;
    pendingRepoId = group.groupId;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    repoOffsetX = event.clientX - rect.left;
    repoOffsetY = event.clientY - rect.top;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    preRepoX = group.x;
    preRepoY = group.y;
    el.setPointerCapture(event.pointerId);
  }

  function handleItemPointerMove(event: PointerEvent, group: PlacedGroup) {
    if (pendingRepoId !== group.groupId || !canvasEl) return;
    const alreadyDragging =
      repositioningId === group.groupId ||
      (splitGroupId !== null && repositioningId === splitGroupId);
    if (!alreadyDragging) {
      const dx = event.clientX - pointerDownX;
      const dy = event.clientY - pointerDownY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      repositioningId = group.groupId;
    }

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
          zoneId: group.zoneId,
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
    }

    const canvasRect = canvasEl.getBoundingClientRect();
    const scrolledX = event.clientX - canvasRect.left + canvasEl.scrollLeft;
    const scrolledY = event.clientY - canvasRect.top + canvasEl.scrollTop;
    const x = (scrolledX - repoOffsetX) / zoom;
    const y = (scrolledY - repoOffsetY) / zoom;
    const movingGroupId = splitGroupId ?? group.groupId;
    const idx = placedGroups.findIndex((g) => g.groupId === movingGroupId);
    if (idx !== -1) {
      placedGroups[idx].x = Math.max(0, x);
      placedGroups[idx].y = Math.max(0, y);
      const b = getGroupBounds(placedGroups[idx]);
      repoOverZoneId = getZoneAt(placedGroups[idx].x + b.w / 2, placedGroups[idx].y + b.h / 2)?.id ?? null;
    }

    // Track whether pointer is over the Game Box sidebar
    if (sidebarEl) {
      const sr = sidebarEl.getBoundingClientRect();
      repoOverSidebar =
        event.clientX >= sr.left && event.clientX <= sr.right &&
        event.clientY >= sr.top && event.clientY <= sr.bottom;
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
    repoOverZoneId = null;

    const wasOverSidebar = repoOverSidebar;
    repoOverSidebar = false;

    if (!wasDragging) return;

    // Dropped on Game Box → return to box
    if (wasOverSidebar) {
      removeGroup(movingGroupId);
      return;
    }

    const draggedIdx = placedGroups.findIndex((g) => g.groupId === movingGroupId);
    if (draggedIdx === -1) return;

    const draggedGroup = placedGroups[draggedIdx];

    // Validate zone — snap back if dropped outside any zone
    const b = getGroupBounds(draggedGroup);
    const targetZone = getZoneAt(draggedGroup.x + b.w / 2, draggedGroup.y + b.h / 2);
    if (!targetZone) {
      placedGroups[draggedIdx].x = preRepoX;
      placedGroups[draggedIdx].y = preRepoY;
      return;
    }
    placedGroups[draggedIdx].zoneId = targetZone.id;

    // Check for merge with overlapping group of same component
    const draggedBounds = getGroupBounds(draggedGroup);
    let targetGroupId: string | null = null;
    for (let i = placedGroups.length - 1; i >= 0; i--) {
      const g = placedGroups[i];
      if (
        g.groupId !== movingGroupId &&
        g.component.id === draggedGroup.component.id &&
        boundsOverlap(draggedBounds, getGroupBounds(g))
      ) {
        targetGroupId = g.groupId;
        break;
      }
    }

    if (!targetGroupId) return;

    const draggedInstances = [...draggedGroup.instances];
    placedGroups.splice(draggedIdx, 1);
    const newTargetIdx = placedGroups.findIndex((g) => g.groupId === targetGroupId);
    if (newTargetIdx !== -1) {
      placedGroups[newTargetIdx].instances.push(...draggedInstances);
      activeGroupId = targetGroupId;
      activeInstanceId = null;
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  function handleGroupClick(_event: MouseEvent, group: PlacedGroup) {
    if (lastInteractionWasDrag) {
      lastInteractionWasDrag = false;
      return;
    }
    const topInst = group.instances[group.instances.length - 1];
    activeGroupId = group.groupId;
    activeInstanceId = topInst.instanceId;
  }

  function handleGroupDblClick(_event: MouseEvent, group: PlacedGroup) {
    activeGroupId = group.groupId;
    activeInstanceId = null;
  }

  function clearCanvas() {
    // Return all instances on the canvas back to the Game Box
    for (const group of placedGroups) {
      const existing = boxInstances[group.component.id] ?? [];
      boxInstances[group.component.id] = [...existing, ...group.instances];
    }
    activeGroupId = null;
    activeInstanceId = null;
    repoOverSidebar = false;
    placedGroups = [];
  }

  function handleCanvasClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.placed-item')) {
      activeGroupId = null;
      activeInstanceId = null;
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

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
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, rotation: (inst.rotation - 90 + 360) % 360 }));
      } else {
        placedGroups[idx].instances[topInstIdx].rotation =
          (placedGroups[idx].instances[topInstIdx].rotation - 90 + 360) % 360;
      }
    } else if (event.key === 'e') {
      event.preventDefault();
      if (activeInstanceId === null) {
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, rotation: (inst.rotation + 90) % 360 }));
      } else {
        placedGroups[idx].instances[topInstIdx].rotation =
          (placedGroups[idx].instances[topInstIdx].rotation + 90) % 360;
      }
    } else if (event.key === 'f') {
      event.preventDefault();
      if (activeInstanceId === null) {
        placedGroups[idx].instances = placedGroups[idx].instances
          .map((inst) => ({ ...inst, flipped: !inst.flipped }))
          .reverse();
      } else {
        placedGroups[idx].instances[topInstIdx].flipped =
          !placedGroups[idx].instances[topInstIdx].flipped;
      }
    } else if (event.key === 'u') {
      event.preventDefault();
      if (idx > 0) {
        const [item] = placedGroups.splice(idx, 1);
        placedGroups.splice(idx - 1, 0, item);
      }
    }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  let zoom = $state(1);
  const minZoom = 0.25;
  const maxZoom = 4;
  const zoomStep = 0.25;
  const zoomPercentage = $derived(Math.round(zoom * 100));

  let _zoomAnimFrame = 0;
  function animateZoom(target: number) {
    if (_zoomAnimFrame) cancelAnimationFrame(_zoomAnimFrame);
    const start = zoom;
    const t0 = performance.now();
    function tick(now: number) {
      const t = Math.min((now - t0) / ANIM_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      zoom = start + (target - start) * eased;
      _zoomAnimFrame = t < 1 ? requestAnimationFrame(tick) : 0;
    }
    _zoomAnimFrame = requestAnimationFrame(tick);
  }

  function zoomIn() { animateZoom(Math.min(zoom + zoomStep, maxZoom)); }
  function zoomOut() { animateZoom(Math.max(zoom - zoomStep, minZoom)); }
  function resetZoom() { animateZoom(1); }

  let canvasEl = $state<HTMLElement | null>(null);
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

  // Canvas min dimensions grow with zone content
  const canvasMinWidth = $derived(
    Math.max(...zones.map((z) => { const l = getZoneLayout(z); return l.x + l.width + 120; }))
  );
  const canvasMinHeight = $derived(
    Math.max(...zones.map((z) => { const l = getZoneLayout(z); return l.y + l.height + 80; }))
  );

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
  <!-- Sidebar / Game Box -->
  <div
    class="sidebar"
    class:game-box-drop-target={repoOverSidebar}
    bind:this={sidebarEl}
  >
    <div class="sidebar-setup">
      <a
        href="/projects/{data.project.ownerUsername}/{data.project.code}/tabletop/game-setup"
        class="setup-btn"
      >
        Configure Game Setup
      </a>
      <button
        class="setup-btn run-setup-btn"
        disabled={!data.gameSetup || setupRunning}
        title={data.gameSetup ? 'Run the game setup' : 'No game setup configured'}
        onclick={runSetup}
      >
        {setupRunning ? 'Running…' : 'Run Setup'}
      </button>
    </div>

    <div class="sidebar-header">
      <h2>Game Box</h2>
      {#if repoOverSidebar}
        <span class="game-box-return-hint">Drop to return</span>
      {/if}
    </div>

    <div class="component-list">
      {#if data.components.length === 0}
        <p class="empty">No components yet.</p>
      {:else if gameBoxComponents.length === 0}
        <p class="empty">All components are on the table.</p>
      {:else}
        {#each gameBoxComponents as component (component.id)}
          <div
            class="component-item"
            class:dragging={draggingId === component.id}
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="Drag {component.name} to a zone"
            ondragstart={(e) => handleDragStart(e, component)}
            ondragend={handleDragEnd}
          >
            <div class="component-info">
              <div class="component-name-row">
                <span class="component-name">{component.name}</span>
                {#if boxInstanceCounts[component.id] !== undefined && boxInstanceCounts[component.id] > 1}
                  <span class="instance-count">({boxInstanceCounts[component.id]})</span>
                {/if}
              </div>
              <div class="component-meta">
                <span class="type-badge type-{component.type.toLowerCase()}"
                  >{getComponentDisplayType(component)}</span
                >
                {#if isEditableComponent(component)}
                  <span class="dim-label">{getDimensionLabel(component)}</span>
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
  <div class="canvas-area">
    <!-- Zoom controls -->
    <div class="zoom-control">
      <button class="zoom-btn" onclick={zoomOut} disabled={zoom <= minZoom} title="Zoom out">−</button>
      <button class="zoom-reset" onclick={resetZoom} title="Reset zoom to 100%">{zoomPercentage}%</button>
      <button class="zoom-btn" onclick={zoomIn} disabled={zoom >= maxZoom} title="Zoom in">+</button>
    </div>

    <div
      class="canvas-scroll"
      bind:this={canvasEl}
      role="region"
      aria-label="Tabletop canvas. Drag components from the Game Box into a zone."
      onclick={handleCanvasClick}
    >
      <div
        class="canvas-inner"
        style="min-width: {canvasMinWidth * zoom}px; min-height: {canvasMinHeight * zoom}px;"
      >
        <!-- Zones -->
        {#each zones as zone (zone.id)}
          {@const layout = getZoneLayout(zone)}
          {@const isDropTarget = dragOverZoneId === zone.id || repoOverZoneId === zone.id}
          <div
            class="zone"
            class:zone-drop-target={isDropTarget}
            style="left: {layout.x * zoom}px; top: {layout.y * zoom}px; width: {layout.width * zoom}px; height: {layout.height * zoom}px;"
            ondragover={(e) => handleZoneDragOver(e, zone)}
            ondragleave={(e) => handleZoneDragLeave(e, zone)}
            ondrop={(e) => handleZoneDrop(e, zone)}
            role="region"
            aria-label="{zone.label} zone"
          >
            <span class="zone-label" class:zone-label-active={isDropTarget}>{zone.label}</span>
          </div>
        {/each}

        <!-- Placed items -->
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
            class:animating={animatingGroupIds.has(group.groupId)}
            style="position: absolute; left: {group.x * zoom}px; top: {group.y * zoom}px; width: {placedW}px; height: {placedH}px;"
            onpointerdown={(e) => handleItemPointerDown(e, group)}
            onpointermove={(e) => handleItemPointerMove(e, group)}
            onpointerup={(e) => handleItemPointerUp(e, group)}
            onclick={(e) => handleGroupClick(e, group)}
            ondblclick={(e) => handleGroupDblClick(e, group)}
          >
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

            <button
              class="remove-btn"
              onclick={() => removeGroup(group.groupId)}
              title="Remove"
              aria-label="Remove {group.component.name}"
            >×</button>
            {#if group.instances.length > 1}
              <div class="count-badge">{group.instances.length}</div>
            {/if}

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

<!-- Game setup dialogs — rendered outside the tabletop layout as fixed overlays -->
{#if playerCountDialogState}
  <PlayerCountDialog
    min={playerCountDialogState.min}
    max={playerCountDialogState.max}
    onConfirm={(n) => {
      playerCountDialogState!.resolve(n);
      playerCountDialogState = null;
    }}
  />
{/if}

{#if choosePlayerDialogState}
  <ChoosePlayerDialog
    playerCount={choosePlayerDialogState.playerCount}
    onConfirm={(n) => {
      choosePlayerDialogState!.resolve(n);
      choosePlayerDialogState = null;
    }}
  />
{/if}

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

  .sidebar-setup {
    padding: 0.75rem 0.75rem 0.5rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .sidebar.game-box-drop-target {
    background: #eff6ff;
    border-right-color: #93c5fd;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 1rem 0.5rem;
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

  .game-box-return-hint {
    font-size: 0.6875rem;
    font-weight: 500;
    color: #3b82f6;
    margin-left: auto;
  }

  .component-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem 0;
  }

  .empty {
    padding: 0.75rem;
    font-size: 0.8125rem;
    color: #9ca3af;
    text-align: center;
  }

  .component-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    cursor: grab;
    transition: background 0.1s ease;
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

  .component-name-row {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
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

  .instance-count {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 400;
    flex-shrink: 0;
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

  .drag-handle {
    color: #d1d5db;
    font-size: 1rem;
    flex-shrink: 0;
    cursor: grab;
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

  .run-setup-btn {
    font-family: inherit;
    cursor: pointer;
  }

  .run-setup-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
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
    background: radial-gradient(circle, #d1d5db 1px, transparent 1px);
    background-size: 24px 24px;
    background-color: #f3f4f6;
  }

  .canvas-scroll {
    position: absolute;
    inset: 0;
    overflow: auto;
  }

  .canvas-inner {
    position: relative;
  }

  /* Zones */
  .zone {
    position: absolute;
    border: 2px dashed #c4c9d4;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.35);
    box-sizing: border-box;
    transition: border-color 0.15s, background 0.15s;
    pointer-events: auto;
  }

  .zone-drop-target {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.07);
  }

  .zone-label {
    position: absolute;
    top: 10px;
    left: 14px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #b0b7c3;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    pointer-events: none;
    user-select: none;
    transition: color 0.15s;
  }

  .zone-label-active {
    color: #3b82f6;
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

  /* Placed items */
  .placed-item {
    position: absolute;
    cursor: grab;
    touch-action: none;
    z-index: 1;
  }

  .placed-item.repositioning {
    cursor: grabbing;
    z-index: 100;
  }

  /* Slide animation — only active during programmatic moves */
  .placed-item.animating {
    transition: left 0.4s ease, top 0.4s ease;
    pointer-events: none;
  }

  .ghost-card {
    position: absolute;
    background: #d1d5db;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  .rotating-wrapper {
    position: absolute;
  }

  .placed-item.active {
    outline: 2px solid #3b82f6;
    outline-offset: 4px;
    border-radius: 4px;
  }

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
