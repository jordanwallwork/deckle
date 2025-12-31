<script lang="ts">
  let {
    id,
    value = "",
    placeholder,
    rows = 3,
    disabled = false,
    onchange,
    oninput,
    class: className = ""
  }: {
    id?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
    class?: string;
  } = $props();
</script>

<textarea
  {id}
  bind:value
  {placeholder}
  {rows}
  {disabled}
  class="textarea-input {className}"
  onchange={(e) => onchange?.(e.currentTarget.value)}
  oninput={(e) => oninput?.(e.currentTarget.value)}
></textarea>

<style>
  .textarea-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: 8px;
    background: var(--color-background, white);
    color: var(--color-text, #333);
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;
  }

  .textarea-input:focus {
    outline: none;
    border-color: var(--color-primary, #0066cc);
  }

  .textarea-input:disabled {
    background-color: #f5f5f5;
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
