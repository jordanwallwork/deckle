<script lang="ts">
  import { onMount } from 'svelte';
  import FieldWrapper from './FieldWrapper.svelte';
  import GoogleFontModal from './GoogleFontModal.svelte';
  import {
    POPULAR_FONTS,
    SYSTEM_FONT,
    loadGoogleFonts,
    type GoogleFont
  } from '$lib/services/googleFonts';
  import type { FontMetadata } from '$lib/components/editor/types';

  let {
    label,
    id,
    value = '',
    usedFonts = [],
    onchange
  }: {
    label: string;
    id: string;
    value?: string;
    usedFonts?: FontMetadata[];
    onchange: (font: { family: string; category: string }) => void;
  } = $props();

  let isOpen = $state(false);
  let isModalOpen = $state(false);
  let fontsPreloaded = $state(false);

  // Display value for the selected font
  let displayValue = $derived(value || 'System Default');

  // Popular fonts excluding already used fonts
  let popularFonts = $derived(
    POPULAR_FONTS.filter(font => !usedFonts.some(used => used.family === font.family))
  );

  // Handle font selection
  function selectFont(font: { family: string; category: string }) {
    onchange(font);
    isOpen = false;
  }

  // Toggle dropdown
  function toggleDropdown() {
    isOpen = !isOpen;
  }

  // Open font search modal
  function openFontModal() {
    isOpen = false; // Close dropdown
    isModalOpen = true;
  }

  // Handle font selection from modal
  function handleModalSelect(font: { family: string; category: string }) {
    onchange(font);
    isModalOpen = false;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const container = document.getElementById(`${id}-container`);
    if (container && !container.contains(target)) {
      isOpen = false;
    }
  }

  // Preload popular fonts and used fonts so they display correctly in the selector
  function preloadFonts() {
    if (fontsPreloaded) return;

    // Get fonts to preload (popular fonts + used fonts)
    const fontsToPreload = [
      ...POPULAR_FONTS.slice(0, 10).map(f => ({ family: f.family, variants: ['400'] })),
      ...usedFonts.map(f => ({ family: f.family, variants: ['400'] }))
    ];

    // Filter out duplicates and System Default
    const uniqueFonts = fontsToPreload.filter((font, index, self) =>
      font.family !== 'System Default' &&
      self.findIndex(f => f.family === font.family) === index
    );

    if (uniqueFonts.length > 0) {
      loadGoogleFonts(uniqueFonts);
    }

    fontsPreloaded = true;
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);

    // Preload fonts immediately on mount for proper preview in selector
    preloadFonts();

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // Also preload if usedFonts changes
  $effect(() => {
    if (usedFonts.length > 0) {
      const newFonts = usedFonts
        .filter(f => f.family !== 'System Default')
        .map(f => ({ family: f.family, variants: ['400'] }));
      if (newFonts.length > 0) {
        loadGoogleFonts(newFonts);
      }
    }
  });
</script>

<FieldWrapper {label} htmlFor={id}>
  <div id={`${id}-container`} class="font-selector">
    <button
      type="button"
      {id}
      class="font-selector-trigger"
      onclick={toggleDropdown}
      style={value && value !== 'System Default' ? `font-family: '${value}', sans-serif;` : ''}
    >
      <span class="font-name">{displayValue}</span>
      <svg
        class="chevron"
        class:open={isOpen}
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 4L6 8L10 4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    {#if isOpen}
      <div class="font-dropdown">
        <!-- Used Fonts Section -->
        {#if usedFonts.length > 0}
          <div class="font-section">
            <div class="section-header">Recently Used</div>
            {#each usedFonts as font}
              <button
                type="button"
                class="font-option"
                class:selected={value === font.family}
                onclick={() => selectFont({ family: font.family, category: font.category || 'sans-serif' })}
                style={`font-family: '${font.family}', sans-serif;`}
              >
                <span class="font-name">{font.family}</span>
                <span class="font-category">{font.category}</span>
              </button>
            {/each}
          </div>
        {/if}

        <!-- System Default -->
        <div class="font-section">
          <button
            type="button"
            class="font-option"
            class:selected={!value || value === 'System Default'}
            onclick={() => selectFont({ family: 'System Default', category: 'sans-serif' })}
          >
            <span class="font-name">System Default</span>
            <span class="font-category">sans-serif</span>
          </button>
        </div>

        <!-- Popular Fonts Section -->
        <div class="font-section">
          <div class="section-header">Popular Fonts</div>
          {#each popularFonts.slice(0, 10) as font}
            <button
              type="button"
              class="font-option"
              class:selected={value === font.family}
              onclick={() => selectFont({ family: font.family, category: font.category })}
              style={`font-family: '${font.family}', sans-serif;`}
            >
              <span class="font-name">{font.family}</span>
              <span class="font-category">{font.category}</span>
            </button>
          {/each}
        </div>

        <!-- Search Option -->
        <div class="font-section">
          <button type="button" class="search-trigger" onclick={openFontModal}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6.33333 11.6667C9.27885 11.6667 11.6667 9.27885 11.6667 6.33333C11.6667 3.38781 9.27885 1 6.33333 1C3.38781 1 1 3.38781 1 6.33333C1 9.27885 3.38781 11.6667 6.33333 11.6667Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13 13L10.1 10.1"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Search Google Fonts...
          </button>
        </div>
      </div>
    {/if}
  </div>
</FieldWrapper>

<GoogleFontModal
  isOpen={isModalOpen}
  onselect={handleModalSelect}
  onclose={() => isModalOpen = false}
/>

<style>
  .font-selector {
    position: relative;
  }

  .font-selector-trigger {
    width: 100%;
    height: 2.125rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .font-selector-trigger:hover {
    border-color: var(--color-text-secondary);
  }

  .font-selector-trigger:focus {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  .font-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    margin-left: 0.5rem;
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .font-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 400px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-shadow: var(--shadow-md);
    overflow-y: auto;
    z-index: 1000;
  }

  .font-section {
    border-bottom: 1px solid var(--color-border);
  }

  .font-section:last-child {
    border-bottom: none;
  }

  .section-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.688rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    background: var(--color-bg-subtle);
  }

  .font-option {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: none;
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .font-option:hover {
    background: var(--color-bg-subtle);
  }

  .font-option.selected {
    background: var(--color-bg-subtle);
    color: var(--color-accent-fg);
  }

  .font-option .font-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .font-option .font-category {
    font-size: 0.688rem;
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .search-trigger {
    width: 100%;
    padding: 0.75rem;
    border: none;
    background: var(--color-surface);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-accent-fg);
    transition: background-color 0.15s;
  }

  .search-trigger:hover {
    background: var(--color-bg-subtle);
  }

  .search-trigger svg {
    flex-shrink: 0;
  }
</style>
