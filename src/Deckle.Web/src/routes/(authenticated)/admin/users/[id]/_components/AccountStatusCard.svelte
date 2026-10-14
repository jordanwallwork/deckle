<script lang="ts">
  import type { AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Badge, Button } from '$lib/components';
  import { formatShortDate } from '$lib/utils/file.utils';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user, isSelf }: { user: AdminUserDetail; isSelf: boolean } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);

  async function toggleDisabled() {
    const disable = !user.isDisabled;
    const label = user.name || user.email;
    const message = disable
      ? `Disable ${label}? They will be signed out and unable to sign in or use API keys.`
      : `Re-enable ${label}? They will be able to sign in again.`;
    if (!confirm(message)) return;

    busy = true;
    error = await runAdminAction(
      () => adminApi.setUserDisabled(user.id, disable),
      disable ? 'Failed to disable account' : 'Failed to enable account'
    );
    busy = false;
  }
</script>

<AdminCard title="Account status" {error}>
  <div>
    {#if user.isDisabled}
      <Badge variant="danger">
        Disabled{user.disabledAt ? ` since ${formatShortDate(user.disabledAt)}` : ''}
      </Badge>
    {:else}
      <Badge variant="success">Active</Badge>
    {/if}
  </div>
  <div class="card-actions">
    <Button
      variant={user.isDisabled ? 'primary' : 'danger'}
      size="sm"
      disabled={busy || isSelf}
      onclick={toggleDisabled}
    >
      {user.isDisabled ? 'Enable account' : 'Disable account'}
    </Button>
  </div>
  {#if isSelf}
    <p class="card-hint">You can't disable your own account.</p>
  {/if}
</AdminCard>
