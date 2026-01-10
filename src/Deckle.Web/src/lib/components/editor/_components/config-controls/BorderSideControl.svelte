<script lang="ts">
  import type { BorderStyle } from "../../types";
  import { ColorInput, NumberInput } from "$lib/components/forms";

  let {
    label,
    width,
    style,
    color,
    onchange
  }: {
    label: string;
    width?: number;
    style?: BorderStyle;
    color?: string;
    onchange: (updates: { width?: number; style?: BorderStyle; color?: string }) => void;
  } = $props();

  const borderStyleOptions: Array<{ value: BorderStyle; label: string }> = [
    { value: "none", label: "None" },
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" },
    { value: "double", label: "Double" },
  ];
</script>

<div class="border-row">
  <span class="side-label">{label}</span>
  <ColorInput
    value={color ?? "#000000"}
    onchange={(newColor) => onchange({ color: newColor })}
  />
  <NumberInput
    value={width}
    min={0}
    placeholder="0"
    unit="px"
    onchange={(newWidth) => onchange({ width: newWidth })}
  />
  <select
    value={style ?? "solid"}
    onchange={(e) => onchange({ style: e.currentTarget.value as BorderStyle })}
  >
    {#each borderStyleOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .border-row {
    display: grid;
    grid-template-columns: auto 50px 80px 1fr;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .side-label {
    font-size: 0.75rem;
    color: #666;
    min-width: 60px;
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
