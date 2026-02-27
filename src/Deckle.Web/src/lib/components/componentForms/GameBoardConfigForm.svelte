<script lang="ts">
  import { GAME_BOARD_SIZES, type GameBoardPresetSize } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';
  import type { GameBoardComponent } from '$lib/types';

  let {
    componentName = $bindable(),
    sizeMode = $bindable(),
    presetSize = $bindable(),
    horizontal = $bindable(),
    customWidthMm = $bindable(),
    customHeightMm = $bindable(),
    customHorizontalFolds = $bindable(),
    customVerticalFolds = $bindable(),
    samples = [],
    selectedSampleId = $bindable(null)
  }: {
    componentName: string;
    sizeMode: 'preset' | 'custom';
    presetSize: string | null;
    horizontal: boolean;
    customWidthMm: string;
    customHeightMm: string;
    customHorizontalFolds: string;
    customVerticalFolds: string;
    samples?: GameBoardComponent[];
    selectedSampleId?: string | null;
  } = $props();

  const squareSizes = $derived(GAME_BOARD_SIZES.filter((s) => s.group === 'Square'));
  const rectangleSizes = $derived(GAME_BOARD_SIZES.filter((s) => s.group === 'Rectangle'));

  const selectedPreset = $derived(
    GAME_BOARD_SIZES.find((s) => s.value === presetSize) ?? null
  );

  const matchingSamples = $derived(
    sizeMode === 'preset'
      ? samples.filter((s) => s.presetSize === presetSize && s.horizontal === horizontal)
      : []
  );

  $effect(() => {
    if (selectedSampleId && !matchingSamples.some((s) => s.id === selectedSampleId)) {
      selectedSampleId = null;
    }
  });

  // For bi-fold presets, show horizontal toggle (orientation affects which dimension is folded)
  const showHorizontalToggle = $derived(
    sizeMode === 'preset' && selectedPreset !== null && !selectedPreset.isQuadFold
  );

  function getPresetDimensions(size: GameBoardPresetSize, horiz: boolean): string {
    const w = horiz ? size.landscapeWidthMm : size.landscapeHeightMm;
    const h = horiz ? size.landscapeHeightMm : size.landscapeWidthMm;
    const folded = size.isQuadFold
      ? `Folded: ${w / 2}×${h / 2}mm`
      : `Folded: ${w / 2}×${h}mm`;
    return `${w}×${h}mm unfolded — ${folded}`;
  }

  function getPresetThicknessMm(size: GameBoardPresetSize): number {
    // bi-fold = 1 fold total → 2.5 × 2^1 = 5mm; quad-fold = 2 folds → 2.5 × 2^2 = 10mm
    return 2.5 * Math.pow(2, size.isQuadFold ? 2 : 1);
  }

  const presetThicknessMm = $derived(selectedPreset ? getPresetThicknessMm(selectedPreset) : null);

  const customThicknessMm = $derived(() => {
    if (sizeMode !== 'custom') return null;
    const hf = parseInt(customHorizontalFolds);
    const vf = parseInt(customVerticalFolds);
    if (isNaN(hf) || isNaN(vf) || hf < 0 || vf < 0) return null;
    return 2.5 * Math.pow(2, hf + vf);
  });

  const customFoldedSize = $derived(() => {
    if (sizeMode !== 'custom') return null;
    const w = parseFloat(customWidthMm);
    const h = parseFloat(customHeightMm);
    const hf = parseInt(customHorizontalFolds);
    const vf = parseInt(customVerticalFolds);
    if (isNaN(w) || isNaN(h) || isNaN(hf) || isNaN(vf)) return null;
    if (hf === 0 && vf === 0) return null;
    const fw = vf > 0 ? w / vf : w;
    const fh = hf > 0 ? h / hf : h;
    return { fw, fh };
  });

  const customWidthValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const v = parseFloat(customWidthMm);
    return !isNaN(v) && v >= 304 && v <= 914;
  });

  const customHeightValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const v = parseFloat(customHeightMm);
    return !isNaN(v) && v >= 152 && v <= 635;
  });

  const customHFoldsValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const v = parseInt(customHorizontalFolds);
    return !isNaN(v) && v >= 0 && v <= 2;
  });

  const customVFoldsValid = $derived(() => {
    if (sizeMode !== 'custom') return true;
    const v = parseInt(customVerticalFolds);
    return !isNaN(v) && v >= 0 && v <= 2;
  });
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
    <FormField label="Board Size" name="preset-size">
      <Select id="preset-size" bind:value={presetSize}>
        <optgroup label="Square (when folded)">
          {#each squareSizes as size}
            <option value={size.value}>{size.label}</option>
          {/each}
        </optgroup>
        <optgroup label="Rectangle (when folded)">
          {#each rectangleSizes as size}
            <option value={size.value}>{size.label}</option>
          {/each}
        </optgroup>
      </Select>
    </FormField>

    {#if selectedPreset}
      <p class="dimension-hint">
        {getPresetDimensions(selectedPreset, horizontal)}
        {#if presetThicknessMm !== null}
          — Folded thickness: {presetThicknessMm}mm <span
            class="thickness-info"
            title="Estimated thickness when folded, based on 2.5mm board material">ⓘ</span>
        {/if}
      </p>
    {/if}

    {#if showHorizontalToggle}
      <label class="horizontal-toggle">
        <input type="checkbox" bind:checked={horizontal} />
        <span>Horizontal (landscape orientation)</span>
      </label>
    {/if}
  {:else}
    <FormField label="Width (mm)" name="custom-width">
      <Input
        id="custom-width"
        type="number"
        bind:value={customWidthMm}
        placeholder="Enter width in mm"
        min="304"
        max="914"
        step="1"
      />
      {#if !customWidthValid()}
        <p class="field-error">Width must be between 304mm and 914mm</p>
      {/if}
    </FormField>

    <FormField label="Height (mm)" name="custom-height">
      <Input
        id="custom-height"
        type="number"
        bind:value={customHeightMm}
        placeholder="Enter height in mm"
        min="152"
        max="635"
        step="1"
      />
      {#if !customHeightValid()}
        <p class="field-error">Height must be between 152mm and 635mm</p>
      {/if}
    </FormField>

    <FormField label="Horizontal Folds" name="custom-hfolds">
      <Input
        id="custom-hfolds"
        type="number"
        bind:value={customHorizontalFolds}
        min="0"
        max="2"
        step="1"
      />
      {#if !customHFoldsValid()}
        <p class="field-error">Horizontal folds must be 0, 1, or 2</p>
      {/if}
    </FormField>

    <FormField label="Vertical Folds" name="custom-vfolds">
      <Input
        id="custom-vfolds"
        type="number"
        bind:value={customVerticalFolds}
        min="0"
        max="2"
        step="1"
      />
      {#if !customVFoldsValid()}
        <p class="field-error">Vertical folds must be 0, 1, or 2</p>
      {/if}
    </FormField>

    {#if customFoldedSize() !== null || customThicknessMm() !== null}
      <p class="dimension-hint">
        {#if customFoldedSize() !== null}
          Folded: {customFoldedSize()!.fw}×{customFoldedSize()!.fh}mm
        {/if}
        {#if customThicknessMm() !== null}
          {customFoldedSize() !== null ? '— ' : ''}Folded thickness: {customThicknessMm()}mm <span
            class="thickness-info"
            title="Estimated thickness when folded, based on 2.5mm board material">ⓘ</span>
        {/if}
      </p>
    {/if}
  {/if}

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

  .dimension-hint {
    font-size: 0.8rem;
    color: var(--color-muted-teal);
    margin: 0.25rem 0 0.75rem 0;
  }

  .thickness-info {
    cursor: help;
    opacity: 0.7;
    font-size: 0.75em;
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
