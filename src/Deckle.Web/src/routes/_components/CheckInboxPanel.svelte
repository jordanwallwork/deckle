<script lang="ts">
  import ResendConfirmation from '$lib/components/auth/ResendConfirmation.svelte';

  let {
    email,
    onBack
  }: {
    /** The address the confirmation link was sent to */
    email: string;
    /** Returns to the sign-in form */
    onBack: () => void;
  } = $props();
</script>

<div class="check-inbox">
  <h2>Check your inbox</h2>
  <p>
    We sent a confirmation link to <strong>{email}</strong>. Follow the link to finish creating your
    account.
  </p>
  <p class="hint">Didn't get it? Check your spam folder, or send it again.</p>

  <ResendConfirmation {email} />

  <button type="button" class="back-button" onclick={onBack}>Back to sign in</button>
</div>

<style>
  .check-inbox {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--color-text-primary);
    overflow-wrap: anywhere;
  }

  .hint {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .back-button {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .back-button:hover {
    border-color: var(--color-text-secondary);
  }
</style>
