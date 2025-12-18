<script lang="ts">
  import type { PageData } from "./$types";
  import { projectsApi, ApiError } from "$lib/api";
  import { goto, invalidateAll } from "$app/navigation";
  import { Button, Dialog, Card, Badge } from "$lib/components";
  import { getBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildSettingsBreadcrumbs } from "$lib/utils/breadcrumbs";

  let { data }: { data: PageData } = $props();

  // Update breadcrumbs for this page
  const breadcrumbs = getBreadcrumbs();
  $effect(() => {
    breadcrumbs.set(
      buildSettingsBreadcrumbs(data.project.id, data.project.name)
    );
  });

  // Project details editing
  let isEditingProject = $state(false);
  let projectName = $state(data.project.name);
  let projectDescription = $state(data.project.description || "");
  let isSavingProject = $state(false);
  let projectErrorMessage = $state("");

  // Delete project
  let showDeleteDialog = $state(false);
  let deleteConfirmationName = $state("");
  let isDeletingProject = $state(false);
  let deleteErrorMessage = $state("");

  const isOwner = $derived(data.project.role === "Owner");
  const canEditProject = $derived(
    data.project.role === "Owner" || data.project.role === "Admin"
  );

  function startEditingProject() {
    isEditingProject = true;
    projectName = data.project.name;
    projectDescription = data.project.description || "";
    projectErrorMessage = "";
  }

  function cancelEditingProject() {
    isEditingProject = false;
    projectName = data.project.name;
    projectDescription = data.project.description || "";
    projectErrorMessage = "";
  }

  async function saveProjectDetails() {
    if (!projectName.trim()) {
      projectErrorMessage = "Project name is required";
      return;
    }

    isSavingProject = true;
    projectErrorMessage = "";

    try {
      await projectsApi.update(data.project.id, {
        name: projectName,
        description: projectDescription || undefined,
      });
      await invalidateAll();
      isEditingProject = false;
    } catch (err) {
      console.error("Error updating project:", err);
      if (err instanceof ApiError) {
        projectErrorMessage = err.message;
      } else {
        projectErrorMessage = "Failed to update project. Please try again.";
      }
    } finally {
      isSavingProject = false;
    }
  }

  function openDeleteDialog() {
    showDeleteDialog = true;
    deleteConfirmationName = "";
    deleteErrorMessage = "";
  }

  function closeDeleteDialog() {
    showDeleteDialog = false;
    deleteConfirmationName = "";
    deleteErrorMessage = "";
  }

  async function confirmDeleteProject() {
    if (deleteConfirmationName !== data.project.name) {
      deleteErrorMessage = "Project name does not match";
      return;
    }

    isDeletingProject = true;
    deleteErrorMessage = "";

    try {
      await projectsApi.delete(data.project.id);
      goto("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      if (err instanceof ApiError) {
        deleteErrorMessage = err.message;
      } else {
        deleteErrorMessage = "Failed to delete project. Please try again.";
      }
      isDeletingProject = false;
    }
  }

  function getRoleBadgeVariant(
    role: string
  ): "default" | "success" | "warning" | "danger" {
    switch (role) {
      case "Owner":
        return "danger";
      case "Admin":
        return "warning";
      case "Member":
        return "success";
      default:
        return "default";
    }
  }
</script>

<svelte:head>
  <title>Settings · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Manage settings for {data.project
      .name}. Update project details, manage users, and configure project options."
  />
</svelte:head>

<div class="tab-content">
  <div class="settings-section">
    <h2>Project Details</h2>

    <Card>
      {#if isEditingProject}
        <div class="form-group">
          <label for="projectName">Project Name</label>
          <input
            id="projectName"
            type="text"
            bind:value={projectName}
            placeholder="Enter project name"
            disabled={isSavingProject}
          />
        </div>

        <div class="form-group">
          <label for="projectDescription">Description</label>
          <textarea
            id="projectDescription"
            bind:value={projectDescription}
            placeholder="Enter project description (optional)"
            rows="3"
            disabled={isSavingProject}
          ></textarea>
        </div>

        {#if projectErrorMessage}
          <p class="error-message">{projectErrorMessage}</p>
        {/if}

        <div class="form-actions">
          <Button
            variant="secondary"
            onclick={cancelEditingProject}
            disabled={isSavingProject}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onclick={saveProjectDetails}
            disabled={isSavingProject}
          >
            {isSavingProject ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      {:else}
        <div class="project-info">
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">{data.project.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Description:</span>
            <span class="info-value"
              >{data.project.description || "No description"}</span
            >
          </div>
        </div>

        {#if canEditProject}
          <div class="card-actions">
            <Button variant="primary" size="sm" onclick={startEditingProject}>
              Edit Details
            </Button>
          </div>
        {/if}
      {/if}
    </Card>
  </div>

  <div class="settings-section">
    <h2>Project Users</h2>

    <Card>
      <div class="users-list">
        {#each data.users as user}
          <div class="user-item">
            <div class="user-info">
              {#if user.pictureUrl}
                <img
                  src={user.pictureUrl}
                  alt={user.name || user.email}
                  class="user-avatar"
                />
              {:else}
                <div class="user-avatar-placeholder">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              {/if}
              <div class="user-details">
                <div class="user-name">{user.name || user.email}</div>
                {#if user.name}
                  <div class="user-email">{user.email}</div>
                {/if}
              </div>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  {#if isOwner}
    <div class="settings-section danger-zone">
      <h2>Danger Zone</h2>

      <Card>
        <div class="danger-zone-content">
          <div>
            <h3>Delete Project</h3>
            <p>
              Once you delete a project, there is no going back. Please be
              certain.
            </p>
          </div>
          <Button variant="danger" onclick={openDeleteDialog}>
            Delete Project
          </Button>
        </div>
      </Card>
    </div>
  {/if}
</div>

<Dialog
  bind:show={showDeleteDialog}
  title="Delete Project"
  maxWidth="500px"
  onclose={closeDeleteDialog}
>
  <div class="delete-dialog-content">
    <p class="warning-text">
      This action cannot be undone. This will permanently delete the project
      <strong>{data.project.name}</strong> and all of its data.
    </p>

    <p>Please type <strong>{data.project.name}</strong> to confirm:</p>

    <input
      type="text"
      bind:value={deleteConfirmationName}
      placeholder="Enter project name"
      disabled={isDeletingProject}
      class="confirmation-input"
    />

    {#if deleteErrorMessage}
      <p class="error-message">{deleteErrorMessage}</p>
    {/if}
  </div>

  {#snippet actions()}
    <Button
      variant="secondary"
      onclick={closeDeleteDialog}
      disabled={isDeletingProject}
    >
      Cancel
    </Button>
    <Button
      variant="danger"
      onclick={confirmDeleteProject}
      disabled={isDeletingProject ||
        deleteConfirmationName !== data.project.name}
    >
      {isDeletingProject ? "Deleting..." : "Delete Project"}
    </Button>
  {/snippet}
</Dialog>

<style>
  .tab-content {
    max-width: 900px;
  }

  .settings-section {
    margin-bottom: 2.5rem;
  }

  .settings-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 1rem;
  }

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

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background);
    color: var(--color-text);
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .form-group input:disabled,
  .form-group textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .users-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .user-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background-secondary);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.125rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .user-email {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .danger-zone h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  .danger-zone p {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .danger-zone-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .delete-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .warning-text {
    color: var(--color-text);
    line-height: 1.6;
  }

  .confirmation-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background);
    color: var(--color-text);
    font-family: inherit;
  }

  .confirmation-input:focus {
    outline: none;
    border-color: var(--color-danger, #d32f2f);
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin: 0;
    padding: 0.75rem;
    background-color: #ffebee;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }

  @media (max-width: 768px) {
    .tab-content {
      padding: 1rem;
    }

    .danger-zone-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .user-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
  }
</style>
