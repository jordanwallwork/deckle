<script lang="ts">
  import type { PageData } from './$types';
  import { Avatar } from '$lib/components';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PageHeader>
  <h1>Account Settings</h1>
</PageHeader>

<div class="settings-section">
  <h2>Profile Information</h2>

  <section>
    <Avatar src={data.user.picture} name={data.user.name} size="xl" class="profile-avatar" />

    <dl class="profile-fields">
      <div class="field-group">
        <dt class="field-label">Username</dt>
        <dd class="field-value">{data.user.username}</dd>
      </div>

      <div class="field-group">
        <dt class="field-label">Name</dt>
        <dd class="field-value">{data.user.name}</dd>
      </div>

      <div class="field-group">
        <dt class="field-label">Email</dt>
        <dd class="field-value">{data.user.email}</dd>
      </div>
    </dl>
  </section>
</div>

<style>
  .settings-section {
    padding: 2rem;
  }

  .settings-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 1.5rem 0;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-fields {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 0;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    margin: 0;
  }

  .field-value {
    font-size: 1rem;
    color: var(--color-deep-forest);
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    margin: 0;
  }

  @media (min-width: 640px) {
    section {
      flex-direction: row;
      align-items: flex-start;
      gap: 3rem;
    }

    .profile-fields {
      flex: 1;
    }
  }
</style>
