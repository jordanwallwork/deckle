<script lang="ts">
  import type { PageData } from "./$types";
  import { setBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildEditorBreadcrumbs } from "$lib/utils/breadcrumbs";
  import ComponentEditor from "$lib/components/editor/ComponentEditor.svelte";

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = $derived(data.part.charAt(0).toUpperCase() + data.part.slice(1));

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(
      buildEditorBreadcrumbs(data.project, data.component, partLabel)
    );
  });
</script>

<svelte:head>
  <title>Edit {partLabel} Design · {data.component.name} · Deckle</title>
  <meta
    name="description"
    content="Design the {data.part} of {data.component.name}"
  />
</svelte:head>

<ComponentEditor {data} />
