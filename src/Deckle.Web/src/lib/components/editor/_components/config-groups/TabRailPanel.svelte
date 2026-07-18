<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { PropertyGroup } from '../../capabilities';
  import { groupsForType, GROUP_META } from '../../capabilities';
  import { selectionGroupHasSetValues } from '../../groupModel';
  import { GROUP_COMPONENTS } from './groupRegistry';
  import { panelPrefs, setActiveTab } from './panelPrefs.svelte';
  import IdentityGroup from './IdentityGroup.svelte';
  import TypeSpecificFields from './type-specific/TypeSpecificFields.svelte';

  /**
   * Variant B (ADR-0001 D5): a narrow vertical icon tab rail down the panel
   * edge, one granted group per tab, with a set-indicator dot per tab. Identity
   * + type-specific fields stay pinned at the top. Active tab is remembered
   * across selections (panelPrefs), falling back when the group isn't granted.
   */
  let { elements, dpi, update, seal }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const groups = $derived<PropertyGroup[]>(groupsForType(el.type).filter((g) => g !== 'identity'));

  // Resolve the active tab against the current element's granted groups.
  const active = $derived<PropertyGroup | undefined>(
    groups.includes(panelPrefs.activeTab) ? panelPrefs.activeTab : groups[0]
  );
  const ActiveComponent = $derived(active ? GROUP_COMPONENTS[active] : undefined);
</script>

<div class="tab-panel">
  <section class="pinned">
    <IdentityGroup {elements} {dpi} {update} {seal} />
    <TypeSpecificFields {elements} {dpi} {update} {seal} />
  </section>

  {#if groups.length > 0}
    <div class="tab-layout">
      <nav class="tab-rail" aria-label="Property groups">
        {#each groups as group (group)}
          <button
            type="button"
            class="tab"
            class:active={active === group}
            onclick={() => setActiveTab(group)}
            title={GROUP_META[group].label}
            aria-label={GROUP_META[group].label}
            aria-pressed={active === group}
          >
            <span class="glyph">{GROUP_META[group].glyph}</span>
            {#if selectionGroupHasSetValues(elements, group)}
              <span class="set-dot" aria-label="has set values"></span>
            {/if}
          </button>
        {/each}
      </nav>

      <div class="tab-content">
        {#if active}
          <h4 class="tab-title">{GROUP_META[active].label}</h4>
          {#if ActiveComponent}
            <ActiveComponent {elements} {dpi} {update} {seal} />
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
  }

  .pinned {
    padding: 1rem 1rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .tab-layout {
    display: flex;
    align-items: stretch;
  }

  .tab-rail {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
  }

  .tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: transparent;
    border: none;
    border-left: 2px solid transparent;
    cursor: pointer;
    color: var(--color-text-secondary);
  }

  .tab:hover {
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .tab.active {
    background: var(--color-surface);
    color: var(--color-accent-fg);
    border-left-color: var(--color-accent-fg);
  }

  .glyph {
    font-size: 1rem;
    line-height: 1;
  }

  .set-dot {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent-fg);
  }

  .tab-content {
    flex: 1 1 0;
    min-width: 0;
    padding: 1rem;
  }

  .tab-title {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
</style>
