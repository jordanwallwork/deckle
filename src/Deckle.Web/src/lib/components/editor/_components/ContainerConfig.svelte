<script lang="ts">
  import type { ContainerElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';

  let { element }: { element: ContainerElement } = $props();

  function updateElement(updates: Partial<ContainerElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<div class="config-section">
  <h3 class="section-title">Container Settings</h3>

  <div class="field">
    <label for="display">Display</label>
    <select
      id="display"
      value={element.display || 'flex'}
      onchange={(e) => updateElement({ display: e.currentTarget.value as 'flex' | 'block' })}
    >
      <option value="flex">Flex</option>
      <option value="block">Block</option>
    </select>
  </div>

  {#if element.display === 'flex'}
    <div class="field">
      <label for="flex-direction">Flex Direction</label>
      <select
        id="flex-direction"
        value={element.flexConfig?.direction || 'row'}
        onchange={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            direction: e.currentTarget.value as any
          }
        })}
      >
        <option value="row">Row</option>
        <option value="column">Column</option>
        <option value="row-reverse">Row Reverse</option>
        <option value="column-reverse">Column Reverse</option>
      </select>
    </div>

    <div class="field">
      <label for="justify-content">Justify Content</label>
      <select
        id="justify-content"
        value={element.flexConfig?.justifyContent || 'flex-start'}
        onchange={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            justifyContent: e.currentTarget.value as any
          }
        })}
      >
        <option value="flex-start">Flex Start</option>
        <option value="flex-end">Flex End</option>
        <option value="center">Center</option>
        <option value="space-between">Space Between</option>
        <option value="space-around">Space Around</option>
        <option value="space-evenly">Space Evenly</option>
      </select>
    </div>

    <div class="field">
      <label for="align-items">Align Items</label>
      <select
        id="align-items"
        value={element.flexConfig?.alignItems || 'flex-start'}
        onchange={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            alignItems: e.currentTarget.value as any
          }
        })}
      >
        <option value="flex-start">Flex Start</option>
        <option value="flex-end">Flex End</option>
        <option value="center">Center</option>
        <option value="stretch">Stretch</option>
        <option value="baseline">Baseline</option>
      </select>
    </div>

    <div class="field">
      <label for="gap">Gap (px)</label>
      <input
        type="number"
        id="gap"
        value={element.flexConfig?.gap || 0}
        oninput={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            gap: parseInt(e.currentTarget.value) || 0
          }
        })}
      />
    </div>
  {/if}

  <div class="field">
    <label for="bg-color">Background Color</label>
    <div class="color-input">
      <input
        type="color"
        id="bg-color"
        value={element.background?.color || '#ffffff'}
        oninput={(e) => updateElement({
          background: {
            ...element.background,
            color: e.currentTarget.value
          }
        })}
      />
      <input
        type="text"
        value={element.background?.color || '#ffffff'}
        oninput={(e) => updateElement({
          background: {
            ...element.background,
            color: e.currentTarget.value
          }
        })}
      />
    </div>
  </div>

  <div class="field">
    <label for="padding">Padding (px)</label>
    <input
      type="number"
      id="padding"
      placeholder="All sides"
      value={element.padding?.top ?? ''}
      oninput={(e) => {
        const val = parseInt(e.currentTarget.value) || 0;
        updateElement({
          padding: { top: val, right: val, bottom: val, left: val }
        });
      }}
    />
  </div>

  <div class="field">
    <label for="width">Width</label>
    <input
      type="text"
      id="width"
      placeholder="auto, 100px, 50%"
      value={element.dimensions?.width ?? ''}
      oninput={(e) => updateElement({
        dimensions: {
          ...element.dimensions,
          width: e.currentTarget.value || undefined
        }
      })}
    />
  </div>

  <div class="field">
    <label for="height">Height</label>
    <input
      type="text"
      id="height"
      placeholder="auto, 100px, 50%"
      value={element.dimensions?.height ?? ''}
      oninput={(e) => updateElement({
        dimensions: {
          ...element.dimensions,
          height: e.currentTarget.value || undefined
        }
      })}
    />
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
</style>
