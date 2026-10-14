<script lang="ts">
  import type { PageData } from './$types';
  import { Avatar, Badge, UsernameLink } from '$lib/components';
  import ProfileCard from './_components/ProfileCard.svelte';
  import EmailStatusCard from './_components/EmailStatusCard.svelte';
  import RoleCard from './_components/RoleCard.svelte';
  import StorageCard from './_components/StorageCard.svelte';
  import AccountStatusCard from './_components/AccountStatusCard.svelte';
  import SignInMethodsCard from './_components/SignInMethodsCard.svelte';
  import OwnedProjectsTable from './_components/OwnedProjectsTable.svelte';

  let { data }: { data: PageData } = $props();

  const detail = $derived(data.userDetail);
  const isSelf = $derived(data.currentUserId === detail.id);
  const displayName = $derived(detail.name || detail.email);
</script>

<svelte:head>
  <title>{displayName} - User Management - Admin - Deckle</title>
</svelte:head>

<div class="user-detail">
  <a class="back-link" href="/admin/users">&larr; Back to users</a>

  <header class="user-header">
    <Avatar src={detail.pictureUrl} name={displayName} size="lg" class="user-avatar" />
    <div class="user-heading">
      <h1>
        {displayName}
        {#if isSelf}<Badge variant="info" size="sm">You</Badge>{/if}
      </h1>
      <UsernameLink username={detail.username} />
      <span class="user-email">{detail.email}</span>
    </div>
  </header>

  <div class="card-grid">
    <ProfileCard user={detail} />
    <EmailStatusCard user={detail} />
    <RoleCard user={detail} {isSelf} />
    <StorageCard user={detail} />
    <AccountStatusCard user={detail} {isSelf} />
    <SignInMethodsCard user={detail} />
    <OwnedProjectsTable projects={detail.projects} />
  </div>
</div>

<style>
  .user-detail {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .back-link {
    align-self: flex-start;
    font-size: 0.875rem;
    color: #6b7280;
    text-decoration: none;
  }

  .back-link:hover {
    color: #667eea;
    text-decoration: underline;
  }

  .user-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-header :global(.user-avatar) {
    --avatar-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    flex-shrink: 0;
  }

  .user-heading {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    overflow-wrap: anywhere;
  }

  .user-email {
    font-size: 0.875rem;
    color: #6b7280;
    overflow-wrap: anywhere;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 1.5rem;
    }
  }
</style>
