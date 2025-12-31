<script lang="ts">
  import { Card, Button, Input, TextArea } from "$lib/components";
  import type { Project } from "$lib/types";

  let {
    project,
    canEdit,
    onSave,
  }: {
    project: Project;
    canEdit: boolean;
    onSave: (name: string, description?: string) => Promise<void>;
  } = $props();

  let isEditing = $state(false);
  let projectName = $state(project.name);
  let projectDescription = $state(project.description || "");
  let isSaving = $state(false);
  let errorMessage = $state("");

  function startEditing() {
    isEditing = true;
    projectName = project.name;
    projectDescription = project.description || "";
    errorMessage = "";
  }

  function cancelEditing() {
    isEditing = false;
    projectName = project.name;
    projectDescription = project.description || "";
    errorMessage = "";
  }

  async function handleSave() {
    if (!projectName.trim()) {
      errorMessage = "Project name is required";
      return;
    }

    isSaving = true;
    errorMessage = "";

    try {
      await onSave(projectName, projectDescription || undefined);
      isEditing = false;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Failed to update project";
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
      <label for="projectDescription">Description</label>
      <TextArea
        id="projectDescription"
        bind:value={projectDescription}
        placeholder="Enter project description (optional)"
        rows={3}
        disabled={isSaving}
      />
    </div>

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}

    <div class="form-actions">
      <Button variant="secondary" onclick={cancelEditing} disabled={isSaving}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  {:else}
    <div class="project-info">
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">{project.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Description:</span>
        <span class="info-value">{project.description || "No description"}</span>
      </div>
    </div>

    {#if canEdit}
      <div class="card-actions">
        <Button variant="primary" size="sm" onclick={startEditing}>
          Edit Details
        </Button>
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

  .info-label {
    font-weight: 500;
    color: var(--color-text-secondary);
    min-width: 120px;
  }

  .info-value {
    color: var(--color-text);
    flex: 1;
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
