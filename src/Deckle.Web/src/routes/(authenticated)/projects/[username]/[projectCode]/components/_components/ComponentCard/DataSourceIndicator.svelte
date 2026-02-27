<script lang="ts">
  import { Button } from '$lib/components';
  import type { CardComponent, GameBoardComponent, PlayerMatComponent } from '$lib/types';

  let {
    component,
    projectUrlBase,
    onLinkDataSource
  }: {
    component: CardComponent | GameBoardComponent | PlayerMatComponent;
    projectUrlBase: string;
    onLinkDataSource?: (component: CardComponent | GameBoardComponent | PlayerMatComponent) => void;
  } = $props();
</script>

<div class="design-links">
  <span class="design-link">
    Data Source:
    {#if component.dataSource}
      <a href="{projectUrlBase}/data-sources/{component.dataSource.id}" class="design-link"
        >{component.dataSource.name}</a
      >
    {:else}
      None
    {/if}
    {#if onLinkDataSource}
      <Button variant="text" size="sm" onclick={() => onLinkDataSource(component)}>
        ({component.dataSource ? 'Change' : 'Link'})
      </Button>
    {/if}
  </span>
</div>

<style>
  .design-links {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
  }

  .design-link {
    display: inline-block;
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .design-link > a,
  a.design-link {
    font-weight: 500;
  }

  .design-link > a:hover,
  a.design-link:hover {
    color: var(--color-sage);
    text-decoration: underline;
  }
</style>
