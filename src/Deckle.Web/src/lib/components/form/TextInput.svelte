<script lang="ts">
  let {
    id,
    type = "text",
    value = "",
    placeholder,
    disabled = false,
    onchange,
    oninput,
    class: className = ""
  }: {
    id?: string;
    type?: "text" | "email" | "url" | "password";
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
    class?: string;
  } = $props();
</script>

<input
  {type}
  {id}
  bind:value
  {placeholder}
  {disabled}
  class="text-input {className}"
  onchange={(e) => onchange?.(e.currentTarget.value)}
  oninput={(e) => oninput?.(e.currentTarget.value)}
/>

<style>
  .text-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: 8px;
    background: var(--color-background, white);
    color: var(--color-text, #333);
    font-family: inherit;
    box-sizing: border-box;
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary, #0066cc);
  }

  .text-input:disabled {
    background-color: #f5f5f5;
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
