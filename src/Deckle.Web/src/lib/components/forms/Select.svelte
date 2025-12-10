<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    value = $bindable(),
    id,
    disabled = false,
    required = false,
    error = false,
    children
  }: {
    value: string;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    children: Snippet;
  } = $props();
</script>

<select
  bind:value
  {id}
  {disabled}
  {required}
  class:error
>
  {@render children()}
</select>

<style>
  select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    background-color: white;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  select:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.6;
  }

  select.error {
    border-color: #d32f2f;
  }

  select.error:focus {
    border-color: #d32f2f;
  }
</style>
