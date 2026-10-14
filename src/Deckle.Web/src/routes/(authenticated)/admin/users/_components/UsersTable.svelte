<script lang="ts">
  import type { AdminUser } from '$lib/types';
  import { Avatar, Badge, UsernameLink } from '$lib/components';
  import { goto } from '$app/navigation';
  import { formatDateTime } from '$lib/utils/date.utils';
  import { formatStorage, getStoragePercentage } from '$lib/utils/storage.utils';
  import StorageBar from './StorageBar.svelte';

  let { users }: { users: AdminUser[] } = $props();

  function openUser(event: MouseEvent, user: AdminUser) {
    // Links inside the row (the name, the @username profile link) handle their own navigation
    if ((event.target as HTMLElement).closest('a')) return;
    goto(`/admin/users/${user.id}`);
  }
</script>

<div class="users-table-container">
  <table class="users-table">
    <thead>
      <tr>
        <th>User</th>
        <th>Sign-up Date</th>
        <th>Last Login</th>
        <th>Storage</th>
        <th>Projects</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      {#each users as user (user.id)}
        <!-- Row click is a mouse convenience; the name link is the keyboard/a11y path -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <tr onclick={(e) => openUser(e, user)}>
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
              <span class="role-badge" class:admin={user.role === 'Administrator'}>{user.role}</span
              >
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
    </tbody>
  </table>
</div>

<style>
  .users-table-container {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
  }

  .users-table td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #374151;
  }

  .users-table tbody tr {
    cursor: pointer;
  }

  .users-table tbody tr:hover {
    background: #f9fafb;
  }

  .users-table tbody tr:last-child td {
    border-bottom: none;
  }

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
    color: #1a1a1a;
    text-decoration: none;
  }

  .user-name:hover,
  .user-name:focus-visible {
    color: #667eea;
    text-decoration: underline;
  }

  .user-email {
    font-size: 0.75rem;
    color: #6b7280;
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

  .role-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: #e5e7eb;
    color: #374151;
  }

  .role-badge.admin {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  @media (max-width: 1024px) {
    .users-table-container {
      overflow-x: auto;
    }

    .users-table {
      min-width: 900px;
    }
  }
</style>
