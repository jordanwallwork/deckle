<script lang="ts">
  // Setup-replay input lock + skip control (#121). While a run replays, this
  // sits over the canvas and physically intercepts pointer/context events (the
  // screen-space lock, complementing the interaction/keyboard guards), and hosts
  // the Skip button that fast-forwards straight to the final table.
  import { getTabletopApi } from '$lib/tabletop';

  const { store } = getTabletopApi();
</script>

{#if store.isReplaying}
  <div
    class="replay-lock"
    role="presentation"
    oncontextmenu={(e) => e.preventDefault()}
  >
    <button class="skip-btn" onclick={() => store.skipReplay()}> Skip ⏭ </button>
  </div>
{/if}

<style>
  .replay-lock {
    position: absolute;
    inset: 0;
    /* Catch every pointer event so nothing on the table can be interacted
       with while the run builds up. */
    pointer-events: auto;
    z-index: 20;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 1.5rem;
    cursor: default;
  }

  .skip-btn {
    pointer-events: auto;
    background: #1e2030;
    border: 1px solid #3a3d4e;
    color: #e8e9f0;
    border-radius: 6px;
    padding: 0.4rem 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    transition: background 0.1s;
  }

  .skip-btn:hover {
    background: #2a2d3e;
  }
</style>
