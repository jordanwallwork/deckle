<script lang="ts">
  import { Card, Button, Input, TextArea } from '$lib/components';
  import type { Project, ProjectVisibility } from '$lib/types';
  import { marked } from 'marked';

  let {
    project,
    canEdit,
    onSave
  }: {
    project: Project;
    canEdit: boolean;
    onSave: (name: string, description?: string, visibility?: ProjectVisibility) => Promise<void>;
  } = $props();

  let isEditing = $state(false);
  let projectName = $state(project.name);
  let projectDescription = $state(project.description || '');
  let projectVisibility = $state<ProjectVisibility>(project.visibility);
  let isSaving = $state(false);
  let errorMessage = $state('');
  let descriptionPreview = $state(false);

  const descriptionHtml = $derived(
    projectDescription
      ? (marked.parse(projectDescription, { breaks: true, gfm: true }) as string)
      : ''
  );

  const viewDescriptionHtml = $derived(
    project.description
      ? (marked.parse(project.description, { breaks: true, gfm: true }) as string)
      : ''
  );

  const VISIBILITY_LABELS: Record<ProjectVisibility, string> = {
    Private: 'Private — only project members can access',
    Teaser: 'Teaser — name and description are public',
    Public: 'Public — anyone can view the project'
  };

  function startEditing() {
    isEditing = true;
    projectName = project.name;
    projectDescription = project.description || '';
    projectVisibility = project.visibility;
    errorMessage = '';
    descriptionPreview = false;
  }

  function cancelEditing() {
    isEditing = false;
    projectName = project.name;
    projectDescription = project.description || '';
    projectVisibility = project.visibility;
    errorMessage = '';
    descriptionPreview = false;
  }

  async function handleSave() {
    if (!projectName.trim()) {
      errorMessage = 'Project name is required';
      return;
    }

    isSaving = true;
    errorMessage = '';

    try {
      await onSave(projectName, projectDescription || undefined, projectVisibility);
      isEditing = false;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Failed to update project';
    } finally {
      isSaving = false;
    }
  }
</script>

<Card>
  {#if isEditing}
    <div class="form-group">
      <label for="projectName">Project Name</label>
      <Input
        id="projectName"
        bind:value={projectName}
        placeholder="Enter project name"
        disabled={isSaving}
      />
    </div>

    <div class="form-group">
      <div class="desc-label-row">
        <label for="projectDescription">Description</label>
        <button
          type="button"
          class="preview-toggle"
          onclick={() => (descriptionPreview = !descriptionPreview)}
        >
          {descriptionPreview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {#if descriptionPreview}
        <div class="desc-preview">
          {#if projectDescription.trim()}
            {@html descriptionHtml}
          {:else}
            <span class="empty-preview">Nothing to preview yet.</span>
          {/if}
        </div>
      {:else}
        <TextArea
          id="projectDescription"
          bind:value={projectDescription}
          placeholder="Describe your project. Markdown supported: **bold**, *italic*, [links](https://...)"
          rows={4}
          disabled={isSaving}
        />
        <p class="field-hint">Supports Markdown: **bold**, *italic*, [text](url)</p>
      {/if}
    </div>

    <div class="form-group">
      <label for="projectVisibility">Visibility</label>
      <select id="projectVisibility" class="visibility-select" bind:value={projectVisibility} disabled={isSaving}>
        <option value="Private">Private</option>
        <option value="Teaser">Teaser</option>
        <option value="Public">Public</option>
      </select>
      <p class="field-hint">{VISIBILITY_LABELS[projectVisibility]}</p>
    </div>

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}

    <div class="form-actions">
      <Button variant="secondary" onclick={cancelEditing} disabled={isSaving}>Cancel</Button>
      <Button variant="primary" onclick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  {:else}
    <div class="project-info">
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">{project.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Visibility:</span>
        <span class="info-value visibility-value">
          <span class="visibility-dot" class:private={project.visibility === 'Private'} class:teaser={project.visibility === 'Teaser'} class:public={project.visibility === 'Public'}></span>
          {project.visibility}
        </span>
      </div>
      <div class="info-row description-row">
        <span class="info-label">Description:</span>
        <span class="info-value">
          {#if project.description}
            <div class="desc-rendered">
              {@html viewDescriptionHtml}
            </div>
          {:else}
            <span class="no-description">No description</span>
          {/if}
        </span>
      </div>
    </div>

    {#if canEdit}
      <div class="card-actions">
        <Button variant="primary" size="sm" onclick={startEditing}>Edit Details</Button>
      </div>
    {/if}
  {/if}
</Card>

<style>
  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .desc-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .desc-label-row label {
    margin-bottom: 0;
  }

  .preview-toggle {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-muted-teal);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .preview-toggle:hover {
    color: var(--color-sage);
  }

  .desc-preview {
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    font-size: 0.9375rem;
    color: var(--color-text);
    line-height: 1.6;
    min-height: 5rem;
  }

  .desc-preview :global(p) { margin: 0 0 0.75em 0; }
  .desc-preview :global(p:last-child) { margin-bottom: 0; }
  .desc-preview :global(strong) { font-weight: 700; }
  .desc-preview :global(em) { font-style: italic; }
  .desc-preview :global(a) { color: var(--color-muted-teal); text-decoration: underline; }
  .desc-preview :global(ul), .desc-preview :global(ol) { margin: 0.5em 0; padding-left: 1.5em; }

  .empty-preview {
    color: rgba(120, 160, 131, 0.6);
    font-style: italic;
  }

  .field-hint {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    margin: 0.375rem 0 0 0;
  }

  .visibility-select {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-size: 0.9375rem;
    font-family: inherit;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
  }

  .visibility-select:focus {
    outline: none;
    border-color: var(--color-muted-teal);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .project-info {
    margin-bottom: 1rem;
  }

  .info-row {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .description-row {
    align-items: flex-start;
  }

  .info-label {
    font-weight: 500;
    color: var(--color-text-secondary);
    min-width: 120px;
    flex-shrink: 0;
  }

  .info-value {
    color: var(--color-text);
    flex: 1;
  }

  .visibility-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .visibility-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .visibility-dot.private { background-color: var(--color-text-secondary); }
  .visibility-dot.teaser { background-color: #ffb142; }
  .visibility-dot.public { background-color: #2ed573; }

  .desc-rendered :global(p) { margin: 0 0 0.5em 0; font-size: 0.9375rem; }
  .desc-rendered :global(p:last-child) { margin-bottom: 0; }
  .desc-rendered :global(strong) { font-weight: 700; }
  .desc-rendered :global(em) { font-style: italic; }
  .desc-rendered :global(a) { color: var(--color-muted-teal); text-decoration: underline; }
  .desc-rendered :global(ul), .desc-rendered :global(ol) { margin: 0.5em 0; padding-left: 1.5em; font-size: 0.9375rem; }

  .no-description {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
    padding: 0.75rem;
    background-color: #ffebee;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }
</style>
