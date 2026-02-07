<script lang="ts">
  import { PLAYER_MAT_SIZES, type PlayerMatSize } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';
  import type { PlayerMatComponent } from '$lib/types';

  let {
    componentName = $bindable(),
    sizeMode = $bindable(),
    presetSize = $bindable(),
    horizontal = $bindable(),
    customWidthMm = $bindable(),
    customHeightMm = $bindable(),
    templates = [],
    selectedTemplateId = $bindable(null)
  }: {
    componentName: string;
    sizeMode: 'preset' | 'custom';
    presetSize: string | null;
    horizontal: boolean;
    customWidthMm: string;
    customHeightMm: string;
    templates?: PlayerMatComponent[];
    selectedTemplateId?: string | null;
  } = $props();

  const matchingTemplates = $derived(
    sizeMode === 'preset'
      ? templates.filter((t) => t.presetSize === presetSize)
      : []
  );

  // Reset selection when size changes and selected template no longer matches
  $effect(() => {
    if (selectedTemplateId && !matchingTemplates.some((t) => t.id === selectedTemplateId)) {
      selectedTemplateId = null;
    }
  });

  // Validation
  const customWidthValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const width = parseFloat(customWidthMm);
    return !isNaN(width) && width >= 63 && width <= 297;
  });

  const customHeightValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const height = parseFloat(customHeightMm);
    return !isNaN(height) && height >= 63 && height <= 297;
  });

  function getMatSizeLabel(size: PlayerMatSize, horiz: boolean): string {
    const width = horiz ? size.heightMm : size.widthMm;
    const height = horiz ? size.widthMm : size.heightMm;
    return `${size.label} (${width}mm × ${height}mm)`;
  }
</script>

<div class="configuration-form">
  <FormField label="Component Name" name="component-name">
    <Input id="component-name" bind:value={componentName} placeholder="Enter component name" />
  </FormField>

  <FormField label="Size Configuration" name="size-mode">
    <div class="radio-group">
      <label class="radio-option">
        <input type="radio" name="size-mode" value="preset" bind:group={sizeMode} />
        <span>Preset Size</span>
      </label>
      <label class="radio-option">
        <input type="radio" name="size-mode" value="custom" bind:group={sizeMode} />
        <span>Custom Size</span>
      </label>
    </div>
  </FormField>

  {#if sizeMode === 'preset'}
    <FormField label="Mat Size" name="preset-size">
      <Select id="preset-size" bind:value={presetSize}>
        {#each PLAYER_MAT_SIZES as size}
          <option value={size.value}>{getMatSizeLabel(size, horizontal)}</option>
        {/each}
      </Select>
    </FormField>

    <label class="horizontal-toggle">
      <input type="checkbox" bind:checked={horizontal} />
      <span>Horizontal (landscape orientation)</span>
    </label>
  {:else}
    <FormField label="Width (mm)" name="custom-width">
      <Input
        id="custom-width"
        type="number"
        bind:value={customWidthMm}
        placeholder="Enter width in mm"
        min="63"
        max="297"
        step="0.1"
      />
      {#if !customWidthValid()}
        <p class="field-error">Width must be between 63mm and 297mm</p>
      {/if}
    </FormField>

    <FormField label="Height (mm)" name="custom-height">
      <Input
        id="custom-height"
        type="number"
        bind:value={customHeightMm}
        placeholder="Enter height in mm"
        min="63"
        max="297"
        step="0.1"
      />
      {#if !customHeightValid()}
        <p class="field-error">Height must be between 63mm and 297mm</p>
      {/if}
    </FormField>
  {/if}

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

  .radio-group {
    display: flex;
    gap: 1rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .radio-option input[type='radio'] {
    cursor: pointer;
  }

  .radio-option span {
    font-size: 0.875rem;
    color: var(--color-sage);
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

  .field-error {
    color: #d32f2f;
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
  }
</style>
