<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'default',
    size = 'md',
    shape = 'pill',
    position = 'static',
    top,
    right,
    children
  }: {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    shape?: 'pill' | 'circle';
    position?: 'static' | 'absolute';
    top?: string;
    right?: string;
    children: Snippet;
  } = $props();
</script>

<span
  class="badge"
  class:default={variant === 'default'}
  class:primary={variant === 'primary'}
  class:success={variant === 'success'}
  class:warning={variant === 'warning'}
  class:danger={variant === 'danger'}
  class:info={variant === 'info'}
  class:sm={size === 'sm'}
  class:md={size === 'md'}
  class:pill={shape === 'pill'}
  class:circle={shape === 'circle'}
  style:position={position}
  style:top={position === 'absolute' ? top : undefined}
  style:right={position === 'absolute' ? right : undefined}
>
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* Size variants */
  .badge.sm {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
  }

  .badge.md {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  /* Shape variants */
  .badge.pill {
    border-radius: 12px;
  }

  .badge.circle {
    border-radius: 50%;
    width: 20px;
    height: 20px;
    padding: 0;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* Color variants - Default (Sage) */
  .badge.default {
    background-color: rgba(120, 160, 131, 0.1);
    color: var(--color-sage);
  }

  /* Primary (Muted Teal) */
  .badge.primary {
    background-color: rgba(80, 114, 123, 0.1);
    color: var(--color-muted-teal);
  }

  /* Success (Green) */
  .badge.success {
    background-color: rgba(46, 213, 115, 0.1);
    color: #2ed573;
  }

  /* Warning (Orange) */
  .badge.warning {
    background-color: rgba(255, 177, 66, 0.1);
    color: #ffb142;
  }

  /* Danger (Red) */
  .badge.danger {
    background-color: rgba(255, 71, 87, 0.1);
    color: #ff4757;
  }

  /* Info (Blue) */
  .badge.info {
    background-color: rgba(52, 152, 219, 0.1);
    color: #3498db;
  }
</style>
