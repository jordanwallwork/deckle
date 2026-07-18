<script lang="ts">
  let {
    label,
    id,
    value,
    onchange,
    disabled = false,
    disabledMessage,
    hideLabel = false,
    inline = false
  }: {
    label: string;
    id: string;
    value?: number | string;
    onchange: (newValue: string | undefined) => void;
    disabled?: boolean;
    disabledMessage?: string;
    hideLabel?: boolean;
    inline?: boolean;
  } = $props();

  // Normalize the stored value to a dimension string. Storage convention: a
  // plain number means px; a string already carries its unit (mm/%/px).
  const valueStr = $derived(typeof value === 'number' ? `${value}px` : (value ?? ''));

  // Extract numeric value from the dimension string
  const numericValue = $derived.by(() => {
    if (!valueStr) return '';
    const match = valueStr.match(/^(\d+\.?\d*)/);
    return match ? match[1] : '';
  });

  // Extract unit from the dimension string (default to 'mm')
  const unit = $derived.by(() => {
    if (valueStr.includes('%')) return '%';
    if (valueStr.includes('px')) return 'px';
    return 'mm';
  });

  function handleValueChange(newNumericValue: string) {
    onchange(newNumericValue ? `${newNumericValue}${unit}` : undefined);
  }

  function handleUnitChange(newUnit: string) {
    if (numericValue) {
      onchange(`${numericValue}${newUnit}`);
    }
  }
</script>

<div class="field" class:disabled class:inline>
  {#if !hideLabel}
    <label for={id}>{label}</label>
  {/if}
  <div class="dimension-input">
    <input
      type="number"
      {id}
      placeholder="auto"
      value={numericValue}
      oninput={(e) => handleValueChange(e.currentTarget.value)}
      {disabled}
    />
    <select
      class="unit-select"
      class:disabled-unit={!value}
      value={unit}
      onchange={(e) => handleUnitChange(e.currentTarget.value)}
      {disabled}
    >
      <option value="mm">mm</option>
      <option value="px">px</option>
      <option value="%">%</option>
    </select>
  </div>
  {#if disabled && disabledMessage}
    <span class="disabled-message">{disabledMessage}</span>
  {/if}
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .field.inline {
    margin-bottom: 0;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .dimension-input {
    display: flex;
    align-items: center;
  }

  .dimension-input input[type='number'] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid var(--color-border);
    border-radius: 4px 0 0 4px;
    border-right: none;
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  .dimension-input input[type='number']:focus {
    outline: none;
    border-color: var(--color-accent-fg);
    border-right: none;
    z-index: 1;
  }

  .dimension-input .unit-select {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid var(--color-border);
    border-left: none;
    border-radius: 0 4px 4px 0;
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    box-sizing: border-box;
  }

  .dimension-input .unit-select.disabled-unit {
    opacity: 0.4;
    color: var(--color-text-secondary);
  }

  .dimension-input .unit-select:focus {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  .field.disabled label {
    color: var(--color-text-secondary);
  }

  .field.disabled input,
  .field.disabled select {
    background: var(--color-disabled-bg);
    color: var(--color-text-secondary);
    cursor: not-allowed;
  }

  .disabled-message {
    display: block;
    font-size: 0.688rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
    font-style: italic;
  }
</style>

