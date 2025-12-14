<script lang="ts">
  import { page } from '$app/stores';
  import { config } from '$lib/config';
  import LogoMark from './LogoMark.svelte';

  interface NavItem {
    label: string;
    href: string;
    icon: string;
  }

  let { user, collapsed = $bindable(false) }: { user: any; collapsed?: boolean } = $props();
  let showDropdown = $state(false);

  // Initialize collapsed state from local storage if available
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      collapsed = savedState === 'true';
    }
  }

  const navItems: NavItem[] = [
    { label: 'Projects', href: '/projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
  ];

  function isActive(href: string): boolean {
    return $page.url.pathname.startsWith(href);
  }

  function toggleSidebar() {
    collapsed = !collapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', collapsed.toString());
    }
  }

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

<aside class="sidebar" class:collapsed={collapsed}>
  <div class="sidebar-header">
    <a href="/projects" class="logo-link">
      <LogoMark class="logomark" />
      {#if !collapsed}
        <span class="brand-name">Deckle</span>
      {/if}
    </a>
    <button class="collapse-button" onclick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
      <svg viewBox="0 0 20 20" fill="currentColor">
        {#if collapsed}
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        {:else}
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        {/if}
      </svg>
    </button>
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href)}
        title={collapsed ? item.label : ''}
      >
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d={item.icon} />
        </svg>
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    {#if user}
      <div class="user-menu">
        <button class="user-info" onclick={toggleDropdown} title={collapsed ? user.name : ''}>
          {#if user.picture}
            <img src={user.picture} alt={user.name} class="user-avatar" />
          {:else}
            <div class="user-avatar-placeholder">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          {/if}
          {#if !collapsed}
            <div class="user-details">
              <span class="user-name">{user.name}</span>
              <span class="user-email">{user.email}</span>
            </div>
          {/if}
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
</aside>

<style>
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    background-color: var(--color-teal-grey);
    border-right: 1px solid var(--color-muted-teal);
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
    z-index: 100;
  }

  .sidebar.collapsed {
    width: 72px;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(120, 160, 131, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 64px;
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--color-sage);
    transition: opacity 0.2s ease;
    flex: 1;
    min-width: 0;
  }

  .logo-link:hover {
    opacity: 0.8;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collapse-button {
    background: none;
    border: none;
    color: var(--color-sage);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .collapse-button:hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .collapse-button svg {
    width: 20px;
    height: 20px;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    color: rgba(120, 160, 131, 0.8);
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .collapsed .nav-item {
    justify-content: center;
  }

  .nav-item:hover {
    background-color: rgba(120, 160, 131, 0.1);
    color: var(--color-sage);
  }

  .nav-item.active {
    background-color: rgba(120, 160, 131, 0.15);
    color: var(--color-sage);
    font-weight: 600;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid rgba(120, 160, 131, 0.15);
  }

  .user-menu {
    position: relative;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    color: inherit;
    font-family: inherit;
  }

  .collapsed .user-info {
    justify-content: center;
    padding: 0.5rem 0;
  }

  .user-info:hover {
    background-color: rgba(120, 160, 131, 0.1);
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
    bottom: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: white;
    border: 1px solid rgba(52, 73, 86, 0.15);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-sage);
    flex-shrink: 0;
  }

  .user-avatar-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--color-muted-teal);
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
    gap: 0.125rem;
    overflow: hidden;
    min-width: 0;
  }

  .user-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--color-sage);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-email {
    font-size: 0.75rem;
    color: rgba(120, 160, 131, 0.7);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .sidebar {
      width: 72px;
    }

    .collapse-button {
      display: none;
    }
  }
</style>
