<script lang="ts">
  import type { AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Button } from '$lib/components';
  import { formatDateTime } from '$lib/utils/date.utils';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user }: { user: AdminUserDetail } = $props();

  let editing = $state(false);
  let nameInput = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  function startEdit() {
    nameInput = user.name ?? '';
    error = null;
    editing = true;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    const name = nameInput.trim() || null;
    error = await runAdminAction(
      () => adminApi.updateUserName(user.id, name),
      'Failed to update name'
    );
    saving = false;
    if (!error) editing = false;
  }
</script>

<AdminCard title="Profile" {error}>
  <dl class="details">
    <dt>Name</dt>
    <dd>
      {#if editing}
        <form class="name-form" onsubmit={save}>
          <input type="text" aria-label="Name" placeholder="No name" bind:value={nameInput} />
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          <Button variant="secondary" size="sm" disabled={saving} onclick={() => (editing = false)}>
            Cancel
          </Button>
        </form>
      {:else}
        <span class="name-value">
          {#if user.name}{user.name}{:else}<em>No name</em>{/if}
          <Button variant="text" size="sm" onclick={startEdit}>Edit</Button>
        </span>
      {/if}
    </dd>
    <dt>Created</dt>
    <dd>{formatDateTime(user.createdAt)}</dd>
    <dt>Last login</dt>
    <dd>{formatDateTime(user.lastLoginAt)}</dd>
  </dl>
</AdminCard>

<style>
  .details {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.625rem 1rem;
    margin: 0;
    font-size: 0.875rem;
  }

  dt {
    color: #6b7280;
  }

  dd {
    margin: 0;
    color: #374151;
    min-width: 0;
  }

  .name-value {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  em {
    color: #9ca3af;
  }

  .name-form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .name-form input {
    flex: 1 1 140px;
    min-width: 0;
    padding: 0.375rem 0.625rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .name-form input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
</style>
