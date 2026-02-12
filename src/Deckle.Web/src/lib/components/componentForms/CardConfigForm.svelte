<script lang="ts">
  import { CARD_SIZES, type CardSize } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';
  import type { CardComponent } from '$lib/types';

  let {
    cardSize = $bindable(),
    cardHorizontal = $bindable(),
    componentName = $bindable(),
    samples = [],
    selectedSampleId = $bindable(null)
  }: {
    cardSize: string;
    cardHorizontal: boolean;
    componentName: string;
    samples?: CardComponent[];
    selectedSampleId?: string | null;
  } = $props();

  const matchingSamples = $derived(
    samples.filter((t) => t.size === cardSize && t.horizontal === cardHorizontal)
  );

  // Reset selection when card size changes and selected sample no longer matches
  $effect(() => {
    if (selectedSampleId && !matchingSamples.some((t) => t.id === selectedSampleId)) {
      selectedSampleId = null;
    }
  });

  function getCardSizeLabel(size: CardSize, horizontal: boolean): string {
    const width = horizontal ? size.heightMm : size.widthMm;
    const height = horizontal ? size.widthMm : size.heightMm;
    return `${size.label} (${width}mm × ${height}mm)`;
  }
</script>

<div class="configuration-form">
  <FormField label="Component Name" name="component-name">
    <Input id="component-name" bind:value={componentName} placeholder="Enter component name" />
  </FormField>

  <FormField label="Card Size" name="card-size">
    <Select id="card-size" bind:value={cardSize}>
      {#each CARD_SIZES as size}
        <option value={size.value}>{getCardSizeLabel(size, cardHorizontal)}</option>
      {/each}
    </Select>
  </FormField>

  <label class="horizontal-toggle">
    <input type="checkbox" bind:checked={cardHorizontal} />
    <span>Horizontal (landscape orientation)</span>
  </label>

  {#if matchingSamples.length > 0}
    <FormField label="Sample" name="sample">
      <Select id="sample" bind:value={selectedSampleId}>
        <option value={null}>None (blank)</option>
        {#each matchingSamples as sample}
          <option value={sample.id}>{sample.name}</option>
        {/each}
      </Select>
    </FormField>
  {/if}
</div>

<style>
  .configuration-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .horizontal-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }

  .horizontal-toggle input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }

  .horizontal-toggle span {
    user-select: none;
  }
</style>
