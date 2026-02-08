<script lang="ts">
  let {
    id,
    value = $bindable(),
    min,
    max,
    step,
    unit,
    placeholder,
    onchange,
    disabled = false,
    class: className = ''
  }: {
    id?: string;
    value?: number | string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    placeholder?: string;
    onchange?: (value: number) => void;
    disabled?: boolean;
    class?: string;
  } = $props();
</script>

<div class="number-input-wrapper">
  <input
    type="number"
    {id}
    bind:value
    {min}
    {max}
    {step}
    {placeholder}
    {disabled}
    class="number-input {className}"
    oninput={(e) => onchange?.(parseInt(e.currentTarget.value) || 0)}
  />
  {#if unit}
    <span class="unit">{unit}</span>
  {/if}
</div>

<style>
  .number-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .number-input {
    flex: 1;
    min-width: 0;
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

  .number-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .number-input:disabled {
    background-color: #f5f5f5;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .unit {
    font-size: 0.75rem;
    color: #666;
  }
</style>
