<script lang="ts">
  import type { PageData } from './$types';
  import { Button, EditableText } from '$lib/components';
  import { gameSetupsApi, ApiError } from '$lib/api';
  import {
    validateGameSetup,
    computeIsValid,
    type GameSetup,
    type ProjectContext
  } from '$lib/gamerunner';
  import SetupScriptView from './_components/SetupScriptView.svelte';
  import BlueprintEditorView from './_components/BlueprintEditorView.svelte';

  let { data }: { data: PageData } = $props();

  /** Narrow the passed-through document into an editable GameSetup, filling any
   * missing top-level arrays so the editor never dereferences undefined. */
  function toGameSetup(raw: unknown): GameSetup {
    const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      version: 1,
      minPlayers: 1,
      maxPlayers: 4,
      ...base,
      options: Array.isArray(base.options) ? base.options : [],
      blueprints: Array.isArray(base.blueprints) ? base.blueprints : [],
      setup: Array.isArray(base.setup) ? base.setup : []
    } as GameSetup;
  }

  const projectContext: ProjectContext = { components: data.componentRefs };

  let name = $state(data.setup.name);
  let doc = $state(toGameSetup(data.setup.document));
  let view = $state<'script' | 'blueprints'>('script');

  // Live validation: re-runs on every edit because `doc` is deep `$state`.
  const errors = $derived(validateGameSetup(doc, projectContext));
  const isValid = $derived(errors.length === 0);

  let isSaving = $state(false);
  let saveMessage = $state('');

  const projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);

  async function handleSave() {
    isSaving = true;
    saveMessage = '';
    try {
      await gameSetupsApi.update(data.project.id, data.setup.id, {
        name,
        document: doc,
        isValid: computeIsValid(doc, projectContext)
      });
      saveMessage = 'Saved';
      setTimeout(() => (saveMessage = ''), 2000);
    } catch (err) {
      saveMessage = err instanceof ApiError ? `Error: ${err.message}` : 'Failed to save';
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head>
  <title>{name} - Setup editor - {data.project.name} - Deckle</title>
</svelte:head>

<div class="editor">
  <header class="bar">
    <div class="left">
      <a class="back" href={`${projectUrlBase}/tabletop`}>← Tabletop</a>
      <EditableText value={name} onSave={(n: string) => (name = n)} />
      <span class="validity" class:invalid={!isValid} title="Live validation result">
        {isValid ? '✓ Valid' : `⚠ ${errors.length} error${errors.length === 1 ? '' : 's'}`}
      </span>
    </div>

    <div class="right">
      <label class="players">
        Players
        <input class="num" type="number" min="1" bind:value={doc.minPlayers} />–
        <input class="num" type="number" min="1" bind:value={doc.maxPlayers} />
      </label>
      {#if saveMessage}
        <span class="save-msg" class:error={saveMessage.startsWith('Error')}>{saveMessage}</span>
      {/if}
      <Button variant="primary" onclick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab" class:active={view === 'script'} onclick={() => (view = 'script')}>
      Setup script
    </button>
    <button class="tab" class:active={view === 'blueprints'} onclick={() => (view = 'blueprints')}>
      Blueprints
    </button>
  </nav>

  <div class="canvas">
    {#if view === 'script'}
      <SetupScriptView {doc} components={data.componentRefs} {errors} />
    {:else}
      <BlueprintEditorView {doc} {errors} />
    {/if}
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
    background: var(--color-background);
  }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .back {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    text-decoration: none;
  }
  .back:hover {
    color: var(--color-accent-fg);
  }
  .left :global(.editable-text-display),
  .left :global(.editable-text-input) {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
  .validity {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-accent-fg);
  }
  .validity.invalid {
    color: var(--color-danger-fg);
  }
  .players {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .num {
    width: 3rem;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .save-msg {
    font-size: 0.85rem;
    color: var(--color-accent-fg);
  }
  .save-msg.error {
    color: var(--color-danger-fg);
  }
  .tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .tab {
    border: none;
    background: none;
    padding: 0.6rem 0.9rem;
    font: inherit;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tab.active {
    color: var(--color-text-primary);
    border-bottom-color: var(--color-accent-fg);
    font-weight: 600;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 1.5rem 1rem 4rem;
  }
</style>
