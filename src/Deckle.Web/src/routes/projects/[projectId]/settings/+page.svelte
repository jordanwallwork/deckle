<script lang="ts">
  import type { PageData } from "./$types";
  import { projectsApi, ApiError } from "$lib/api";
  import { goto, invalidateAll } from "$app/navigation";
  import { DeleteConfirmationDialog } from "$lib/components";
  import { setBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildSettingsBreadcrumbs } from "$lib/utils/breadcrumbs";
  import ProjectDetailsCard from "./_components/ProjectDetailsCard.svelte";
  import UserListCard from "./_components/UserListCard.svelte";
  import DangerZoneCard from "./_components/DangerZoneCard.svelte";
  import InviteUserDialog from "./_components/InviteUserDialog.svelte";

  let { data }: { data: PageData } = $props();

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(buildSettingsBreadcrumbs(data.project));
  });

  // Delete project
  let showDeleteDialog = $state(false);
  let isDeletingProject = $state(false);

  // Invite user
  let showInviteDialog = $state(false);

  const isOwner = $derived(data.project.role === "Owner");
  const canEditProject = $derived(
    data.project.role === "Owner" || data.project.role === "Admin"
  );
  const canInviteUsers = $derived(
    data.project.role === "Owner" || data.project.role === "Admin"
  );
  const canEditRoles = $derived(
    data.project.role === "Owner" || data.project.role === "Admin"
  );

  async function saveProjectDetails(name: string, description?: string) {
    await projectsApi.update(data.project.id, {
      name,
      description,
    });
    await invalidateAll();
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await projectsApi.updateUserRole(data.project.id, userId, newRole);
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError) {
        console.error("Failed to update user role:", err.message);
        alert(`Failed to update user role: ${err.message}`);
      } else {
        console.error("Failed to update user role:", err);
        alert("Failed to update user role. Please try again.");
      }
    }
  }

  async function handleDeleteProject() {
    isDeletingProject = true;

    try {
      await projectsApi.delete(data.project.id);
      goto("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      isDeletingProject = false;
      // Re-throw to let the dialog handle the error display if needed
      throw err;
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
    <ProjectDetailsCard
      project={data.project}
      canEdit={canEditProject}
      onSave={saveProjectDetails}
    />
  </div>

  <div class="settings-section">
    <h2>Project Users</h2>
    <UserListCard
      users={data.users}
      canInvite={canInviteUsers}
      canEditRoles={canEditRoles}
      onInviteClick={() => (showInviteDialog = true)}
      onRoleChange={handleRoleChange}
    />
  </div>

  {#if isOwner}
    <div class="settings-section">
      <h2>Danger Zone</h2>
      <DangerZoneCard onDeleteClick={() => (showDeleteDialog = true)} />
    </div>
  {/if}
</div>

<DeleteConfirmationDialog
  bind:show={showDeleteDialog}
  itemName={data.project.name}
  itemType="Project"
  onConfirm={handleDeleteProject}
  isDeleting={isDeletingProject}
/>

<InviteUserDialog
  bind:show={showInviteDialog}
  projectId={data.project.id}
/>

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
</style>
