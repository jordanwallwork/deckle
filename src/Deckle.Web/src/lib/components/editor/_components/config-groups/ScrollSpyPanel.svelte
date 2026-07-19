<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { PropertyGroup } from '../../capabilities';
  import { groupsForType, GROUP_META } from '../../capabilities';
  import { selectionGroupHasSetValues } from '../../groupModel';
  import { GROUP_COMPONENTS } from './groupRegistry';
  import { setActiveTab } from './panelPrefs.svelte';
  import IdentityGroup from './IdentityGroup.svelte';
  import TypeSpecificFields from './type-specific/TypeSpecificFields.svelte';

  /**
   * Variant C (ADR-0001 D5): the vertical tab rail becomes a sticky scroll-spy.
   * Every granted group renders in one long list; the rail stays pinned while
   * the list scrolls, the active tab tracks which section is in view, and
   * clicking a tab scrolls to its section.
   */
  let { elements, dpi, update, seal }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const groups = $derived<PropertyGroup[]>(groupsForType(el.type).filter((g) => g !== 'identity'));

  let activeGroup = $state<PropertyGroup>();
  let rootEl = $state<HTMLElement>();
  const sectionNodes = new Map<PropertyGroup, HTMLElement>();
  const visible = new Set<PropertyGroup>();
  let observer: IntersectionObserver | undefined;

  // Keep a valid active tab as the element (and its granted groups) changes.
  $effect(() => {
    if (!activeGroup || !groups.includes(activeGroup)) activeGroup = groups[0];
  });

  /** Action: register a section node for scroll-spy observation. */
  function register(node: HTMLElement, group: PropertyGroup) {
    node.dataset.group = group;
    sectionNodes.set(group, node);
    observer?.observe(node);
    return {
      destroy() {
        observer?.unobserve(node);
        sectionNodes.delete(group);
        visible.delete(group);
      }
    };
  }

  /** Nearest scrollable ancestor, so the observer measures the right viewport. */
  function findScrollParent(node: HTMLElement): Element | null {
    let cur = node.parentElement;
    while (cur) {
      const oy = getComputedStyle(cur).overflowY;
      if (oy === 'auto' || oy === 'scroll') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function setActive(group: PropertyGroup) {
    activeGroup = group;
    setActiveTab(group); // keep variant B/C in sync (remembered across selections)
  }

  $effect(() => {
    // IntersectionObserver is absent in SSR / some test environments; the rail
    // still renders and click-to-scroll works, only live spy tracking is off.
    if (!rootEl || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const g = (e.target as HTMLElement).dataset.group as PropertyGroup;
          if (e.isIntersecting) visible.add(g);
          else visible.delete(g);
        }
        // Active = the topmost (DOM order) section currently in the spy band.
        const next = groups.find((g) => visible.has(g));
        if (next && next !== activeGroup) setActive(next);
      },
      { root: findScrollParent(rootEl), rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );
    observer = obs;
    for (const node of sectionNodes.values()) obs.observe(node);
    return () => obs.disconnect();
  });

  function scrollTo(group: PropertyGroup) {
    setActive(group);
    sectionNodes.get(group)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="spy-panel" bind:this={rootEl}>
  {#if groups.length > 0}
    <nav class="tab-rail" aria-label="Property groups">
      {#each groups as group (group)}
        <button
          type="button"
          class="tab"
          class:active={activeGroup === group}
          onclick={() => scrollTo(group)}
          title={GROUP_META[group].label}
          aria-label={GROUP_META[group].label}
          aria-pressed={activeGroup === group}
        >
          <span class="glyph">{GROUP_META[group].glyph}</span>
          {#if selectionGroupHasSetValues(elements, group)}
            <span class="set-dot" aria-label="has set values"></span>
          {/if}
        </button>
      {/each}
    </nav>
  {/if}

  <div class="sections">
    <section class="pinned-section">
      <IdentityGroup {elements} {dpi} {update} {seal} />
      <TypeSpecificFields {elements} {dpi} {update} {seal} />
    </section>

    {#each groups as group (group)}
      {@const GroupComponent = GROUP_COMPONENTS[group]}
      <section class="group-section" use:register={group}>
        <h4 class="section-title">{GROUP_META[group].label}</h4>
        <GroupComponent {elements} {dpi} {update} {seal} />
      </section>
    {/each}
  </div>
</div>

<style>
  .spy-panel {
    display: flex;
    align-items: flex-start;
  }

  .tab-rail {
    position: sticky;
    top: 0;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
    z-index: 1;
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

  .sections {
    flex: 1 1 0;
    min-width: 0;
  }

  .pinned-section {
    padding: 1rem 1rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .group-section {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    scroll-margin-top: 0.5rem;
  }

  .section-title {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
</style>
