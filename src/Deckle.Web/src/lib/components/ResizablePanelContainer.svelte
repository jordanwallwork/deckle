<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    orientation?: "horizontal" | "vertical";
    leftOrTop: Snippet;
    rightOrBottom: Snippet;
    initialSplit?: number; // percentage for left/top panel
    minSize?: number; // minimum percentage
    maxSize?: number; // maximum percentage
    onResize?: (splitPercentage: number) => void;
  }

  let {
    orientation = "horizontal",
    leftOrTop,
    rightOrBottom,
    initialSplit = 50,
    minSize = 10,
    maxSize = 90,
    onResize,
  }: Props = $props();

  let splitPercentage = $state(initialSplit);
  let isDragging = $state(false);
  let containerRef: HTMLDivElement | undefined = $state();

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef) return;

      const rect = containerRef.getBoundingClientRect();
      let newSplit: number;

      if (orientation === "horizontal") {
        const x = e.clientX - rect.left;
        newSplit = (x / rect.width) * 100;
      } else {
        const y = e.clientY - rect.top;
        newSplit = (y / rect.height) * 100;
      }

      // Clamp to min/max
      newSplit = Math.max(minSize, Math.min(maxSize, newSplit));
      splitPercentage = newSplit;

      if (onResize) {
        onResize(newSplit);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor =
      orientation === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }
</script>

<div
  bind:this={containerRef}
  class="resizable-container"
  class:horizontal={orientation === "horizontal"}
  class:vertical={orientation === "vertical"}
>
  <div
    class="panel left-or-top"
    style={orientation === "horizontal"
      ? `width: ${splitPercentage}%`
      : `height: ${splitPercentage}%`}
  >
    {@render leftOrTop()}
  </div>

  <button
    class="divider"
    class:horizontal={orientation === "horizontal"}
    class:vertical={orientation === "vertical"}
    class:dragging={isDragging}
    onmousedown={handleMouseDown}
    aria-label={orientation === "horizontal"
      ? "Resize panels horizontally"
      : "Resize panels vertically"}
  >
    <div class="divider-handle"></div>
  </button>

  <div class="panel right-or-bottom">
    {@render rightOrBottom()}
  </div>
</div>

<style>
  .resizable-container {
    flex: 1;
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .resizable-container.horizontal {
    flex-direction: row;
  }

  .resizable-container.vertical {
    flex-direction: column;
  }

  .panel {
    overflow: auto;
    position: relative;
  }

  .panel.left-or-top {
    flex-shrink: 0;
  }

  .panel.right-or-bottom {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .divider {
    position: relative;
    flex-shrink: 0;
    background-color: var(--color-border);
    transition: background-color 0.2s ease;
    border: none;
    padding: 0;
    margin: 0;
  }

  .divider.horizontal {
    width: 4px;
    cursor: col-resize;
  }

  .divider.vertical {
    height: 4px;
    cursor: row-resize;
  }

  .divider:hover,
  .divider.dragging {
    background-color: var(--color-sage);
  }

  .divider-handle {
    position: absolute;
    background-color: var(--color-sage);
    opacity: 0;
    transition: opacity 0.2s ease;
    border-radius: 2px;
  }

  .divider.horizontal .divider-handle {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
  }

  .divider.vertical .divider-handle {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 2px;
  }

  .divider:hover .divider-handle,
  .divider.dragging .divider-handle {
    opacity: 1;
  }

  .divider:focus {
    outline: 2px solid var(--color-sage);
    outline-offset: -2px;
  }
</style>
