<script lang="ts">
  import { Dialog, Button } from '$lib/components';

  let {
    show = $bindable(),
    onConfirm,
    onClose
  }: {
    show: boolean;
    onConfirm: (url: string) => void;
    onClose: () => void;
  } = $props();

  // Default values
  let width = $state(400);
  let height = $state(300);
  let bgColor = $state('cccccc');
  let textColor = $state('333333');
  let text = $state('Image');

  // Reset to defaults when dialog opens
  $effect(() => {
    if (show) {
      width = 400;
      height = 300;
      bgColor = 'cccccc';
      textColor = '333333';
      text = 'Image';
    }
  });

  // Generate preview URL
  const previewUrl = $derived(
    `https://placehold.co/${width}x${height}/${bgColor}/${textColor}.png?text=${encodeURIComponent(text)}`
  );

  function handleConfirm() {
    onConfirm(previewUrl);
  }

  function sanitizeColorInput(value: string): string {
    // Remove # if present and keep only valid hex characters
    return value.replace(/[^0-9a-fA-F]/g, '').substring(0, 6);
  }
</script>

<Dialog bind:show title="Generate Placeholder Image" maxWidth="600px" onclose={onClose}>
  {#snippet children()}
    <div class="form-content">
      <!-- Size inputs -->
      <div class="form-row">
        <div class="form-field">
          <label for="width">Width (px)</label>
          <input type="number" id="width" min="1" max="5000" bind:value={width} />
        </div>
        <div class="form-field">
          <label for="height">Height (px)</label>
          <input type="number" id="height" min="1" max="5000" bind:value={height} />
        </div>
      </div>

      <!-- Color inputs -->
      <div class="form-row">
        <div class="form-field">
          <label for="bgColor">Background Color (hex)</label>
          <div class="color-input-group">
            <span class="hash-prefix">#</span>
            <input
              type="text"
              id="bgColor"
              placeholder="cccccc"
              maxlength="6"
              bind:value={bgColor}
              oninput={(e) => (bgColor = sanitizeColorInput(e.currentTarget.value))}
            />
            <div class="color-preview" style="background-color: #{bgColor}"></div>
          </div>
        </div>
        <div class="form-field">
          <label for="textColor">Text Color (hex)</label>
          <div class="color-input-group">
            <span class="hash-prefix">#</span>
            <input
              type="text"
              id="textColor"
              placeholder="333333"
              maxlength="6"
              bind:value={textColor}
              oninput={(e) => (textColor = sanitizeColorInput(e.currentTarget.value))}
            />
            <div class="color-preview" style="background-color: #{textColor}"></div>
          </div>
        </div>
      </div>

      <!-- Text input -->
      <div class="form-field">
        <label for="text">Placeholder Text</label>
        <input type="text" id="text" bind:value={text} />
      </div>

      <!-- Preview -->
      <div class="preview-section">
        <label>Preview</label>
        <div class="preview-container">
          <img src={previewUrl} alt="Placeholder preview" class="preview-image" />
        </div>
        <p class="preview-url">{previewUrl}</p>
      </div>
    </div>
  {/snippet}

  {#snippet actions()}
    <Button variant="primary" outline onclick={onClose}>Cancel</Button>
    <Button variant="primary" onclick={handleConfirm}>Use This Placeholder</Button>
  {/snippet}
</Dialog>

<style>
  .form-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-field label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .form-field input[type='text'],
  .form-field input[type='number'] {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    font-family: inherit;
    box-sizing: border-box;
    height: 2.125rem;
  }

  .form-field input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .color-input-group {
    display: flex;
    align-items: center;
    position: relative;
  }

  .hash-prefix {
    position: absolute;
    left: 0.5rem;
    color: #666;
    font-size: 0.813rem;
    pointer-events: none;
  }

  .color-input-group input {
    padding-left: 1.25rem !important;
    padding-right: 2.5rem !important;
  }

  .color-preview {
    position: absolute;
    right: 0.375rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    border: 1px solid #d1d5db;
    pointer-events: none;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .preview-section label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .preview-container {
    border: 2px solid #d1d5db;
    border-radius: 8px;
    padding: 1rem;
    background: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-image {
    max-width: 100%;
    max-height: 200px;
    display: block;
    border-radius: 4px;
  }

  .preview-url {
    font-size: 0.75rem;
    color: #666;
    word-break: break-all;
    margin: 0;
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
  }
</style>
