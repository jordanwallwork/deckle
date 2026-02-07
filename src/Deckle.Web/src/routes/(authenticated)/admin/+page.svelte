<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Admin Dashboard - Deckle</title>
</svelte:head>

<div class="admin-container">
  <div class="admin-header">
    <h1>Administrator Dashboard</h1>
  </div>

  <div class="admin-content">
    <div class="admin-grid">
      <a href="/admin/users" class="admin-card clickable">
        <h3>User Management</h3>
        <p>View and manage user accounts, roles, and permissions.</p>
      </a>

      <a href="/admin/samples" class="admin-card clickable">
        <h3>Samples</h3>
        <p>View and manage sample components and data sources</p>
      </a>

      <div class="admin-card">
        <h3>Content Moderation</h3>
        <p>Review and moderate user-generated content and projects.</p>
        <span class="badge">Coming Soon</span>
      </div>

      <div class="admin-card">
        <h3>System Settings</h3>
        <p>Configure system-wide settings and preferences.</p>
        <span class="badge">Coming Soon</span>
      </div>
    </div>
  </div>
</div>

<style>
  .admin-header h1 {
    color: #1a1a1a;
    margin-bottom: 1rem;
  }

  .admin-content {
    width: 100%;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .admin-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
    position: relative;
  }

  .admin-card:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    transform: translateY(-2px);
  }

  .admin-card h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 0.75rem;
  }

  .admin-card p {
    font-size: 0.9375rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .badge {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .admin-card.clickable {
    text-decoration: none;
    cursor: pointer;
  }

  .admin-card.clickable:hover {
    border-color: #667eea;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
    transform: translateY(-4px);
  }

  @media (max-width: 768px) {
    .admin-header h1 {
      font-size: 2rem;
    }

    .admin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
