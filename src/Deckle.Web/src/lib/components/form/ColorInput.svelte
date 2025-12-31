<script lang="ts">
  let {
    id,
    value = "#000000",
    onchange,
    disabled = false,
    class: className = ""
  }: {
    id?: string;
    value?: string;
    onchange?: (color: string) => void;
    disabled?: boolean;
    class?: string;
  } = $props();
</script>

<input
  type="color"
  {id}
  {value}
  {disabled}
  class="color-input {className}"
  oninput={(e) => onchange?.(e.currentTarget.value)}
/>

<style>
  .color-input {
    width: 50px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
