<script lang="ts">
  import type { PageData } from './$types';
  import { config } from '$lib/config';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  let showModal = $state(false);
  let selectedType: 'card' | 'dice' | null = $state(null);
  let componentName = $state('');

  // Card configuration
  let cardSize = $state('StandardPoker');

  // Dice configuration
  let diceType = $state('D6');
  let diceStyle = $state('Numbered');
  let diceColor = $state('EarthGreen');

  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const cardSizes = [
    { value: 'MiniAmerican', label: 'Mini American (41mm × 63mm)' },
    { value: 'MiniEuro', label: 'Mini Euro (44mm × 67mm)' },
    { value: 'Bridge', label: 'Bridge (57.2mm × 88.9mm)' },
    { value: 'MetricPoker', label: 'Metric Poker (63mm × 88mm)' },
    { value: 'StandardPoker', label: 'Standard Poker (63.5mm × 88.9mm)' },
    { value: 'Tarot', label: 'Tarot (70mm × 120mm)' },
    { value: 'Jumbo', label: 'Jumbo (88mm × 126mm)' },
    { value: 'ExtraSmallSquare', label: 'Extra Small Square (55mm × 55mm)' },
    { value: 'SmallSquare', label: 'Small Square (63.5mm × 63.5mm)' },
    { value: 'MediumSquare', label: 'Medium Square (70mm × 70mm)' },
    { value: 'LargeSquare', label: 'Large Square (88.9mm × 88.9mm)' }
  ];

  const diceTypes = [
    { value: 'D4', label: 'D4' },
    { value: 'D6', label: 'D6' },
    { value: 'D8', label: 'D8' },
    { value: 'D10', label: 'D10' },
    { value: 'D12', label: 'D12' },
    { value: 'D20', label: 'D20' }
  ];

  const diceStyles = [
    { value: 'Numbered', label: 'Numbered' },
    { value: 'Pips', label: 'Pips' },
    { value: 'Blank', label: 'Blank' }
  ];

  const diceColors = [
    { value: 'EarthGreen', label: 'Earth Green', hex: '#3cb8b5', colorblindFriendly: true },
    { value: 'MarsRed', label: 'Mars Red', hex: '#e00022', colorblindFriendly: true },
    { value: 'MercuryGrey', label: 'Mercury Grey', hex: '#e5e1e6', colorblindFriendly: true },
    { value: 'NeptuneBlue', label: 'Neptune Blue', hex: '#1d50b8', colorblindFriendly: true },
    { value: 'SpaceBlack', label: 'Space Black', hex: '#111820', colorblindFriendly: true },
    { value: 'SunYellow', label: 'Sun Yellow', hex: '#f4e834', colorblindFriendly: true },
    { value: 'EmeraldGreen', label: 'Emerald Green', hex: '#34ab49', colorblindFriendly: false },
    { value: 'JupiterOrange', label: 'Jupiter Orange', hex: '#ed8100', colorblindFriendly: false },
    { value: 'NebularPurple', label: 'Nebular Purple', hex: '#872a92', colorblindFriendly: false },
    { value: 'PlutoBrown', label: 'Pluto Brown', hex: '#8e4400', colorblindFriendly: false },
    { value: 'StarWhite', label: 'Star White', hex: '#ffffff', colorblindFriendly: false }
  ];

  function openModal() {
    showModal = true;
    selectedType = null;
    componentName = '';
    cardSize = 'StandardPoker';
    diceType = 'D6';
    diceStyle = 'Numbered';
    diceColor = 'EarthGreen';
    errorMessage = '';
  }

  function closeModal() {
    showModal = false;
    selectedType = null;
    componentName = '';
    errorMessage = '';
  }

  function selectType(type: 'card' | 'dice') {
    selectedType = type;
    errorMessage = '';
  }

  async function handleSubmit() {
    if (!componentName.trim()) {
      errorMessage = 'Please enter a component name';
      return;
    }

    if (!selectedType) {
      errorMessage = 'Please select a component type';
      return;
    }

    isSubmitting = true;
    errorMessage = '';

    try {
      const endpoint = selectedType === 'card'
        ? `${config.apiUrl}/projects/${data.project.id}/components/cards`
        : `${config.apiUrl}/projects/${data.project.id}/components/dice`;

      const body = selectedType === 'card'
        ? { name: componentName, size: cardSize }
        : { name: componentName, type: diceType, style: diceStyle, baseColor: diceColor };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to create component');
      }

      await invalidateAll();
      closeModal();
    } catch (err) {
      console.error('Error creating component:', err);
      errorMessage = 'Failed to create component. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Components · {data.project.name} · Deckle</title>
  <meta name="description" content="Manage game components for {data.project.name}. Design cards, tokens, and other game pieces from your data sources." />
</svelte:head>

<div class="tab-content">
  <div class="tab-header">
    <h2>Components</h2>
    <button class="add-button" onclick={openModal}>+ Add Component</button>
  </div>

  {#if data.components && data.components.length > 0}
    <div class="components-list">
      {#each data.components as component}
        <div class="component-card">
          <h3>{component.name}</h3>
          {#if component.type}
            <div class="dice-info">
              <p class="component-type">{component.type}</p>
              <div class="dice-color-display">
                <span
                  class="color-indicator"
                  style="background-color: {diceColors.find(c => c.value === component.baseColor)?.hex}"
                  title={diceColors.find(c => c.value === component.baseColor)?.label}
                ></span>
                <span class="color-name">{diceColors.find(c => c.value === component.baseColor)?.label}</span>
              </div>
            </div>
          {:else if component.size}
            <p class="component-type">Card • {cardSizes.find(s => s.value === component.size)?.label || component.size}</p>
          {:else}
            <p class="component-type">Component</p>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p class="empty-message">No components yet</p>
      <p class="empty-subtitle">Add components to build your game's card decks</p>
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-backdrop" onclick={closeModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>New Component</h3>
        <button class="close-button" onclick={closeModal}>&times;</button>
      </div>

      <div class="modal-body">
        {#if !selectedType}
          <div class="type-selection">
            <button class="type-card" onclick={() => selectType('card')}>
              <div class="type-icon">🃏</div>
              <h4>Card</h4>
              <p>Create custom playing cards, game cards, or card decks</p>
            </button>
            <button class="type-card" onclick={() => selectType('dice')}>
              <div class="type-icon">🎲</div>
              <h4>Dice</h4>
              <p>Design custom dice with various colors and styles</p>
            </button>
          </div>
        {:else}
          <div class="configuration-form">
            <button class="back-button" onclick={() => selectedType = null}>← Back to component types</button>

            <div class="form-group">
              <label for="component-name">Component Name</label>
              <input
                id="component-name"
                type="text"
                bind:value={componentName}
                placeholder="Enter component name"
              />
            </div>

            {#if selectedType === 'card'}
              <div class="form-group">
                <label for="card-size">Card Size</label>
                <select id="card-size" bind:value={cardSize}>
                  {#each cardSizes as size}
                    <option value={size.value}>{size.label}</option>
                  {/each}
                </select>
              </div>
            {:else if selectedType === 'dice'}
              <div class="form-group">
                <label for="dice-type">Dice Type</label>
                <select id="dice-type" bind:value={diceType}>
                  {#each diceTypes as type}
                    <option value={type.value}>{type.label}</option>
                  {/each}
                </select>
              </div>

              <div class="form-group">
                <label for="dice-style">Dice Style</label>
                <select id="dice-style" bind:value={diceStyle}>
                  {#each diceStyles as style}
                    <option value={style.value}>{style.label}</option>
                  {/each}
                </select>
              </div>

              <div class="form-group">
                <label for="dice-color">Base Color</label>
                <div class="color-grid">
                  {#each diceColors as color}
                    <div class="color-option-wrapper">
                      <button
                        class="color-option"
                        class:selected={diceColor === color.value}
                        onclick={() => diceColor = color.value}
                        style="background-color: {color.hex}; border-color: {color.hex};"
                        title={color.label}
                      >
                        {#if diceColor === color.value}
                          <span class="checkmark">✓</span>
                        {/if}
                      </button>
                      {#if color.colorblindFriendly}
                        <span class="colorblind-badge" title="Colorblind friendly">👁️</span>
                      {/if}
                    </div>
                  {/each}
                </div>
                <p class="color-label">
                  {diceColors.find(c => c.value === diceColor)?.label}
                  {#if diceColors.find(c => c.value === diceColor)?.colorblindFriendly}
                    <span class="colorblind-text">• Colorblind friendly</span>
                  {/if}
                </p>
              </div>
            {/if}

            {#if errorMessage}
              <p class="error-message">{errorMessage}</p>
            {/if}

            <div class="modal-actions">
              <button class="cancel-button" onclick={closeModal} disabled={isSubmitting}>Cancel</button>
              <button class="submit-button" onclick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Component'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .tab-content {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 12px;
    padding: 2rem;
    min-height: 400px;
  }

  .tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .add-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .components-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .component-card {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }

  .component-card:hover {
    border-color: var(--color-muted-teal);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.2);
  }

  .component-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .component-type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
  }

  .dice-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dice-color-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-indicator {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid var(--color-teal-grey);
    flex-shrink: 0;
  }

  .color-name {
    font-size: 0.875rem;
    color: var(--color-sage);
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background-color: white;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid var(--color-teal-grey);
  }

  .modal-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--color-muted-teal);
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .type-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .type-card {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    padding: 2rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .type-card:hover {
    border-color: var(--color-muted-teal);
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(120, 160, 131, 0.2);
  }

  .type-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .type-card h4 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .type-card p {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
    line-height: 1.4;
  }

  .configuration-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .back-button {
    background: none;
    border: none;
    color: var(--color-muted-teal);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem 0;
    text-align: left;
    transition: color 0.2s ease;
  }

  .back-button:hover {
    color: var(--color-sage);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
  }

  .form-group input,
  .form-group select {
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .color-option-wrapper {
    position: relative;
  }

  .color-option {
    width: 100%;
    aspect-ratio: 1;
    border: 3px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .color-option.selected {
    border-color: var(--color-sage);
    box-shadow: 0 0 0 2px white, 0 0 0 4px var(--color-sage);
  }

  .checkmark {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .colorblind-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background-color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  }

  .color-label {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin-top: 0.5rem;
  }

  .colorblind-text {
    color: var(--color-sage);
    font-weight: 600;
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin: 0;
    padding: 0.75rem;
    background-color: #ffebee;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 2px solid var(--color-teal-grey);
  }

  .cancel-button,
  .submit-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .cancel-button {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .cancel-button:hover:not(:disabled) {
    background-color: #d0d7d3;
  }

  .submit-button {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .cancel-button:disabled,
  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
