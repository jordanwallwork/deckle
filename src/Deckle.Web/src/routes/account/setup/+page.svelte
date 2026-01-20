<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi, ApiError } from '$lib/api';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let username = $state('');
  let isChecking = $state(false);
  let isSubmitting = $state(false);
  let availabilityStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  let validationError = $state<string | null>(null);
  let submitError = $state<string | null>(null);

  // Debounce timer for username availability check
  let checkTimer: ReturnType<typeof setTimeout> | null = null;

  // Validate username format
  function validateUsername(value: string): string | null {
    if (value.length === 0) {
      return null; // Empty is not an error, just idle
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 30) {
      return 'Username must be 30 characters or less';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  }

  // Check username availability with debounce
  async function checkAvailability(value: string) {
    // Clear any pending checks
    if (checkTimer) {
      clearTimeout(checkTimer);
    }

    // Validate format first
    const error = validateUsername(value);
    if (error) {
      validationError = error;
      availabilityStatus = 'invalid';
      return;
    }

    if (value.length === 0) {
      availabilityStatus = 'idle';
      validationError = null;
      return;
    }

    // Debounce the availability check
    availabilityStatus = 'checking';
    validationError = null;

    checkTimer = setTimeout(async () => {
      isChecking = true;
      try {
        const response = await authApi.checkUsername(value);
        if (response.available) {
          availabilityStatus = 'available';
        } else {
          availabilityStatus = 'taken';
          validationError = 'Username is already taken';
        }
      } catch (err) {
        console.error('Failed to check username availability:', err);
        availabilityStatus = 'idle';
      } finally {
        isChecking = false;
      }
    }, 300);
  }

  // Handle input change
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    username = target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    submitError = null;
    checkAvailability(username);
  }

  // Handle form submission
  async function handleSubmit(event: Event) {
    event.preventDefault();

    // Validate before submitting
    const error = validateUsername(username);
    if (error) {
      validationError = error;
      availabilityStatus = 'invalid';
      return;
    }

    if (availabilityStatus !== 'available') {
      return;
    }

    isSubmitting = true;
    submitError = null;

    try {
      await authApi.setUsername({ username });
      // Redirect to projects page on success
      goto('/projects');
    } catch (err) {
      console.error('Failed to set username:', err);
      if (err instanceof ApiError) {
        submitError = err.message;
        // Re-check availability in case it was taken
        checkAvailability(username);
      } else {
        submitError = 'An unexpected error occurred. Please try again.';
      }
    } finally {
      isSubmitting = false;
    }
  }

  // Computed properties for button state
  const canSubmit = $derived(
    username.length >= 3 && availabilityStatus === 'available' && !isSubmitting && !isChecking
  );

  const statusIcon = $derived(
    availabilityStatus === 'checking'
      ? 'loading'
      : availabilityStatus === 'available'
        ? 'check'
        : availabilityStatus === 'taken' || availabilityStatus === 'invalid'
          ? 'error'
          : null
  );
</script>

<div class="setup-container">
  <div class="setup-card">
    <div class="welcome-section">
      {#if data.user.picture}
        <img src={data.user.picture} alt={data.user.name || 'User'} class="avatar" />
      {:else}
        <div class="avatar-placeholder">
          {data.user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      {/if}

      <h1>Welcome to Deckle!</h1>
      <p class="welcome-text">
        Hi{data.user.name ? `, ${data.user.name}` : ''}! Before you get started, please choose a
        username. This will be visible to other users you collaborate with.
      </p>
    </div>

    <form onsubmit={handleSubmit} class="setup-form">
      <div class="form-field">
        <label for="username">Username</label>
        <div class="input-wrapper">
          <span class="input-prefix">@</span>
          <input
            type="text"
            id="username"
            value={username}
            oninput={handleInput}
            placeholder="your_username"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            maxlength="30"
            disabled={isSubmitting}
          />
          {#if statusIcon === 'loading'}
            <span class="input-status loading">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="3"
                  fill="none"
                  stroke-linecap="round"
                  stroke-dasharray="31.4 31.4"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </span>
          {:else if statusIcon === 'check'}
            <span class="input-status success">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          {:else if statusIcon === 'error'}
            <span class="input-status error">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </span>
          {/if}
        </div>
        {#if validationError}
          <p class="field-error">{validationError}</p>
        {:else if availabilityStatus === 'available'}
          <p class="field-success">Username is available</p>
        {:else}
          <p class="field-hint">3-30 characters, letters, numbers, and underscores only</p>
        {/if}
      </div>

      {#if submitError}
        <div class="submit-error">
          {submitError}
        </div>
      {/if}

      <button type="submit" class="submit-button" disabled={!canSubmit}>
        {#if isSubmitting}
          <span class="button-spinner"></span>
          Setting up...
        {:else}
          Continue
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  .setup-container {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, var(--color-teal-grey) 0%, var(--color-muted-teal) 100%);
  }

  .setup-card {
    background: white;
    border-radius: 16px;
    padding: 3rem;
    max-width: 480px;
    width: 100%;
    box-shadow: var(--shadow-lg);
  }

  .welcome-section {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .avatar,
  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto 1.5rem;
  }

  .avatar {
    object-fit: cover;
    border: 3px solid var(--color-sage);
  }

  .avatar-placeholder {
    background-color: var(--color-muted-teal);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 2rem;
    border: 3px solid var(--color-sage);
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-teal-grey);
    margin-bottom: 1rem;
  }

  .welcome-text {
    color: var(--color-text-secondary);
    font-size: 1rem;
    line-height: 1.6;
  }

  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-teal-grey);
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-prefix {
    position: absolute;
    left: 1rem;
    color: var(--color-text-secondary);
    font-size: 1rem;
    pointer-events: none;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.875rem 2.75rem 0.875rem 2rem;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: white;
    color: var(--color-text-primary);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .input-wrapper input:focus {
    outline: none;
    border-color: var(--color-sage);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .input-wrapper input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .input-wrapper input::placeholder {
    color: #9ca3af;
  }

  .input-status {
    position: absolute;
    right: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-status.loading {
    color: var(--color-muted-teal);
  }

  .input-status.success {
    color: #16a34a;
  }

  .input-status.error {
    color: #dc2626;
  }

  .field-hint {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .field-error {
    font-size: 0.8125rem;
    color: #dc2626;
    margin: 0;
  }

  .field-success {
    font-size: 0.8125rem;
    color: #16a34a;
    margin: 0;
  }

  .submit-error {
    padding: 0.875rem 1rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    color: #dc2626;
    font-size: 0.875rem;
  }

  .submit-button {
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    background-color: var(--color-sage);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background-color 0.2s,
      transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--color-muted-teal);
  }

  .submit-button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .submit-button:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
  }

  .button-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .setup-card {
      padding: 2rem 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
