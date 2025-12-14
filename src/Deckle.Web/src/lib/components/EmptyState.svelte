<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  let {
    title,
    subtitle,
    icon,
    actionText,
    actionOnClick,
    actionHref,
    border = true,
    padding = 'md'
  }: {
    title: string;
    subtitle?: string;
    icon?: Snippet;
    actionText?: string;
    actionOnClick?: () => void;
    actionHref?: string;
    border?: boolean;
    padding?: 'sm' | 'md' | 'lg';
  } = $props();
</script>

<div
  class="empty-state"
  class:bordered={border}
  class:sm={padding === 'sm'}
  class:md={padding === 'md'}
  class:lg={padding === 'lg'}
>
  {#if icon}
    <div class="empty-state-icon">
      {@render icon()}
    </div>
  {/if}

  <p class="empty-state-title">{title}</p>

  {#if subtitle}
    <p class="empty-state-subtitle">{subtitle}</p>
  {/if}

  {#if actionText}
    {#if actionHref}
      <a href={actionHref} style="text-decoration: none;">
        <Button variant="primary">{actionText}</Button>
      </a>
    {:else if actionOnClick}
      <Button variant="primary" onclick={actionOnClick}>
        {actionText}
      </Button>
    {/if}
  {/if}
</div>

<style>
  .empty-state {
    background: white;
    text-align: center;
  }

  .empty-state.bordered {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }

  .empty-state.sm {
    padding: 2rem;
  }

  .empty-state.md {
    padding: 3rem 2rem;
  }

  .empty-state.lg {
    padding: 4rem 2rem;
  }

  .empty-state-icon {
    width: 48px;
    height: 48px;
    color: var(--color-muted-teal);
    margin: 0 auto 1rem;
    opacity: 0.5;
  }

  .empty-state-icon :global(svg) {
    width: 100%;
    height: 100%;
  }

  .empty-state-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-state-subtitle {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }
</style>
