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
    value?: string;
    onchange: (newValue: string | undefined) => void;
    disabled?: boolean;
    disabledMessage?: string;
    hideLabel?: boolean;
    inline?: boolean;
  } = $props();

  // Extract numeric value from dimension string
  const numericValue = $derived(() => {
    const dimStr = String(value ?? '');
    if (!dimStr) return '';
    const match = dimStr.match(/^(\d+\.?\d*)/);
    return match ? match[1] : '';
  });

  // Extract unit from dimension string (default to 'mm')
  const unit = $derived(() => {
    const dimStr = String(value ?? '');
    if (dimStr.includes('%')) return '%';
    if (dimStr.includes('px')) return 'px';
    return 'mm';
  });

  function handleValueChange(newNumericValue: string) {
    const currentUnit = unit();
    onchange(newNumericValue ? `${newNumericValue}${currentUnit}` : undefined);
  }

  function handleUnitChange(newUnit: string) {
    const numeric = numericValue();
    if (numeric) {
      onchange(`${numeric}${newUnit}`);
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
      value={numericValue()}
      oninput={(e) => handleValueChange(e.currentTarget.value)}
      {disabled}
    />
    <select
      class="unit-select"
      class:disabled-unit={!value}
      value={unit()}
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
    color: #666;
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
    border: 1px solid #d1d5db;
    border-radius: 4px 0 0 4px;
    border-right: none;
    background: white;
    box-sizing: border-box;
  }

  .dimension-input input[type='number']:focus {
    outline: none;
    border-color: #0066cc;
    border-right: none;
    z-index: 1;
  }

  .dimension-input .unit-select {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 0 4px 4px 0;
    background: white;
    cursor: pointer;
    box-sizing: border-box;
  }

  .dimension-input .unit-select.disabled-unit {
    opacity: 0.4;
    color: #999;
  }

  .dimension-input .unit-select:focus {
    outline: none;
    border-color: #0066cc;
  }

  .field.disabled label {
    color: #999;
  }

  .field.disabled input,
  .field.disabled select {
    background: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }

  .disabled-message {
    display: block;
    font-size: 0.688rem;
    color: #888;
    margin-top: 0.25rem;
    font-style: italic;
  }
</style>
