<script lang="ts">
  import type { EditableComponent, CardComponent, RectangleShape } from '$lib/types';

  let { component, part }: { component: EditableComponent; part?: string } = $props();

  // Check if this is a card component with shape info
  let cardComponent = $derived('shape' in component ? component as CardComponent : null);
  let rectangleShape = $derived(
    cardComponent?.shape?.type === 'rectangle' ? cardComponent.shape as RectangleShape : null
  );
</script>

<div class="config-section">
  <h3 class="section-title">Component Info</h3>

  <div class="info-group">
    <div class="info-item">
      <span class="info-label">Name</span>
      <span class="info-value">{component.name}</span>
    </div>

    <div class="info-item">
      <span class="info-label">Type</span>
      <span class="info-value">{component.type}</span>
    </div>

    {#if part}
      <div class="info-item">
        <span class="info-label">Part</span>
        <span class="info-value">{part}</span>
      </div>
    {/if}

    {#if cardComponent}
      <div class="info-item">
        <span class="info-label">Size</span>
        <span class="info-value">{cardComponent.size}</span>
      </div>
    {/if}
  </div>

  <h4 class="subsection-title">Dimensions</h4>
  <div class="info-group">
    <div class="info-item">
      <span class="info-label">Width</span>
      <span class="info-value">{component.dimensions.widthMm.toFixed(2)} mm</span>
    </div>

    <div class="info-item">
      <span class="info-label">Height</span>
      <span class="info-value">{component.dimensions.heightMm.toFixed(2)} mm</span>
    </div>

    <div class="info-item">
      <span class="info-label">Bleed</span>
      <span class="info-value">{component.dimensions.bleedMm.toFixed(2)} mm</span>
    </div>

    <div class="info-item">
      <span class="info-label">DPI</span>
      <span class="info-value">{component.dimensions.dpi}</span>
    </div>
  </div>

  {#if rectangleShape}
    <h4 class="subsection-title">Shape</h4>
    <div class="info-group">
      <div class="info-item">
        <span class="info-label">Type</span>
        <span class="info-value">Rectangle</span>
      </div>

      <div class="info-item">
        <span class="info-label">Border Radius</span>
        <span class="info-value">{rectangleShape.borderRadiusMm.toFixed(2)} mm</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .config-section {
    padding: 1rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #333;
  }

  .subsection-title {
    font-size: 0.813rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #555;
  }

  .info-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: #f9fafb;
    border-radius: 4px;
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .info-value {
    font-size: 0.813rem;
    color: #1a1a1a;
    font-weight: 500;
  }
</style>
