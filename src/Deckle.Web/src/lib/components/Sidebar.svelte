<script lang="ts">
  import { page } from '$app/stores';
  import LogoMark from './LogoMark.svelte';

  interface NavItem {
    label: string;
    href: string;
    icon: string;
  }

  let { user }: { user: any } = $props();
  let collapsed = $state(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Projects', href: '/projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
  ];

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return $page.url.pathname === '/dashboard' || $page.url.pathname === '/';
    }
    return $page.url.pathname.startsWith(href);
  }

  function toggleSidebar() {
    collapsed = !collapsed;
  }
</script>

<aside class="sidebar" class:collapsed={collapsed}>
  <div class="sidebar-header">
    <a href="/dashboard" class="logo-link">
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
      <div class="user-info" title={collapsed ? user.Name : ''}>
        {#if user.Picture}
          <img src={user.Picture} alt={user.Name} class="user-avatar" />
        {:else}
          <div class="user-avatar-placeholder">
            {user.Name?.charAt(0).toUpperCase()}
          </div>
        {/if}
        {#if !collapsed}
          <div class="user-details">
            <span class="user-name">{user.Name}</span>
            <span class="user-email">{user.Email}</span>
          </div>
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

  .logomark {
    display: block;
    flex-shrink: 0;
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

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
  }

  .collapsed .user-info {
    justify-content: center;
    padding: 0.5rem 0;
  }

  .user-info:hover {
    background-color: rgba(120, 160, 131, 0.1);
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
