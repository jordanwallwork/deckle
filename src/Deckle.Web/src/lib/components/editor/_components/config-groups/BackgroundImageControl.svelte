<script lang="ts">
  import type { Background } from '../../types';
  import SelectField from '../config-controls/SelectField.svelte';

  /**
   * Background image editor (ADR-0001 D3, stories 9 & 10). Source accepts a URL,
   * an uploaded filename, or merge-field syntax — mirroring how image elements
   * take a source. Size / repeat / position expose the CSS background controls.
   */
  let {
    image,
    onchange
  }: {
    image: Background['image'] | undefined;
    onchange: (image: Background['image'] | undefined) => void;
  } = $props();

  function setSource(imageId: string) {
    if (!imageId) {
      onchange(undefined);
      return;
    }
    onchange({ ...image, imageId });
  }

  function patch(updates: Partial<NonNullable<Background['image']>>) {
    if (!image) return;
    onchange({ ...image, ...updates });
  }
</script>

<div class="bg-image">
  <div class="field">
    <label for="bg-image-src">Image source</label>
    <input
      type="text"
      id="bg-image-src"
      placeholder={'URL, filename, or {{ MergeField }}'}
      value={image?.imageId ?? ''}
      oninput={(e) => setSource(e.currentTarget.value)}
    />
  </div>

  {#if image}
    <SelectField
      label="Size"
      id="bg-image-size"
      value={(image.size as string) ?? 'auto'}
      options={[
        { value: 'auto', label: 'Auto' },
        { value: 'cover', label: 'Cover' },
        { value: 'contain', label: 'Contain' }
      ]}
      onchange={(v) => patch({ size: v })}
    />

    <SelectField
      label="Repeat"
      id="bg-image-repeat"
      value={image.repeat ?? 'no-repeat'}
      options={[
        { value: 'no-repeat', label: 'No repeat' },
        { value: 'repeat', label: 'Repeat' },
        { value: 'repeat-x', label: 'Repeat X' },
        { value: 'repeat-y', label: 'Repeat Y' },
        { value: 'space', label: 'Space' },
        { value: 'round', label: 'Round' }
      ]}
      onchange={(v) => patch({ repeat: v as NonNullable<Background['image']>['repeat'] })}
    />

    <SelectField
      label="Position"
      id="bg-image-position"
      value={(image.position as string) ?? 'center'}
      options={[
        { value: 'center', label: 'Center' },
        { value: 'top', label: 'Top' },
        { value: 'bottom', label: 'Bottom' },
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' }
      ]}
      onchange={(v) => patch({ position: v })}
    />
  {/if}
</div>

<style>
  .bg-image {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field {
    margin-bottom: 0.25rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
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
</style>
