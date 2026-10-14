<script lang="ts">
  import { authApi, ApiError } from '$lib/api';

  let {
    email,
    label = 'Resend confirmation email'
  }: {
    /** Address to resend the confirmation link to */
    email: string;
    label?: string;
  } = $props();

  type Status = 'idle' | 'sending' | 'sent' | 'rate-limited' | 'error';

  let status = $state<Status>('idle');

  async function resend(): Promise<void> {
    if (!email.trim()) return;
    status = 'sending';
    try {
      await authApi.resendConfirmation(email.trim());
      status = 'sent';
    } catch (err) {
      status = err instanceof ApiError && err.status === 429 ? 'rate-limited' : 'error';
    }
  }
</script>

<div class="resend">
  <button
    type="button"
    class="resend-button"
    onclick={resend}
    disabled={status === 'sending' || !email.trim()}
  >
    {status === 'sending' ? 'Sending...' : label}
  </button>

  <span class="feedback" role="status">
    {#if status === 'sent'}
      <span class="sent">Sent - check your inbox.</span>
    {:else if status === 'rate-limited'}
      <span class="problem">Too many requests. Please wait a few minutes and try again.</span>
    {:else if status === 'error'}
      <span class="problem">Couldn't send the email. Please try again.</span>
    {/if}
  </span>
</div>

<style>
  .resend {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .resend-button {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: var(--color-accent-fg);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
  }

  .resend-button:hover:not(:disabled) {
    color: var(--color-accent-fg-hover);
  }

  .resend-button:disabled {
    color: var(--color-text-secondary);
    cursor: not-allowed;
  }

  .feedback {
    font-size: 0.8125rem;
  }

  .sent {
    color: var(--color-text-secondary);
  }

  .problem {
    color: var(--color-danger-fg);
  }
</style>
