<script lang="ts">
  import { page } from "$app/stores";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: any } = $props();

  const tabs = [
    { name: "Components", path: `/projects/${data.project.id}/components` },
    { name: "Data Sources", path: `/projects/${data.project.id}/data-sources` },
    {
      name: "Image Library",
      path: `/projects/${data.project.id}/image-library`,
    },
  ];

  function isActiveTab(tabPath: string): boolean {
    return $page.url.pathname === tabPath;
  }
</script>

<div class="project-layout">
  <div class="project-header">
    <div class="breadcrumb">
      <a href="/projects">Projects</a>
      <span class="separator">/</span>
      <span class="current">{data.project.name}</span>
    </div>
  </div>

  <div class="content-area">
    <nav class="side-menu">
      {#each tabs as tab}
        <a
          href={tab.path}
          class="tab-link"
          class:active={isActiveTab(tab.path)}
        >
          {tab.name}
        </a>
      {/each}
    </nav>

    <main class="main-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .project-layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .project-header {
    margin-bottom: 2rem;
  }

  .breadcrumb {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin-bottom: 0.5rem;
  }

  .breadcrumb a {
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .breadcrumb a:hover {
    color: var(--color-sage);
  }

  .breadcrumb .separator {
    margin: 0 0.5rem;
  }

  .breadcrumb .current {
    color: var(--color-sage);
    font-weight: 600;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .description {
    font-size: 1.125rem;
    color: var(--color-muted-teal);
    margin-top: 0.5rem;
    line-height: 1.6;
  }

  .content-area {
    display: flex;
    gap: 2rem;
  }

  .side-menu {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tab-link {
    display: block;
    padding: 0.75rem 1rem;
    color: var(--color-muted-teal);
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .tab-link:hover {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .tab-link.active {
    background-color: var(--color-muted-teal);
    color: white;
    font-weight: 600;
    border-color: var(--color-sage);
  }

  .main-content {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 768px) {
    .content-area {
      flex-direction: column;
    }

    .side-menu {
      width: 100%;
      flex-direction: row;
      overflow-x: auto;
    }

    .tab-link {
      white-space: nowrap;
    }
  }
</style>
