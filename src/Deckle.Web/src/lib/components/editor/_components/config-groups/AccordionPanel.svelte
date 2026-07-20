<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import { groupsForType, GROUP_META } from '../../capabilities';
  import { selectionGroupHasSetValues, groupSummary } from '../../groupModel';
  import { GROUP_COMPONENTS } from './groupRegistry';
  import { isGroupOpen, toggleGroupOpen } from './panelPrefs.svelte';
  import IdentityGroup from './IdentityGroup.svelte';
  import TypeSpecificFields from './type-specific/TypeSpecificFields.svelte';
  import { ChevronDownIcon, ChevronRightIcon } from '$lib/components/icons';

  /**
   * Variant A (ADR-0001 D5): collapsible accordion groups. Identity and the
   * type-specific fields are pinned open at the top; every other granted group
   * is a collapsible section whose header shows a set-indicator dot and a short
   * summary. Open state is remembered across selections via panelPrefs.
   */
  let { elements, dpi, update, seal }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const groups = $derived(groupsForType(el.type).filter((g) => g !== 'identity'));
</script>

<div class="accordion-panel">
  <!-- Pinned section: identity + type-specific fields -->
  <section class="pinned">
    <IdentityGroup {elements} {dpi} {update} {seal} />
    <TypeSpecificFields {elements} {dpi} {update} {seal} />
  </section>

  {#each groups as group (group)}
    {@const open = isGroupOpen(group)}
    {@const isSet = selectionGroupHasSetValues(elements, group)}
    {@const summary = groupSummary(el, group)}
    {@const GroupComponent = GROUP_COMPONENTS[group]}
    <section class="accordion-section" class:open>
      <button
        type="button"
        class="accordion-header"
        onclick={() => toggleGroupOpen(group)}
        aria-expanded={open}
      >
        <span class="chevron">
          {#if open}<ChevronDownIcon size={14} />{:else}<ChevronRightIcon size={14} />{/if}
        </span>
        <span class="group-label">{GROUP_META[group].label}</span>
        {#if isSet}<span class="set-dot" title="Has set values" aria-label="has set values"></span>{/if}
        {#if summary}<span class="summary">{summary}</span>{/if}
      </button>
      {#if open}
        <div class="accordion-body">
          <GroupComponent {elements} {dpi} {update} {seal} />
        </div>
      {/if}
    </section>
  {/each}
</div>

<style>
  .accordion-panel {
    display: flex;
    flex-direction: column;
  }

  .pinned {
    padding: 1rem 1rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .accordion-section {
    border-bottom: 1px solid var(--color-border);
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-text-primary);
  }

  .accordion-header:hover {
    background: var(--color-bg-subtle);
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-secondary);
  }

  .group-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .set-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent-fg);
    display: inline-block;
  }

  .summary {
    margin-left: auto;
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 45%;
  }

  .accordion-body {
    padding: 0 1rem 1rem;
  }
</style>
