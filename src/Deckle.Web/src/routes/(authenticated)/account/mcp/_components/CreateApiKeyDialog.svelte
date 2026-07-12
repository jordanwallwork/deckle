<script lang="ts">
  import { Dialog, Button } from '$lib/components';
  import { apiKeysApi, type ApiKey, ApiError } from '$lib/api';

  interface Props {
    show: boolean;
    oncreated: (key: ApiKey) => void;
  }

  let { show = $bindable(), oncreated }: Props = $props();

  // Step 1: name input. Step 2: show generated key.
  type Step = 'name' | 'reveal';
  let step = $state<Step>('name');
  let name = $state('');
  let generatedKey = $state('');
  let copied = $state(false);
  let isSubmitting = $state(false);
  let error = $state<string | undefined>(undefined);

  $effect(() => {
    if (!show) {
      name = '';
      generatedKey = '';
      copied = false;
      isSubmitting = false;
      error = undefined;
      step = 'name';
    }
  });

  async function handleCreate() {
    if (!name.trim()) {
      error = 'Key name is required';
      return;
    }
    error = undefined;
    isSubmitting = true;
    try {
      const response = await apiKeysApi.create(name.trim());
      generatedKey = response.key;
      step = 'reveal';
      oncreated({ id: response.id, name: response.name, createdAt: response.createdAt, lastUsedAt: null });
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to create API key';
    } finally {
      isSubmitting = false;
    }
  }

  async function copyKey() {
    await navigator.clipboard.writeText(generatedKey);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function handleDone() {
    show = false;
  }
</script>

<Dialog bind:show title={step === 'name' ? 'Create API Key' : 'API Key Created'} maxWidth="480px">
  {#snippet children()}
    {#if step === 'name'}
      <p class="dialog-description">
        Give this key a name so you can identify it later (e.g. "Claude Desktop").
      </p>
      <div class="field">
        <label for="key-name">Key name</label>
        <input
          id="key-name"
          type="text"
          bind:value={name}
          placeholder="e.g. Claude Desktop"
          maxlength="255"
          onkeydown={(e) => e.key === 'Enter' && handleCreate()}
          disabled={isSubmitting}
        />
        {#if error}
          <p class="field-error">{error}</p>
        {/if}
      </div>
    {:else}
      <div class="reveal-warning">
        <span class="warning-icon">⚠</span>
        Copy this key now — it will <strong>not</strong> be shown again.
      </div>
      <div class="key-display">
        <code class="key-value">{generatedKey}</code>
        <button class="copy-btn" onclick={copyKey}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p class="reveal-hint">
        Add this as the <code>X-API-Key</code> header when connecting your MCP client.
      </p>
    {/if}
  {/snippet}

  {#snippet actions()}
    {#if step === 'name'}
      <Button variant="secondary" onclick={() => (show = false)} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleCreate} disabled={isSubmitting || !name.trim()}>
        {isSubmitting ? 'Creating…' : 'Create'}
      </Button>
    {:else}
      <Button onclick={handleDone}>Done</Button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .dialog-description {
    margin: 0 0 1.25rem;
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .field input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.9375rem;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-bg);
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .field input:focus {
    outline: none;
    border-color: var(--color-sage);
  }

  .field input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .field-error {
    font-size: 0.8125rem;
    color: var(--color-danger);
    margin: 0;
  }

  .reveal-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff8e1;
    border: 1px solid #ffe082;
    border-radius: var(--radius-md);
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    color: #7a5800;
    margin-bottom: 1rem;
  }

  .warning-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .key-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-bg-subtle, #f5f5f5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.625rem 0.75rem;
    margin-bottom: 0.75rem;
  }

  .key-value {
    flex: 1;
    font-family: monospace;
    font-size: 0.8125rem;
    word-break: break-all;
    color: var(--color-text);
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 0.25rem 0.625rem;
    background: var(--color-sage-dark);
    color: white;
    border: none;
    border-radius: var(--radius-sm, 4px);
    font-size: 0.8125rem;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  .copy-btn:hover {
    opacity: 0.85;
  }

  .reveal-hint {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .reveal-hint code {
    font-family: monospace;
    background: var(--color-bg-subtle, #f0f0f0);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-size: 0.85em;
  }
</style>
