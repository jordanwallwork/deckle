<script lang="ts">
  import type { TextElement } from '../../types';
  import MarkdownRenderer from '../MarkdownRenderer.svelte';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { parseInlineClasses, hasInlineClasses } from '$lib/utils/textParser';
  import { replaceMergeFields } from '$lib/utils/mergeFields';
  import { spacingToCss, borderStyle } from '../../utils';

  let { element, dpi }: { element: TextElement; dpi: number } = $props();

  const dataSourceRow = getDataSourceRow();

  // Apply merge fields and inline classes
  const textContent = $derived(() => {
    // Step 1: Replace merge fields FIRST (before inline classes)
    let processedContent = replaceMergeFields(element.content, $dataSourceRow);

    // Step 2: Apply inline classes if not using markdown
    if (!element.markdown && hasInlineClasses(processedContent)) {
      return parseInlineClasses(processedContent, true);
    }

    // Return processed content (with merge fields replaced)
    return processedContent;
  });

  // Derived style properties for granular reactivity
  const display = $derived(element.display || 'block');
  const fontSize = $derived(element.fontSize ? `${element.fontSize}px` : undefined);
  const fontFamily = $derived(element.fontFamily);
  const fontWeight = $derived(element.fontWeight);
  const fontStyle = $derived(element.fontStyle);
  const color = $derived(element.color);
  const textDecoration = $derived(element.textDecoration);
  const textAlign = $derived(element.textAlign);
  const lineHeight = $derived(element.lineHeight);
  const letterSpacing = $derived(element.letterSpacing ? `${element.letterSpacing}px` : undefined);
  const wordWrap = $derived(element.wordWrap);
  const textTransform = $derived(element.textTransform);
  const padding = $derived(spacingToCss(element.padding, dpi));
  const backgroundColor = $derived(element.backgroundColor);
  const border = $derived(borderStyle(element.border, dpi));
</script>

<div
  style:width="100%"
  style:height="100%"
  style:display
  style:font-size={fontSize}
  style:font-family={fontFamily}
  style:font-weight={fontWeight}
  style:font-style={fontStyle}
  style:color
  style:text-decoration={textDecoration}
  style:text-align={textAlign}
  style:line-height={lineHeight}
  style:letter-spacing={letterSpacing}
  style:word-wrap={wordWrap}
  style:text-transform={textTransform}
  style:padding
  style:background-color={backgroundColor}
  style={border}
  class="text-element"
>
  {#if element.markdown}
    <MarkdownRenderer content={element.content} />
  {:else if textContent()}
    {@html textContent()}
  {:else}
    {replaceMergeFields(element.content, $dataSourceRow)}
  {/if}
</div>

<style>
  .text-element {
    /* Element-specific styles only */
  }
</style>
