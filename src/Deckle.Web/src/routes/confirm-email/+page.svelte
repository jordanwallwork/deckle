<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { authApi } from '$lib/api';
  import { getAuthErrorCode, getAuthErrorMessage } from '$lib/types';
  import ResendConfirmation from '$lib/components/auth/ResendConfirmation.svelte';

  type Status = 'confirming' | 'success' | 'error';

  let status = $state<Status>('confirming');
  let error = $state<string | null>(null);
  let canResend = $state(true);
  let email = $state('');

  onMount(async () => {
    const token = page.url.searchParams.get('token');
    if (!token) {
      status = 'error';
      error = 'This confirmation link is missing its token. Check you copied the whole link.';
      return;
    }

    try {
      await authApi.confirmEmail(token);
      status = 'success';
      // Full reload so the layout picks up the new auth cookie
      window.location.href = '/projects';
    } catch (err) {
      status = 'error';
      error = getAuthErrorMessage(err);
      canResend = getAuthErrorCode(err) !== 'account_disabled';
    }
  });
</script>

<svelte:head>
  <title>Confirm your email - Deckle</title>
</svelte:head>

<div class="container">
  <main class="card">
    {#if status === 'confirming'}
      <h1>Confirming your email...</h1>
      <div class="spinner" aria-label="Loading"></div>
    {:else if status === 'success'}
      <h1>Email confirmed</h1>
      <p>You're signed in. Taking you to your projects...</p>
    {:else}
      <h1>We couldn't confirm your email</h1>
      <div class="error-message" role="alert">{error}</div>

      {#if canResend}
        <p>Enter your email address and we'll send you a new link.</p>
        <div class="form-field">
          <label for="resend-email">Email</label>
          <input
            id="resend-email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>
        <ResendConfirmation {email} label="Send a new confirmation link" />
      {/if}

      <a class="back-link" href="/">Back to sign in</a>
    {/if}
  </main>
</div>

<style>
  .container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--bg-teal);
  }

  .card {
    max-width: 420px;
    width: 100%;
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    padding: 2rem;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-md);
    color: var(--color-danger-fg);
    font-size: 0.875rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .form-field input {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--color-sage-dark);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .back-link {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-accent-fg);
  }

  .back-link:hover {
    color: var(--color-accent-fg-hover);
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent-solid);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .card {
      padding: 1.5rem;
    }
  }
</style>
