<script lang="ts">
  import type { ImageElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';

  let { element }: { element: ImageElement } = $props();

  function updateElement(updates: Partial<ImageElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<div class="config-section">
  <h3 class="section-title">Image Settings</h3>

  <div class="field checkbox-field">
    <label>
      <input
        type="checkbox"
        checked={element.visible !== false}
        onchange={(e) => updateElement({ visible: e.currentTarget.checked })}
      />
      <span>Visible</span>
    </label>
  </div>

  {#if element.position === 'absolute'}
    <div class="field">
      <label class="section-label">Position:</label>
      <div class="padding-grid">
        <div class="padding-input">
          <label for="position-x">Left</label>
          <input
            type="number"
            id="position-x"
            value={element.x ?? 0}
            oninput={(e) => updateElement({ x: parseInt(e.currentTarget.value) || 0 })}
          />
          <span class="unit">px</span>
        </div>

        <div class="padding-input">
          <label for="position-y">Top</label>
          <input
            type="number"
            id="position-y"
            value={element.y ?? 0}
            oninput={(e) => updateElement({ y: parseInt(e.currentTarget.value) || 0 })}
          />
          <span class="unit">px</span>
        </div>
      </div>
    </div>
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

  <div class="field">
    <label for="width">Width</label>
    <div class="dimension-input">
      <input
        type="number"
        id="width"
        placeholder="auto"
        value={(() => {
          const width = String(element.dimensions?.width ?? '');
          if (!width) return '';
          const match = width.match(/^(\d+\.?\d*)/);
          return match ? match[1] : '';
        })()}
        oninput={(e) => {
          const value = e.currentTarget.value;
          const unit = (() => {
            const width = String(element.dimensions?.width ?? '');
            if (width.includes('%')) return '%';
            return 'px';
          })();
          updateElement({
            dimensions: {
              ...element.dimensions,
              width: value ? `${value}${unit}` : undefined
            }
          });
        }}
      />
      <select
        class="unit-select"
        class:disabled-unit={!element.dimensions?.width}
        value={(() => {
          const width = String(element.dimensions?.width ?? '');
          if (width.includes('%')) return '%';
          return 'px';
        })()}
        onchange={(e) => {
          const width = String(element.dimensions?.width ?? '');
          const match = width.match(/^(\d+\.?\d*)/);
          const value = match ? match[1] : '';
          if (value) {
            updateElement({
              dimensions: {
                ...element.dimensions,
                width: `${value}${e.currentTarget.value}`
              }
            });
          }
        }}
      >
        <option value="px">px</option>
        <option value="%">%</option>
      </select>
    </div>
  </div>

  <div class="field">
    <label for="height">Height</label>
    <div class="dimension-input">
      <input
        type="number"
        id="height"
        placeholder="auto"
        value={(() => {
          const height = String(element.dimensions?.height ?? '');
          if (!height) return '';
          const match = height.match(/^(\d+\.?\d*)/);
          return match ? match[1] : '';
        })()}
        oninput={(e) => {
          const value = e.currentTarget.value;
          const unit = (() => {
            const height = String(element.dimensions?.height ?? '');
            if (height.includes('%')) return '%';
            return 'px';
          })();
          updateElement({
            dimensions: {
              ...element.dimensions,
              height: value ? `${value}${unit}` : undefined
            }
          });
        }}
      />
      <select
        class="unit-select"
        class:disabled-unit={!element.dimensions?.height}
        value={(() => {
          const height = String(element.dimensions?.height ?? '');
          if (height.includes('%')) return '%';
          return 'px';
        })()}
        onchange={(e) => {
          const height = String(element.dimensions?.height ?? '');
          const match = height.match(/^(\d+\.?\d*)/);
          const value = match ? match[1] : '';
          if (value) {
            updateElement({
              dimensions: {
                ...element.dimensions,
                height: `${value}${e.currentTarget.value}`
              }
            });
          }
        }}
      >
        <option value="px">px</option>
        <option value="%">%</option>
      </select>
    </div>
  </div>

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

  <div class="field">
    <label for="border-color">Border Color</label>
    <div class="color-input">
      <input
        type="color"
        id="border-color"
        value={element.border?.color || '#000000'}
        oninput={(e) => updateElement({
          border: {
            ...element.border,
            color: e.currentTarget.value
          }
        })}
      />
      <input
        type="text"
        value={element.border?.color || '#000000'}
        oninput={(e) => updateElement({
          border: {
            ...element.border,
            color: e.currentTarget.value
          }
        })}
      />
    </div>
  </div>

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

  .checkbox-field label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-field input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .checkbox-field span {
    font-size: 0.813rem;
    color: #333;
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

  .color-input {
    display: flex;
    gap: 0.5rem;
  }

  .color-input input[type="color"] {
    width: 50px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-input input[type="text"] {
    flex: 1;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .padding-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .padding-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .padding-input label {
    font-size: 0.75rem;
    color: #666;
    margin: 0;
    min-width: 40px;
  }

  .padding-input input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
  }

  .padding-input .unit {
    font-size: 0.75rem;
    color: #666;
  }

  .dimension-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .dimension-input input[type="number"] {
    flex: 1;
    min-width: 0;
  }

  .dimension-input .unit-select {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .dimension-input .unit-select.disabled-unit {
    opacity: 0.4;
    color: #999;
  }

  .dimension-input .unit-select:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
