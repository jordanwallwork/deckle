<script lang="ts">
  import { config } from '$lib/config';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let showCreateDialog = $state(false);
  let projectName = $state('');
  let projectDescription = $state('');
  let isCreating = $state(false);

  async function createProject() {
    if (!projectName.trim()) return;

    isCreating = true;
    try {
      const response = await fetch(`${config.apiUrl}/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription
        })
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      isCreating = false;
    }
  }

  function closeDialog() {
    showCreateDialog = false;
    projectName = '';
    projectDescription = '';
  }
</script>

<div class="container">
  <header>
    <h1>Projects</h1>
    <button class="create-button" onclick={() => (showCreateDialog = true)}>
      + New Project
    </button>
  </header>

  {#if data.projects.length === 0}
    <div class="empty-state">
      <p class="empty-message">No projects yet</p>
      <p class="empty-subtitle">Create your first project to get started</p>
    </div>
  {:else}
    <div class="projects-grid">
      {#each data.projects as project}
        <a href="/projects/{project.id}" class="project-card">
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
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showCreateDialog}
  <div class="dialog-overlay" onclick={closeDialog}>
    <div class="dialog" onclick={(e) => e.stopPropagation()}>
      <h2>Create New Project</h2>
      <form onsubmit={(e) => { e.preventDefault(); createProject(); }}>
        <div class="form-group">
          <label for="name">Project Name</label>
          <input
            id="name"
            type="text"
            bind:value={projectName}
            required
            autofocus
            placeholder="My Game Project"
          />
        </div>
        <div class="form-group">
          <label for="description">Description (optional)</label>
          <textarea
            id="description"
            bind:value={projectDescription}
            rows="3"
            placeholder="A brief description of your game..."
          ></textarea>
        </div>
        <div class="dialog-actions">
          <button type="button" class="secondary" onclick={closeDialog}>Cancel</button>
          <button type="submit" class="primary" disabled={isCreating || !projectName.trim()}>
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-sage);
  }

  .create-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .project-card {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .project-card:hover {
    border-color: var(--color-muted-teal);
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(120, 160, 131, 0.2);
  }

  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
  }

  .project-card h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    flex: 1;
  }

  .role-badge {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .project-description {
    color: var(--color-muted-teal);
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .project-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--color-teal-grey);
  }

  .project-date {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background-color: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-sage);
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .form-group textarea {
    resize: vertical;
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .dialog-actions button {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .dialog-actions button.secondary {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .dialog-actions button.secondary:hover {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .dialog-actions button.primary {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .dialog-actions button.primary:hover {
    background-color: var(--color-sage);
  }

  .dialog-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dialog-actions button:disabled:hover {
    background-color: var(--color-muted-teal);
  }
</style>
