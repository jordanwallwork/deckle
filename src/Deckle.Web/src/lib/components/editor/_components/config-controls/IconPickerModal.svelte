<script lang="ts">
  import { loadFaIcons, type FaIcon, type FaIconStyle } from '$lib/data/faIcons';
  import { CloseIcon } from '$lib/components/icons';

  let {
    isOpen = false,
    onselect,
    onclose
  }: {
    isOpen: boolean;
    onselect: (iconName: string, style: FaIconStyle) => void;
    onclose: () => void;
  } = $props();

  let searchQuery = $state('');
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let allIcons = $state<FaIcon[]>([]);
  let filteredIcons = $state<FaIcon[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;
  let prevQuery = '';

  $effect(() => {
    if (isOpen) {
      searchQuery = '';
      prevQuery = '';
      filteredIcons = allIcons;

      if (allIcons.length === 0 && !loading) {
        loading = true;
        error = null;
        loadFaIcons()
          .then((icons) => {
            allIcons = icons;
            filteredIcons = icons;
          })
          .catch(() => {
            error = 'Failed to load icons. Please try again.';
          })
          .finally(() => {
            loading = false;
          });
      }

      setTimeout(() => searchInputRef?.focus(), 100);
    }
  });

  $effect(() => {
    if (isOpen && searchQuery !== prevQuery) {
      prevQuery = searchQuery;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterIcons();
      }, 300);
    }
  });

  function filterIcons() {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      filteredIcons = allIcons;
      return;
    }
    filteredIcons = allIcons.filter(
      (icon) => icon.name.includes(query) || icon.keywords.some((kw) => kw.includes(query))
    );
  }

  function selectIcon(icon: FaIcon) {
    onselect(icon.name, icon.style);
    onclose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="icon-modal-title">
      <div class="modal-header">
        <h2 id="icon-modal-title">Insert Icon</h2>
        <button type="button" class="close-button" onclick={onclose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </div>

      <div class="modal-body">
        <div class="search-section">
          <input
            type="text"
            bind:this={searchInputRef}
            bind:value={searchQuery}
            placeholder="Search icons..."
            class="search-input"
            disabled={loading}
          />
        </div>

        <div class="results-section">
          {#if loading}
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Loading icons...</span>
            </div>
          {:else if error}
            <div class="error-state">
              <span>{error}</span>
              <button
                type="button"
                class="retry-button"
                onclick={() => {
                  loading = true;
                  error = null;
                  loadFaIcons()
                    .then((icons) => {
                      allIcons = icons;
                      filteredIcons = icons;
                    })
                    .catch(() => {
                      error = 'Failed to load icons. Please try again.';
                    })
                    .finally(() => {
                      loading = false;
                    });
                }}
              >
                Retry
              </button>
            </div>
          {:else if filteredIcons.length > 0}
            <div class="icon-grid">
              {#each filteredIcons as icon}
                <button
                  type="button"
                  class="icon-card"
                  onclick={() => selectIcon(icon)}
                  title={icon.name}
                >
                  <i class="fa-{icon.style} fa-{icon.name} icon-preview"></i>
                  <span class="icon-name">{icon.name}</span>
                </button>
              {/each}
            </div>
          {:else}
            <div class="no-results">
              No icons found matching "{searchQuery}"
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal {
    background: white;
    border-radius: 8px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 90%;
    max-width: 540px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .close-button {
    padding: 0.25rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #6b7280;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .modal-body {
    padding: 1rem 1.25rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-section {
    flex-shrink: 0;
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-sizing: border-box;
  }

  .search-input:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .search-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .results-section {
    flex: 1;
    min-height: 200px;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
    padding: 0.5rem 0;
  }

  .icon-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .icon-card:hover {
    border-color: #0066cc;
    background: #f8faff;
  }

  .icon-card :global(.icon-preview) {
    font-size: 1.25rem;
    color: #374151;
  }

  .icon-name {
    font-size: 0.625rem;
    color: #9ca3af;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .no-results {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    height: 100%;
    min-height: 150px;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #0066cc;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    height: 100%;
    min-height: 150px;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .retry-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    cursor: pointer;
  }

  .retry-button:hover {
    background: #f3f4f6;
  }
</style>
