<script lang="ts">
  import type { Shadow } from '../../types';
  import NumberField from '../config-controls/NumberField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';

  /**
   * List editor for one or more box shadows (ADR-0001 D3, story 8). Shadow
   * lengths are px numbers by the stored schema (`boxShadowStyle` appends `px`),
   * so they use NumberField rather than the unit-aware DimensionInput.
   */
  let {
    shadows,
    onchange
  }: {
    shadows: Shadow[];
    onchange: (shadows: Shadow[]) => void;
  } = $props();

  function newShadow(): Shadow {
    return { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.25)', inset: false };
  }

  function add() {
    onchange([...shadows, newShadow()]);
  }

  function remove(i: number) {
    onchange(shadows.filter((_, idx) => idx !== i));
  }

  function patch(i: number, updates: Partial<Shadow>) {
    onchange(shadows.map((s, idx) => (idx === i ? { ...s, ...updates } : s)));
  }
</script>

<div class="shadow-list">
  {#each shadows as shadow, i (i)}
    <div class="shadow-item">
      <div class="shadow-item-header">
        <span class="shadow-title">Shadow {i + 1}</span>
        <button type="button" class="remove-btn" onclick={() => remove(i)} aria-label="Remove shadow"
          >×</button
        >
      </div>
      <div class="shadow-grid">
        <NumberField
          label="Offset X"
          id={`shadow-${i}-x`}
          value={shadow.offsetX}
          step={1}
          onchange={(v) => patch(i, { offsetX: v })}
        />
        <NumberField
          label="Offset Y"
          id={`shadow-${i}-y`}
          value={shadow.offsetY}
          step={1}
          onchange={(v) => patch(i, { offsetY: v })}
        />
        <NumberField
          label="Blur"
          id={`shadow-${i}-blur`}
          value={shadow.blur}
          min={0}
          step={1}
          onchange={(v) => patch(i, { blur: v })}
        />
        <NumberField
          label="Spread"
          id={`shadow-${i}-spread`}
          value={shadow.spread ?? 0}
          step={1}
          onchange={(v) => patch(i, { spread: v })}
        />
      </div>
      <ColorPicker
        label="Color"
        id={`shadow-${i}-color`}
        value={shadow.color}
        onchange={(c) => patch(i, { color: c })}
      />
      <label class="inset-toggle">
        <input
          type="checkbox"
          checked={shadow.inset ?? false}
          onchange={(e) => patch(i, { inset: e.currentTarget.checked })}
        />
        <span>Inset</span>
      </label>
    </div>
  {/each}

  <button type="button" class="add-btn" onclick={add}>+ Add shadow</button>
</div>

<style>
  .shadow-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .shadow-item {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.625rem;
    background: var(--color-bg-subtle);
  }

  .shadow-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .shadow-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .remove-btn {
    border: none;
    background: transparent;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0 0.25rem;
  }

  .remove-btn:hover {
    color: var(--color-text-primary);
  }

  .shadow-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .shadow-grid :global(.field) {
    margin-bottom: 0.5rem;
  }

  .inset-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    margin-top: 0.25rem;
  }

  .add-btn {
    padding: 0.375rem 0.5rem;
    border: 1px dashed var(--color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .add-btn:hover {
    border-color: var(--color-accent-fg);
    color: var(--color-accent-fg);
  }
</style>
