<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';

  function undo() {
    templateStore.undo();
  }

  function redo() {
    templateStore.redo();
  }
</script>

<div class="undo-redo-controls">
  <button
    class="control-btn"
    onclick={undo}
    disabled={!$templateStore.canUndo}
    title="Undo (Ctrl+Z)"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  </button>
  <button
    class="control-btn"
    onclick={redo}
    disabled={!$templateStore.canRedo}
    title="Redo (Ctrl+Y)"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  </button>
</div>

<style>
  .undo-redo-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .control-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
