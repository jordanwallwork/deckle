<script lang="ts">
  import { PLAYER_MAT_SIZES, PLAYER_MAT_ORIENTATIONS } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';

  let {
    componentName = $bindable(),
    sizeMode = $bindable(),
    presetSize = $bindable(),
    orientation = $bindable(),
    customWidthMm = $bindable(),
    customHeightMm = $bindable()
  }: {
    componentName: string;
    sizeMode: 'preset' | 'custom';
    presetSize: string | null;
    orientation: string;
    customWidthMm: string;
    customHeightMm: string;
  } = $props();

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
</script>

<div class="configuration-form">
  <FormField label="Component Name" name="component-name">
    <Input
      id="component-name"
      bind:value={componentName}
      placeholder="Enter component name"
    />
  </FormField>

  <FormField label="Size Configuration" name="size-mode">
    <div class="radio-group">
      <label class="radio-option">
        <input
          type="radio"
          name="size-mode"
          value="preset"
          bind:group={sizeMode}
        />
        <span>Preset Size</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          name="size-mode"
          value="custom"
          bind:group={sizeMode}
        />
        <span>Custom Size</span>
      </label>
    </div>
  </FormField>

  {#if sizeMode === 'preset'}
    <FormField label="Mat Size" name="preset-size">
      <Select id="preset-size" bind:value={presetSize}>
        {#each PLAYER_MAT_SIZES as size}
          <option value={size.value}>
            {size.label} ({size.widthMm}mm × {size.heightMm}mm)
          </option>
        {/each}
      </Select>
    </FormField>

    <FormField label="Orientation" name="orientation">
      <Select id="orientation" bind:value={orientation}>
        {#each PLAYER_MAT_ORIENTATIONS as orient}
          <option value={orient.value}>{orient.label}</option>
        {/each}
      </Select>
    </FormField>
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

  .radio-option input[type="radio"] {
    cursor: pointer;
  }

  .radio-option span {
    font-size: 0.875rem;
    color: var(--color-sage);
  }

  .field-error {
    color: #d32f2f;
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
  }
</style>
