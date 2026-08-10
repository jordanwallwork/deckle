<script lang="ts">
  // Solo seat switcher (#124). Shown in the toolbar ONLY when the current run
  // has seat zones; lets one designer view the table omniscient (default) or
  // through a single seat's eyes. It only drives the view controller — switching
  // never touches saved state, undo history, or persisted data.
  import { getTabletopApi } from '$lib/tabletop';

  const { viewController } = getTabletopApi();

  // Seats are 0-based internally (matching ownerSeat/seatIndex) but shown 1-based.
  const seatCount = $derived(viewController.seatCount);
  const seats = $derived(Array.from({ length: seatCount }, (_, i) => i));
  const label = $derived(
    viewController.isOmniscient ? 'Omniscient' : `Seat ${(viewController.viewer as number) + 1}`
  );

  let open = $state(false);

  function choose(next: 'omniscient' | number) {
    if (next === 'omniscient') viewController.viewOmniscient();
    else viewController.viewAsSeat(next);
    open = false;
  }

  function handleWindowPointerDown(e: PointerEvent) {
    if (!open) return;
    if (e.target instanceof Element && e.target.closest('.seat-switcher')) return;
    open = false;
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

{#if seatCount > 0}
  <div class="seat-switcher">
    <button
      class="seat-btn"
      onclick={() => (open = !open)}
      title="Switch viewing seat"
      aria-haspopup="menu"
      aria-expanded={open}
    >
      👁 {label} ▾
    </button>
    {#if open}
      <div class="menu" role="menu">
        <button
          class="menu-item"
          class:active={viewController.isOmniscient}
          role="menuitemradio"
          aria-checked={viewController.isOmniscient}
          onclick={() => choose('omniscient')}
        >
          Omniscient
        </button>
        {#each seats as seat (seat)}
          <button
            class="menu-item"
            class:active={viewController.viewer === seat}
            role="menuitemradio"
            aria-checked={viewController.viewer === seat}
            onclick={() => choose(seat)}
          >
            Seat {seat + 1}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .seat-switcher {
    position: relative;
    display: flex;
  }

  /* Self-contained toolbar-button styling (matches Toolbar's .tool-btn, whose
     scoped styles do not reach this child component). */
  .seat-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    height: 1.75rem;
    padding: 0.25rem 0.5rem;
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    transition: background 0.1s;
  }

  .seat-btn:hover {
    background: #3a3d4e;
  }

  .menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 300;
    display: flex;
    flex-direction: column;
    min-width: 8rem;
    padding: 0.25rem;
    background: #1e2030;
    border: 1px solid #3a3d4e;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }

  .menu-item {
    text-align: left;
    background: transparent;
    border: none;
    color: #c8cad8;
    border-radius: 4px;
    padding: 0.375rem 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
  }

  .menu-item:hover {
    background: #2a2d3e;
  }

  .menu-item.active {
    background: #3a3d4e;
    color: #e8e9f0;
  }
</style>
