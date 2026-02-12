<script lang="ts">
  import type { CardComponent, PlayerMatComponent } from '$lib/types';

  let {
    component,
    projectUrlBase,
    canEdit = false
  }: {
    component: CardComponent | PlayerMatComponent;
    projectUrlBase: string;
    canEdit?: boolean;
  } = $props();
</script>

<div class="design-links" style:margin-top="0.5rem">
  <a href="{projectUrlBase}/components/{component.id}/front" class="design-link">
    {canEdit ? 'Edit' : 'View'} Front
  </a>
  <span class="design-link-separator">•</span>
  <a href="{projectUrlBase}/components/{component.id}/back" class="design-link">
    {canEdit ? 'Edit' : 'View'} Back
  </a>
  <span class="design-link-separator">•</span>
  <a href="{projectUrlBase}/export?components={component.id}" class="design-link"> Export </a>
</div>

<style>
  .design-links {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
  }

  .design-link,
  .design-link-separator {
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
