<script lang="ts">
  import { Card, Badge, Button } from '$lib/components';

  interface User {
    userId: string;
    name?: string;
    email: string;
    pictureUrl?: string;
    role: 'Owner' | 'Collaborator';
    isPending: boolean;
  }

  let {
    users,
    canInvite = false,
    canManageUsers = false,
    currentUserId,
    onInviteClick,
    onRemoveUser
  }: {
    users: User[];
    canInvite?: boolean;
    canManageUsers?: boolean;
    currentUserId?: string;
    onInviteClick?: () => void;
    onRemoveUser?: (userId: string, userName: string, role: string) => Promise<void>;
  } = $props();

  function getRoleBadgeVariant(role: string): 'default' | 'success' | 'warning' | 'danger' {
    switch (role) {
      case 'Owner':
        return 'danger';
      case 'Collaborator':
        return 'success';
      default:
        return 'default';
    }
  }

  // Determine if revoke button should be shown for a user
  function canRevokeUser(user: User): boolean {
    if (!onRemoveUser) return false;

    if (user.role === 'Owner') return false;

    const isSelf = user.userId === currentUserId;

    if (isSelf) {
      // Users can remove themselves (backend will validate owner rules)
      return true;
    }

    // Can remove others if we have permission
    return canManageUsers;
  }

  function getRevokeButtonText(user: User): string {
    const isSelf = user.userId === currentUserId;
    return isSelf ? 'Leave Project' : 'Remove';
  }
</script>

<Card>
  {#if canInvite}
    <div class="card-header">
      <Button onclick={onInviteClick} size="sm">Add Collaborator</Button>
    </div>
  {/if}

  <div class="users-list">
    {#each users as user}
      <div class="user-item">
        <div class="user-info">
          {#if user.pictureUrl}
            <img src={user.pictureUrl} alt={user.name || user.email} class="user-avatar" />
          {:else}
            <div class="user-avatar-placeholder">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
          {/if}
          <div class="user-details">
            <div class="user-name">{user.name || user.email}</div>
            {#if user.name}
              <div class="user-email">{user.email}</div>
            {/if}
          </div>
        </div>
        <div class="badges">
          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
          {#if user.isPending}
            <Badge variant="default">Pending</Badge>
          {/if}
          {#if canRevokeUser(user)}
            <Button
              variant="danger"
              outline
              size="sm"
              onclick={() => onRemoveUser?.(user.userId, user.name || user.email, user.role)}
            >
              {getRevokeButtonText(user)}
            </Button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</Card>

<style>
  .card-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .users-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .user-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background-secondary);
  }

  .badges {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.125rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .user-email {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .user-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
  }
</style>
