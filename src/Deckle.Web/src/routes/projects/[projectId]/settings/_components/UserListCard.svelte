<script lang="ts">
  import { Card, Badge } from "$lib/components";

  interface User {
    name?: string;
    email: string;
    pictureUrl?: string;
    role: string;
  }

  let { users }: { users: User[] } = $props();

  function getRoleBadgeVariant(
    role: string
  ): "default" | "success" | "warning" | "danger" {
    switch (role) {
      case "Owner":
        return "danger";
      case "Admin":
        return "warning";
      case "Member":
        return "success";
      default:
        return "default";
    }
  }
</script>

<Card>
  <div class="users-list">
    {#each users as user}
      <div class="user-item">
        <div class="user-info">
          {#if user.pictureUrl}
            <img
              src={user.pictureUrl}
              alt={user.name || user.email}
              class="user-avatar"
            />
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
        <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
      </div>
    {/each}
  </div>
</Card>

<style>
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
