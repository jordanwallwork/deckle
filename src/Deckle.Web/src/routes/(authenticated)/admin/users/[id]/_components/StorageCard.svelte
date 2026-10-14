<script lang="ts">
  import type { AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Button } from '$lib/components';
  import { formatStorage, getStoragePercentage } from '$lib/utils/storage.utils';
  import StorageBar from '../../_components/StorageBar.svelte';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user }: { user: AdminUserDetail } = $props();

  // svelte-ignore state_referenced_locally
  let quotaInput = $state<number>(user.storageQuotaMb);
  let saving = $state(false);
  let error = $state<string | null>(null);

  const percentage = $derived(getStoragePercentage(user.storageUsedBytes, user.storageQuotaMb));
  const unchanged = $derived(quotaInput === user.storageQuotaMb);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!Number.isInteger(quotaInput) || quotaInput < 0) {
      error = 'Quota must be a whole number of MB';
      return;
    }
    saving = true;
    error = await runAdminAction(
      () => adminApi.updateUserQuota(user.id, quotaInput),
      'Failed to update quota'
    );
    saving = false;
  }
</script>

<AdminCard title="Storage" {error}>
  <div class="usage">
    <span>{formatStorage(user.storageUsedBytes, user.storageQuotaMb)}</span>
    <span class="percent">{percentage.toFixed(0)}%</span>
  </div>
  <StorageBar {percentage} />
  <form class="quota-form" onsubmit={save}>
    <label for="quota-input">Quota (MB)</label>
    <input id="quota-input" type="number" min="0" step="1" bind:value={quotaInput} />
    <Button type="submit" size="sm" disabled={saving || unchanged}>
      {saving ? 'Saving...' : 'Save'}
    </Button>
  </form>
</AdminCard>

<style>
  .usage {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #374151;
  }

  .percent {
    color: #6b7280;
  }

  .quota-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .quota-form label {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .quota-form input {
    width: 7rem;
    padding: 0.375rem 0.625rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .quota-form input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
</style>
