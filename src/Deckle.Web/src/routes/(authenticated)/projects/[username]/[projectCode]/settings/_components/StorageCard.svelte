<script lang="ts">
  import { Card } from '$lib/components';
  import type { ProjectStorage } from '$lib/types';

  let { storage }: { storage: ProjectStorage } = $props();

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const categories = $derived([
    { label: 'Components', bytes: storage.componentBytes, color: '#78a083' },
    { label: 'Data Sources', bytes: storage.dataSourceBytes, color: '#5b8a9b' },
    { label: 'Files', bytes: storage.fileBytes, color: '#b09060' }
  ]);

  // SVG donut chart
  const SIZE = 140;
  const RADIUS = 52;
  const STROKE = 18;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  type Slice = { label: string; bytes: number; color: string; dash: number; gap: number; offset: number };

  function buildSlices(): Slice[] {
    const total = storage.totalBytes;
    if (total === 0) return [];
    let offset = 0;
    return categories.map((cat) => {
      const dash = (cat.bytes / total) * CIRCUMFERENCE;
      const slice: Slice = { ...cat, dash, gap: CIRCUMFERENCE - dash, offset };
      offset += dash;
      return slice;
    });
  }

  const slices = $derived(buildSlices());

  const isEmpty = $derived(storage.totalBytes === 0);
</script>

<Card>
  <div class="storage-layout">
    <div class="chart-area">
      <svg width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}" aria-hidden="true">
        {#if isEmpty}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="var(--color-border)"
            stroke-width={STROKE}
          />
        {:else}
          {#each slices as slice}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              stroke-width={STROKE}
              stroke-dasharray="{slice.dash} {slice.gap}"
              stroke-dashoffset={-(slice.offset - CIRCUMFERENCE / 4)}
              stroke-linecap="butt"
            />
          {/each}
        {/if}
        <text x={CX} y={CY - 6} text-anchor="middle" class="center-label-main">
          {formatBytes(storage.totalBytes)}
        </text>
        <text x={CX} y={CY + 12} text-anchor="middle" class="center-label-sub">total</text>
      </svg>
    </div>

    <div class="legend">
      {#each categories as cat}
        <div class="legend-item">
          <span class="legend-dot" style="background-color: {cat.color}"></span>
          <span class="legend-label">{cat.label}</span>
          <span class="legend-bytes">{formatBytes(cat.bytes)}</span>
        </div>
      {/each}
    </div>
  </div>
</Card>

<style>
  .storage-layout {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .chart-area {
    flex-shrink: 0;
  }

  .center-label-main {
    font-size: 0.8rem;
    font-weight: 600;
    fill: var(--color-text);
    font-family: inherit;
  }

  .center-label-sub {
    font-size: 0.65rem;
    fill: var(--color-text-secondary);
    font-family: inherit;
  }

  .legend {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-width: 160px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-label {
    font-size: 0.9rem;
    color: var(--color-text);
    flex: 1;
  }

  .legend-bytes {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-align: right;
  }
</style>
