<script lang="ts">
  import type { PageData } from "./$types";
  import { PageLayout, Badge, EmptyState } from "$lib/components";

  let { data }: { data: PageData } = $props();

  const recentProjects = $derived(data.projects.slice(0, 4));
</script>

<svelte:head>
  <title>Dashboard · Deckle</title>
  <meta
    name="description"
    content="Your Deckle dashboard - manage game design projects and create game components."
  />
</svelte:head>

<PageLayout>
  {#snippet header()}
    <div class="header-text">
      <h1>Dashboard</h1>
      <p class="subtitle">
        Welcome back, {data.user?.name?.split(" ")[0] || "there"}
      </p>
    </div>
  {/snippet}

  <div class="dashboard-content">
    <!-- Stats cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon projects">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{data.projects.length}</div>
          <div class="stat-label">Projects</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon components">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">-</div>
          <div class="stat-label">Components</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon sources">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">-</div>
          <div class="stat-label">Data Sources</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon images">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">-</div>
          <div class="stat-label">Images</div>
        </div>
      </div>
    </div>

    <!-- Recent Projects -->
    <div class="section">
      <div class="section-header">
        <h2>Recent Projects</h2>
        <a href="/projects" class="view-all">View All →</a>
      </div>

      {#if recentProjects.length === 0}
        <EmptyState
          title="No projects yet"
          subtitle="Create your first project to get started"
          actionText="Go to Projects"
          actionHref="/projects"
        >
          {#snippet icon()}
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          {/snippet}
        </EmptyState>
      {:else}
        <div class="projects-grid">
          {#each recentProjects as project}
            <a href="/projects/{project.id}" class="project-card">
              <div class="project-header">
                <h3>{project.name}</h3>
                <Badge variant="default">{project.role}</Badge>
              </div>
              {#if project.description}
                <p class="project-description">{project.description}</p>
              {/if}
              <div class="project-footer">
                <span class="project-date">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <div class="section-header">
        <h2>Quick Actions</h2>
      </div>

      <div class="actions-grid">
        <a href="/projects" class="action-card">
          <div class="action-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="action-content">
            <h3>New Project</h3>
            <p>Start a new game design project</p>
          </div>
        </a>

        <a href="/projects" class="action-card">
          <div class="action-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="action-content">
            <h3>Browse Templates</h3>
            <p>Explore component templates</p>
          </div>
        </a>

        <a href="/projects" class="action-card">
          <div class="action-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fill-rule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="action-content">
            <h3>View Documentation</h3>
            <p>Learn how to use Deckle</p>
          </div>
        </a>
      </div>
    </div>
  </div>
</PageLayout>

<style>
  .header-text h1 {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .dashboard-content {
    margin-top: -1rem;
    padding: 0 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-icon.projects {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .stat-icon.components {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .stat-icon.sources {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  .stat-icon.images {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    color: white;
  }

  .stat-icon svg {
    width: 24px;
    height: 24px;
  }

  .stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--color-sage);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .section {
    margin-bottom: 2.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-sage);
  }

  .view-all {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .view-all:hover {
    color: var(--color-sage);
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .project-card {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .project-card:hover {
    border-color: var(--color-muted-teal);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
    gap: 0.75rem;
  }

  .project-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-description {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.5;
    font-size: 0.875rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .project-footer {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .project-date {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .action-card {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    align-items: start;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .action-card:hover {
    border-color: var(--color-muted-teal);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .action-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: linear-gradient(
      135deg,
      var(--color-muted-teal) 0%,
      var(--color-sage) 100%
    );
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-icon svg {
    width: 20px;
    height: 20px;
  }

  .action-content h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.25rem;
  }

  .action-content p {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .header-text h1 {
      font-size: 1.5rem;
    }

    .stat-card {
      padding: 1rem;
      flex-direction: column;
      align-items: start;
    }

    .projects-grid,
    .actions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
