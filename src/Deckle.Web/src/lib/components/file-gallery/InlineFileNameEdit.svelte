<script lang="ts">
  import { filesApi, ApiError } from '$lib/api';
  import { getFileNameWithoutExtension, getFileExtension } from '$lib/utils/file.utils';

  let {
    file,
    onRenamed,
    onError,
    onEditingChange
  }: {
    file: { id: string; fileName: string };
    onRenamed?: () => void;
    onError?: (message: string) => void;
    onEditingChange?: (isEditing: boolean) => void;
  } = $props();

  let isEditing = $state(false);
  let editingFileName = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);
  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isEditing && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  export function startEditing() {
    isEditing = true;
    editingFileName = getFileNameWithoutExtension(file.fileName);
    error = null;
    onEditingChange?.(true);
  }

  function cancelEditing() {
    isEditing = false;
    editingFileName = '';
    error = null;
    // Delay to allow click events to be blocked before signaling edit is complete
    setTimeout(() => onEditingChange?.(false), 100);
  }

  async function submitRename() {
    if (!editingFileName.trim()) {
      cancelEditing();
      return;
    }

    const originalName = getFileNameWithoutExtension(file.fileName);
    if (editingFileName.trim() === originalName) {
      cancelEditing();
      return;
    }

    saving = true;
    error = null;

    try {
      await filesApi.rename(file.id, {
        newFileName: editingFileName.trim()
      });
      cancelEditing();
      onRenamed?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          error = err.message;
        } else {
          onError?.(err.message || 'Failed to rename file');
          cancelEditing();
        }
      } else {
        onError?.('Failed to rename file');
        cancelEditing();
      }
    } finally {
      saving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      submitRename();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      cancelEditing();
    }
  }

  function handleSpanKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startEditing();
    }
  }
</script>

{#if isEditing}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="inline-edit-wrapper" onclick={(e) => e.stopPropagation()}>
    <div class="inline-edit-container" class:has-error={error}>
      <input
        type="text"
        class="inline-edit-input"
        class:invalid={error}
        bind:this={inputRef}
        bind:value={editingFileName}
        onkeydown={handleKeydown}
        onblur={submitRename}
        disabled={saving}
      />
      <span class="inline-edit-extension">{getFileExtension(file.fileName)}</span>
    </div>
    {#if error}
      <div class="inline-edit-error">{error}</div>
    {/if}
  </div>
{:else}
  <button
    class="file-name-button"
    title={file.fileName}
    onclick={(e) => {
      e.stopPropagation();
      startEditing();
    }}
    type="button"
    onkeydown={handleSpanKeydown}
  ><span class="file-name">{file.fileName}</span></button>
{/if}

<style>
  .file-name-button {
    background: none;
    border: none;
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
    cursor: pointer;
    text-align: left;
    display: block;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease;
  }

  .file-name-button:hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .file-name-button:focus {
    outline: none;
    background-color: rgba(120, 160, 131, 0.15);
  }

  .file-name-button:hover .file-name {
    color: var(--color-sage-dark);
  }

  .file-name {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inline-edit-container {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    background: white;
    border: 1px solid var(--color-sage);
    border-radius: var(--radius-sm);
    padding: 0.125rem 0.375rem;
    max-width: 300px;
  }

  .inline-edit-container.has-error {
    border-color: var(--color-danger);
  }

  .inline-edit-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text);
    background: transparent;
    padding: 0.125rem 0;
  }

  .inline-edit-input.invalid {
    color: var(--color-danger);
  }

  .inline-edit-input:disabled {
    opacity: 0.6;
  }

  .inline-edit-extension {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .inline-edit-error {
    font-size: 0.75rem;
    color: var(--color-danger);
    margin-top: 0.25rem;
  }
</style>
