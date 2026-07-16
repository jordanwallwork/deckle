<script lang="ts">
  // The Blueprint editor — the SECOND switchable view of the setup-editor page
  // (#111/#122). It edits the SAME in-memory GameSetup as the setup-script view
  // (#123) and relies on the page shell's single Save + validity badge; every
  // mutation here goes through the pure helpers in `blueprintEdit` and mutates
  // the shared `$state` doc in place, so no second save path exists.
  import {
    addBlueprint,
    deleteBlueprint,
    duplicateBlueprint,
    findBlueprintReferences,
    type GameSetup,
    type SetupValidationError,
    type ZoneScope
  } from '$lib/gamerunner';
  import { ConfirmDialog } from '$lib/components';
  import BlueprintDetail from './BlueprintDetail.svelte';

  let { doc, errors }: { doc: GameSetup; errors: SetupValidationError[] } = $props();

  const SCOPES: ZoneScope[] = ['seat', 'table', 'edge'];
  let selectedId = $state<string | null>(doc.blueprints[0]?.id ?? null);

  const selectedIndex = $derived(doc.blueprints.findIndex((b) => b.id === selectedId));
  const selected = $derived(selectedIndex >= 0 ? doc.blueprints[selectedIndex] : null);

  function add(scope: ZoneScope) {
    selectedId = addBlueprint(doc, scope).id;
  }

  function duplicate() {
    if (!selected) return;
    const copy = duplicateBlueprint(doc, selected.id);
    if (copy) selectedId = copy.id;
  }

  // Delete flow: warn first when setup steps still reference the blueprint
  // (#110/#111 delete-anytime with dangling-ref validation).
  let pendingDelete = $state<{ id: string; refs: string[] } | null>(null);

  function requestDelete() {
    if (!selected) return;
    pendingDelete = { id: selected.id, refs: findBlueprintReferences(doc, selected.id) };
    if (pendingDelete.refs.length === 0) confirmDelete();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteBlueprint(doc, pendingDelete.id);
    pendingDelete = null;
    selectedId = doc.blueprints[0]?.id ?? null;
  }

  function blueprintHasError(index: number): boolean {
    return errors.some((e) => e.docPath.startsWith(`blueprints[${index}]`));
  }
</script>

<div class="layout">
  <aside class="list">
    {#each SCOPES as scope (scope)}
      <div class="group">
        <div class="group-head">
          <span class="group-title">{scope}</span>
          <button class="add" title={`Add ${scope} blueprint`} onclick={() => add(scope)}>＋</button>
        </div>
        {#each doc.blueprints as bp, i (bp.id)}
          {#if bp.scope === scope}
            <button
              class="item"
              class:active={bp.id === selectedId}
              class:has-error={blueprintHasError(i)}
              onclick={() => (selectedId = bp.id)}
            >
              <span class="item-name">{bp.displayName}</span>
              <span class="item-zones">{bp.zones.length}</span>
            </button>
          {/if}
        {/each}
        {#if !doc.blueprints.some((b) => b.scope === scope)}
          <p class="none">No {scope} blueprints</p>
        {/if}
      </div>
    {/each}
  </aside>

  <section class="pane">
    {#if selected}
      <BlueprintDetail
        blueprint={selected}
        blueprintIndex={selectedIndex}
        {errors}
        onDuplicate={duplicate}
        onDelete={requestDelete}
      />
    {:else}
      <div class="placeholder">
        <p>No blueprint selected.</p>
        <p class="hint">Add a seat, table, or edge blueprint from the list to begin.</p>
      </div>
    {/if}
  </section>
</div>

{#if pendingDelete && pendingDelete.refs.length > 0}
  <ConfirmDialog
    show={true}
    title="Delete blueprint?"
    message={`This blueprint is still referenced by ${pendingDelete.refs.length} setup step${pendingDelete.refs.length === 1 ? '' : 's'} (${pendingDelete.refs.join(', ')}). Deleting it will leave those references invalid until you fix them. Delete anyway?`}
    confirmText="Delete anyway"
    confirmVariant="danger"
    onconfirm={confirmDelete}
    oncancel={() => (pendingDelete = null)}
  />
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 1.25rem;
    max-width: 1100px;
    margin: 0 auto;
    align-items: start;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.2rem;
    margin-bottom: 0.3rem;
  }
  .group-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }
  .add {
    border: none;
    background: none;
    color: var(--color-accent-fg);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0.2rem;
  }
  .add:hover {
    color: var(--color-accent-fg-hover);
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    background: none;
    color: var(--color-text-primary);
    padding: 0.35rem 0.5rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
  }
  .item:hover {
    background: var(--color-bg-subtle);
  }
  .item.active {
    background: color-mix(in srgb, var(--color-sage) 18%, transparent);
    border-color: var(--color-accent-fg);
  }
  .item.has-error {
    border-color: var(--color-danger);
  }
  .item-zones {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border-radius: 999px;
    padding: 0 0.4rem;
  }
  .none {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0.1rem 0.5rem;
  }
  .pane {
    min-width: 0;
  }
  .placeholder {
    color: var(--color-text-muted);
    text-align: center;
    padding: 3rem 1rem;
  }
  .hint {
    font-size: 0.85rem;
  }
</style>
