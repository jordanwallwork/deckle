<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/forms/FormField.svelte';
  import Input from '$lib/components/forms/Input.svelte';
  import Select from '$lib/components/forms/Select.svelte';
  import { projectsApi, ApiError } from '$lib/api';
  import { invalidateAll } from '$app/navigation';

  let {
    show = $bindable(),
    projectId,
    onInviteSent
  }: {
    show: boolean;
    projectId: string;
    onInviteSent?: () => void;
  } = $props();

  let email = $state('');
  let role = $state('Collaborator');
  let isSubmitting = $state(false);
  let error = $state<string | undefined>(undefined);

  const roleDescriptions = {
    Admin: 'Can manage project settings, invite users, and delete components',
    Collaborator: 'Can view, create, and edit components',
    Viewer: 'Can only view components (read-only access)'
  };

  $effect(() => {
    if (!show) {
      // Reset state when dialog closes
      email = '';
      role = 'Collaborator';
      error = undefined;
    }
  });

  async function handleSubmit() {
    error = undefined;

    if (!email.trim()) {
      error = 'Email is required';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      error = 'Please enter a valid email address';
      return;
    }

    isSubmitting = true;

    try {
      await projectsApi.inviteUser(projectId, { email: email.trim(), role });

      // Notify parent
      onInviteSent?.();

      // Close dialog
      show = false;

      // Refresh data
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'Failed to send invitation. Please try again.';
      }
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    show = false;
  }
</script>

<Dialog bind:show title="Invite Collaborator" onclose={handleCancel}>
  {#snippet children()}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <FormField label="Email Address" name="email" required {error}>
        <Input
          bind:value={email}
          type="email"
          id="email"
          placeholder="colleague@example.com"
          required
          disabled={isSubmitting}
        />
      </FormField>

      <FormField label="Role" name="role" required>
        <Select bind:value={role} id="role" disabled={isSubmitting}>
          <option value="Admin">Admin</option>
          <option value="Collaborator">Collaborator</option>
          <option value="Viewer">Viewer</option>
        </Select>
      </FormField>

      <div class="role-description">
        <strong>{role}:</strong>
        {roleDescriptions[role as keyof typeof roleDescriptions]}
      </div>
    </form>
  {/snippet}

  {#snippet actions()}
    <Button variant="secondary" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
    <Button onclick={handleSubmit} disabled={isSubmitting}>
      {isSubmitting ? 'Sending...' : 'Send Invitation'}
    </Button>
  {/snippet}
</Dialog>

<style>
  .role-description {
    padding: 0.75rem;
    background: var(--color-background-secondary);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: -0.5rem;
    margin-bottom: 1rem;
  }

  .role-description strong {
    color: var(--color-text);
  }
</style>
