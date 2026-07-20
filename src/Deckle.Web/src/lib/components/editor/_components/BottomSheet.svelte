<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Draggable bottom sheet with peek / half / full snap points (ADR-0001 D6).
   * Keeps the canvas visible while editing on mobile. The drag handle adjusts
   * the sheet height live and snaps to the nearest point on release; dragging
   * below the peek threshold closes it.
   */
  let {
    open = false,
    onClose,
    title = 'Configuration',
    children
  }: {
    open?: boolean;
    onClose: () => void;
    title?: string;
    children: Snippet;
  } = $props();

  let viewportH = $state(typeof window !== 'undefined' ? window.innerHeight : 800);
  const peek = $derived(140);
  const half = $derived(Math.round(viewportH * 0.5));
  const full = $derived(Math.round(viewportH * 0.9));
  const snaps = $derived([peek, half, full]);

  // Current sheet height in px. Reset to `half` whenever it (re)opens.
  let height = $state(0);
  let dragging = $state(false);

  $effect(() => {
    if (open && height === 0) height = half;
    if (!open) height = 0;
  });

  function onResize() {
    viewportH = window.innerHeight;
  }

  let startY = 0;
  let startH = 0;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    startY = e.clientY;
    startH = height;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dy = e.clientY - startY;
    height = Math.max(0, Math.min(full, startH - dy));
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    // Close when dragged below half the peek height.
    if (height < peek / 2) {
      onClose();
      return;
    }
    // Snap to the nearest snap point.
    height = snaps.reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a), snaps[0]);
  }

  function cycleSnap() {
    const idx = snaps.findIndex((s) => Math.abs(s - height) < 8);
    height = snaps[(idx + 1) % snaps.length] ?? half;
  }
</script>

<svelte:window onresize={onResize} />

{#if open}
  <div class="sheet-scrim" role="presentation" onclick={onClose}></div>
  <section
    class="bottom-sheet"
    class:dragging
    style="height: {height}px"
    aria-label={title}
  >
    <div
      class="sheet-handle"
      role="slider"
      tabindex="0"
      aria-label="Resize sheet"
      aria-valuenow={height}
      aria-valuemin={0}
      aria-valuemax={full}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      ondblclick={cycleSnap}
      onkeydown={(e) => {
        if (e.key === 'ArrowUp') height = Math.min(full, height + 60);
        else if (e.key === 'ArrowDown') height = Math.max(0, height - 60);
        else if (e.key === 'Escape') onClose();
      }}
    >
      <span class="grabber"></span>
    </div>
    <div class="sheet-body">
      {@render children()}
    </div>
  </section>
{/if}

<style>
  .sheet-scrim {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    z-index: 30;
  }

  .bottom-sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 31;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .bottom-sheet:not(.dragging) {
    transition: height 0.22s ease;
  }

  .sheet-handle {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.25rem;
    cursor: grab;
    touch-action: none;
    border-bottom: 1px solid var(--color-border);
  }

  .sheet-handle:active {
    cursor: grabbing;
  }

  .grabber {
    width: 2.5rem;
    height: 5px;
    border-radius: 3px;
    background: var(--color-disabled-border);
  }

  .sheet-body {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
</style>
