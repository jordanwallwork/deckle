<script lang="ts">
  let {
    value,
    onSave,
    placeholder = 'Enter text',
    class: className = '',
    editingClass = '',
    displayClass = ''
  }: {
    value: string;
    onSave: (newValue: string) => void;
    placeholder?: string;
    class?: string;
    editingClass?: string;
    displayClass?: string;
  } = $props();

  let isEditing = $state(false);
  let editValue = $state('');

  function startEditing() {
    editValue = value;
    isEditing = true;
  }

  function saveEdit() {
    if (isEditing) {
      const trimmedValue = editValue.trim();
      onSave(trimmedValue);
      isEditing = false;
    }
  }

  function cancelEdit() {
    isEditing = false;
    editValue = '';
  }

  function handleInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  function handleSpanKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startEditing();
    }
  }

  // Auto-focus action for input
  function focusAndSelect(element: HTMLInputElement) {
    element.focus();
    element.select();
  }
</script>

{#if isEditing}
  <input
    type="text"
    bind:value={editValue}
    {placeholder}
    class="editable-text-input {className} {editingClass}"
    onblur={saveEdit}
    onkeydown={handleInputKeyDown}
    onclick={(e) => e.stopPropagation()}
    use:focusAndSelect
  />
{:else}
  <span
    class="editable-text-display {className} {displayClass}"
    role="button"
    tabindex="0"
    aria-label="Double-click or press Enter/Space to edit"
    ondblclick={startEditing}
    onkeydown={handleSpanKeyDown}
  >
    {value || placeholder}
  </span>
{/if}

<style>
  .editable-text-input {
    padding: 0.125rem 0.25rem;
    border: 1px solid #0066cc;
    border-radius: 3px;
    background: white;
    outline: none;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .editable-text-input:focus {
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
  }

  .editable-text-display {
    cursor: text;
    user-select: none;
  }

  .editable-text-display:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }
</style>
