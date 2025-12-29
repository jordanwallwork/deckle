<script lang="ts">
  import type { TextElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';
  import VisibilityCheckbox from './VisibilityCheckbox.svelte';
  import PositionControls from './PositionControls.svelte';
  import DimensionInput from './DimensionInput.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import PaddingControls from './PaddingControls.svelte';

  let { element }: { element: TextElement } = $props();

  function updateElement(updates: Partial<TextElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<div class="config-section">
  <h3 class="section-title">Text Settings</h3>

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
    <label for="content">Content</label>
    <textarea
      id="content"
      rows="3"
      value={element.content}
      oninput={(e) => updateElement({ content: e.currentTarget.value })}
    ></textarea>
  </div>

  <div class="field">
    <label for="font-size">Font Size (px)</label>
    <input
      type="number"
      id="font-size"
      value={element.fontSize || 16}
      oninput={(e) => updateElement({ fontSize: parseInt(e.currentTarget.value) || 16 })}
    />
  </div>

  <div class="field">
    <label for="font-weight">Font Weight</label>
    <select
      id="font-weight"
      value={element.fontWeight?.toString() || 'normal'}
      onchange={(e) => {
        const val = e.currentTarget.value;
        updateElement({ fontWeight: isNaN(Number(val)) ? val as any : parseInt(val) });
      }}
    >
      <option value="normal">Normal</option>
      <option value="bold">Bold</option>
      <option value="300">Light (300)</option>
      <option value="400">Regular (400)</option>
      <option value="500">Medium (500)</option>
      <option value="600">Semi-Bold (600)</option>
      <option value="700">Bold (700)</option>
      <option value="800">Extra-Bold (800)</option>
    </select>
  </div>

  <div class="field">
    <label for="text-align">Text Align</label>
    <select
      id="text-align"
      value={element.textAlign || 'left'}
      onchange={(e) => updateElement({ textAlign: e.currentTarget.value as any })}
    >
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
      <option value="justify">Justify</option>
    </select>
  </div>

  <ColorPicker
    label="Text Color"
    id="color"
    value={element.color || '#000000'}
    onchange={(color) => updateElement({ color })}
  />

  <ColorPicker
    label="Background Color"
    id="bg-color"
    value={element.backgroundColor || '#ffffff'}
    onchange={(backgroundColor) => updateElement({ backgroundColor })}
  />

  <div class="field">
    <label for="line-height">Line Height</label>
    <input
      type="text"
      id="line-height"
      placeholder="1.5 or 24px"
      value={element.lineHeight ?? ''}
      oninput={(e) => {
        const val = e.currentTarget.value;
        updateElement({ lineHeight: isNaN(Number(val)) ? val : parseFloat(val) });
      }}
    />
  </div>

  <div class="field">
    <label for="letter-spacing">Letter Spacing (px)</label>
    <input
      type="number"
      id="letter-spacing"
      step="0.1"
      value={element.letterSpacing ?? ''}
      oninput={(e) => updateElement({ letterSpacing: parseFloat(e.currentTarget.value) || undefined })}
    />
  </div>

  <div class="field">
    <label for="text-decoration">Text Decoration</label>
    <select
      id="text-decoration"
      value={element.textDecoration || 'none'}
      onchange={(e) => updateElement({ textDecoration: e.currentTarget.value as any })}
    >
      <option value="none">None</option>
      <option value="underline">Underline</option>
      <option value="overline">Overline</option>
      <option value="line-through">Line Through</option>
    </select>
  </div>

  <div class="field">
    <label for="text-transform">Text Transform</label>
    <select
      id="text-transform"
      value={element.textTransform || 'none'}
      onchange={(e) => updateElement({ textTransform: e.currentTarget.value as any })}
    >
      <option value="none">None</option>
      <option value="uppercase">Uppercase</option>
      <option value="lowercase">Lowercase</option>
      <option value="capitalize">Capitalize</option>
    </select>
  </div>

  <PaddingControls
    padding={element.padding}
    onchange={(padding) => updateElement({ padding })}
  />

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
  .field select,
  .field textarea {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    font-family: inherit;
  }

  .field textarea {
    resize: vertical;
  }

  .field input[type="text"]:focus,
  .field input[type="number"]:focus,
  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
