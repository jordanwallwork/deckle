<script lang="ts">
  import { getErrorFlavor } from '$lib/utils/errorFlavor';
  import type { ApiError } from '$lib/api';

  interface Props {
    /**
     * Error object (ApiError) or error message string
     */
    error: ApiError | string | null | undefined;
    /**
     * Optional custom status code (used when error is a string)
     */
    statusCode?: number;
  }

  let { error, statusCode }: Props = $props();

  // Compute error details
  const errorDetails = $derived(() => {
    if (!error) return null;

    let code: number;
    let technicalMsg: string;

    if (typeof error === 'string') {
      code = statusCode || 500;
      technicalMsg = error;
    } else {
      code = error.status;
      technicalMsg = error.message;
    }

    const flavor = getErrorFlavor(code);

    return {
      title: flavor.title,
      flavorText: flavor.flavorText,
      statusCode: code,
      technicalMessage: technicalMsg
    };
  });
</script>

{#if errorDetails()}
  {@const details = errorDetails()!}
  <div class="error-display">
    <div class="error-content">
      <h3 class="error-title">{details.title}</h3>
      <p class="error-flavor">{details.flavorText}</p>
    </div>

    <div class="details">
      {details.statusCode} - {details.technicalMessage}
    </div>
  </div>
{/if}

<style>
  .error-display {
    background-color: rgba(231, 76, 60, 0.08);
    border: 1px solid rgba(231, 76, 60, 0.3);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: var(--shadow-sm);
  }

  .error-content {
    margin-bottom: 1rem;
  }

  .error-title {
    color: #c0392b;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.02em;
  }

  .error-flavor {
    color: var(--color-text-primary);
    font-size: 0.9375rem;
    font-style: italic;
    line-height: 1.6;
    margin: 0;
    opacity: 0.85;
  }

  .details {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    border-left: 3px solid rgba(231, 76, 60, 0.4);
  }
</style>
