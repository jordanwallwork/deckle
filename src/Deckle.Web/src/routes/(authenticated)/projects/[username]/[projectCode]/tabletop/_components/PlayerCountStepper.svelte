<script lang="ts">
  // Bounded +/- stepper for the player count (#120). Enforces the document's
  // [minPlayers, maxPlayers] band; the clamping itself lives in the pure
  // choices helpers, this just drives them and disables at the edges.
  import { clampPlayerCount } from '$lib/play/choices';

  let {
    value = $bindable(),
    min,
    max
  }: { value: number; min: number; max: number } = $props();

  const atMin = $derived(value <= min);
  const atMax = $derived(value >= max);

  function step(delta: number) {
    value = clampPlayerCount(value + delta, min, max);
  }
</script>

<div class="row">
  <span class="label">Players</span>
  <div class="stepper">
    <button type="button" class="step" onclick={() => step(-1)} disabled={atMin} aria-label="Fewer players">
      −
    </button>
    <span class="count" aria-live="polite">{value}</span>
    <button type="button" class="step" onclick={() => step(1)} disabled={atMax} aria-label="More players">
      +
    </button>
  </div>
  <span class="hint">{min}–{max}</span>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .label {
    font-weight: 600;
    color: var(--color-text-primary);
    min-width: 5rem;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .step {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.125rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .step:hover:not(:disabled) {
    border-color: var(--color-accent-fg);
  }

  .step:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .count {
    min-width: 2rem;
    text-align: center;
    font-weight: 600;
    font-size: 1.0625rem;
    color: var(--color-text-primary);
  }

  .hint {
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }
</style>
