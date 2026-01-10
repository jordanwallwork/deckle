<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    min,
    max,
    step,
    placeholder,
    unit,
    hideLabel = false,
    oninput,
    onchange
  }: {
    label: string;
    id: string;
    value: number | string | undefined;
    min?: number;
    max?: number;
    step?: number | string;
    placeholder?: string;
    unit?: string;
    hideLabel?: boolean;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onchange?: (value: number) => void;
  } = $props();

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    // Call oninput if provided
    if (oninput) {
      oninput(e);
    }

    // Call onchange with the numeric value if provided
    if (onchange) {
      const numValue = parseFloat(e.currentTarget.value);
      if (!isNaN(numValue)) {
        onchange(numValue);
      }
    }
  }
</script>

<FieldWrapper {label} {hideLabel} htmlFor={id}>
  <div class="number-field-container">
    <input
      type="number"
      {id}
      {value}
      {min}
      {max}
      {step}
      {placeholder}
      oninput={handleInput}
    />
    {#if unit}
      <span class="unit">{unit}</span>
    {/if}
  </div>
</FieldWrapper>

<style>
  .number-field-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    flex: 1;
  }

  .unit {
    position: absolute;
    right: 0.75rem;
    font-size: 0.813rem;
    color: #6b7280;
    pointer-events: none;
    user-select: none;
  }

  input[type="number"] {
    padding-right: 2rem;
  }
</style>
