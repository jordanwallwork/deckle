<script lang="ts">
  import { getErrorFlavor } from "$lib/utils/errorFlavor";
  import type { ApiError } from "$lib/api";

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

    if (typeof error === "string") {
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
      technicalMessage: technicalMsg,
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
    background-color: #ffebee;
    border: 1px solid #ef9a9a;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
  }

  .error-content {
    margin-bottom: 0.75rem;
  }

  .error-title {
    color: #c62828;
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.5px;
  }

  .error-flavor {
    color: #d32f2f;
    font-size: 0.9375rem;
    font-style: italic;
    line-height: 1.5;
    margin: 0;
  }

  .details {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    font-size: 0.8125rem;
    color: #616161;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  }
</style>
