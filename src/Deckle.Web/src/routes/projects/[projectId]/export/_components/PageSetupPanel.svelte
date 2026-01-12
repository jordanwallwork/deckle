<script lang="ts">
  import FieldWrapper from '$lib/components/editor/_components/config-controls/FieldWrapper.svelte';
  import SelectField from '$lib/components/editor/_components/config-controls/SelectField.svelte';
  import NumberField from '$lib/components/editor/_components/config-controls/NumberField.svelte';
  import type { PageSetup } from '$lib/types';
  import { browser } from '$app/environment';

  let {
    pageSetup = $bindable(),
    pageElements = [],
    paperDimensions,
    componentName = 'component',
    componentCount = 1
  }: {
    pageSetup: PageSetup;
    pageElements?: HTMLElement[];
    paperDimensions: { width: number; height: number };
    componentName?: string;
    componentCount?: number;
  } = $props();

  let isExporting = $state(false);

  // Show separate pages option only when multiple components selected
  const shouldShowSeparatePages = $derived(componentCount > 1);

  // Helper to convert between units
  const inchesToCm = (inches: number) => inches * 2.54;
  const cmToInches = (cm: number) => cm / 2.54;

  // Margin value in the current unit
  let marginValue = $derived(
    pageSetup.unit === 'inches' ? pageSetup.marginInches : inchesToCm(pageSetup.marginInches)
  );

  // Update margin when input changes
  function handleMarginChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    // Convert to inches for storage
    pageSetup.marginInches = pageSetup.unit === 'inches' ? value : cmToInches(value);
  }

  // Toggle unit
  function toggleUnit() {
    pageSetup.unit = pageSetup.unit === 'inches' ? 'cm' : 'inches';
  }

  // Export pages as PNG
  async function exportAsPng() {
    if (pageElements.length === 0) {
      alert('No pages to export');
      return;
    }

    isExporting = true;

    try {
      if (pageElements.length === 1) {
        // Single page: download as PNG
        const dataUrl = await capturePageAtFullSize(pageElements[0]);

        // Download the image
        const link = document.createElement('a');
        link.download = `${componentName}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        // Dynamically import zip.js (browser-only library)
        const { BlobWriter, ZipWriter } = await import('@zip.js/zip.js');

        // Multiple pages: create a ZIP file
        const zipWriter = new ZipWriter(new BlobWriter('application/zip'));

        // Convert each page to PNG and add to ZIP
        for (let i = 0; i < pageElements.length; i++) {
          const dataUrl = await capturePageAtFullSize(pageElements[i]);

          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          // Add to ZIP with numbered filename
          const pageNumber = String(i + 1).padStart(3, '0');
          await zipWriter.add(`${componentName}-page-${pageNumber}.png`, blob.stream());
        }

        // Close the ZIP and download
        const zipBlob = await zipWriter.close();
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.download = `${componentName}-pages.zip`;
        link.href = zipUrl;
        link.click();

        // Clean up
        URL.revokeObjectURL(zipUrl);
      }
    } catch (error) {
      console.error('Failed to export as PNG:', error);
      alert('Failed to export pages. Please try again.');
    } finally {
      isExporting = false;
    }
  }

  // Export pages as PDF
  async function exportAsPdf() {
    if (pageElements.length === 0) {
      alert('No pages to export');
      return;
    }

    isExporting = true;

    try {
      // Dynamically import jspdf (browser-only library)
      const { jsPDF } = await import('jspdf');

      // Determine PDF orientation and dimensions based on paper size
      const pdfOrientation = pageSetup.orientation === 'portrait' ? 'p' : 'l';
      const pdfFormat = pageSetup.paperSize === 'A4' ? 'a4' : 'letter';

      // Create PDF with same dimensions as the paper
      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'px',
        format: [paperDimensions.width, paperDimensions.height]
      });

      // Convert each page to PNG and add to PDF
      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
          pdf.addPage([paperDimensions.width, paperDimensions.height]);
        }

        const dataUrl = await capturePageAtFullSize(pageElements[i]);

        // Add image to PDF (full page)
        pdf.addImage(dataUrl, 'PNG', 0, 0, paperDimensions.width, paperDimensions.height);
      }

      // Download the PDF
      pdf.save(`${componentName}.pdf`);
    } catch (error) {
      console.error('Failed to export as PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      isExporting = false;
    }
  }

  // Capture a page at full size (without zoom transform)
  async function capturePageAtFullSize(element: HTMLElement): Promise<string> {
    // Dynamically import html-to-image (browser-only library)
    const { toPng } = await import('html-to-image');

    // Save the original transform
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;

    try {
      // Temporarily remove the scale transform
      element.style.transform = 'none';
      element.style.transformOrigin = 'top left';

      // Capture at full resolution with exact dimensions
      const dataUrl = await toPng(element, {
        width: paperDimensions.width,
        height: paperDimensions.height,
        pixelRatio: 1,
        backgroundColor: '#ffffff'
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
  <div class="export-buttons">
    <button
      class="export-button"
      onclick={exportAsPng}
      disabled={isExporting || pageElements.length === 0}
    >
      {isExporting ? 'Exporting...' : 'Export as PNG'}
    </button>
    <button
      class="export-button"
      onclick={exportAsPdf}
      disabled={isExporting || pageElements.length === 0}
    >
      {isExporting ? 'Exporting...' : 'Export as PDF'}
    </button>
  </div>

  <SelectField
    label="Paper Size"
    id="paperSize"
    value={pageSetup.paperSize}
    options={[
      { value: 'A4', label: 'A4' },
      { value: 'USLetter', label: 'US Letter' }
    ]}
    onchange={(value) => (pageSetup.paperSize = value as 'A4' | 'USLetter')}
  />

  <SelectField
    label="Orientation"
    id="orientation"
    value={pageSetup.orientation}
    options={[
      { value: 'portrait', label: 'Portrait' },
      { value: 'landscape', label: 'Landscape' }
    ]}
    onchange={(value) => (pageSetup.orientation = value as 'portrait' | 'landscape')}
  />

  <FieldWrapper label="Margin" htmlFor="margin">
    <div class="margin-input-wrapper">
      <input
        type="number"
        id="margin"
        value={marginValue.toFixed(2)}
        step={pageSetup.unit === 'inches' ? '0.25' : '0.5'}
        min="0"
        oninput={handleMarginChange}
      />
      <button type="button" class="unit-toggle" onclick={toggleUnit} title="Toggle unit">
        {pageSetup.unit}
      </button>
    </div>
  </FieldWrapper>

  <FieldWrapper label="Crop Marks" htmlFor="cropMarks">
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id="cropMarks"
        bind:checked={pageSetup.cropMarks}
        class="checkbox-input"
      />
      <label for="cropMarks" class="checkbox-label"> Show crop marks for cutting </label>
    </div>
  </FieldWrapper>

  <FieldWrapper label="Export Backs" htmlFor="exportBacks">
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
  </FieldWrapper>

  {#if shouldShowSeparatePages}
    <FieldWrapper label="Separate Pages" htmlFor="separateComponentPages">
      <div class="checkbox-wrapper">
        <input
          type="checkbox"
          id="separateComponentPages"
          bind:checked={pageSetup.separateComponentPages}
          class="checkbox-input"
        />
        <label for="separateComponentPages" class="checkbox-label">
          Put each component on separate pages
        </label>
      </div>
    </FieldWrapper>
  {/if}
</div>

<style>
  .page-setup-panel {
    padding: 1rem;
    height: 100%;
    overflow-y: auto;
  }

  .export-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .export-button {
    flex: 1;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background: var(--color-sage);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .export-button:hover:not(:disabled) {
    background: #2d4a3e;
  }

  .export-button:active:not(:disabled) {
    background: #243a32;
  }

  .export-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .margin-input-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
  }

  .margin-input-wrapper input[type='number'] {
    flex: 1;
    min-width: 0;
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
    height: 2.125rem;
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
    font-size: 0.75rem;
    color: #666;
    cursor: pointer;
    user-select: none;
  }
</style>
