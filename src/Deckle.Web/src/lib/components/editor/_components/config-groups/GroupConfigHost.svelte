<script lang="ts">
  import type { TemplateElement } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { panelPrefs, setVariant } from './panelPrefs.svelte';
  import AccordionPanel from './AccordionPanel.svelte';
  import TabRailPanel from './TabRailPanel.svelte';

  /**
   * Hosts the two panel prototypes behind a dev toggle (ADR-0001 D5 decision
   * gate). Binds the group controls to the template store — including edit
   * sessions (D7) — and disables writes in read-only mode. Both variants stay
   * in the codebase; the owner picks the winner.
   */
  let {
    elements,
    dpi,
    readOnly = false
  }: { elements: TemplateElement[]; dpi: number; readOnly?: boolean } = $props();

  // Initialise the variant from `?panel=a|b` once (dev toggle via query param).
  onMount(() => {
    const p = $page.url.searchParams.get('panel');
    if (p === 'a' || p === 'b') setVariant(p);
  });

  function update(updates: Partial<TemplateElement>, sessionKey?: string) {
    if (readOnly) return;
    for (const el of elements) {
      templateStore.updateElement(el.id, updates, sessionKey);
    }
  }

  function seal() {
    templateStore.sealSession();
  }
</script>

<div class="group-config-host">
  <div class="variant-toggle" role="group" aria-label="Config panel variant">
    <span class="toggle-label">Panel</span>
    <div class="toggle-buttons">
      <button
        type="button"
        class:active={panelPrefs.variant === 'a'}
        onclick={() => setVariant('a')}
        title="Variant A — accordion groups">A</button
      >
      <button
        type="button"
        class:active={panelPrefs.variant === 'b'}
        onclick={() => setVariant('b')}
        title="Variant B — vertical tab rail">B</button
      >
    </div>
  </div>

  {#if panelPrefs.variant === 'a'}
    <AccordionPanel {elements} {dpi} {update} {seal} />
  {:else}
    <TabRailPanel {elements} {dpi} {update} {seal} />
  {/if}
</div>

<style>
  .group-config-host {
    display: flex;
    flex-direction: column;
  }

  .variant-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
  }

  .toggle-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-secondary);
  }

  .toggle-buttons {
    display: flex;
    gap: 2px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 2px;
  }

  .toggle-buttons button {
    width: 1.75rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .toggle-buttons button.active {
    background: var(--color-accent-solid);
    color: white;
  }
</style>
