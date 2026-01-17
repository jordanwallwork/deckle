<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/forms/FormField.svelte';
  import Input from '$lib/components/forms/Input.svelte';
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
  const role = 'Collaborator'; // Only Collaborator role is available for invites
  let isSubmitting = $state(false);
  let error = $state<string | undefined>(undefined);

  $effect(() => {
    if (!show) {
      // Reset state when dialog closes
      email = '';
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

      <!-- Only Collaborator role is available for invites (Owner is the project creator) -->
    </form>
  {/snippet}

  {#snippet actions()}
    <Button variant="secondary" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
    <Button onclick={handleSubmit} disabled={isSubmitting}>
      {isSubmitting ? 'Sending...' : 'Send Invitation'}
    </Button>
  {/snippet}
</Dialog>

