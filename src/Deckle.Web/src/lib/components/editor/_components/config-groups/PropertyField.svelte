<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Shared wrapper for a single configurable property inside a group control.
   *
   * Unset-first (ADR-0001 D4): the control shows its effective default as a
   * placeholder when unset; when the property is explicitly set, a reset (×)
   * affordance appears to clear it back to `undefined`. The `set` flag drives
   * both the reset button's visibility and a subtle "set" dot indicator.
   *
   * The label lives here so wrapped controls should render with `hideLabel`.
   */
  let {
    label,
    set = false,
    onclear,
    mixed = false,
    children
  }: {
    label: string;
    set?: boolean;
    onclear?: () => void;
    mixed?: boolean;
    children: Snippet;
  } = $props();
</script>

<div class="property-field" class:is-set={set}>
  <div class="pf-header">
    <span class="pf-label">
      {label}
      {#if set}<span class="pf-dot" title="Set" aria-label="explicitly set"></span>{/if}
      {#if mixed}<span class="pf-mixed">Mixed</span>{/if}
    </span>
    {#if set && onclear}
      <button
        type="button"
        class="pf-reset"
        onclick={onclear}
        title="Reset to default"
        aria-label={`Reset ${label} to default`}
      >
        ×
      </button>
    {/if}
  </div>
  <div class="pf-control">
    {@render children()}
  </div>
</div>

<style>
  .property-field {
    margin-bottom: 0.875rem;
  }

  .pf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 1rem;
    margin-bottom: 0.25rem;
  }

  .pf-label {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .pf-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent-fg);
    display: inline-block;
  }

  .pf-mixed {
    font-size: 0.6875rem;
    font-style: italic;
    color: var(--color-text-secondary);
  }

  .pf-reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }

  .pf-reset:hover {
    background: var(--color-bg-subtle);
    color: var(--color-text-primary);
  }
</style>
