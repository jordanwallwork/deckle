<script lang="ts">
  import { config } from '$lib/config';
  import LogoMark from './LogoMark.svelte';

  let { user }: { user: any } = $props();
  let showDropdown = $state(false);

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown() {
    showDropdown = false;
  }

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
</script>

<header class="topbar">
  <div class="topbar-content">
    <div class="topbar-left">
      <a href="/projects" class="logo-link">
        <LogoMark width="28" height="28" class="logomark" />
        <span class="brand-name">Deckle</span>
      </a>
    </div>

    <div class="topbar-right">
      {#if user}
        <div class="user-menu">
          <button class="user-info" onclick={toggleDropdown}>
            {#if user.picture}
              <img src={user.picture} alt={user.name} class="user-avatar" />
            {:else}
              <div class="user-avatar-placeholder">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            {/if}
            <div class="user-details">
              <span class="user-name">{user.name}</span>
            </div>
            <svg class="chevron" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>

          {#if showDropdown}
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <div class="dropdown-user-name">{user.name}</div>
                <div class="dropdown-user-email">{user.email}</div>
              </div>
              <div class="dropdown-divider"></div>
              <a href="/account/settings" class="dropdown-item">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
                Account Settings
              </a>
              <button class="dropdown-item" onclick={handleSignOut}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
                </svg>
                Sign Out
              </button>
            </div>
            <button class="dropdown-overlay" onclick={closeDropdown} aria-label="Close dropdown"></button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background-color: var(--color-sage);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .topbar-content {
    height: 100%;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 100%;
  }

  .topbar-left {
    display: flex;
    align-items: center;
  }

  .topbar-right {
    display: flex;
    align-items: center;
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
    transition: opacity 0.2s ease;
  }

  .logo-link:hover {
    opacity: 0.9;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .user-menu {
    position: relative;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    background: none;
    border: none;
    color: white;
    font-family: inherit;
  }

  .user-info:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  .user-avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .user-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .chevron {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.7;
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
    z-index: 88;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 220px;
    background-color: white;
    border: 1px solid rgba(52, 73, 86, 0.15);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 89;
  }

  .dropdown-header {
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
  }

  .dropdown-user-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-sage);
  }

  .dropdown-user-email {
    font-size: 0.75rem;
    color: var(--color-muted-teal);
    margin-top: 0.125rem;
  }

  .dropdown-divider {
    height: 1px;
    background-color: rgba(52, 73, 86, 0.1);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-sage);
    text-decoration: none;
    transition: background-color 0.2s ease;
    font-family: inherit;
  }

  .dropdown-item svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .dropdown-item:hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .dropdown-item:hover svg {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .topbar-content {
      padding: 0 1rem;
    }

    .user-name {
      max-width: 120px;
    }
  }
</style>
