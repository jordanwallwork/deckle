<script lang="ts">
  import type { AdminUser } from '$lib/types';
  import type { AdminUserSortKey } from '$lib/api/admin';
  import type { AdminUserSort } from '$lib/utils/adminUserFilters';
  import { Avatar, Badge, SortableHeader, Table, UsernameLink } from '$lib/components';
  import { rowLink } from '$lib/actions/rowLink';
  import { formatDateTime } from '$lib/utils/date.utils';
  import { formatStorage, getStoragePercentage } from '$lib/utils/storage.utils';
  import RoleBadge from './RoleBadge.svelte';
  import StorageBar from './StorageBar.svelte';

  let {
    users,
    sort,
    onSort
  }: { users: AdminUser[]; sort: AdminUserSort; onSort: (key: AdminUserSortKey) => void } =
    $props();

  const columns: { key: AdminUserSortKey; label: string }[] = [
    { key: 'name', label: 'User' },
    { key: 'createdAt', label: 'Sign-up Date' },
    { key: 'lastLoginAt', label: 'Last Login' },
    { key: 'storage', label: 'Storage' },
    { key: 'projects', label: 'Projects' },
    { key: 'role', label: 'Role' }
  ];
</script>

<Table framed minWidth="900px" label="Users">
  {#snippet head()}
    {#each columns as column (column.key)}
      <SortableHeader
        label={column.label}
        active={sort.sortBy === column.key}
        direction={sort.sortDir}
        onSort={() => onSort(column.key)}
      />
    {/each}
  {/snippet}

  {#each users as user (user.id)}
    <!-- Row click is a mouse convenience; the name link is the keyboard/a11y path -->
    <tr use:rowLink={`/admin/users/${user.id}`}>
      <td class="user-cell">
        <div class="user-info">
          <Avatar
            src={user.pictureUrl}
            name={user.name || user.email}
            size="md"
            class="user-avatar"
          />
          <div class="user-details">
            <a class="user-name" href="/admin/users/{user.id}">{user.name || 'No name'}</a>
            <UsernameLink username={user.username} />
            <span class="user-email">{user.email}</span>
          </div>
        </div>
      </td>
      <td>{formatDateTime(user.createdAt)}</td>
      <td>{formatDateTime(user.lastLoginAt)}</td>
      <td class="storage-cell">
        <div class="storage-info">
          <span class="storage-text"
            >{formatStorage(user.storageUsedBytes, user.storageQuotaMb)}</span
          >
          <StorageBar
            percentage={getStoragePercentage(user.storageUsedBytes, user.storageQuotaMb)}
          />
        </div>
      </td>
      <td class="projects-cell">{user.projectCount}</td>
      <td>
        <div class="badges">
          <RoleBadge role={user.role} size="sm" />
          {#if !user.emailConfirmed}
            <Badge variant="warning" size="sm">Unconfirmed</Badge>
          {/if}
          {#if user.isDisabled}
            <Badge variant="danger" size="sm">Disabled</Badge>
          {/if}
        </div>
      </td>
    </tr>
  {/each}
</Table>

<style>
  .user-cell {
    min-width: 250px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-info :global(.user-avatar) {
    --avatar-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .user-details {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
  }

  .user-name:hover,
  .user-name:focus-visible {
    color: var(--color-secondary-fg);
    text-decoration: underline;
  }

  .user-email {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .storage-cell {
    min-width: 160px;
  }

  .storage-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .storage-text {
    font-size: 0.8125rem;
  }

  .projects-cell {
    text-align: center;
    font-weight: 600;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }
</style>
