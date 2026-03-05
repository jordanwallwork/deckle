<script lang="ts">
  import { config } from '$lib/config';
  import type { CurrentUser } from '$lib/types';
  import Avatar from './Avatar.svelte';
  import LogoMark from './LogoMark.svelte';
  import { SettingsIcon, LogoutIcon } from './icons';
  import { topbarProject } from '$lib/stores/topbarProject';

  let { user }: { user: CurrentUser | null } = $props();
  let showDropdown = $state(false);
  let showOwnerPopover = $state(false);

  function toggleDropdown(): void {
    showDropdown = !showDropdown;
  }

  function closeDropdown(): void {
    showDropdown = false;
  }

  function toggleOwnerPopover(): void {
    showOwnerPopover = !showOwnerPopover;
  }

  function closeOwnerPopover(): void {
    showOwnerPopover = false;
  }

  async function handleSignOut(): Promise<void> {
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
      <a href={user ? '/projects' : '/'} class="logo-link">
        <LogoMark width="28" height="28" class="logomark" />
        <span class="brand-name">Deckle</span>
      </a>
      {#if $topbarProject}
        <span class="project-breadcrumb">
          <span class="project-owner">{$topbarProject.ownerName}</span>
          <span class="project-separator">/</span>
          <span class="owner-ellipsis-wrapper">
            <button
              class="owner-ellipsis-btn"
              onclick={toggleOwnerPopover}
              aria-label="Show project owner">…</button
            >
            {#if showOwnerPopover}
              <div class="owner-popover">{$topbarProject.ownerName}</div>
              <button
                class="dropdown-overlay"
                onclick={closeOwnerPopover}
                aria-label="Close owner popover"
              ></button>
            {/if}
          </span>
          <a href={$topbarProject.projectUrl} class="project-name">{$topbarProject.projectName}</a>
        </span>
      {/if}
    </div>

    <div class="topbar-right">
      {#if user}
        <div class="user-menu">
          <button class="user-info" onclick={toggleDropdown}>
            <Avatar
              src={user.picture}
              name={user.name}
              size="sm"
              variant="light"
              class="user-avatar"
            />
          </button>

          {#if showDropdown}
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <div class="dropdown-user-name">{user.name}</div>
                <div class="dropdown-user-email">{user.email}</div>
              </div>
              <div class="dropdown-divider"></div>
              <a href="/account/settings" class="dropdown-item">
                <SettingsIcon size={16} />
                Account Settings
              </a>
              <button class="dropdown-item" onclick={handleSignOut}>
                <LogoutIcon size={16} />
                Sign Out
              </button>
            </div>
            <button class="dropdown-overlay" onclick={closeDropdown} aria-label="Close dropdown"
            ></button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .topbar {
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
    min-width: 0;
  }

  .project-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.75rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9375rem;
    min-width: 0;
  }

  .project-separator {
    opacity: 0.5;
    font-weight: 300;
  }

  .project-owner {
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-name {
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: white;
    text-decoration: none;
  }

  .project-name:hover {
    text-decoration: underline;
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

  .owner-ellipsis-wrapper {
    display: none;
    position: relative;
    align-items: center;
  }

  .owner-ellipsis-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    cursor: pointer;
    padding: 0 0.125rem;
    line-height: 1;
    font-family: inherit;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .owner-ellipsis-btn:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

  .owner-popover {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background-color: white;
    color: var(--color-sage);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(52, 73, 86, 0.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    z-index: 89;
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

  .dropdown-item :global(svg) {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .dropdown-item:hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .dropdown-item:hover :global(svg) {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .topbar-content {
      padding: 0 1rem;
    }
  }

  @media (max-width: 650px) {
    .project-owner,
    .project-separator {
      display: none;
    }

    .owner-ellipsis-wrapper {
      display: flex;
    }
  }

  @media (max-width: 480px) {
    .brand-name {
      display: none;
    }

    .user-info {
      padding: 0.5rem;
    }
  }
</style>

