<script lang="ts">
  let {
    value = $bindable(),
    type = 'text',
    id,
    placeholder,
    disabled = false,
    required = false,
    autofocus = false,
    error = false,
  }: {
    value: string;
    type?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    autofocus?: boolean;
    error?: boolean;
  } = $props();
</script>

<input
  bind:value
  {type}
  {id}
  {placeholder}
  {disabled}
  {required}
  {autofocus}
  class:error
/>

<style>
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.6;
  }

  input.error {
    border-color: #d32f2f;
  }

  input.error:focus {
    border-color: #d32f2f;
  }
</style>
