<script lang="ts">
  import { FormField, Select } from "$lib/components/forms";
  import type {
    PageSetup,
    PaperSize,
    Orientation,
    MeasurementUnit,
  } from "$lib/types";
  import { toPng } from "html-to-image";
  import { BlobWriter, ZipWriter } from "@zip.js/zip.js";

  let {
    pageSetup = $bindable(),
    pageElements = [],
    paperDimensions,
    componentName = "component",
  }: {
    pageSetup: PageSetup;
    pageElements?: HTMLElement[];
    paperDimensions: { width: number; height: number };
    componentName?: string;
  } = $props();

  let isExporting = $state(false);

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

  // Export pages as PNG
  async function exportAsPng() {
    if (pageElements.length === 0) {
      alert("No pages to export");
      return;
    }

    isExporting = true;

    try {
      if (pageElements.length === 1) {
        // Single page: download as PNG
        const dataUrl = await capturePageAtFullSize(pageElements[0]);

        // Download the image
        const link = document.createElement("a");
        link.download = `${componentName}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        // Multiple pages: create a ZIP file
        const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

        // Convert each page to PNG and add to ZIP
        for (let i = 0; i < pageElements.length; i++) {
          const dataUrl = await capturePageAtFullSize(pageElements[i]);

          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          // Add to ZIP with numbered filename
          const pageNumber = String(i + 1).padStart(3, "0");
          await zipWriter.add(`${componentName}-page-${pageNumber}.png`, blob.stream());
        }

        // Close the ZIP and download
        const zipBlob = await zipWriter.close();
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement("a");
        link.download = `${componentName}-pages.zip`;
        link.href = zipUrl;
        link.click();

        // Clean up
        URL.revokeObjectURL(zipUrl);
      }
    } catch (error) {
      console.error("Failed to export as PNG:", error);
      alert("Failed to export pages. Please try again.");
    } finally {
      isExporting = false;
    }
  }

  // Capture a page at full size (without zoom transform)
  async function capturePageAtFullSize(element: HTMLElement): Promise<string> {
    // Save the original transform
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;

    try {
      // Temporarily remove the scale transform
      element.style.transform = "none";
      element.style.transformOrigin = "top left";

      // Capture at full resolution with exact dimensions
      const dataUrl = await toPng(element, {
        width: paperDimensions.width,
        height: paperDimensions.height,
        pixelRatio: 1,
        backgroundColor: "#ffffff",
      });

      return dataUrl;
    } finally {
      // Restore the original transform
      element.style.transform = originalTransform;
      element.style.transformOrigin = originalTransformOrigin;
    }
  }
</script>

<div class="page-setup-panel">
  <h3>Page Setup</h3>

  <button
    class="export-png-button"
    onclick={exportAsPng}
    disabled={isExporting || pageElements.length === 0}
  >
    {isExporting ? "Exporting..." : "Export as PNG"}
  </button>

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

  <FormField label="Crop Marks" name="cropMarks">
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id="cropMarks"
        bind:checked={pageSetup.cropMarks}
        class="checkbox-input"
      />
      <label for="cropMarks" class="checkbox-label">
        Show crop marks for cutting
      </label>
    </div>
  </FormField>

  <FormField label="Export Backs" name="exportBacks">
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id="exportBacks"
        bind:checked={pageSetup.exportBacks}
        class="checkbox-input"
      />
      <label for="exportBacks" class="checkbox-label">
        Export back designs on separate pages
      </label>
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
    margin: 0 0 1rem 0;
    color: var(--color-sage);
  }

  .export-png-button {
    width: 100%;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background: var(--color-sage);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1.5rem;
  }

  .export-png-button:hover:not(:disabled) {
    background: #2d4a3e;
  }

  .export-png-button:active:not(:disabled) {
    background: #243a32;
  }

  .export-png-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .checkbox-input {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 0.813rem;
    color: #4b5563;
    cursor: pointer;
    user-select: none;
  }
</style>
