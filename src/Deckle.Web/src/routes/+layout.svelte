<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { config } from '$lib/config';
  import type { LayoutData } from './$types';
  import "../app.css";

  let { children, data }: { children: any, data: LayoutData } = $props();
  let showDropdown = $state(false);

  async function handleSignOut() {
    try {
      await fetch(`${config.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown() {
    showDropdown = false;
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<nav class="top-nav">
  <div class="nav-content">
    <a href="/" class="logo-link">
      <svg
        class="logomark"
        viewBox="20 20 88 88"
        width="24"
        height="24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="var(--color-sage)"
          stroke="var(--color-sage)"
          stroke-width="9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M24,60 V92 C28,96 32,88 36,92 C40,96 44,88 48,92 C52,96 56,88 60,92 C64,96 68,88 72,92 V60 H24 Z"
          />

          <path
            d="M44,44 V76 C48,78 54,74 60,76 C66,78 72,74 78,76 C84,78 88,74 92,76 V44 H44 Z"
            style="filter: brightness(120%)"
          />

          <rect
            x="28"
            y="28"
            width="48"
            height="32"
            rx="6"
            ry="6"
            style="filter: brightness(140%)"
          />
        </g>
      </svg>
      <span class="brand-name">Deckle</span>
    </a>

    {#if data.user}
      <div class="user-menu">
        <button class="user-button" onclick={toggleDropdown}>
          {#if data.user.Picture}
            <img src={data.user.Picture} alt={data.user.Name} class="user-avatar" />
          {:else}
            <div class="user-avatar-placeholder">
              {data.user.Name?.charAt(0).toUpperCase()}
            </div>
          {/if}
          <span class="user-name">{data.user.Name}</span>
          <svg class="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        {#if showDropdown}
          <div class="dropdown-menu">
            <a href="/account/settings" class="dropdown-item">Account Settings</a>
            <button class="dropdown-item" onclick={handleSignOut}>Sign Out</button>
          </div>
          <button class="dropdown-overlay" onclick={closeDropdown} aria-label="Close dropdown"></button>
        {/if}
      </div>
    {/if}
  </div>
</nav>

<main class="main-content">
  {@render children()}
</main>

<style>
  .top-nav {
    background-color: var(--color-teal-grey);
    border-bottom: 1px solid var(--color-muted-teal);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--color-sage);
    transition: opacity 0.2s ease;
  }

  .logo-link:hover {
    opacity: 0.8;
  }

  .logomark {
    display: block;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .main-content {
    min-height: calc(100vh - 57px);
  }

  .user-menu {
    position: relative;
  }

  .user-button {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.375rem 0.75rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    color: var(--color-sage);
  }

  .user-button:hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-sage);
  }

  .user-avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--color-muted-teal);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-name {
    font-weight: 500;
    font-size: 0.9375rem;
  }

  .dropdown-arrow {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  .user-button:hover .dropdown-arrow {
    transform: translateY(1px);
  }

  .dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    border: none;
    cursor: default;
    z-index: 99;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    overflow: hidden;
    z-index: 100;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9375rem;
    color: var(--color-sage);
    text-decoration: none;
    transition: background-color 0.2s ease;
  }

  .dropdown-item:hover {
    background-color: var(--color-teal-grey);
  }

  .dropdown-item:not(:last-child) {
    border-bottom: 1px solid var(--color-teal-grey);
  }
</style>
