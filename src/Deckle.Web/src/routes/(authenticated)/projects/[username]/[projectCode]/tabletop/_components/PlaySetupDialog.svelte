<script lang="ts">
  // Play dialog step 2 (#120): configure and execute a chosen setup. The picker
  // (#119) hands us a setup; here we load its full document, gate on the #114
  // validator, let the designer pick a bounded player count and typed options
  // (remembered per setup), then run the #117 interpreter and load the result
  // into the live tabletop as one undo entry. A failed run applies nothing.
  import { getContext } from 'svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import LoadingSpinner from '$lib/components/icons/LoadingSpinner.svelte';
  import { gameSetupsApi, ApiError } from '$lib/api';
  import { getTabletopApi } from '$lib/tabletop';
  import type { GameComponent, GameSetupSummary } from '$lib/types';
  import { validateGameSetup } from '$lib/gamerunner/validate';
  import { runSetup } from '$lib/gamerunner/interpreter';
  import type { GameSetup } from '$lib/gamerunner/types';
  import { coerceChoices, type PlayChoices } from '$lib/play/choices';
  import {
    loadLastSeed,
    loadRememberedChoices,
    saveLastSeed,
    saveRememberedChoices
  } from '$lib/play/storage';
  import { buildProjectContext, chooseSeed, tableHasContent, type SeedMode } from '$lib/play/run';
  import PlayerCountStepper from './PlayerCountStepper.svelte';
  import SetupOptionInputs from './SetupOptionInputs.svelte';
  import SetupErrorPanel from './SetupErrorPanel.svelte';

  interface Props {
    show: boolean;
    projectId: string;
    setup: GameSetupSummary | null;
    onclose: () => void;
    /** Seam for #123's editor route; the affordance is shown when provided. */
    onOpenEditor?: (setupId: string) => void;
  }

  let { show = $bindable(), projectId, setup, onclose, onOpenEditor }: Props = $props();

  const { store } = getTabletopApi();
  const components = getContext<GameComponent[]>('tabletopComponents') ?? [];

  type Phase = 'loading' | 'invalid' | 'ready' | 'load-error';

  let phase = $state<Phase>('loading');
  let loadError = $state<string | null>(null);
  let validationErrors = $state<string[]>([]);
  let runError = $state<string | null>(null);
  let confirmWipe = $state(false);
  let doc = $state<GameSetup | null>(null);
  let choices = $state<PlayChoices>({ playerCount: 1, options: {} });
  // The seed of this setup's last run, if any. Drives "replay same deal" (#121,
  // decision #107); a plain Play always mints a NEW seed. The seed chosen for a
  // pending run (through the wipe-confirm gate).
  let lastSeed = $state<number | null>(null);
  let pendingSeed = $state<number | null>(null);

  // (Re)load whenever the dialog opens for a setup.
  $effect(() => {
    if (show && setup) {
      void load(setup);
    }
  });

  async function load(chosen: GameSetupSummary) {
    phase = 'loading';
    loadError = null;
    validationErrors = [];
    runError = null;
    try {
      const detail = await gameSetupsApi.get(projectId, chosen.id);
      const projectContext = buildProjectContext(components);
      const errors = validateGameSetup(detail.document, projectContext);
      if (errors.length > 0) {
        validationErrors = errors.map((e) => e.message);
        doc = null;
        phase = 'invalid';
        return;
      }
      const loaded = detail.document as GameSetup;
      doc = loaded;
      choices = coerceChoices(loaded, loadRememberedChoices(chosen.id));
      lastSeed = loadLastSeed(chosen.id);
      phase = 'ready';
    } catch (err) {
      loadError = err instanceof ApiError ? err.message : 'Failed to load this setup. Please try again.';
      phase = 'load-error';
    }
  }

  // `'new'` = a fresh deal (the default Play); `'same'` = re-run the last seed
  // deterministically ("replay same deal", #121). The seed is fixed here so the
  // wipe-confirm gate runs the same deal the user asked for.
  function requestRun(mode: SeedMode) {
    runError = null;
    pendingSeed = chooseSeed(mode, lastSeed);
    if (tableHasContent(store.state)) {
      confirmWipe = true;
    } else {
      execute();
    }
  }

  function execute() {
    confirmWipe = false;
    if (!setup || !doc || pendingSeed === null) return;
    const seed = pendingSeed;
    const result = runSetup(doc, {
      playerCount: choices.playerCount,
      options: choices.options,
      seed,
      templates: store.templates
    });
    if (!result.ok) {
      // Failed run applies NOTHING to the table.
      runError = result.error.message;
      return;
    }
    saveRememberedChoices(setup.id, choices);
    saveLastSeed(setup.id, seed);
    lastSeed = seed;
    // Animated replay toward the final state; commits as ONE undo entry (#121).
    store.playSetupRun(result.state, result.visibility, result.trace);
    onclose();
  }

  function openEditor() {
    if (setup && onOpenEditor) onOpenEditor(setup.id);
  }
</script>

<Dialog bind:show title={setup ? `Play · ${setup.name}` : 'Play a setup'} maxWidth="440px" {onclose}>
  {#if phase === 'loading'}
    <div class="state">
      <LoadingSpinner size={24} />
      <span>Loading setup…</span>
    </div>
  {:else if phase === 'load-error'}
    <div class="state error">{loadError}</div>
  {:else if phase === 'invalid'}
    <SetupErrorPanel
      heading="This setup has validation errors and cannot be played."
      messages={validationErrors}
      onOpenEditor={onOpenEditor ? openEditor : undefined}
    />
  {:else if doc}
    <div class="config">
      <PlayerCountStepper bind:value={choices.playerCount} min={doc.minPlayers} max={doc.maxPlayers} />
      <SetupOptionInputs options={doc.options} bind:values={choices.options} />
      {#if runError}
        <SetupErrorPanel
          heading="The setup couldn’t run."
          messages={[runError]}
          onOpenEditor={onOpenEditor ? openEditor : undefined}
        />
      {/if}
    </div>
  {/if}

  {#snippet actions()}
    <Button variant="secondary" onclick={onclose}>Cancel</Button>
    {#if phase === 'ready'}
      {#if lastSeed !== null}
        <Button variant="secondary" onclick={() => requestRun('same')}>Replay same deal</Button>
      {/if}
      <Button variant="primary" onclick={() => requestRun('new')}>Play</Button>
    {/if}
  {/snippet}
</Dialog>

<ConfirmDialog
  bind:show={confirmWipe}
  title="Clear the table?"
  message="Running this setup will clear everything currently on the table. This can be undone."
  confirmText="Clear and play"
  confirmVariant="danger"
  onconfirm={execute}
  oncancel={() => (confirmWipe = false)}
/>

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

  .config {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
</style>
