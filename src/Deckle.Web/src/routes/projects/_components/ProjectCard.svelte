<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import type { Project } from '$lib/types';

  let {
    project
  }: {
    project: Project;
  } = $props();
</script>

<Card href="/projects/{project.id}">
  <div class="project-header">
    <h2>{project.name}</h2>
    <span class="role-badge">{project.role}</span>
  </div>
  {#if project.description}
    <p class="project-description">{project.description}</p>
  {/if}
  <div class="project-footer">
    <span class="project-date">
      Created {new Date(project.createdAt).toLocaleDateString()}
    </span>
  </div>
</Card>

<style>
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
    gap: 0.75rem;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .role-badge {
    background-color: rgba(120, 160, 131, 0.1);
    color: var(--color-sage);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .project-description {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.5;
    font-size: 0.875rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .project-footer {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .project-date {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }
</style>
