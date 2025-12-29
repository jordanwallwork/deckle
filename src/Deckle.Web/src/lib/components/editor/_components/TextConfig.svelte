<script lang="ts">
  import type { TextElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';

  let { element }: { element: TextElement } = $props();

  function updateElement(updates: Partial<TextElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<div class="config-section">
  <h3 class="section-title">Text Settings</h3>

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

  <div class="field">
    <label for="color">Text Color</label>
    <div class="color-input">
      <input
        type="color"
        id="color"
        value={element.color || '#000000'}
        oninput={(e) => updateElement({ color: e.currentTarget.value })}
      />
      <input
        type="text"
        value={element.color || '#000000'}
        oninput={(e) => updateElement({ color: e.currentTarget.value })}
      />
    </div>
  </div>

  <div class="field">
    <label for="bg-color">Background Color</label>
    <div class="color-input">
      <input
        type="color"
        id="bg-color"
        value={element.backgroundColor || '#ffffff'}
        oninput={(e) => updateElement({ backgroundColor: e.currentTarget.value })}
      />
      <input
        type="text"
        value={element.backgroundColor || '#ffffff'}
        oninput={(e) => updateElement({ backgroundColor: e.currentTarget.value })}
      />
    </div>
  </div>

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

  <div class="field">
    <label class="section-label">Padding:</label>
    <div class="padding-grid">
      <div class="padding-input">
        <label for="padding-top">Top</label>
        <input
          type="number"
          id="padding-top"
          value={element.padding?.top ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              top: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-right">Right</label>
        <input
          type="number"
          id="padding-right"
          value={element.padding?.right ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              right: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-bottom">Bottom</label>
        <input
          type="number"
          id="padding-bottom"
          value={element.padding?.bottom ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              bottom: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-left">Left</label>
        <input
          type="number"
          id="padding-left"
          value={element.padding?.left ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              left: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>
    </div>
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
