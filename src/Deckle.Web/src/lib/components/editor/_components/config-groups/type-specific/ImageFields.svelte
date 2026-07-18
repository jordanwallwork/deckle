<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import type { ImageElement } from '../../../types';
  import SelectField from '../../config-controls/SelectField.svelte';
  import ObjectPositionGrid from '../../config-controls/ObjectPositionGrid.svelte';
  import PlaceholderModal from '../../configuration/PlaceholderModal.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0] as ImageElement);
  let showPlaceholderModal = $state(false);
</script>

<div class="image-fields">
  <div class="field">
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
      value={el.imageId}
      oninput={(e) => update({ imageId: e.currentTarget.value }, `${el.id}:imageId`)}
    />
  </div>

  <SelectField
    label="Object Fit"
    id="object-fit"
    value={el.objectFit || 'cover'}
    options={[
      { value: 'cover', label: 'Cover' },
      { value: 'contain', label: 'Contain' },
      { value: 'fill', label: 'Fill' },
      { value: 'none', label: 'None' },
      { value: 'scale-down', label: 'Scale Down' }
    ]}
    onchange={(v) => update({ objectFit: v as ImageElement['objectFit'] })}
  />

  {#if el.objectFit !== 'fill'}
    <div class="object-position-section">
      <span class="section-label">Object Position</span>
      <ObjectPositionGrid
        value={el.objectPosition ?? 'center center'}
        onchange={(position) => update({ objectPosition: position })}
      />
    </div>
  {/if}
</div>

<PlaceholderModal
  bind:show={showPlaceholderModal}
  onConfirm={(url: string) => {
    update({ imageId: url });
    showPlaceholderModal = false;
  }}
  onClose={() => (showPlaceholderModal = false)}
/>

<style>
  .image-fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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

  .field input[type='text'] {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  .field input[type='text']:focus {
    outline: none;
    border-color: var(--color-accent-fg);
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
  }
</style>
