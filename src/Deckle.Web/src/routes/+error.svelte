<script lang="ts">
  import { page } from '$app/stores';
  import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
  import Button from '$lib/components/Button.svelte';
  import { ApiError } from '$lib/api';

  // SvelteKit's error page receives error and status via $page.error and $page.status
  const error = $derived(() => {
    const pageError = $page.error;
    const status = $page.status || 500;

    if (!pageError) {
      return new ApiError(status, 'An unknown error occurred');
    }

    // Convert SvelteKit error to ApiError format for ErrorDisplay
    const message =
      typeof pageError === 'string' ? pageError : pageError.message || 'An error occurred';

    return new ApiError(status, message);
  });
</script>

<div class="error-page">
  <div class="error-container">
    <ErrorDisplay error={error()} />

    <div class="error-actions">
      <a href="/" class="home-link">
        <Button variant="primary" size="md">Return Home</Button>
      </a>
      <Button variant="secondary" size="md" onclick={() => window.history.back()}>Go Back</Button>
    </div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 60px);
    padding: 2rem;
    background-color: var(--color-bg-primary);
  }

  .error-container {
    max-width: 600px;
    width: 100%;
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow-md);
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .home-link {
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .error-page {
      padding: 1rem;
    }

    .error-container {
      padding: 1.5rem;
    }

    .error-actions {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
