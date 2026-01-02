<script lang="ts">
  import { FormField, Select } from "$lib/components/forms";
  import type {
    PageSetup,
    PaperSize,
    Orientation,
    MeasurementUnit,
  } from "$lib/types";

  let {
    pageSetup = $bindable(),
  }: {
    pageSetup: PageSetup;
  } = $props();

  // Helper to convert between units
  const inchesToCm = (inches: number) => inches * 2.54;
  const cmToInches = (cm: number) => cm / 2.54;

  // Margin value in the current unit
  let marginValue = $derived(
    pageSetup.unit === "inches"
      ? pageSetup.marginInches
      : inchesToCm(pageSetup.marginInches)
  );

  // Update margin when input changes
  function handleMarginChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    // Convert to inches for storage
    pageSetup.marginInches =
      pageSetup.unit === "inches" ? value : cmToInches(value);
  }

  // Toggle unit
  function toggleUnit() {
    pageSetup.unit = pageSetup.unit === "inches" ? "cm" : "inches";
  }
</script>

<div class="page-setup-panel">
  <h3>Page Setup</h3>

  <FormField label="Paper Size" name="paperSize">
    <Select bind:value={pageSetup.paperSize}>
      <option value="A4">A4</option>
      <option value="USLetter">US Letter</option>
    </Select>
  </FormField>

  <FormField label="Orientation" name="orientation">
    <Select bind:value={pageSetup.orientation}>
      <option value="portrait">Portrait</option>
      <option value="landscape">Landscape</option>
    </Select>
  </FormField>

  <FormField label="Margin" name="margin">
    <div class="margin-input-wrapper">
      <input
        type="number"
        id="margin"
        value={marginValue.toFixed(2)}
        step={pageSetup.unit === "inches" ? "0.25" : "0.5"}
        min="0"
        class="margin-input"
        oninput={handleMarginChange}
      />
      <button
        type="button"
        class="unit-toggle"
        onclick={toggleUnit}
        title="Toggle unit"
      >
        {pageSetup.unit}
      </button>
    </div>
  </FormField>
</div>

<style>
  .page-setup-panel {
    padding: 1.5rem;
    height: 100%;
    overflow-y: auto;
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1.5rem 0;
    color: var(--color-sage);
  }

  .margin-input-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
  }

  .margin-input {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
    font-family: inherit;
  }

  .margin-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .unit-toggle {
    padding: 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 3.5rem;
  }

  .unit-toggle:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .unit-toggle:active {
    background: #f3f4f6;
  }
</style>
