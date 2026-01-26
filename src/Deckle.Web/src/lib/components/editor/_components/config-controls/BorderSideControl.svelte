<script lang="ts">
  import type { BorderStyle } from '../../types';
  import { ColorInput } from '$lib/components/forms';
  import DimensionInput from './DimensionInput.svelte';

  let {
    label,
    width,
    style,
    color,
    onUpdate
  }: {
    label: string;
    width?: number | string;
    style?: BorderStyle;
    color?: string;
    onUpdate: (updates: { width?: number | string; style?: BorderStyle; color?: string }) => void;
  } = $props();

  // Convert width to string format for DimensionInput
  const widthString = $derived(() => {
    if (width === undefined) return undefined;
    if (typeof width === 'string') return width;
    return `${width}px`;
  });

  const borderStyleOptions: Array<{ value: BorderStyle; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' }
  ];

  const effectiveStyle = $derived(style ?? 'solid');
  const isNone = $derived(effectiveStyle === 'none');
</script>

<div class="border-row" class:is-none={isNone}>
  <span class="side-label">{label}</span>
  <select
    value={effectiveStyle}
    onchange={(e) => onUpdate({ style: e.currentTarget.value as BorderStyle })}
  >
    {#each borderStyleOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if !isNone}
    <DimensionInput
      label="Width"
      id="border-width-{label.toLowerCase()}"
      value={widthString()}
      onchange={(newWidth) => onUpdate({ width: newWidth })}
      hideLabel
      inline
    />
    <ColorInput value={color ?? '#000000'} onchange={(newColor) => onUpdate({ color: newColor })} />
  {/if}
</div>

<style>
  .border-row {
    display: grid;
    grid-template-columns: 60px 1fr 120px 50px;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .border-row.is-none {
    grid-template-columns: 60px 1fr;
  }

  .side-label {
    font-size: 0.75rem;
    color: #666;
  }

  select {
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
    font-family: inherit;
  }

  select:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
