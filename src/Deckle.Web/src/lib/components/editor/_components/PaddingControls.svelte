<script lang="ts">
  type Padding = {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };

  let {
    padding,
    onchange
  }: {
    padding?: Padding;
    onchange: (newPadding: Padding) => void;
  } = $props();
</script>

<div class="field">
  <label class="section-label">Padding:</label>
  <div class="padding-grid">
    <div class="padding-input">
      <label for="padding-top">Top</label>
      <input
        type="number"
        id="padding-top"
        value={padding?.top ?? ''}
        oninput={(e) => onchange({
          ...padding,
          top: parseInt(e.currentTarget.value) || 0
        })}
      />
      <span class="unit">px</span>
    </div>

    <div class="padding-input">
      <label for="padding-right">Right</label>
      <input
        type="number"
        id="padding-right"
        value={padding?.right ?? ''}
        oninput={(e) => onchange({
          ...padding,
          right: parseInt(e.currentTarget.value) || 0
        })}
      />
      <span class="unit">px</span>
    </div>

    <div class="padding-input">
      <label for="padding-bottom">Bottom</label>
      <input
        type="number"
        id="padding-bottom"
        value={padding?.bottom ?? ''}
        oninput={(e) => onchange({
          ...padding,
          bottom: parseInt(e.currentTarget.value) || 0
        })}
      />
      <span class="unit">px</span>
    </div>

    <div class="padding-input">
      <label for="padding-left">Left</label>
      <input
        type="number"
        id="padding-left"
        value={padding?.left ?? ''}
        oninput={(e) => onchange({
          ...padding,
          left: parseInt(e.currentTarget.value) || 0
        })}
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
