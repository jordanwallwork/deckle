<script lang="ts">
  import { projectsApi, ApiError } from '$lib/api';
  import type { PageData } from './$types';
  import { Button, EmptyState, Dialog } from '$lib/components';
  import { FormField, Input, TextArea } from '$lib/components/forms';
  import ProjectCard from './_components/ProjectCard.svelte';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import { goto } from '$app/navigation';
  import { type ValidationErrorResponse, getValidationErrors, getFieldValidation, getGeneralErrors } from '$lib/types';

  let { data }: { data: PageData } = $props();

  let showCreateDialog = $state(false);
  let projectName = $state('');
  let projectCode = $state('');
  let projectDescription = $state('');
  let isCreating = $state(false);
  let validationErrors = $state<ValidationErrorResponse | null>(null);
  let generalError = $state<string | null>(null);
  let isProjectCodePristine = $state(true);

  // Derived field validation states
  const nameValidation = $derived(getFieldValidation(validationErrors, 'name'));
  const codeValidation = $derived(getFieldValidation(validationErrors, 'code'));
  const generalErrors = $derived(getGeneralErrors(validationErrors));

  function generateCodeFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  function handleProjectNameInput(value: string): void {
    if (isProjectCodePristine) {
      projectCode = generateCodeFromName(value);
    }
  }

  function handleProjectCodeInput(): void {
    isProjectCodePristine = false;
  }

  function openCreateDialog(): void {
    showCreateDialog = true;
  }

  async function createProject(): Promise<void> {
    if (!projectName.trim() || !projectCode.trim()) return;

    isCreating = true;
    validationErrors = null;
    generalError = null;
    try {
      const project = await projectsApi.create({
        name: projectName,
        code: projectCode,
        description: projectDescription
      });

      // Navigate to the newly created project
      await goto(`/projects/${project.ownerUsername}/${project.code}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      const validation = getValidationErrors(error);
      if (validation) {
        validationErrors = validation;
      } else if (error instanceof ApiError) {
        generalError = error.message;
      } else {
        generalError = 'Failed to create project. Please try again.';
      }
    } finally {
      isCreating = false;
    }
  }

  function closeDialog(): void {
    showCreateDialog = false;
    projectName = '';
    projectCode = '';
    projectDescription = '';
    validationErrors = null;
    generalError = null;
    isProjectCodePristine = true;
  }
</script>

<svelte:head>
  <title>Projects · Deckle</title>
  <meta
    name="description"
    content="Manage your game design projects. Create and organize game components, data sources, and image libraries for your tabletop games."
  />
</svelte:head>

<PageHeader>
  <div>
    <h1>Projects</h1>
    <p class="subtitle">Manage your game design projects</p>
  </div>

  {#snippet headerActions()}
    <Button variant="primary" onclick={() => (showCreateDialog = true)} class="header-button">
      {#snippet icon()}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
      {/snippet}
      New Project
    </Button>
  {/snippet}
</PageHeader>

{#if data.projects.length === 0}
  <EmptyState
    title="No projects yet"
    subtitle="Create your first project to get started"
    actionText="Create Project"
    actionOnClick={openCreateDialog}
  >
    {#snippet icon()}
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    {/snippet}
  </EmptyState>
{:else}
  <div class="projects-grid">
    {#each data.projects as project}
      <ProjectCard {project} />
    {/each}
  </div>
{/if}

<Dialog bind:show={showCreateDialog} title="Create New Project" onclose={closeDialog}>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createProject();
    }}
  >
    <FormField label="Project Name" name="name" required error={nameValidation.messages[0]}>
      <Input id="name" bind:value={projectName} placeholder="My Game Project" required error={nameValidation.invalid} oninput={handleProjectNameInput} />
    </FormField>

    <FormField label="Project Code" name="code" required hint={codeValidation.invalid ? undefined : 'Only lowercase letters, numbers, and dashes allowed'} error={codeValidation.messages[0]}>
      <Input id="code" bind:value={projectCode} placeholder="my-game-project" pattern="^[a-z0-9-]+$" required error={codeValidation.invalid} oninput={handleProjectCodeInput} />
    </FormField>

    <FormField label="Description (optional)" name="description">
      <TextArea
        id="description"
        bind:value={projectDescription}
        rows={3}
        placeholder="A brief description of your game..."
      />
    </FormField>

    {#if generalError}
      <div class="general-error">{generalError}</div>
    {/if}
    {#each generalErrors as error}
      <div class="general-error">{error}</div>
    {/each}
  </form>

  {#snippet actions()}
    <Button variant="secondary" onclick={closeDialog}>Cancel</Button>
    <Button variant="primary" disabled={isCreating || !projectName.trim() || !projectCode.trim()} onclick={createProject}>
      {isCreating ? 'Creating...' : 'Create Project'}
    </Button>
  {/snippet}
</Dialog>

<style>
  .subtitle {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .projects-grid {
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  .general-error {
    padding: 0.75rem 1rem;
    background-color: rgba(211, 47, 47, 0.1);
    border: 1px solid rgba(211, 47, 47, 0.3);
    border-radius: 6px;
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
