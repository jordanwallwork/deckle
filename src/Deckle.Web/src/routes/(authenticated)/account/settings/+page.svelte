<script lang="ts">
  import type { PageData } from './$types';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import ProfileInfoCard from './_components/ProfileInfoCard.svelte';
  import PublicProfileCard from './_components/PublicProfileCard.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PageHeader>
  <h1>Account Settings</h1>
</PageHeader>

<div class="settings-layout">
  <div class="settings-section">
    <h2>Profile Information</h2>
    <ProfileInfoCard user={data.user} />
  </div>

  <div class="settings-section">
    <h2>Public Profile</h2>
    <PublicProfileCard user={data.user} />
  </div>
</div>

<style>
  .settings-layout {
    padding: var(--pad-content);
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0 2rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .settings-layout {
      grid-template-columns: 1fr;
    }
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
