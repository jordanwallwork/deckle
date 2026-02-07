<script lang="ts">
  import {
    CARD_SIZES,
    DICE_COLORS,
    DICE_TYPES,
    DICE_STYLES,
    PLAYER_MAT_SIZES
  } from '$lib/constants';
  import type { GameComponent, CardComponent, PlayerMatComponent } from '$lib/types';
  import { isCard, isDice, isPlayerMat } from '$lib/utils/componentTypes';

  let { component }: { component: GameComponent } = $props();

  function getCardSizeLabel(card: CardComponent): string {
    const sizeInfo = CARD_SIZES.find((s) => s.value === card.size);
    if (!sizeInfo) return card.size;
    const width = card.horizontal ? sizeInfo.heightMm : sizeInfo.widthMm;
    const height = card.horizontal ? sizeInfo.widthMm : sizeInfo.heightMm;
    return `${sizeInfo.label} (${width}mm × ${height}mm)`;
  }

  function getMatSizeLabel(mat: PlayerMatComponent): string {
    const sizeInfo = PLAYER_MAT_SIZES.find((s) => s.value === mat.presetSize);
    if (!sizeInfo) return mat.presetSize || '';
    const width = mat.horizontal ? sizeInfo.heightMm : sizeInfo.widthMm;
    const height = mat.horizontal ? sizeInfo.widthMm : sizeInfo.heightMm;
    return `${sizeInfo.label} (${width}mm × ${height}mm)`;
  }
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
    Card • {getCardSizeLabel(component)}
  </p>
{:else if isPlayerMat(component)}
  <p class="component-type">
    Player Mat •
    {#if component.presetSize}
      {getMatSizeLabel(component)}
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
