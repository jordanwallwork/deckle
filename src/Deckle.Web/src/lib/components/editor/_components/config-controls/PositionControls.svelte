<script lang="ts">
  import DimensionInput from './DimensionInput.svelte';

  let {
    x,
    y,
    onchange
  }: {
    x?: number | string;
    y?: number | string;
    onchange: (updates: { x?: number | string; y?: number | string }) => void;
  } = $props();

  // Convert number to string format for DimensionInput
  function toStringValue(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }
</script>

<div class="field">
  <span class="section-label">Position:</span>
  <div class="position-grid">
    <DimensionInput
      label="Left"
      id="position-x"
      value={toStringValue(x)}
      onchange={(newValue) => onchange({ x: newValue })}
    />

    <DimensionInput
      label="Top"
      id="position-y"
      value={toStringValue(y)}
      onchange={(newValue) => onchange({ y: newValue })}
    />
  </div>
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .position-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .position-grid :global(.field) {
    margin-bottom: 0;
  }
</style>
