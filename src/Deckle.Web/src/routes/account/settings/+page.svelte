<script lang="ts">
  import type { PageData } from './$types';
  import PageLayout from '$lib/components/PageLayout.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PageLayout>
  {#snippet header()}
    <div class="header-text">
      <h1>Account Settings</h1>
      <p class="subtitle">View and manage your account information</p>
    </div>
  {/snippet}

  <div class="settings-content">
    <div class="settings-section">
      <h2>Profile Information</h2>

      <div class="profile-card">
        <div class="profile-avatar-section">
          {#if data.user.picture}
            <img src={data.user.picture} alt={data.user.name || 'User'} class="profile-avatar" />
          {:else}
            <div class="profile-avatar-placeholder">
              {data.user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          {/if}
        </div>

        <div class="profile-fields">
          <div class="field-group">
            <label class="field-label">User ID</label>
            <div class="field-value">{data.user.id || 'N/A'}</div>
          </div>

          <div class="field-group">
            <label class="field-label">Name</label>
            <div class="field-value">{data.user.name || 'N/A'}</div>
          </div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="field-value">{data.user.email || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</PageLayout>

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

  .settings-content {
    background-color: white;
    border-radius: 12px;
    border: 1px solid rgba(52, 73, 86, 0.1);
  }

  .settings-section {
    padding: 2rem;
  }

  .settings-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 1.5rem 0;
  }

  .profile-card {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-avatar-section {
    display: flex;
    justify-content: center;
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid var(--color-sage);
  }

  .profile-avatar-placeholder {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background-color: var(--color-muted-teal);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 3rem;
    border: 4px solid var(--color-sage);
  }

  .profile-fields {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .field-value {
    font-size: 1rem;
    color: var(--color-deep-forest);
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
  }

  @media (min-width: 640px) {
    .profile-card {
      flex-direction: row;
      align-items: flex-start;
      gap: 3rem;
    }

    .profile-avatar-section {
      flex-shrink: 0;
    }

    .profile-fields {
      flex: 1;
    }
  }
</style>
