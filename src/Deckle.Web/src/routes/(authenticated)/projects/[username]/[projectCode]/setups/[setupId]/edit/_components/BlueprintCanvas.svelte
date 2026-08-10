<script lang="ts">
  // Single-seat blueprint canvas (#111/#122): draws the blueprint's zones at
  // their authored local geometry and overlays the setup-time auto-fit ring
  // derived from the zones' bounding box (reusing #118 `radialLayout` +
  // `rectsBounds`). The ring is a preview aid — the roomier-override knob and
  // preview player count are local view state, not persisted on the blueprint
  // (the ring radius lives on the `placeSeats` step, per #109/#115).
  import { radialLayout, rectsBounds, boundsCenter, type Zone, type ZoneScope } from '$lib/gamerunner';

  let {
    zones,
    scope,
    radiusOverride = $bindable(undefined),
    previewCount = $bindable(4)
  }: {
    zones: Zone[];
    scope: ZoneScope;
    radiusOverride?: number | undefined;
    previewCount?: number;
  } = $props();

  const FACE_CLASS: Record<string, string> = {
    all: 'face-all',
    owner: 'face-owner',
    others: 'face-others',
    none: 'face-none'
  };

  const rects = $derived(zones.map((z) => z.geometry.rect));
  const bounds = $derived(rectsBounds(rects));
  const center = $derived(boundsCenter(rects));
  const showRing = $derived(scope === 'seat' && zones.length > 0);

  const ring = $derived(
    radialLayout.computeRing({
      playerCount: Math.max(1, previewCount),
      seatPanel: { width: bounds.width, height: bounds.height },
      radiusOverride,
      center
    })
  );

  // A viewBox that contains the zones and, for seat scope, the whole ring.
  const view = $derived.by(() => {
    const pad = 24;
    let minX = bounds.x;
    let minY = bounds.y;
    let maxX = bounds.x + bounds.width;
    let maxY = bounds.y + bounds.height;
    if (showRing) {
      minX = Math.min(minX, center.x - ring.radius);
      minY = Math.min(minY, center.y - ring.radius);
      maxX = Math.max(maxX, center.x + ring.radius);
      maxY = Math.max(maxY, center.y + ring.radius);
    }
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.max(1, maxX - minX + pad * 2),
      h: Math.max(1, maxY - minY + pad * 2)
    };
  });

  const fontSize = $derived(Math.max(8, Math.min(view.w, view.h) * 0.04));
</script>

<div class="wrap">
  {#if zones.length === 0}
    <p class="empty">Add a zone to see it on the canvas.</p>
  {:else}
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} class="canvas" role="img" aria-label="Blueprint zone layout preview">
      {#if showRing}
        <circle class="ring" cx={center.x} cy={center.y} r={ring.radius} />
        <circle class="ring-center" cx={center.x} cy={center.y} r={fontSize * 0.25} />
      {/if}
      {#each zones as z (z.id)}
        <g>
          <rect
            class={FACE_CLASS[z.faceVisibility] ?? 'face-all'}
            class:hidden-presence={z.presence === 'hidden-from-non-owners'}
            x={z.geometry.rect.x}
            y={z.geometry.rect.y}
            width={z.geometry.rect.width}
            height={z.geometry.rect.height}
            rx={fontSize * 0.3}
          />
          <text
            class="label"
            x={z.geometry.rect.x + z.geometry.rect.width / 2}
            y={z.geometry.rect.y + z.geometry.rect.height / 2}
            font-size={fontSize}
          >{z.name || z.role}</text>
        </g>
      {/each}
    </svg>
  {/if}

  <div class="ring-controls" class:disabled={!showRing}>
    <label>
      Preview players
      <input type="number" min="1" max="12" bind:value={previewCount} disabled={!showRing} />
    </label>
    <label title="Roomier-override: only ever widens the auto-fit ring (#111)">
      Ring radius
      <input
        type="number"
        min="0"
        step="10"
        placeholder="auto"
        value={radiusOverride ?? ''}
        disabled={!showRing}
        onchange={(e) => {
          const v = e.currentTarget.value;
          radiusOverride = v === '' ? undefined : Number(v);
        }}
      />
    </label>
    {#if showRing}
      <span class="auto">auto-fit ≈ {Math.round(ring.radius)}</span>
    {:else}
      <span class="auto">Ring applies to seat blueprints</span>
    {/if}
  </div>
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .canvas {
    width: 100%;
    max-height: 340px;
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  .empty {
    color: var(--color-text-muted);
    font-size: 0.85rem;
    text-align: center;
    padding: 2rem;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
  }
  .ring {
    fill: none;
    stroke: var(--color-accent-fg);
    stroke-width: 1.5;
    stroke-dasharray: 6 5;
    opacity: 0.6;
  }
  .ring-center {
    fill: var(--color-accent-fg);
    opacity: 0.6;
  }
  rect {
    stroke: var(--color-border);
    stroke-width: 1;
  }
  .face-all {
    fill: color-mix(in srgb, var(--color-sage) 45%, transparent);
  }
  .face-owner {
    fill: color-mix(in srgb, #4f83cc 40%, transparent);
  }
  .face-others {
    fill: color-mix(in srgb, #a06fce 40%, transparent);
  }
  .face-none {
    fill: color-mix(in srgb, var(--color-text-muted) 30%, transparent);
  }
  .hidden-presence {
    stroke-dasharray: 4 3;
    stroke: var(--color-danger);
  }
  .label {
    fill: var(--color-text-primary);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }
  .ring-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .ring-controls label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .ring-controls input {
    width: 4.5rem;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .auto {
    font-style: italic;
  }
</style>
