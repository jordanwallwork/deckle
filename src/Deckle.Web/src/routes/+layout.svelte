<script lang="ts">
  import type { Snippet } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import TopBar from '$lib/components/TopBar.svelte';
  import { initPostHog, identifyUser, resetUser } from '$lib/analytics';
  import { initMaxScreen } from '$lib/stores/maxScreen';
  import type { LayoutData } from './$types';
  import '../app.css';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  const maxScreen = initMaxScreen();

  // Initialize PostHog analytics (cookieless EU configuration)
  $effect(() => {
    initPostHog(data.posthogKey);
  });

  // Identify/reset user when authentication state changes
  $effect(() => {
    if (data.user?.id) {
      identifyUser(data.user.id, {
        username: data.user.username ?? undefined
      });
    } else {
      resetUser();
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="layout">
  <TopBar user={data.user ?? null} />
  <div class="main-content">
    {@render children()}
  </div>
  {#if !$maxScreen}
    <footer>
      <a href="/privacy">Privacy</a>
      <a href="https://docs.deckle.games">Docs</a>
      <a href="https://github.com/jordanwallwork/deckle">GitHub</a>
      {#if data.user?.role === 'Administrator'}
        <a href="/admin">Admin</a>
      {/if}
    </footer>
  {/if}
</div>

<style>
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
  }

  footer {
    padding: var(--pad-content);
    display: flex;
    justify-content: center;
    gap: 2rem;
  }

  footer a {
    color: var(--color-muted-teal);
    font-size: 0.8rem;
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
  }
</style>
