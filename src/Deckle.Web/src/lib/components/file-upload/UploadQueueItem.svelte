<script lang="ts">
  import type { QueueItem } from './uploadQueue.svelte';
  import { formatFileSize } from './validation';

  let { item, onremove }: { item: QueueItem; onremove?: () => void } = $props();

  const STATUS_LABELS: Record<QueueItem['status'], string> = {
    pending: 'Ready',
    uploading: 'Uploading',
    done: 'Uploaded',
    error: 'Failed',
    invalid: 'Skipped'
  };

  let removable = $derived(item.status === 'pending' || item.status === 'invalid');
</script>

<li class="queue-item" data-status={item.status}>
  <div class="item-main">
    <div class="item-text">
      <p class="item-name" title={item.file.name}>{item.file.name}</p>
      <p class="item-size">{formatFileSize(item.file.size)}</p>
    </div>
    <span class="item-status">
      {item.status === 'uploading' ? `${item.progress}%` : STATUS_LABELS[item.status]}
    </span>
    {#if removable && onremove}
      <button
        type="button"
        class="remove-button"
        onclick={onremove}
        aria-label="Remove {item.file.name}">&times;</button
      >
    {/if}
  </div>

  {#if item.status === 'uploading'}
    <div class="progress-bar">
      <div class="progress-fill" style="width: {item.progress}%"></div>
    </div>
  {/if}

  {#if item.error}
    <p class="item-error">{item.error}</p>
  {/if}
</li>

<style>
  .queue-item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .item-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .item-text {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .item-name {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-size {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .item-status {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  [data-status='done'] .item-status {
    color: var(--color-secondary-fg);
  }

  [data-status='error'] .item-status,
  [data-status='invalid'] .item-status {
    color: var(--color-danger-fg);
  }

  .remove-button {
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 0 0.25rem;
    border-radius: var(--radius-xs);
  }

  .remove-button:hover {
    color: var(--color-text);
  }

  .progress-bar {
    width: 100%;
    height: 0.375rem;
    background-color: var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--color-muted-teal);
    transition: width 0.3s ease;
  }

  .item-error {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-danger-fg);
    text-align: left;
  }
</style>
