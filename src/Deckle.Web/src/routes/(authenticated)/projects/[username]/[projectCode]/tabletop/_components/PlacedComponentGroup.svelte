<script lang="ts">
  import type { GameComponent, ComponentShape } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { isEditableComponent, getComponentDisplayType } from '$lib/utils/componentTypes';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';

  let {
    component,
    loading,
    dataSourceRows,
    projectId,
    mmScale,
    flipped = false
  }: {
    component: GameComponent;
    loading: boolean;
    dataSourceRows: Record<string, string>[];
    projectId: string;
    mmScale: number;
    flipped?: boolean;
  } = $props();

  let design = $derived.by((): ContainerElement | null => {
    if (!isEditableComponent(component)) return null;
    const raw = flipped ? component.backDesign : component.frontDesign;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  let dims = $derived(isEditableComponent(component) ? component.dimensions : null);

  // Instances: one per data source row, or one blank instance
  let instances = $derived(dataSourceRows.length > 0 ? dataSourceRows : [{}]);

  // Trim area in canvas pixels — scale from physical mm so all components are proportional
  // regardless of their source DPI
  let trimW = $derived(dims ? Math.round(dims.widthMm * mmScale) : 100);
  let trimH = $derived(dims ? Math.round(dims.heightMm * mmScale) : 140);

  // Per-component render scale: maps source pixels → canvas pixels
  let canvasScale = $derived(dims ? trimW / dims.widthPx : 1);

  // Source-pixel bleed offset (used in translate before scale)
  let bleedPx = $derived(dims ? dims.bleedPx : 0);

  // Stack visual offset (canvas px per ghost layer)
  const STACK_OFFSET = 5;
  let numGhosts = $derived(instances.length > 1 ? Math.min(instances.length - 1, 2) : 0);

  let totalW = $derived(trimW + numGhosts * STACK_OFFSET);
  let totalH = $derived(trimH + numGhosts * STACK_OFFSET);

  function mergeDataFor(row: Record<string, string>): Record<string, string> | null {
    return Object.keys(row).length > 0 ? row : null;
  }
</script>

<div class="group-wrapper" style="width: {totalW}px; height: {totalH}px;">
  {#if loading}
    <!-- Skeleton while data source loads -->
    <div
      class="skeleton"
      style="
        position: absolute;
        top: {numGhosts * STACK_OFFSET}px;
        left: {numGhosts * STACK_OFFSET}px;
        width: {trimW}px;
        height: {trimH}px;
      "
    >
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    </div>
  {:else if design && dims}
    <!-- Ghost cards (stack depth effect) -->
    {#if numGhosts >= 2}
      <div
        class="ghost-card"
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: {trimW}px;
          height: {trimH}px;
        "
      ></div>
    {/if}
    {#if numGhosts >= 1}
      <div
        class="ghost-card"
        style="
          position: absolute;
          top: {STACK_OFFSET}px;
          left: {STACK_OFFSET}px;
          width: {trimW}px;
          height: {trimH}px;
        "
      ></div>
    {/if}

    <!-- Top card: clipped to trim area, bleed hidden -->
    <div
      class="trim-clip"
      style="
        position: absolute;
        top: {numGhosts * STACK_OFFSET}px;
        left: {numGhosts * STACK_OFFSET}px;
        width: {trimW}px;
        height: {trimH}px;
        overflow: hidden;
      "
    >
      <div
        style="
          transform: scale({canvasScale}) translate(-{bleedPx}px, -{bleedPx}px);
          transform-origin: 0 0;
          position: absolute;
          top: 0;
          left: 0;
        "
      >
        <StaticComponentRenderer
          {design}
          dimensions={dims}
          shape={'shape' in component ? (component.shape as ComponentShape) : undefined}
          mergeData={mergeDataFor(instances[0])}
          {projectId}
        />
      </div>
    </div>

    <!-- Instance count badge -->
    {#if instances.length > 1}
      <div class="count-badge">{instances.length}</div>
    {/if}
  {:else if flipped && isEditableComponent(component) && dims}
    <!-- Blank white back face -->
    <div
      class="trim-clip blank-back"
      style="
        position: absolute;
        top: {numGhosts * STACK_OFFSET}px;
        left: {numGhosts * STACK_OFFSET}px;
        width: {trimW}px;
        height: {trimH}px;
        overflow: hidden;
      "
    ></div>
  {:else}
    <!-- No design / non-editable placeholder -->
    <div
      class="placeholder"
      style="
        position: absolute;
        top: 0;
        left: 0;
        width: {trimW}px;
        height: {trimH}px;
      "
    >
      <span class="placeholder-type">{getComponentDisplayType(component)}</span>
      <span class="placeholder-name">{component.name}</span>
      {#if !isEditableComponent(component)}
        <span class="placeholder-hint">No preview available</span>
      {:else}
        <span class="placeholder-hint">No design yet</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .group-wrapper {
    position: relative;
    user-select: none;
  }

  /* Skeleton loading state */
  .skeleton {
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .spinner-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: #6b7280;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Ghost cards for stack effect */
  .ghost-card {
    background: #d1d5db;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  /* Trim clip: clips renderer to the trim area */
  .trim-clip {
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .blank-back {
    background: white;
  }

  /* Instance count badge */
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
  }

  /* No-design placeholder */
  .placeholder {
    background: #f3f4f6;
    border: 2px dashed #d1d5db;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px;
  }

  .placeholder-type {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .placeholder-name {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-align: center;
    word-break: break-word;
  }

  .placeholder-hint {
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
  }
</style>
