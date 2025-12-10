<script lang="ts">
  let {
    value = $bindable(),
    id,
    placeholder,
    disabled = false,
    required = false,
    rows = 3,
    error = false,
  }: {
    value: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    rows?: number;
    error?: boolean;
  } = $props();
</script>

<textarea
  bind:value
  {id}
  {placeholder}
  {disabled}
  {required}
  {rows}
  class:error
></textarea>

<style>
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  textarea:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.6;
  }

  textarea.error {
    border-color: #d32f2f;
  }

  textarea.error:focus {
    border-color: #d32f2f;
  }
</style>
