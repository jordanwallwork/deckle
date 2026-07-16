<script lang="ts">
  import { getContext } from 'svelte';
  import { getTabletopApi } from '$lib/tabletop';
  import type { GameSetupSummary } from '$lib/types';
  import SetupPickerDialog from './SetupPickerDialog.svelte';

  let {
    zoom,
    onZoomChange,
    onFitView
  }: { zoom: number; onZoomChange: (z: number) => void; onFitView: () => void } = $props();

  const { store } = getTabletopApi();
  const projectId = getContext<string>('projectId');

  const zoomPercentage = $derived(Math.round(zoom * 100));

  let showSetupPicker = $state(false);

  function handleSetupSelected(setup: GameSetupSummary) {
    // TODO(#120): open the Play dialog (count stepper + typed options), then run
    // the setup through the interpreter. #119 only browses + selects.
    console.log('Setup selected:', setup.id, setup.name);
  }

  function zoomIn() {
    onZoomChange(Math.min(3, zoom + 0.25));
  }

  function zoomOut() {
    onZoomChange(Math.max(0.25, zoom - 0.25));
  }

  function resetZoom() {
    onZoomChange(1);
  }
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="toolbar-label">Tabletop</span>
  </div>

  <div class="toolbar-group">
    <button
      class="tool-btn"
      onclick={() => store.undo()}
      disabled={!store.canUndo}
      title="Undo (Ctrl+Z)"
    >
      ↩
    </button>
    <button
      class="tool-btn"
      onclick={() => store.redo()}
      disabled={!store.canRedo}
      title="Redo (Ctrl+Y)"
    >
      ↪
    </button>
  </div>

  <div class="toolbar-group">
    <button class="tool-btn" onclick={zoomOut} disabled={zoom <= 0.25} title="Zoom out">−</button>
    <button class="zoom-reset" onclick={resetZoom} title="Reset zoom">{zoomPercentage}%</button>
    <button class="tool-btn" onclick={zoomIn} disabled={zoom >= 3} title="Zoom in">+</button>
    <button class="tool-btn" onclick={onFitView} title="Fit to view">⤢</button>
  </div>

  <div class="toolbar-group">
    <button class="tool-btn play-btn" onclick={() => (showSetupPicker = true)} title="Play a setup">
      ▶ Play
    </button>
  </div>
</div>

<SetupPickerDialog
  bind:show={showSetupPicker}
  {projectId}
  onSelect={handleSetupSelected}
  onclose={() => (showSetupPicker = false)}
/>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: #1e2030;
    border-bottom: 1px solid #3a3d4e;
    flex-shrink: 0;
    color: #c8cad8;
    font-size: 0.8125rem;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .toolbar-label {
    font-weight: 600;
    color: #e8e9f0;
    margin-right: 0.25rem;
  }

  .tool-btn,
  .zoom-reset {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
    min-width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s;
  }

  .tool-btn:hover:not(:disabled),
  .zoom-reset:hover {
    background: #3a3d4e;
  }

  .tool-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .zoom-reset {
    min-width: 3rem;
    font-size: 0.75rem;
  }

  .play-btn {
    width: auto;
    padding: 0.25rem 0.75rem;
    gap: 0.25rem;
    font-weight: 600;
  }
</style>

