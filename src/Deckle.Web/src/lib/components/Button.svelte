<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    onclick,
    icon,
    children,
    class: className = ''
  }: {
    variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'icon';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    icon?: Snippet;
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="btn {variant} {size} {className}"
  class:primary={variant === 'primary'}
  class:secondary={variant === 'secondary'}
  class:danger={variant === 'danger'}
  class:text={variant === 'text'}
  class:icon={variant === 'icon'}
  class:sm={size === 'sm'}
  class:md={size === 'md'}
  class:lg={size === 'lg'}
>
  {#if icon}
    <span class="btn-icon">
      {@render icon()}
    </span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: none;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  /* Size variants */
  .btn.sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    border-radius: 6px;
  }

  .btn.md {
    padding: 0.625rem 1.25rem;
    font-size: 0.9375rem;
    border-radius: 8px;
  }

  .btn.lg {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
  }

  /* Primary variant */
  .btn.primary {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .btn.primary:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Secondary variant */
  .btn.secondary {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .btn.secondary:hover:not(:disabled) {
    background-color: var(--color-muted-teal);
    color: white;
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .btn.secondary:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Danger variant */
  .btn.danger {
    background-color: #e74c3c;
    color: white;
  }

  .btn.danger:hover:not(:disabled) {
    background-color: #c0392b;
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .btn.danger:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Text variant */
  .btn.text {
    background: none;
    color: var(--color-muted-teal);
    padding: 0.5rem 0;
    font-weight: 500;
  }

  .btn.text:hover:not(:disabled) {
    color: var(--color-sage);
  }

  /* Icon variant */
  .btn.icon {
    background: none;
    padding: 0.25rem;
    border-radius: 4px;
    color: inherit;
  }

  .btn.icon:hover:not(:disabled) {
    background-color: rgba(120, 160, 131, 0.1);
  }

  /* Disabled state */
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary:disabled:hover {
    background-color: var(--color-muted-teal);
    transform: none;
    box-shadow: none;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
