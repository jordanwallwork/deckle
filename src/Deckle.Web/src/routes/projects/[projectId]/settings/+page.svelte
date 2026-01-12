<script lang="ts">
  import type { PageData } from './$types';
  import { projectsApi, ApiError } from '$lib/api';
  import { goto, invalidateAll } from '$app/navigation';
  import { DeleteConfirmationDialog, ConfirmDialog, TabContent } from '$lib/components';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { buildSettingsBreadcrumbs } from '$lib/utils/breadcrumbs';
  import ProjectDetailsCard from './_components/ProjectDetailsCard.svelte';
  import UserListCard from './_components/UserListCard.svelte';
  import DangerZoneCard from './_components/DangerZoneCard.svelte';
  import InviteUserDialog from './_components/InviteUserDialog.svelte';

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

  // Remove user
  let showRemoveDialog = $state(false);
  let userToRemove = $state<{ userId: string; userName: string; role: string } | null>(null);
  let isRemovingUser = $state(false);

  const isOwner = $derived(data.project.role === 'Owner');
  const canEditProject = $derived(data.project.role === 'Owner' || data.project.role === 'Admin');
  const canInviteUsers = $derived(data.project.role === 'Owner' || data.project.role === 'Admin');
  const canEditRoles = $derived(data.project.role === 'Owner' || data.project.role === 'Admin');
  const currentUserId = $derived(data.user?.id);

  async function saveProjectDetails(name: string, description?: string) {
    await projectsApi.update(data.project.id, {
      name,
      description
    });
    await invalidateAll();
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await projectsApi.updateUserRole(data.project.id, userId, newRole);
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Failed to update user role:', err.message);
        alert(`Failed to update user role: ${err.message}`);
      } else {
        console.error('Failed to update user role:', err);
        alert('Failed to update user role. Please try again.');
      }
    }
  }

  async function handleRemoveUserClick(userId: string, userName: string, role: string) {
    userToRemove = { userId, userName, role };
    showRemoveDialog = true;
  }

  async function handleRemoveUserConfirm() {
    if (!userToRemove) return;

    isRemovingUser = true;

    try {
      await projectsApi.removeUser(data.project.id, userToRemove.userId);

      // If current user removed themselves, redirect to projects list
      if (userToRemove.userId === currentUserId) {
        goto('/projects');
      } else {
        // Otherwise just refresh the user list
        await invalidateAll();
        showRemoveDialog = false;
        userToRemove = null;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Failed to remove user:', err.message);
        alert(`Failed to remove user: ${err.message}`);
      } else {
        console.error('Failed to remove user:', err);
        alert('Failed to remove user. Please try again.');
      }
    } finally {
      isRemovingUser = false;
    }
  }

  function handleRemoveUserCancel() {
    showRemoveDialog = false;
    userToRemove = null;
  }

  async function handleDeleteProject() {
    isDeletingProject = true;

    try {
      await projectsApi.delete(data.project.id);
      goto('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
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

<TabContent>
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
      {currentUserId}
      canInvite={canInviteUsers}
      {canEditRoles}
      onInviteClick={() => (showInviteDialog = true)}
      onRoleChange={handleRoleChange}
      onRemoveUser={handleRemoveUserClick}
    />
  </div>

  {#if isOwner}
    <div class="settings-section">
      <h2>Danger Zone</h2>
      <DangerZoneCard onDeleteClick={() => (showDeleteDialog = true)} />
    </div>
  {/if}
</TabContent>

<DeleteConfirmationDialog
  bind:show={showDeleteDialog}
  itemName={data.project.name}
  itemType="Project"
  onConfirm={handleDeleteProject}
  isDeleting={isDeletingProject}
/>

<InviteUserDialog bind:show={showInviteDialog} projectId={data.project.id} />

<ConfirmDialog
  bind:show={showRemoveDialog}
  title={userToRemove?.userId === currentUserId ? 'Leave Project' : 'Remove User'}
  message={userToRemove?.userId === currentUserId
    ? 'Are you sure you want to leave this project? You will lose access to all project data.'
    : `Are you sure you want to remove ${userToRemove?.userName} from this project?${
        userToRemove?.role === 'Admin' ? ' This user is an Admin and will lose all access.' : ''
      }`}
  confirmText={userToRemove?.userId === currentUserId ? 'Leave' : 'Remove'}
  cancelText="Cancel"
  confirmVariant="danger"
  onconfirm={handleRemoveUserConfirm}
  oncancel={handleRemoveUserCancel}
/>

<style>
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
