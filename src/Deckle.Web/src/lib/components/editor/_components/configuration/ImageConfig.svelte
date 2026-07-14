<script lang="ts">
  import type { BaseElement, ImageElement } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import BaseElementConfig from './BaseElementConfig.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import ObjectPositionGrid from '../config-controls/ObjectPositionGrid.svelte';
  import PlaceholderModal from './PlaceholderModal.svelte';

  let { element }: { element: ImageElement } = $props();

  let showPlaceholderModal = $state(false);

  function updateElement(updates: Partial<ImageElement>) {
    templateStore.updateElement(element.id, updates);
  }

  function handlePlaceholderConfirm(url: string) {
    updateElement({ imageId: url });
    showPlaceholderModal = false;
  }

  function handlePlaceholderClose() {
    showPlaceholderModal = false;
  }
</script>

<BaseElementConfig
  {element}
  updateElement={updateElement as (updates: Partial<BaseElement>) => void}
>
  <div class="image-url-field">
    <div class="field-header">
      <label for="image-url">Image</label>
      <button type="button" class="placeholder-link" onclick={() => (showPlaceholderModal = true)}>
        Use Placeholder
      </button>
    </div>
    <input
      type="text"
      id="image-url"
      placeholder="URL, filename (hero.png), or merge field syntax"
      value={element.imageId}
      oninput={(e) => updateElement({ imageId: e.currentTarget.value })}
    />
    <p class="helper-text">Tip: Use merge field syntax like <code>{'{'}{'{'} ImageUrl {'}'}{'}' }</code> to load from data source</p>
  </div>

  <SelectField
    label="Object Fit"
    id="object-fit"
    value={element.objectFit || 'cover'}
    options={[
      { value: 'cover', label: 'Cover' },
      { value: 'contain', label: 'Contain' },
      { value: 'fill', label: 'Fill' },
      { value: 'none', label: 'None' },
      { value: 'scale-down', label: 'Scale Down' }
    ]}
    onchange={(value) => updateElement({ objectFit: value as any })}
  />

  {#if element.objectFit !== 'fill'}
    <div class="object-position-section">
      <span class="section-label">Object Position</span>
      <ObjectPositionGrid
        value={element.objectPosition ?? 'center center'}
        onchange={(position) => updateElement({ objectPosition: position })}
      />
    </div>
  {/if}
</BaseElementConfig>

<PlaceholderModal
  bind:show={showPlaceholderModal}
  onConfirm={handlePlaceholderConfirm}
  onClose={handlePlaceholderClose}
/>

<style>
  .image-url-field {
    margin-bottom: 1rem;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .field-header label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .placeholder-link {
    background: none;
    border: none;
    color: var(--color-accent-fg);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    font-family: inherit;
  }

  .placeholder-link:hover {
    color: var(--color-accent-fg-hover);
  }

  .image-url-field input[type='text'] {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: inherit;
    box-sizing: border-box;
    height: 2.125rem;
  }

  .image-url-field input[type='text']:focus {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  .helper-text {
    margin: 0.375rem 0 0 0;
    font-size: 0.688rem;
    color: var(--color-text-secondary);
    line-height: 1.2;
  }

  .helper-text code {
    background: var(--color-bg-subtle);
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
    font-size: 0.688rem;
  }

  .object-position-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
