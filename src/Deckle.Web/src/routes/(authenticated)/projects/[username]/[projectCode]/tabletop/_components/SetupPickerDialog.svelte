<script lang="ts">
  // Setup picker (#119): browse the project's game setups and select one to play.
  // Loading only — execution (count/options + interpreter) is #120's job; this
  // component just reports the chosen setup through `onSelect`.
  import Dialog from '$lib/components/Dialog.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import LoadingSpinner from '$lib/components/icons/LoadingSpinner.svelte';
  import { gameSetupsApi, ApiError } from '$lib/api';
  import type { GameSetupSummary } from '$lib/types';

  interface Props {
    show: boolean;
    projectId: string;
    onSelect: (setup: GameSetupSummary) => void;
    onclose: () => void;
  }

  let { show = $bindable(), projectId, onSelect, onclose }: Props = $props();

  let loading = $state(false);
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
</script>

<Dialog bind:show title="Play a setup" maxWidth="480px" {onclose}>
  {#if loading}
    <div class="state">
      <LoadingSpinner size={24} />
      <span>Loading setups…</span>
    </div>
  {:else if error}
    <div class="state error">{error}</div>
  {:else if sorted.length === 0}
    <div class="state">No setups have been created for this project yet.</div>
  {:else}
    <ul class="setup-list">
      {#each sorted as setup (setup.id)}
        <li>
          <button
            type="button"
            class="setup-row"
            class:invalid={!setup.isValid}
            disabled={!setup.isValid}
            title={setup.isValid ? undefined : 'This setup has validation errors and cannot be played'}
            onclick={() => select(setup)}
          >
            <span class="setup-name">{setup.name}</span>
            {#if setup.isValid}
              <Badge variant="success" size="sm">Valid</Badge>
            {:else}
              <Badge variant="danger" size="sm">Invalid</Badge>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
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

  .setup-row {
    width: 100%;
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
</style>
