<script lang="ts">
  import { onMount } from 'svelte';
  import {
    POPULAR_FONTS,
    searchGoogleFonts,
    loadGoogleFonts,
    isGoogleFontsApiConfigured,
    type GoogleFont,
    type FontCategory
  } from '$lib/services/googleFonts';
  import { CloseIcon, ExternalLinkIcon } from '$lib/components/icons';

  const hasApiKey = isGoogleFontsApiConfigured();

  let {
    isOpen = false,
    onselect,
    onclose
  }: {
    isOpen: boolean;
    onselect: (font: { family: string; category: string }) => void;
    onclose: () => void;
  } = $props();

  let searchQuery = $state('');
  let selectedCategory = $state<FontCategory>('all');
  let searchResults = $state<GoogleFont[]>([]);
  let isSearching = $state(false);
  let manualFontName = $state('');
  let searchInputRef: HTMLInputElement | null = null;

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    if (isOpen) {
      // Reset state when modal opens
      searchQuery = '';
      selectedCategory = 'all';
      manualFontName = '';

      // Load initial fonts immediately
      handleSearch();

      // Focus search input after modal opens
      setTimeout(() => {
        searchInputRef?.focus();
      }, 100);
    }
  });

  // Track previous values for debounced search
  let prevQuery = '';
  let prevCategory: FontCategory = 'all';

  $effect(() => {
    // Trigger debounced search when query or category changes (but not on initial load)
    if (isOpen && (searchQuery !== prevQuery || selectedCategory !== prevCategory)) {
      prevQuery = searchQuery;
      prevCategory = selectedCategory;

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handleSearch();
      }, 300);
    }
  });

  async function handleSearch() {
    isSearching = true;
    try {
      const results = await searchGoogleFonts(searchQuery, selectedCategory, 100);
      searchResults = results;

      // Preload search result fonts for preview
      if (results.length > 0) {
        const fontsToLoad = results.slice(0, 30).map(f => ({ family: f.family, variants: ['400'] }));
        loadGoogleFonts(fontsToLoad);
      }
    } catch (error) {
      console.error('Error searching fonts:', error);
      // Fall back to filtering popular fonts
      let filtered = POPULAR_FONTS;
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(f => f.category === selectedCategory);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(f => f.family.toLowerCase().includes(query));
      }
      searchResults = filtered;
    } finally {
      isSearching = false;
    }
  }

  function selectFont(font: GoogleFont) {
    // Load the font before selecting
    loadGoogleFonts([{ family: font.family, variants: ['400'] }]);
    onselect({ family: font.family, category: font.category });
    onclose();
  }

  function selectManualFont() {
    const fontName = manualFontName.trim();
    if (!fontName) return;

    // Load the font
    loadGoogleFonts([{ family: fontName, variants: ['400'] }]);
    onselect({ family: fontName, category: 'sans-serif' });
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

  onMount(() => {
    // Preload popular fonts for preview
    loadGoogleFonts(POPULAR_FONTS.slice(0, 20).map(f => ({ family: f.family, variants: ['400'] })));
  });

  const categories: { value: FontCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'display', label: 'Display' },
    { value: 'handwriting', label: 'Handwriting' },
    { value: 'monospace', label: 'Monospace' }
  ];
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title">{hasApiKey ? 'Search Google Fonts' : 'Select a Font'}</h2>
        <button type="button" class="close-button" onclick={onclose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </div>

      <div class="modal-body">
        {#if hasApiKey}
          <!-- Search Input -->
          <div class="search-section">
            <input
              type="text"
              bind:this={searchInputRef}
              bind:value={searchQuery}
              placeholder="Search font names..."
              class="search-input"
            />
          </div>

          <!-- Category Filters -->
          <div class="category-filters">
            {#each categories as cat}
              <button
                type="button"
                class="category-filter"
                class:active={selectedCategory === cat.value}
                onclick={() => selectedCategory = cat.value}
              >
                {cat.label}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Results -->
        <div class="results-section">
          {#if !hasApiKey}
            <div class="section-label">Popular Fonts</div>
          {/if}
          {#if isSearching}
            <div class="loading">Searching...</div>
          {:else if searchResults.length > 0}
            <div class="font-grid">
              {#each searchResults as font}
                <button
                  type="button"
                  class="font-card"
                  onclick={() => selectFont(font)}
                >
                  <span class="font-preview" style={`font-family: '${font.family}', sans-serif;`}>
                    {font.family}
                  </span>
                  <span class="font-category">{font.category}</span>
                </button>
              {/each}
            </div>
          {:else if hasApiKey}
            <div class="no-results">
              {#if searchQuery}
                No fonts found matching "{searchQuery}"
              {:else}
                Type to search or select a category
              {/if}
            </div>
          {/if}
        </div>

        <!-- Manual Entry Section -->
        <div class="manual-section">
          <div class="manual-header">
            <span>Or enter a font name manually:</span>
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noopener noreferrer"
              class="google-fonts-link"
            >
              Browse fonts.google.com
              <ExternalLinkIcon size={12} />
            </a>
          </div>
          <div class="manual-input-row">
            <input
              type="text"
              bind:value={manualFontName}
              placeholder="e.g., Roboto, Playfair Display..."
              class="manual-input"
              onkeydown={(e) => e.key === 'Enter' && selectManualFont()}
            />
            <button
              type="button"
              class="use-font-button"
              onclick={selectManualFont}
              disabled={!manualFontName.trim()}
            >
              Use Font
            </button>
          </div>
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
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 90%;
    max-width: 640px;
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

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .category-filter {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    border: 1px solid #d1d5db;
    border-radius: 9999px;
    background: white;
    cursor: pointer;
    transition: all 0.15s;
  }

  .category-filter:hover {
    border-color: #9ca3af;
    background: #f9fafb;
  }

  .category-filter.active {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }

  .results-section {
    flex: 1;
    min-height: 200px;
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .section-label {
    padding: 0.5rem 0.75rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .font-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .font-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }

  .font-card:hover {
    border-color: #0066cc;
    background: #f8faff;
  }

  .font-preview {
    font-size: 1rem;
    color: #111827;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .font-category {
    font-size: 0.6875rem;
    color: #9ca3af;
    text-transform: capitalize;
  }

  .loading,
  .no-results {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .manual-section {
    flex-shrink: 0;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }

  .manual-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .google-fonts-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #0066cc;
    text-decoration: none;
    font-size: 0.8125rem;
  }

  .google-fonts-link:hover {
    text-decoration: underline;
  }

  .manual-input-row {
    display: flex;
    gap: 0.5rem;
  }

  .manual-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-sizing: border-box;
  }

  .manual-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .use-font-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background: #0066cc;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .use-font-button:hover:not(:disabled) {
    background: #0052a3;
  }

  .use-font-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>
