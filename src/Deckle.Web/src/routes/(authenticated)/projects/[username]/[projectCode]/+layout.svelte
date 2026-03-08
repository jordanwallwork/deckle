<script lang="ts">
  import type { LayoutData } from './$types';
  import { getMaxScreen } from '$lib/stores/maxScreen';
  import { topbarProject } from '$lib/stores/topbarProject';
  import { topbarTabs } from '$lib/stores/topbarTabs';
  import { Tabs } from '$lib/components';
  import { onDestroy } from 'svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();

  const maxScreen = getMaxScreen();

  $effect(() => {
    topbarProject.set({
      ownerName: data.project.ownerUsername,
      projectName: data.project.name,
      projectUrl: `/projects/${data.project.ownerUsername}/${data.project.code}/components`
    });
  });

  onDestroy(() => {
    topbarProject.set(null);
    topbarTabs.set([]);
  });

  // Helper to build project URL base
  const projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);

  // Filter tabs based on user role
  // Viewers: only Components
  // Collaborators: Components, Data Sources, Image Library
  // Admins/Owners: All tabs including Settings
  const tabs = $derived([
    { name: 'Components', path: `${projectUrlBase}/components` },
    ...(data.project.role !== 'Viewer'
      ? [
          { name: 'Data Sources', path: `${projectUrlBase}/data-sources` },
          {
            name: 'Image Library',
            path: `${projectUrlBase}/image-library`
          }
        ]
      : []),
    { name: 'Tabletop', path: `${projectUrlBase}/tabletop` },
    ...(data.project.role === 'Owner' || data.project.role === 'Admin'
      ? [
          {
            name: 'Settings',
            path: `${projectUrlBase}/settings`
          }
        ]
      : [])
  ]);

  $effect(() => {
    topbarTabs.set(tabs);
  });
</script>

{#if !$maxScreen}
  <Tabs {tabs} />
{/if}

<div class="project-page-content" class:nopadding={$maxScreen}>
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

