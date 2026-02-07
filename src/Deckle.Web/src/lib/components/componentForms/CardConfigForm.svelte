<script lang="ts">
  import { CARD_SIZES, type CardSize } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';
  import type { CardComponent } from '$lib/types';

  let {
    cardSize = $bindable(),
    cardHorizontal = $bindable(),
    componentName = $bindable(),
    templates = [],
    selectedTemplateId = $bindable(null)
  }: {
    cardSize: string;
    cardHorizontal: boolean;
    componentName: string;
    templates?: CardComponent[];
    selectedTemplateId?: string | null;
  } = $props();

  const matchingTemplates = $derived(
    templates.filter((t) => t.size === cardSize && t.horizontal === cardHorizontal)
  );

  // Reset selection when card size changes and selected template no longer matches
  $effect(() => {
    if (selectedTemplateId && !matchingTemplates.some((t) => t.id === selectedTemplateId)) {
      selectedTemplateId = null;
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

  {#if matchingTemplates.length > 0}
    <FormField label="Template" name="template">
      <Select id="template" bind:value={selectedTemplateId}>
        <option value={null}>None (blank)</option>
        {#each matchingTemplates as template}
          <option value={template.id}>{template.name}</option>
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
