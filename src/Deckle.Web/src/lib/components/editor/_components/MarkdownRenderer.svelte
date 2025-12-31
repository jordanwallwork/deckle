<script lang="ts">
  import { marked } from "marked";
  import { parseInlineClasses, hasInlineClasses } from "$lib/utils/textParser";

  let { content = "" }: { content: string } = $props();

  // Configure marked for safe rendering
  marked.setOptions({
    breaks: true, // Support GitHub-style line breaks
    gfm: true, // GitHub Flavored Markdown
  });

  // Pre-process content to handle inline classes before markdown parsing
  const preprocessedContent = $derived(() => {
    if (hasInlineClasses(content)) {
      // Don't escape HTML in the parsed content since marked will handle escaping
      return parseInlineClasses(content, false);
    }
    return content;
  });

  const htmlContent = $derived(marked.parse(preprocessedContent()) as string);
</script>

<div class="markdown-content">
  {@html htmlContent}
</div>

<style>
  /* Override specific markdown elements to preserve formatting */
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    font-weight: bold;
    margin: 0.5em 0;
  }

  .markdown-content :global(h1) {
    font-size: 2em;
  }
  .markdown-content :global(h2) {
    font-size: 1.5em;
  }
  .markdown-content :global(h3) {
    font-size: 1.17em;
  }
  .markdown-content :global(h4) {
    font-size: 1em;
  }
  .markdown-content :global(h5) {
    font-size: 0.83em;
  }
  .markdown-content :global(h6) {
    font-size: 0.67em;
  }

  .markdown-content :global(p) {
    margin: 0.5em 0;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 0.5em 0;
    padding-left: 2em;
  }

  .markdown-content :global(li) {
    margin: 0.25em 0;
  }

  .markdown-content :global(strong) {
    font-weight: bold;
  }

  .markdown-content :global(em) {
    font-style: italic;
  }

  .markdown-content :global(code) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-family: "Courier New", Courier, monospace;
  }

  .markdown-content :global(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 1em;
    border-radius: 3px;
    overflow-x: auto;
    margin: 0.5em 0;
  }

  .markdown-content :global(pre code) {
    background-color: transparent;
    padding: 0;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid rgba(0, 0, 0, 0.2);
    margin: 0.5em 0;
    padding-left: 1em;
    color: rgba(0, 0, 0, 0.6);
  }

  .markdown-content :global(a) {
    color: #0066cc;
    text-decoration: underline;
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    margin: 1em 0;
  }

  .markdown-content :global(table) {
    border-collapse: collapse;
    margin: 0.5em 0;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid rgba(0, 0, 0, 0.2);
    padding: 0.5em;
  }

  .markdown-content :global(th) {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: bold;
  }
</style>
