<script lang="ts">
  let {
    x = 0,
    y = 0,
    onchange
  }: {
    x?: number;
    y?: number;
    onchange: (updates: { x?: number; y?: number }) => void;
  } = $props();
</script>

<div class="field">
  <label class="section-label">Position:</label>
  <div class="padding-grid">
    <div class="padding-input">
      <label for="position-x">Left</label>
      <input
        type="number"
        id="position-x"
        value={x ?? 0}
        oninput={(e) => onchange({ x: parseInt(e.currentTarget.value) || 0 })}
      />
      <span class="unit">px</span>
    </div>

    <div class="padding-input">
      <label for="position-y">Top</label>
      <input
        type="number"
        id="position-y"
        value={y ?? 0}
        oninput={(e) => onchange({ y: parseInt(e.currentTarget.value) || 0 })}
      />
      <span class="unit">px</span>
    </div>
  </div>
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .padding-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .padding-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .padding-input label {
    font-size: 0.75rem;
    color: #666;
    margin: 0;
    min-width: 40px;
  }

  .padding-input input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
  }

  .padding-input input[type="number"]:focus {
    outline: none;
    border-color: #0066cc;
  }

  .padding-input .unit {
    font-size: 0.75rem;
    color: #666;
  }
</style>
