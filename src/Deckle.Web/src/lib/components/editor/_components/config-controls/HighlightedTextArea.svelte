<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';
  import InsertDropdown from './InsertDropdown.svelte';
  import IconPickerModal from './IconPickerModal.svelte';
  import FormulaEvaluator from 'formula-evaluator';
  import type { FaIconStyle } from '$lib/data/faIcons';

  let {
    label,
    id,
    value,
    rows = 3,
    placeholder,
    hideLabel = false,
    showToolbar = false,
    dataSourceFields = [] as string[],
    oninput
  }: {
    label: string;
    id: string;
    value: string;
    rows?: number;
    placeholder?: string;
    hideLabel?: boolean;
    showToolbar?: boolean;
    dataSourceFields?: string[];
    oninput: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  } = $props();

  const evaluator = new FormulaEvaluator();

  let textareaRef: HTMLTextAreaElement | null = null;
  let showIconPicker = $state(false);
  let showMergeDropdown = $state(false);
  let showFormulaDropdown = $state(false);

  let mergeFieldItems = $derived(
    dataSourceFields.map((field) => ({
      label: field,
      value: field,
      description: 'Merge field'
    }))
  );

  let formulaItems = $derived.by(() => {
    const fns = evaluator.describeFunctions();
    return fns.map((fn: { name: string; description: string }) => ({
      label: fn.name + '()',
      value: fn.name,
      description: fn.description
    }));
  });

  /**
   * Checks if the cursor is currently inside a {{ }} merge field.
   */
  function isCursorInsideMergeField(): boolean {
    if (!textareaRef) return false;
    const pos = textareaRef.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const lastOpen = before.lastIndexOf('{{');
    const lastClose = before.lastIndexOf('}}');
    if (lastOpen === -1 || lastOpen < lastClose) return false;
    const nextClose = after.indexOf('}}');
    return nextClose !== -1;
  }

  function insertAtCursor(text: string, cursorOffset?: number) {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const newValue = value.slice(0, start) + text + value.slice(end);

    // Update value via native setter to trigger oninput properly
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textareaRef, newValue);
    }

    // Fire input event so parent state updates
    const inputEvent = new Event('input', { bubbles: true });
    textareaRef.dispatchEvent(inputEvent);

    // Restore cursor position
    const newPos = start + (cursorOffset ?? text.length);
    requestAnimationFrame(() => {
      textareaRef?.focus();
      textareaRef?.setSelectionRange(newPos, newPos);
    });
  }

  function handleIconSelect(iconName: string, style: FaIconStyle) {
    if (style === 'solid') {
      insertAtCursor(`{[s:${iconName}]}`);
    } else {
      insertAtCursor(`{[${iconName}]}`);
    }
  }

  function handleMergeFieldSelect(fieldName: string) {
    if (isCursorInsideMergeField()) {
      insertAtCursor(fieldName);
    } else {
      insertAtCursor(`{{${fieldName}}}`);
    }
  }

  function handleFormulaSelect(funcName: string) {
    if (isCursorInsideMergeField()) {
      insertAtCursor(`${funcName}()`, funcName.length + 1);
    } else {
      insertAtCursor(`{{${funcName}()}}`, 2 + funcName.length + 1);
    }
  }

  function closeAllDropdowns() {
    showMergeDropdown = false;
    showFormulaDropdown = false;
  }

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  /**
   * Highlights icon syntax: {[icon-name]} and {className:[icon-name]}
   */
  function highlightIcons(text: string): string {
    const iconPattern = /\{([^{}:]*?:\s*)?\[((?:s:)?[a-z0-9-]+)\]\}/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = iconPattern.exec(text)) !== null) {
      result += text.slice(lastIndex, match.index);
      const classPrefix = match[1] ? `<span class="hl-identifier">${match[1]}</span>` : '';
      const rawIconName = match[2];
      // Highlight "s:" prefix separately if present
      let iconNameHtml: string;
      if (rawIconName.startsWith('s:')) {
        iconNameHtml = `<span class="hl-identifier">s:</span><span class="hl-icon-name">${rawIconName.slice(2)}</span>`;
      } else {
        iconNameHtml = `<span class="hl-icon-name">${rawIconName}</span>`;
      }
      result += `<span class="icon-field">{${classPrefix}[${iconNameHtml}]}</span>`;
      lastIndex = match.index + match[0].length;
    }

    result += text.slice(lastIndex);
    return result;
  }

  function buildHighlighted(raw: string): string {
    const mergeFieldPattern = /\{\{([^}]*)\}\}/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mergeFieldPattern.exec(raw)) !== null) {
      result += highlightIcons(escapeHtml(raw.slice(lastIndex, match.index)));
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

    result += highlightIcons(escapeHtml(raw.slice(lastIndex)));
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
  {#if showToolbar}
    <div class="toolbar">
      <button
        type="button"
        class="toolbar-btn"
        title="Insert icon"
        onclick={() => (showIconPicker = true)}
      >
        <i class="fa-solid fa-icons"></i>
      </button>

      <div class="toolbar-dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn"
          title="Insert merge field"
          disabled={dataSourceFields.length === 0}
          onclick={() => {
            closeAllDropdowns();
            showMergeDropdown = !showMergeDropdown;
          }}
        >
          <i class="fa-solid fa-database"></i>
        </button>
        {#if showMergeDropdown}
          <InsertDropdown
            items={mergeFieldItems}
            onselect={handleMergeFieldSelect}
            onclose={() => (showMergeDropdown = false)}
          />
        {/if}
      </div>

      <div class="toolbar-dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn bold"
          title="Insert formula"
          onclick={() => {
            closeAllDropdowns();
            showFormulaDropdown = !showFormulaDropdown;
          }}
        >
          f()
        </button>
        {#if showFormulaDropdown}
          <InsertDropdown
            items={formulaItems}
            onselect={handleFormulaSelect}
            onclose={() => (showFormulaDropdown = false)}
          />
        {/if}
      </div>
    </div>
  {/if}

  <div class="highlighted-textarea">
    <div class="backdrop" aria-hidden="true">
      <div class="highlight-content">{@html highlighted}</div>
    </div>
    <textarea
      bind:this={textareaRef}
      {id}
      {rows}
      {value}
      {placeholder}
      {oninput}
      onscroll={handleScroll}
    ></textarea>
  </div>
</FieldWrapper>

<IconPickerModal
  isOpen={showIconPicker}
  onselect={handleIconSelect}
  onclose={() => (showIconPicker = false)}
/>

<style>
  .toolbar {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.15s;
  }

  .toolbar-btn.bold {
    font-weight: bold;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: #f3f4f6;
    color: #374151;
    border-color: #9ca3af;
  }

  .toolbar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toolbar-dropdown-wrapper {
    position: relative;
  }

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

  :global(.highlight-content .icon-field) {
    background: #fef3e0;
    color: #e65100;
    border-radius: 2px;
  }

  :global(.highlight-content .icon-field .hl-icon-name) {
    color: #e65100;
  }

  :global(.highlight-content .icon-field .hl-identifier) {
    color: #1a73e8;
    background: transparent;
  }
</style>
