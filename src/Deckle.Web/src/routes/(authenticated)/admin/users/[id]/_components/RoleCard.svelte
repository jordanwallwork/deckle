<script lang="ts">
  import type { AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Button } from '$lib/components';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user, isSelf }: { user: AdminUserDetail; isSelf: boolean } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);

  const isAdmin = $derived(user.role === 'Administrator');

  async function toggleRole() {
    const newRole = isAdmin ? 'User' : 'Administrator';
    const label = user.name || user.email;
    const message = isAdmin
      ? `Demote ${label} to User? They will lose access to the admin area.`
      : `Promote ${label} to Administrator? They will gain full admin access.`;
    if (!confirm(message)) return;

    busy = true;
    error = await runAdminAction(
      () => adminApi.updateUserRole(user.id, newRole),
      'Failed to update role'
    );
    busy = false;
  }
</script>

<AdminCard title="Role" {error}>
  <div>
    <span class="role-badge" class:admin={isAdmin}>{user.role}</span>
  </div>
  <div class="card-actions">
    <Button
      variant={isAdmin ? 'secondary' : 'primary'}
      size="sm"
      disabled={busy || isSelf}
      onclick={toggleRole}
    >
      {isAdmin ? 'Demote to User' : 'Promote to Administrator'}
    </Button>
  </div>
  {#if isSelf}
    <p class="card-hint">You can't change your own role.</p>
  {/if}
</AdminCard>

<style>
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
</style>
