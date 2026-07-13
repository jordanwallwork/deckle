<script lang="ts">
  import { Card, Button } from '$lib/components';
  import { TrashIcon, PlusIcon } from '$lib/components/icons';
  import { apiKeysApi, type ApiKey, ApiError } from '$lib/api';
  import { invalidateAll } from '$app/navigation';
  import CreateApiKeyDialog from './CreateApiKeyDialog.svelte';

  let { apiKeys }: { apiKeys: ApiKey[] } = $props();

  let localKeys = $state<ApiKey[]>([...apiKeys]);
  let showCreate = $state(false);
  let deletingId = $state<string | null>(null);
  let deleteError = $state<string | null>(null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function handleCreated(key: ApiKey) {
    localKeys = [...localKeys, key];
  }

  async function handleDelete(id: string) {
    deletingId = id;
    deleteError = null;
    try {
      await apiKeysApi.delete(id);
      localKeys = localKeys.filter((k) => k.id !== id);
    } catch (err) {
      deleteError = err instanceof ApiError ? err.message : 'Failed to delete key';
    } finally {
      deletingId = null;
    }
  }
</script>

<Card>
  <div class="header">
    <p class="description">
      API keys authenticate MCP clients. Each key grants full access to your projects on behalf of
      your account — keep them secret.
    </p>
    <Button size="sm" onclick={() => (showCreate = true)}>
      <PlusIcon size={14} />
      New key
    </Button>
  </div>

  {#if deleteError}
    <p class="error">{deleteError}</p>
  {/if}

  {#if localKeys.length === 0}
    <div class="empty">
      <p>No API keys yet. Create one to connect an MCP client.</p>
    </div>
  {:else}
    <table class="keys-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Created</th>
          <th>Last used</th>
          <th aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each localKeys as key (key.id)}
          <tr>
            <td class="name-cell">{key.name}</td>
            <td class="date-cell">{formatDate(key.createdAt)}</td>
            <td class="date-cell">{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</td>
            <td class="action-cell">
              <button
                class="delete-btn"
                onclick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
                aria-label="Delete {key.name}"
              >
                <TrashIcon size={15} />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</Card>

<CreateApiKeyDialog bind:show={showCreate} oncreated={handleCreated} />

<style>
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .description {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    max-width: 44ch;
  }

  .error {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: var(--color-danger);
  }

  .empty {
    padding: 2rem 0;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
  }

  .empty p {
    margin: 0;
  }

  .keys-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9375rem;
  }

  .keys-table th {
    text-align: left;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    padding: 0 0 0.5rem;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .keys-table td {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .keys-table tr:last-child td {
    border-bottom: none;
  }

  .name-cell {
    font-weight: 500;
    color: var(--color-text);
    word-break: break-word;
  }

  .date-cell {
    color: var(--color-text-secondary);
    white-space: nowrap;
    padding-right: 1.5rem;
  }

  .action-cell {
    text-align: right;
    width: 2rem;
  }

  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0.25rem;
    border-radius: var(--radius-xs);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background-color 0.15s;
  }

  .delete-btn:hover:not(:disabled) {
    color: var(--color-danger);
    background-color: rgba(192, 57, 43, 0.08);
  }

  .delete-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
