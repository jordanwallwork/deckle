<script lang="ts">
  import type { Snippet } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/stores';
  import TopBar from '$lib/components/TopBar.svelte';
  import type { LayoutData } from './$types';
  import '../app.css';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  // Determine if we should show the dashboard layout (topbar)
  const isAuthPage = $derived($page.url.pathname === '/' && !data.user);
  const isSetupPage = $derived($page.url.pathname === '/account/setup');
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if isAuthPage || isSetupPage}
  <!-- Landing page or setup page layout (no topbar) -->
  <main class="landing-content">
    {@render children()}
  </main>
{:else}
  <!-- Dashboard layout (topbar + content) -->

  <div class="dashboard-layout">
    {#if data.user}
      <TopBar user={data.user} />
    {/if}
    <main class="main-content">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .landing-content {
    min-height: 100vh;
  }

  .dashboard-layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    background-color: #f8f9fa;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
  }
</style>
