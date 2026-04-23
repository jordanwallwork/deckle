<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi, ApiError } from '$lib/api';
  import { config } from '$lib/config';

  type Mode = 'login' | 'register';

  let mode = $state<Mode>('login');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  function handleGoogleSignIn(): void {
    window.location.href = `${config.apiUrl}/auth/login`;
  }

  function switchMode(next: Mode): void {
    mode = next;
    error = null;
    confirmPassword = '';
  }

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    error = null;

    if (!email.trim() || !password) {
      error = 'Email and password are required';
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        error = 'Password must be at least 8 characters';
        return;
      }
      if (password !== confirmPassword) {
        error = 'Passwords do not match';
        return;
      }
    }

    isSubmitting = true;
    try {
      if (mode === 'register') {
        await authApi.register({ email: email.trim(), password });
      } else {
        await authApi.loginWithPassword({ email: email.trim(), password });
      }
      goto('/projects');
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'An unexpected error occurred. Please try again.';
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Deckle - Effortless Game Design</title>
  <meta
    name="description"
    content="Create game components from spreadsheets in minutes. Deckle is a tool for designing cards, tokens, and game pieces for playtesting."
  />
</svelte:head>

<div class="container">
  <main>
    <h1>Deckle</h1>
    <p class="subtitle">Effortless game design - From spreadsheet to playtest in minutes</p>

    <div class="auth-card">
      <button class="google-button" onclick={handleGoogleSignIn} type="button">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div class="divider">
        <span>or</span>
      </div>

      <div class="mode-tabs">
        <button
          type="button"
          class="tab-button"
          class:active={mode === 'login'}
          onclick={() => switchMode('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          class="tab-button"
          class:active={mode === 'register'}
          onclick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="form-field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
            disabled={isSubmitting}
            required
          />
        </div>

        <div class="form-field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
            autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
            disabled={isSubmitting}
            required
          />
        </div>

        {#if mode === 'register'}
          <div class="form-field">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              bind:value={confirmPassword}
              placeholder="Repeat your password"
              autocomplete="new-password"
              disabled={isSubmitting}
              required
            />
          </div>
        {/if}

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <button type="submit" class="submit-button" disabled={isSubmitting}>
          {#if isSubmitting}
            <span class="spinner"></span>
            {mode === 'register' ? 'Creating account...' : 'Signing in...'}
          {:else}
            {mode === 'register' ? 'Create Account' : 'Sign In'}
          {/if}
        </button>
      </form>

      {#if mode === 'login'}
        <p class="switch-mode">
          Don't have an account?
          <button type="button" class="link-button" onclick={() => switchMode('register')}>Register</button>
        </p>
      {:else}
        <p class="switch-mode">
          Already have an account?
          <button type="button" class="link-button" onclick={() => switchMode('login')}>Sign In</button>
        </p>
      {/if}
    </div>
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

  main {
    text-align: center;
    max-width: 420px;
    width: 100%;
    min-height: 0;
  }

  h1 {
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .auth-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: var(--shadow-lg);
    text-align: left;
  }

  .google-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #374151;
    background: white;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .google-button:hover {
    border-color: #9ca3af;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .google-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.25rem 0;
    color: var(--color-text-secondary);
    font-size: 0.8125rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .mode-tabs {
    display: flex;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-bottom: 1.25rem;
  }

  .tab-button {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .tab-button.active {
    background: var(--color-sage);
    color: white;
  }

  .tab-button:not(.active):hover {
    background: var(--color-bg-subtle, #f3f4f6);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-teal-grey);
  }

  .form-field input {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: white;
    color: var(--color-text-primary);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--color-sage);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .form-field input:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .submit-button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    background: var(--color-sage);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-button:hover:not(:disabled) {
    background: var(--color-muted-teal);
  }

  .submit-button:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .switch-mode {
    margin-top: 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .link-button {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-sage);
    font-size: inherit;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
  }

  .link-button:hover {
    color: var(--color-muted-teal);
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 1.5rem;
    }

    h1 {
      font-size: 2.5rem;
    }
  }
</style>
