<script lang="ts">
  let {
    position,
    inverseScale,
    onmousedown,
  }: {
    position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    inverseScale: number;
    onmousedown: (e: MouseEvent) => void;
  } = $props();

  const cursorMap: Record<typeof position, string> = {
    nw: 'nw-resize',
    n: 'n-resize',
    ne: 'ne-resize',
    e: 'e-resize',
    se: 'se-resize',
    s: 's-resize',
    sw: 'sw-resize',
    w: 'w-resize',
  };
</script>

<div
  class="resize-handle panzoom-exclude {position}"
  style="--inverse-scale: {inverseScale}"
  {onmousedown}
  role="button"
  tabindex="-1"
></div>

<style>
  .resize-handle {
    position: absolute;
    width: calc(8px * var(--inverse-scale));
    height: calc(8px * var(--inverse-scale));
    background: #0066cc;
    border: calc(1px * var(--inverse-scale)) solid white;
    border-radius: calc(2px * var(--inverse-scale));
    pointer-events: auto;
    z-index: 10;
    touch-action: none;
    user-select: none;
  }

  /* Corner handles */
  .resize-handle.nw {
    top: calc(-4px * var(--inverse-scale));
    left: calc(-4px * var(--inverse-scale));
    cursor: nw-resize;
  }

  .resize-handle.ne {
    top: calc(-4px * var(--inverse-scale));
    right: calc(-4px * var(--inverse-scale));
    cursor: ne-resize;
  }

  .resize-handle.se {
    bottom: calc(-4px * var(--inverse-scale));
    right: calc(-4px * var(--inverse-scale));
    cursor: se-resize;
  }

  .resize-handle.sw {
    bottom: calc(-4px * var(--inverse-scale));
    left: calc(-4px * var(--inverse-scale));
    cursor: sw-resize;
  }

  /* Edge handles */
  .resize-handle.n {
    top: calc(-4px * var(--inverse-scale));
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
  }

  .resize-handle.e {
    right: calc(-4px * var(--inverse-scale));
    top: 50%;
    transform: translateY(-50%);
    cursor: e-resize;
  }

  .resize-handle.s {
    bottom: calc(-4px * var(--inverse-scale));
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
  }

  .resize-handle.w {
    left: calc(-4px * var(--inverse-scale));
    top: 50%;
    transform: translateY(-50%);
    cursor: w-resize;
  }

  .resize-handle:hover {
    background: #0052a3;
  }
</style>
