<script lang="ts">
  import type { AdminUserDetail } from '$lib/types';
  import { adminApi } from '$lib/api';
  import { Badge, Button } from '$lib/components';
  import { formatShortDate } from '$lib/utils/file.utils';
  import AdminCard from './AdminCard.svelte';
  import { runAdminAction } from './adminAction';

  let { user }: { user: AdminUserDetail } = $props();

  let busy = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);

  async function run(action: () => Promise<unknown>, fallback: string, successNotice?: string) {
    busy = true;
    notice = null;
    error = await runAdminAction(action, fallback);
    if (!error && successNotice) notice = successNotice;
    busy = false;
  }

  const resend = () =>
    run(
      () => adminApi.resendConfirmation(user.id),
      'Failed to resend confirmation',
      `Confirmation email sent to ${user.email}`
    );

  const markConfirmed = () =>
    run(() => adminApi.confirmUserEmail(user.id), 'Failed to confirm email');
</script>

<AdminCard title="Email" {error}>
  <p class="email">{user.email}</p>
  {#if user.emailConfirmed}
    <div>
      <Badge variant="success">
        Confirmed{user.emailConfirmedAt ? ` ${formatShortDate(user.emailConfirmedAt)}` : ''}
      </Badge>
    </div>
  {:else}
    <div>
      <Badge variant="warning">Unconfirmed</Badge>
    </div>
    <div class="card-actions">
      {#if user.hasPassword}
        <Button variant="secondary" size="sm" disabled={busy} onclick={resend}>
          Resend confirmation
        </Button>
      {/if}
      <Button size="sm" disabled={busy} onclick={markConfirmed}>Mark as confirmed</Button>
    </div>
  {/if}
  {#if notice}
    <p class="card-hint" role="status">{notice}</p>
  {/if}
</AdminCard>

<style>
  .email {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    overflow-wrap: anywhere;
  }
</style>
