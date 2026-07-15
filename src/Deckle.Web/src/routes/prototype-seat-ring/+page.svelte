<!-- PROTOTYPE — throwaway (wayfinder ticket #109).
     Question: does the seat-stamping ring model (#102) *feel* right at 1–6+ players?
     Two variants of the same stamped model, switchable via ?variant=:
       A — faithful radial ring    B — BGA-style unrotated rows -->
<script lang="ts">
  import { page } from '$app/state';
  import PrototypeSwitcher from './_components/PrototypeSwitcher.svelte';
  import VariantRadial from './_components/VariantRadial.svelte';
  import VariantRows from './_components/VariantRows.svelte';
  import type { RingKnobs } from './_components/model';

  const variants = [
    { key: 'A', name: 'Radial ring' },
    { key: 'B', name: 'BGA rows' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');

  let knobs: RingKnobs = $state({
    playerCount: 4,
    radius: 320,
    seatOneAngle: 180,
    seatScale: 1
  });
  let showEdges = $state(true);
  let viewerSeat = $state(0);

  $effect(() => {
    if (viewerSeat >= knobs.playerCount) viewerSeat = 0;
  });
</script>

<div class="proto">
  <aside class="controls">
    <h1>Seat ring prototype</h1>
    <p class="hint">Wayfinder #109 — throwaway. One seat template (hand + tableau + discard) stamped N times.</p>

    <label>
      Players: <strong>{knobs.playerCount}</strong>
      <input type="range" min="1" max="8" bind:value={knobs.playerCount} />
    </label>

    <label>
      Viewer seat:
      <select bind:value={viewerSeat}>
        {#each Array(knobs.playerCount) as _, i (i)}
          <option value={i}>Seat {i + 1}</option>
        {/each}
      </select>
    </label>

    <label class="check">
      <input type="checkbox" bind:checked={showEdges} />
      Show edge zones (always N — 2-player gets 2)
    </label>

    <fieldset>
      <legend>Author knobs (radial)</legend>
      <label>
        Ring radius: <strong>{knobs.radius}</strong>
        <input type="range" min="200" max="480" bind:value={knobs.radius} />
      </label>
      <label>
        Seat 1 position: <strong>{knobs.seatOneAngle}°</strong>
        <input type="range" min="0" max="359" bind:value={knobs.seatOneAngle} />
      </label>
      <label>
        Seat scale: <strong>{knobs.seatScale.toFixed(2)}</strong>
        <input type="range" min="0.4" max="1.3" step="0.05" bind:value={knobs.seatScale} />
      </label>
    </fieldset>

    <p class="hint">← / → switch variant. React to: spacing at high counts, edge placement between seats, which knobs (if any) an author actually needs.</p>
  </aside>

  {#if variant === 'B'}
    <VariantRows {knobs} {showEdges} {viewerSeat} />
  {:else}
    <VariantRadial {knobs} {showEdges} {viewerSeat} />
  {/if}

  <PrototypeSwitcher {variants} current={variant} />
</div>

<style>
  .proto {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    height: 100vh;
    box-sizing: border-box;
    background: #1a1f1c;
    color: #e8e8e8;
  }

  .controls {
    width: 240px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    overflow-y: auto;
  }

  h1 {
    font-size: 1.1rem;
    margin: 0;
  }

  .hint {
    font-size: 0.75rem;
    color: #9aa89f;
    margin: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
  }

  label.check {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid #3a453e;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  legend {
    padding: 0 0.4rem;
    color: #9aa89f;
  }

  select {
    background: #2a332d;
    color: inherit;
    border: 1px solid #3a453e;
    border-radius: 6px;
    padding: 0.3rem;
  }
</style>
