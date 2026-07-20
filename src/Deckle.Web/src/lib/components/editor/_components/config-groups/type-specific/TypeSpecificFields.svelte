<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import TextFields from './TextFields.svelte';
  import ImageFields from './ImageFields.svelte';
  import ShapeFields from './ShapeFields.svelte';
  import IteratorFields from './IteratorFields.svelte';
  import GridFields from './GridFields.svelte';

  /**
   * Renders the pinned, always-visible type-specific fields for the selected
   * element (ADR-0001 story 20). Container has no extra fields. Shared visual
   * styling lives in the capability groups, not here.
   */
  let props: GroupControlProps = $props();
  const type = $derived(props.elements[0]?.type);
</script>

{#if type === 'text'}
  <TextFields {...props} />
{:else if type === 'image'}
  <ImageFields {...props} />
{:else if type === 'shape'}
  <ShapeFields {...props} />
{:else if type === 'iterator'}
  <IteratorFields {...props} />
{:else if type === 'grid'}
  <GridFields {...props} />
{/if}
