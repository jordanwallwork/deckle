<script lang="ts">
  import type { AdminApiKey, AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Button, Table } from '$lib/components';
  import { formatShortDate } from '$lib/utils/file.utils';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user }: { user: AdminUserDetail } = $props();

  let revoking = $state<string | null>(null);
  let error = $state<string | null>(null);

  const methods = $derived([
    { label: 'Google', enabled: user.hasGoogleSignIn },
    { label: 'Password', enabled: user.hasPassword }
  ]);

  async function revoke(key: AdminApiKey) {
    if (!confirm(`Revoke API key "${key.name}"? Anything using it will stop working.`)) return;
    revoking = key.id;
    error = await runAdminAction(
      () => adminApi.revokeUserApiKey(user.id, key.id),
      'Failed to revoke API key'
    );
    revoking = null;
  }
</script>

<AdminCard title="Sign-in methods" {error} wide>
  <ul class="chips">
    {#each methods as method (method.label)}
      <li class="chip" class:enabled={method.enabled}>
        {method.label}: {method.enabled ? 'Yes' : 'No'}
      </li>
    {/each}
  </ul>

  <h3>API keys</h3>
  {#if user.apiKeys.length === 0}
    <p class="card-hint">No API keys.</p>
  {:else}
    <Table compact label="API keys">
      {#snippet head()}
        <th>Name</th>
        <th>Created</th>
        <th>Last used</th>
        <th aria-label="Actions"></th>
      {/snippet}

      {#each user.apiKeys as key (key.id)}
        <tr>
          <td>{key.name}</td>
          <td>{formatShortDate(key.createdAt)}</td>
          <td>{key.lastUsedAt ? formatShortDate(key.lastUsedAt) : 'Never'}</td>
          <td class="actions">
            <Button
              variant="danger"
              size="sm"
              disabled={revoking !== null}
              onclick={() => revoke(key)}
            >
              {revoking === key.id ? 'Revoking...' : 'Revoke'}
            </Button>
          </td>
        </tr>
      {/each}
    </Table>
  {/if}
</AdminCard>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chip {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid #e5e7eb;
    font-size: 0.8125rem;
    color: #9ca3af;
  }

  .chip.enabled {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.08);
    color: #4c51bf;
    font-weight: 600;
  }

  h3 {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  .actions {
    text-align: right;
  }
</style>
