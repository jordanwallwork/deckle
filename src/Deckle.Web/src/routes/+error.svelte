<script lang="ts">
  import { page } from "$app/stores";
  import ErrorDisplay from "$lib/components/ErrorDisplay.svelte";
  import { ApiError } from "$lib/api";

  // SvelteKit's error page receives error and status via $page.error and $page.status
  const error = $derived(() => {
    const pageError = $page.error;
    const status = $page.status || 500;

    if (!pageError) {
      return new ApiError(status, "An unknown error occurred");
    }

    // Convert SvelteKit error to ApiError format for ErrorDisplay
    const message =
      typeof pageError === "string"
        ? pageError
        : pageError.message || "An error occurred";

    return new ApiError(status, message);
  });
</script>

<div class="error-page">
  <div class="error-container">
    <ErrorDisplay error={error()} />

    <div class="error-actions">
      <a href="/" class="button">Return Home</a>
      <button
        onclick={() => window.history.back()}
        class="button button-secondary"
      >
        Go Back
      </button>
    </div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .error-container {
    max-width: 600px;
    width: 100%;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: center;
  }

  .button {
    padding: 0.75rem 1.5rem;
    background-color: #1976d2;
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .button:hover {
    background-color: #1565c0;
  }

  .button-secondary {
    background-color: #757575;
  }

  .button-secondary:hover {
    background-color: #616161;
  }
</style>
