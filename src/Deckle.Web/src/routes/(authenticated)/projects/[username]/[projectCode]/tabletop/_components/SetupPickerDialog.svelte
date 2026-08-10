<script lang="ts">
  // Setup picker (#119): browse the project's game setups, create new ones, open
  // them in the editor, or select one to play. Play execution (count/options +
  // interpreter) is #120's job; this component reports the chosen setup through
  // `onSelect` and navigates to the editor for create/edit.
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Dialog from '$lib/components/Dialog.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import LoadingSpinner from '$lib/components/icons/LoadingSpinner.svelte';
  import { gameSetupsApi, ApiError } from '$lib/api';
  import { emptyGameSetup, validateGameSetup } from '$lib/gamerunner';
  import type { GameSetupSummary } from '$lib/types';

  interface Props {
    show: boolean;
    projectId: string;
    onSelect: (setup: GameSetupSummary) => void;
    onclose: () => void;
  }

  let { show = $bindable(), projectId, onSelect, onclose }: Props = $props();

  let loading = $state(false);
  let creating = $state(false);
  let error = $state<string | null>(null);
  let setups = $state<GameSetupSummary[]>([]);

  const sorted = $derived(
    [...setups].sort((a, b) => a.name.localeCompare(b.name))
  );

  // Load whenever the dialog opens.
  $effect(() => {
    if (show) {
      void load();
    }
  });

  async function load() {
    loading = true;
    error = null;
    try {
      setups = await gameSetupsApi.list(projectId);
    } catch (err) {
      error =
        err instanceof ApiError ? err.message : 'Failed to load setups. Please try again.';
    } finally {
      loading = false;
    }
  }

  function select(setup: GameSetupSummary) {
    if (!setup.isValid) return;
    onSelect(setup);
    onclose();
  }

  function editorUrl(setupId: string): string {
    const { username, projectCode } = $page.params;
    return `/projects/${username}/${projectCode}/setups/${setupId}/edit`;
  }

  function edit(setup: GameSetupSummary) {
    void goto(editorUrl(setup.id));
  }

  // Create a fresh, empty (and therefore valid) setup, then open it in the editor.
  async function createSetup() {
    if (creating) return;
    creating = true;
    error = null;
    try {
      const document = emptyGameSetup();
      const isValid = validateGameSetup(document, { components: [] }).length === 0;
      const setup = await gameSetupsApi.create(projectId, {
        name: 'New setup',
        document,
        isValid
      });
      await goto(editorUrl(setup.id));
    } catch (err) {
      error =
        err instanceof ApiError ? err.message : 'Failed to create setup. Please try again.';
      creating = false;
    }
  }
</script>

<Dialog bind:show title="Play a setup" maxWidth="480px" {onclose}>
  {#if loading}
    <div class="state">
      <LoadingSpinner size={24} />
      <span>Loading setups…</span>
    </div>
  {:else}
    {#if error}
      <div class="state error">{error}</div>
    {:else if sorted.length === 0}
      <div class="state">No setups have been created for this project yet.</div>
    {:else}
      <ul class="setup-list">
        {#each sorted as setup (setup.id)}
          <li class="setup-item">
            <button
              type="button"
              class="setup-row"
              class:invalid={!setup.isValid}
              disabled={!setup.isValid}
              title={setup.isValid ? 'Play this setup' : 'This setup has validation errors and cannot be played — edit it to fix'}
              onclick={() => select(setup)}
            >
              <span class="setup-name">{setup.name}</span>
              {#if setup.isValid}
                <Badge variant="success" size="sm">Valid</Badge>
              {:else}
                <Badge variant="danger" size="sm">Invalid</Badge>
              {/if}
            </button>
            <button type="button" class="edit-btn" title="Edit this setup" onclick={() => edit(setup)}>
              Edit
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="footer">
      <button type="button" class="new-btn" disabled={creating} onclick={createSetup}>
        {creating ? 'Creating…' : '＋ New setup'}
      </button>
    </div>
  {/if}
</Dialog>

<style>
  .state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 0;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .state.error {
    color: var(--color-danger-fg);
  }

  .setup-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setup-item {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
  }

  .setup-row {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, border-color 0.1s;
  }

  .setup-row:hover:not(:disabled) {
    border-color: var(--color-accent-fg);
    background: var(--color-surface-hover, var(--color-surface));
  }

  .setup-row.invalid {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .setup-name {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .edit-btn {
    flex: 0 0 auto;
    padding: 0 0.9rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .edit-btn:hover {
    border-color: var(--color-accent-fg);
    color: var(--color-text-primary);
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .new-btn {
    padding: 0.55rem 1rem;
    background: var(--color-accent-fg, var(--color-surface));
    border: 1px solid var(--color-accent-fg, var(--color-border));
    border-radius: var(--radius-md);
    color: var(--color-on-accent, #fff);
    cursor: pointer;
    font-weight: 600;
    transition: opacity 0.1s;
  }

  .new-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .new-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
