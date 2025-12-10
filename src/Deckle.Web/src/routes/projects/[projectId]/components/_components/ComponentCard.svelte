<script lang="ts">
  import { CARD_SIZES, DICE_COLORS } from '$lib/constants';
  import Card from '$lib/components/Card.svelte';
  import type { GameComponent } from '$lib/types';

  let {
    component
  }: {
    component: GameComponent;
  } = $props();
</script>

<Card>
  <h3>{component.name}</h3>
  {#if component.type}
    <div class="dice-info">
      <p class="component-type">{component.type}</p>
      <div class="dice-color-display">
        <span
          class="color-indicator"
          style="background-color: {DICE_COLORS.find(c => c.value === component.baseColor)?.hex}"
          title={DICE_COLORS.find(c => c.value === component.baseColor)?.label}
        ></span>
        <span class="color-name">{DICE_COLORS.find(c => c.value === component.baseColor)?.label}</span>
      </div>
    </div>
  {:else if component.size}
    <p class="component-type">Card • {CARD_SIZES.find(s => s.value === component.size)?.label || component.size}</p>
  {:else}
    <p class="component-type">Component</p>
  {/if}
</Card>

<style>
  h3 {
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
</style>
