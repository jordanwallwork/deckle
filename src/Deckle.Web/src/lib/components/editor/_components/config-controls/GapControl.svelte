<script lang="ts">
  let {
    value = 0,
    onchange
  }: {
    value?: number;
    onchange: (gap: number) => void;
  } = $props();
</script>

<div class="gap-control">
  <input
    type="range"
    id="gap"
    min="0"
    max="50"
    {value}
    oninput={(e) => onchange(Number.parseInt(e.currentTarget.value) || 0)}
  />
  <input
    type="number"
    class="gap-number"
    min="0"
    {value}
    oninput={(e) => onchange(Number.parseInt(e.currentTarget.value) || 0)}
  />
  <span class="unit">px</span>
</div>

<style>
  .gap-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gap-control input[type='range'] {
    flex: 1;
    height: 4px;
    background: #d1d5db;
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .gap-control input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #0066cc;
    border-radius: 50%;
    cursor: pointer;
  }

  .gap-control input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #0066cc;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .gap-control .gap-number {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    text-align: center;
    box-sizing: border-box;
  }

  .gap-control .unit {
    font-size: 0.75rem;
    color: #666;
  }
</style>
