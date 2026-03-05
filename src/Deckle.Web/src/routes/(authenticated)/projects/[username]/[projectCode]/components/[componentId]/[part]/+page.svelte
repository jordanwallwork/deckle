<script lang="ts">
  import type { PageData } from './$types';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import ComponentEditor from '$lib/components/editor/ComponentEditor.svelte';

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = $derived(data.part.charAt(0).toUpperCase() + data.part.slice(1));

  // Enable max screen mode (hides tabs, footer, removes padding)
  $effect(() => {
    setMaxScreen(true);
    return () => setMaxScreen(false);
  });
</script>

<svelte:head>
  <title
    >{data.project.role === 'Viewer' ? 'View' : 'Edit'}
    {partLabel} Design · {data.component.name} · Deckle</title
  >
  <meta name="description" content="Design the {data.part} of {data.component.name}" />
</svelte:head>

<ComponentEditor {data} readOnly={data.project.role === 'Viewer'} />

