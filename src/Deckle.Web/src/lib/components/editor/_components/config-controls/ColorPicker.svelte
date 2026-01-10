<script lang="ts">
  let {
    label,
    id,
    value = '#000000',
    onchange
  }: {
    label: string;
    id: string;
    value?: string;
    onchange: (color: string) => void;
  } = $props();
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="color-input">
    <input
      type="color"
      {id}
      {value}
      oninput={(e) => onchange(e.currentTarget.value)}
    />
    <input
      type="text"
      {value}
      oninput={(e) => onchange(e.currentTarget.value)}
    />
  </div>
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .color-input {
    display: flex;
    gap: 0.5rem;
  }

  .color-input input[type="color"] {
    width: 50px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-input input[type="text"] {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
  }

  .color-input input[type="text"]:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
