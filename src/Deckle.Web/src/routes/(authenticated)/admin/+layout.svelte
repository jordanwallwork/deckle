<script lang="ts">
  import { initBreadcrumbs } from '$lib/stores/breadcrumb';
  import { getMaxScreen } from '$lib/stores/maxScreen';
  import { Breadcrumb } from '$lib/components';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';

  let { children }: { children: any } = $props();

  const maxScreen = getMaxScreen();

  // Initialize breadcrumbs context for admin pages
  const breadcrumbs = initBreadcrumbs([{ label: 'Admin', href: '/admin' }]);
</script>

<PageHeader overridePadding="0.5rem">
  <Breadcrumb items={$breadcrumbs} />
</PageHeader>

<div class="admin-page-content" class:nopadding={$maxScreen}>
  {@render children()}
</div>

<style>
  .admin-page-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding: 2rem;
  }
  .admin-page-content.nopadding {
    padding: 0;
  }
</style>
