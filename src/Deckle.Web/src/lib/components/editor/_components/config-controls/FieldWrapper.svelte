<script lang="ts">
  let {
    label,
    htmlFor,
    hideLabel = false,
    children
  }: { label: string; htmlFor: string; hideLabel?: boolean; children: any } = $props();
</script>

<div class="field">
  <label for={htmlFor} class:visually-hidden={hideLabel}>{label}</label>
  {@render children()}
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  :global(.field input[type='text']),
  :global(.field input[type='number']),
  :global(.field input[type='range']),
  :global(.field select),
  :global(.field textarea) {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: inherit;
    box-sizing: border-box;
  }

  :global(.field input[type='text']),
  :global(.field input[type='number']),
  :global(.field select) {
    height: 2.125rem;
  }

  :global(.field textarea) {
    resize: vertical;
  }

  :global(.field input[type='text']:focus),
  :global(.field input[type='number']:focus),
  :global(.field select:focus),
  :global(.field textarea:focus) {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  /* Visually hide label while keeping it accessible to screen readers */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
