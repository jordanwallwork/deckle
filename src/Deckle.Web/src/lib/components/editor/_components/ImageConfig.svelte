<script lang="ts">
  import type { ImageElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';
  import VisibilityCheckbox from './VisibilityCheckbox.svelte';
  import PositionControls from './PositionControls.svelte';
  import DimensionInput from './DimensionInput.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let { element }: { element: ImageElement } = $props();

  function updateElement(updates: Partial<ImageElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<div class="config-section">
  <h3 class="section-title">Image Settings</h3>

  <VisibilityCheckbox
    visible={element.visible}
    onchange={(visible) => updateElement({ visible })}
  />

  {#if element.position === 'absolute'}
    <PositionControls
      x={element.x}
      y={element.y}
      onchange={(updates) => updateElement(updates)}
    />
  {/if}

  <div class="field">
    <label for="image-url">Image URL</label>
    <input
      type="text"
      id="image-url"
      placeholder="https://example.com/image.jpg"
      value={element.imageId}
      oninput={(e) => updateElement({ imageId: e.currentTarget.value })}
    />
  </div>

  <DimensionInput
    label="Width"
    id="width"
    value={element.dimensions?.width?.toString()}
    onchange={(width) => updateElement({
      dimensions: {
        ...element.dimensions,
        width
      }
    })}
  />

  <DimensionInput
    label="Height"
    id="height"
    value={element.dimensions?.height?.toString()}
    onchange={(height) => updateElement({
      dimensions: {
        ...element.dimensions,
        height
      }
    })}
  />

  <div class="field">
    <label for="object-fit">Object Fit</label>
    <select
      id="object-fit"
      value={element.objectFit || 'cover'}
      onchange={(e) => updateElement({ objectFit: e.currentTarget.value as any })}
    >
      <option value="cover">Cover</option>
      <option value="contain">Contain</option>
      <option value="fill">Fill</option>
      <option value="none">None</option>
      <option value="scale-down">Scale Down</option>
    </select>
  </div>

  <div class="field">
    <label for="object-position">Object Position</label>
    <input
      type="text"
      id="object-position"
      placeholder="center, 50% 50%, top left"
      value={element.objectPosition ?? 'center'}
      oninput={(e) => updateElement({ objectPosition: e.currentTarget.value })}
    />
  </div>

  <div class="field">
    <label for="border-radius">Border Radius (px)</label>
    <input
      type="number"
      id="border-radius"
      value={element.borderRadius ?? ''}
      oninput={(e) => updateElement({ borderRadius: parseInt(e.currentTarget.value) || undefined })}
    />
  </div>

  <div class="field">
    <label for="border-width">Border Width (px)</label>
    <input
      type="number"
      id="border-width"
      value={element.border?.width ?? ''}
      oninput={(e) => updateElement({
        border: {
          ...element.border,
          width: parseInt(e.currentTarget.value) || undefined
        }
      })}
    />
  </div>

  <ColorPicker
    label="Border Color"
    id="border-color"
    value={element.border?.color || '#000000'}
    onchange={(color) => updateElement({
      border: {
        ...element.border,
        color
      }
    })}
  />

  <div class="field">
    <label for="border-style">Border Style</label>
    <select
      id="border-style"
      value={element.border?.style || 'solid'}
      onchange={(e) => updateElement({
        border: {
          ...element.border,
          style: e.currentTarget.value as any
        }
      })}
    >
      <option value="solid">Solid</option>
      <option value="dashed">Dashed</option>
      <option value="dotted">Dotted</option>
      <option value="double">Double</option>
      <option value="none">None</option>
    </select>
  </div>
</div>

<style>
  .config-section {
    padding: 1rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #333;
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .field input[type="text"],
  .field input[type="number"],
  .field select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
  }

  .field input[type="text"]:focus,
  .field input[type="number"]:focus,
  .field select:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
