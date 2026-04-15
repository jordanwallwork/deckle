<script lang="ts">
  import { Card, Avatar } from '$lib/components';
  import type { CurrentUser } from '$lib/types';

  let { user }: { user: CurrentUser } = $props();
</script>

<Card>
  <div class="profile-layout">
    <Avatar src={user.picture} name={user.name} size="xl" />

    <dl class="fields">
      <div class="field-row">
        <dt>Username</dt>
        <dd>{user.username}</dd>
      </div>
      <div class="field-row">
        <dt>Name</dt>
        <dd>{user.name}</dd>
      </div>
      <div class="field-row">
        <dt>Email</dt>
        <dd>{user.email}</dd>
      </div>
    </dl>
  </div>
</Card>

<style>
  .profile-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .profile-layout {
      flex-direction: row;
      align-items: flex-start;
      gap: 2rem;
    }
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    flex: 1;
  }

  .field-row {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
    margin: 0;
  }

  .field-row:last-child {
    border-bottom: none;
  }

  dt {
    font-weight: 500;
    color: var(--color-text-secondary);
    min-width: 90px;
    flex-shrink: 0;
    font-size: 0.9375rem;
  }

  dd {
    color: var(--color-text);
    flex: 1;
    margin: 0;
    font-size: 0.9375rem;
  }
</style>
