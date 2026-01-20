<script lang="ts">
  import {
    CARD_SIZES,
    DICE_COLORS,
    DICE_TYPES,
    DICE_STYLES,
    PLAYER_MAT_SIZES,
    PLAYER_MAT_ORIENTATIONS
  } from '$lib/constants';
  import type { GameComponent } from '$lib/types';
  import { isCard, isDice, isPlayerMat } from '$lib/utils/componentTypes';

  let { component }: { component: GameComponent } = $props();
</script>

{#if isDice(component)}
  <div class="dice-info">
    <p class="component-type">
      {component.number} x {DICE_TYPES.find((t) => t.value === component.diceType)?.label ||
        component.diceType}
      • {DICE_STYLES.find((s) => s.value === component.style)?.label || component.style}
      •
      <span
        class="color-indicator"
        style="background-color: {DICE_COLORS.find((c) => c.value === component.baseColor)?.hex}"
        title={DICE_COLORS.find((c) => c.value === component.baseColor)?.label}
      ></span>
      {DICE_COLORS.find((c) => c.value === component.baseColor)?.label}
    </p>
  </div>
{:else if isCard(component)}
  <p class="component-type">
    Card • {CARD_SIZES.find((s) => s.value === component.size)?.label || component.size}
  </p>
{:else if isPlayerMat(component)}
  <p class="component-type">
    Player Mat •
    {#if component.presetSize}
      {PLAYER_MAT_SIZES.find((s) => s.value === component.presetSize)?.label ||
        component.presetSize}
      ({PLAYER_MAT_ORIENTATIONS.find((o) => o.value === component.orientation)?.label ||
        component.orientation})
    {:else}
      Custom ({component.customWidthMm}mm × {component.customHeightMm}mm)
    {/if}
  </p>
{:else}
  <p class="component-type">Component</p>
{/if}

<style>
  .component-type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
    text-align: center;
  }

  .dice-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .color-indicator {
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: 8px;
  }
</style>
