<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    name,
    error,
    hint,
    required = false,
    children
  }: {
    label: string;
    name: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: Snippet;
  } = $props();
</script>

<div class="form-field">
  <label for={name}>
    {label}
    {#if required}<span class="required">*</span>{/if}
  </label>
  {@render children()}
  {#if hint && !error}
    <span class="field-hint">{hint}</span>
  {/if}
  {#if error}
    <span class="field-error">{error}</span>
  {/if}
</div>

<style>
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
  }

  .required {
    color: #d32f2f;
    margin-left: 0.25rem;
  }

  .field-hint {
    font-size: 0.8125rem;
    color: var(--color-text-muted, #888);
    margin-top: -0.25rem;
  }

  .field-error {
    font-size: 0.8125rem;
    color: #d32f2f;
    margin-top: -0.25rem;
  }
</style>
