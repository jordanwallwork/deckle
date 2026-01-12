<script lang="ts">
  import type { UserStorageQuota } from '$lib/types';

  let { quota }: { quota: UserStorageQuota } = $props();

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  const usedMb = $derived(quota.usedBytes / (1024 * 1024));
  const availableMb = $derived(quota.availableBytes / (1024 * 1024));
  const percentage = $derived(Math.min(100, Math.round(quota.usedPercentage)));

  const barColor = $derived(
    percentage >= 95 ? 'critical' : percentage >= 80 ? 'warning' : 'normal'
  );

  const showWarning = $derived(percentage >= 90);
</script>

<div class="storage-quota">
  <div class="quota-header">
    <h3 class="quota-title">Storage Usage</h3>
    <span
      class="quota-percentage"
      class:critical={percentage >= 95}
      class:warning={percentage >= 80}
    >
      {percentage}%
    </span>
  </div>

  <div class="quota-bar">
    <div class="quota-fill {barColor}" style="width: {percentage}%"></div>
  </div>

  <div class="quota-details">
    <p class="quota-used">
      <span class="label">Used:</span>
      <span class="value">{usedMb.toFixed(2)} MB</span>
    </p>
    <p class="quota-available">
      <span class="label">Available:</span>
      <span class="value">{availableMb.toFixed(2)} MB</span>
    </p>
    <p class="quota-total">
      <span class="label">Total:</span>
      <span class="value">{quota.quotaMb} MB</span>
    </p>
  </div>

  {#if showWarning}
    <div class="quota-warning">
      <svg
        class="warning-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p class="warning-text">
        {#if percentage >= 95}
          Your storage is almost full. Delete some files to free up space.
        {:else}
          You're running low on storage space. Consider deleting unused files.
        {/if}
      </p>
    </div>
  {/if}
</div>

<style>
  .storage-quota {
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .quota-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .quota-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .quota-percentage {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-muted-teal);
  }

  .quota-percentage.warning {
    color: #f39c12;
  }

  .quota-percentage.critical {
    color: #e74c3c;
  }

  .quota-bar {
    width: 100%;
    height: 1.5rem;
    background-color: var(--color-background);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
  }

  .quota-fill {
    height: 100%;
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
    border-radius: var(--radius-md);
  }

  .quota-fill.normal {
    background: linear-gradient(90deg, var(--color-muted-teal), var(--color-sage));
  }

  .quota-fill.warning {
    background: linear-gradient(90deg, #f39c12, #e67e22);
  }

  .quota-fill.critical {
    background: linear-gradient(90deg, #e74c3c, #c0392b);
  }

  .quota-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 0;
  }

  .quota-details p {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .quota-details .label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .quota-details .value {
    font-size: 1rem;
    color: var(--color-text);
    font-weight: 600;
  }

  .quota-warning {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background-color: rgba(243, 156, 18, 0.1);
    border: 1px solid #f39c12;
    border-radius: var(--radius-md);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .quota-percentage.critical + .quota-bar .quota-fill.critical ~ .quota-warning {
    background-color: rgba(231, 76, 60, 0.1);
    border-color: #e74c3c;
  }

  .warning-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    color: #f39c12;
    margin-top: 0.125rem;
  }

  .warning-text {
    margin: 0;
    font-size: 0.875rem;
    color: #f39c12;
    line-height: 1.5;
  }

  /* Adjust warning color for critical state */
  .quota-percentage.critical ~ .quota-warning .warning-icon,
  .quota-percentage.critical ~ .quota-warning .warning-text {
    color: #e74c3c;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .quota-details {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .quota-details p {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }
</style>
