<script lang="ts">
  import { Card, Badge } from '$lib/components';
  import type { Project, ProjectVisibility } from '$lib/types';
  import { marked } from 'marked';

  let {
    project
  }: {
    project: Project;
  } = $props();

  const VISIBILITY_LABELS: Record<ProjectVisibility, string> = {
    Private: 'Private',
    Teaser: 'Teaser',
    Public: 'Public'
  };

  const VISIBILITY_VARIANTS: Record<ProjectVisibility, 'default' | 'success' | 'warning'> = {
    Private: 'default',
    Teaser: 'warning',
    Public: 'success'
  };

  // Strip markdown to plain text for the card preview
  const descriptionPlain = $derived(() => {
    if (!project.description) return '';
    const html = marked.parse(project.description, { breaks: true, gfm: true }) as string;
    return html.replace(/<[^>]*>/g, '').trim();
  });
</script>

<Card href="/projects/{project.ownerUsername}/{project.code}">
  <div class="project-header">
    <h2>{project.name}</h2>
    <div class="badges">
      <Badge variant={VISIBILITY_VARIANTS[project.visibility]}>{VISIBILITY_LABELS[project.visibility]}</Badge>
      <Badge variant="default">{project.role}</Badge>
    </div>
  </div>
  {#if project.description}
    <p class="project-description">{descriptionPlain()}</p>
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

  .badges {
    display: flex;
    gap: 0.375rem;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .project-description {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.5;
    font-size: 0.875rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
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
