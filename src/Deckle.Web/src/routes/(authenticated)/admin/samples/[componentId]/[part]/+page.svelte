<script lang="ts">
  import type { PageData } from './$types';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { buildAdminSampleEditorBreadcrumbs } from '$lib/utils/breadcrumbs';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import AdminSampleEditor from './_components/AdminSampleEditor.svelte';

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = $derived(data.part.charAt(0).toUpperCase() + data.part.slice(1));

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(buildAdminSampleEditorBreadcrumbs(data.component, data.part, partLabel));
  });

  // Enable max screen mode (hides tabs, footer, removes padding)
  $effect(() => {
    setMaxScreen(true);
    return () => setMaxScreen(false);
  });
</script>

<svelte:head>
  <title>Edit {partLabel} Design - {data.component.name} - Admin - Deckle</title>
  <meta name="description" content="Edit the {data.part} design of sample component {data.component.name}" />
</svelte:head>

<AdminSampleEditor {data} />
