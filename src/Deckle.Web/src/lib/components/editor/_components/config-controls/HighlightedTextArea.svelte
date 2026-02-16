<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';
  import FormulaEvaluator from 'formula-evaluator';

  let {
    label,
    id,
    value,
    rows = 3,
    placeholder,
    hideLabel = false,
    oninput
  }: {
    label: string;
    id: string;
    value: string;
    rows?: number;
    placeholder?: string;
    hideLabel?: boolean;
    oninput: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  } = $props();

  const evaluator = new FormulaEvaluator();

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Uses formula-evaluator's tokenizer to syntax-highlight formula content inside {{ }}.
   * Classifies tokens as: function, identifier, string, number, boolean.
   */
  function highlightFormula(formula: string): string {
    try {
      const tokens = evaluator.tokenize(formula);
      let result = '';
      let pos = 0;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Preserve whitespace/characters between tokens
        if (token.start > pos) {
          result += escapeHtml(formula.slice(pos, token.start));
        }

        const raw = formula.slice(token.start, token.end);
        const escaped = escapeHtml(raw);

        if (token.type === 'string') {
          result += `<span class="hl-string">${escaped}</span>`;
        } else if (token.type === 'number') {
          result += `<span class="hl-number">${escaped}</span>`;
        } else if (token.type === 'identifier') {
          if (token.value === 'true' || token.value === 'false') {
            result += `<span class="hl-boolean">${escaped}</span>`;
          } else {
            // Check if next token is '(' to identify function calls
            const next = tokens[i + 1];
            if (next && next.value === '(') {
              result += `<span class="hl-function">${escaped}</span>`;
            } else {
              result += `<span class="hl-identifier">${escaped}</span>`;
            }
          }
        } else {
          result += escaped;
        }

        pos = token.end;
      }

      // Append any trailing content
      if (pos < formula.length) {
        result += escapeHtml(formula.slice(pos));
      }

      return result;
    } catch {
      // If tokenization fails, fall back to plain escaped text
      return escapeHtml(formula);
    }
  }

  function buildHighlighted(raw: string): string {
    const mergeFieldPattern = /\{\{([^}]*)\}\}/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mergeFieldPattern.exec(raw)) !== null) {
      result += escapeHtml(raw.slice(lastIndex, match.index));
      const content = match[1];
      // Split on | to separate formula from fallback value
      const pipeIndex = content.indexOf('|');
      let inner: string;
      if (pipeIndex >= 0) {
        const formula = content.slice(0, pipeIndex);
        const fallback = content.slice(pipeIndex + 1);
        inner = `${highlightFormula(formula)}|${highlightFormula(fallback)}`;
      } else {
        inner = highlightFormula(content);
      }
      result += `<span class="merge-field">{{${inner}}}</span>`;
      lastIndex = match.index + match[0].length;
    }

    result += escapeHtml(raw.slice(lastIndex));
    return result + '\n';
  }

  let highlighted = $derived(buildHighlighted(value));

  function handleScroll(e: Event) {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    const backdrop = textarea.previousElementSibling as HTMLElement;
    if (backdrop) {
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
    }
  }
</script>

<FieldWrapper {label} {hideLabel} htmlFor={id}>
  <div class="highlighted-textarea">
    <div class="backdrop" aria-hidden="true">
      <div class="highlight-content">{@html highlighted}</div>
    </div>
    <textarea
      {id}
      {rows}
      {value}
      {placeholder}
      {oninput}
      onscroll={handleScroll}
    ></textarea>
  </div>
</FieldWrapper>

<style>
  .highlighted-textarea {
    position: relative;
  }

  .backdrop,
  .highlighted-textarea :global(textarea) {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    font-family: inherit;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    border: 1px solid transparent;
    border-radius: 4px;
    background: white;
    overflow: auto;
    pointer-events: none;
  }

  .highlight-content {
    color: #1a1a1a;
  }

  .highlighted-textarea :global(textarea) {
    position: relative;
    color: transparent !important;
    caret-color: #1a1a1a;
    background: transparent !important;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    resize: vertical;
  }

  .highlighted-textarea :global(textarea:focus) {
    outline: none;
    border-color: #0066cc;
  }

  .highlighted-textarea :global(textarea::placeholder) {
    color: #9ca3af;
  }

  :global(.highlight-content .merge-field) {
    background: #e8f0fe;
    color: #1a73e8;
    border-radius: 2px;
  }

  :global(.highlight-content .merge-field .hl-function) {
    color: #7b2ff7;
  }

  :global(.highlight-content .merge-field .hl-identifier) {
    color: #1a73e8;
    background: #d3e3fd;
  }

  :global(.highlight-content .merge-field .hl-string) {
    color: #1a7f37;
  }

  :global(.highlight-content .merge-field .hl-number) {
    color: #b35900;
  }

  :global(.highlight-content .merge-field .hl-boolean) {
    color: #b35900;
  }
</style>
