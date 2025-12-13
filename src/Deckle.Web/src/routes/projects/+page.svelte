<script lang="ts">
  import { projectsApi, ApiError } from '$lib/api';
  import type { PageData } from './$types';
  import PageLayout from '$lib/components/PageLayout.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import { FormField, Input, TextArea } from '$lib/components/forms';
  import ProjectCard from './_components/ProjectCard.svelte';
  import EmptyProjectsState from './_components/EmptyProjectsState.svelte';

  let { data }: { data: PageData } = $props();

  const projectCount = $derived(data.projects.length);

  let showCreateDialog = $state(false);
  let projectName = $state('');
  let projectDescription = $state('');
  let isCreating = $state(false);

  function openCreateDialog() {
    showCreateDialog = true;
  }

  async function createProject() {
    if (!projectName.trim()) return;

    isCreating = true;
    try {
      await projectsApi.create({
        name: projectName,
        description: projectDescription
      });

      window.location.reload();
    } catch (error) {
      console.error('Failed to create project:', error);
      if (error instanceof ApiError) {
        alert(`Failed to create project: ${error.message}`);
      } else {
        alert('Failed to create project. Please try again.');
      }
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

<svelte:head>
  <title>Projects · Deckle</title>
  <meta name="description" content="Manage your game design projects. Create and organize game components, data sources, and image libraries for your tabletop games." />
</svelte:head>

<PageLayout>
  {#snippet header()}
    <div class="header-text">
      <h1>Projects</h1>
      <p class="subtitle">Manage your game design projects</p>
    </div>
  {/snippet}

  {#snippet headerActions()}
    <button class="create-button" onclick={() => (showCreateDialog = true)}>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      New Project
    </button>
  {/snippet}

  {#if data.projects.length === 0}
    <EmptyProjectsState onCreateClick={openCreateDialog} />
  {:else}
    <div class="projects-grid">
      {#each data.projects as project}
        <ProjectCard {project} />
      {/each}
    </div>
  {/if}
</PageLayout>

<Dialog bind:show={showCreateDialog} title="Create New Project" onclose={closeDialog}>
  <form onsubmit={(e) => { e.preventDefault(); createProject(); }}>
    <FormField label="Project Name" name="name" required>
      <Input
        id="name"
        bind:value={projectName}
        placeholder="My Game Project"
        required
        autofocus
      />
    </FormField>

    <FormField label="Description (optional)" name="description">
      <TextArea
        id="description"
        bind:value={projectDescription}
        rows={3}
        placeholder="A brief description of your game..."
      />
    </FormField>
  </form>

  {#snippet actions()}
    <button type="button" class="secondary" onclick={closeDialog}>Cancel</button>
    <button type="button" class="primary" disabled={isCreating || !projectName.trim()} onclick={createProject}>
      {isCreating ? 'Creating...' : 'Create Project'}
    </button>
  {/snippet}
</Dialog>

<style>
  .header-text h1 {
    font-size: 1.875rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .create-button {
    background-color: white;
    color: var(--color-sage);
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }

  .create-button svg {
    width: 18px;
    height: 18px;
  }

  .create-button:hover {
    background-color: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }
</style>
