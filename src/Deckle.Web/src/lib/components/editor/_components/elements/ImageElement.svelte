<script lang="ts">
  import type { ImageElement } from '../../types';
  import { borderStyle, boxShadowStyle } from '../../utils';
  import { getContext } from 'svelte';
  import { config } from '$lib/config';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { replaceMergeFields } from '$lib/utils/mergeFields';

  let { element, dpi }: { element: ImageElement; dpi: number } = $props();

  // Get projectId from context
  const projectId = getContext<string>('projectId');

  // Get data source row context for merge field resolution
  const dataSourceRow = getDataSourceRow();

  // Apply merge fields to imageId
  const resolvedImageId = $derived(replaceMergeFields(element.imageId, $dataSourceRow));

  // Derived style properties for granular reactivity
  const objectFit = $derived(element.objectFit);
  const objectPosition = $derived(element.objectPosition);
  const border = $derived(borderStyle(element.border, dpi));
  // Border radius is handled by borderStyle helper, no need for separate property
  const boxShadow = $derived(boxShadowStyle(element.shadow));

  // Resolve image source (URL, file API path, or placeholder)
  const displaySrc = $derived(resolveImageSrc(resolvedImageId, projectId));

  /**
   * Helper to determine if a value is a URL
   */
  function isUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
  }

  /**
   * Resolves an image source to a usable URL
   *
   * @param imageId - The image identifier (URL, filename, or empty)
   * @param projectId - The project ID (required if imageId is a filename)
   * @returns A URL to display the image (either the URL itself, file API path, or placeholder)
   */
  export function resolveImageSrc(imageId: string | undefined | null, projectId?: string): string {
    // Return placeholder if imageId is empty
    if (!imageId || imageId.trim() === '') {
      return `https://placehold.co/400x300/e5e7eb/9ca3af.png?text=Image`;
    }

    // If imageId is already a URL, return it as-is
    if (isUrl(imageId)) {
      return imageId;
    }

    // Otherwise, treat it as a filename and use the file API
    return `${config.apiUrl}/file/${projectId}?filename=${encodeURIComponent(imageId)}`;
  }

</script>

<img
  src={displaySrc}
  alt={element.label}
  style:width="100%"
  style:height="100%"
  style:display="block"
  style:object-fit={objectFit}
  style:object-position={objectPosition}
  style={border}
  style:box-shadow={boxShadow}
  class="image-element"
/>

<style>
  .image-element {
    /* Element-specific styles only */
  }
</style>
