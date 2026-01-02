<script lang="ts">
  import type { LayoutData } from "./$types";
  import { initBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildProjectBreadcrumbs } from "$lib/utils/breadcrumbs";
  import { page } from "$app/stores";
  import { Breadcrumb, Tabs } from "$lib/components";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";

  let { data, children }: { data: LayoutData; children: any } = $props();

  const tabs = [
    { name: "Components", path: `/projects/${data.project.id}/components` },
    { name: "Data Sources", path: `/projects/${data.project.id}/data-sources` },
    {
      name: "Image Library",
      path: `/projects/${data.project.id}/image-library`,
    },
    {
      name: "Settings",
      path: `/projects/${data.project.id}/settings`,
    },
  ];

  // Initialize breadcrumbs context
  const breadcrumbs = initBreadcrumbs(buildProjectBreadcrumbs(data.project));

  // Check if we're on the editor or export page (hide tabs on editor and export)
  const isEditorPage = $derived(
    /\/projects\/[^/]+\/components\/[^/]+\/(front|back|export)/.test(
      $page.url.pathname
    )
  );
</script>

<PageHeader>
  <Breadcrumb items={$breadcrumbs} />
</PageHeader>

{#if !isEditorPage}
  <Tabs {tabs} />
{/if}

<div class="project-page-content" class:nopadding={isEditorPage}>
  {@render children()}
</div>

<style>
  .project-page-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
  }
  .project-page-content.nopadding {
    padding: 0;
  }
</style>
