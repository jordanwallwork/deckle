<script lang="ts">
  import { DICE_TYPES, DICE_STYLES, DICE_COLORS } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';

  let {
    diceType = $bindable(),
    diceStyle = $bindable(),
    diceColor = $bindable(),
    componentName = $bindable(),
    diceNumber = $bindable()
  }: {
    diceType: string;
    diceStyle: string;
    diceColor: string;
    componentName: string;
    diceNumber: string;
  } = $props();
</script>

<div class="configuration-form">
  <FormField label="Component Name" name="component-name">
    <Input id="component-name" bind:value={componentName} placeholder="Enter component name" />
  </FormField>

  <FormField label="Number of Dice" name="dice-number">
    <Input
      id="dice-number"
      type="number"
      bind:value={diceNumber}
      placeholder="Enter number of dice"
    />
  </FormField>

  <FormField label="Dice Type" name="dice-type">
    <Select id="dice-type" bind:value={diceType}>
      {#each DICE_TYPES as type}
        <option value={type.value}>{type.label}</option>
      {/each}
    </Select>
  </FormField>

  <FormField label="Dice Style" name="dice-style">
    <Select id="dice-style" bind:value={diceStyle}>
      {#each DICE_STYLES as style}
        <option value={style.value}>{style.label}</option>
      {/each}
    </Select>
  </FormField>

  <div class="color-field">
    <span class="color-field-label">Base Color</span>
    <div class="color-grid">
      {#each DICE_COLORS as color}
        <div class="color-option-wrapper">
          <button
            type="button"
            class="color-option"
            class:selected={diceColor === color.value}
            onclick={() => (diceColor = color.value)}
            style="background-color: {color.hex}; border-color: {color.hex};"
            aria-label="{color.label}{color.colorblindFriendly ? ' (Colorblind friendly)' : ''}"
            aria-pressed={diceColor === color.value}
          >
            {#if diceColor === color.value}
              <span class="checkmark" aria-hidden="true">✓</span>
            {/if}
          </button>
          {#if color.colorblindFriendly}
            <span class="colorblind-badge" aria-hidden="true" title="Colorblind friendly">👁️</span>
          {/if}
        </div>
      {/each}
    </div>
    <p class="color-label" aria-live="polite">
      {DICE_COLORS.find((c) => c.value === diceColor)?.label}
      {#if DICE_COLORS.find((c) => c.value === diceColor)?.colorblindFriendly}
        <span class="colorblind-text">• Colorblind friendly</span>
      {/if}
    </p>
  </div>
</div>

<style>
  .configuration-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .color-field {
    margin-bottom: 1.5rem;
  }

  .color-field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
    display: block;
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
    box-shadow:
      0 0 0 2px white,
      0 0 0 4px var(--color-sage);
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
</style>
