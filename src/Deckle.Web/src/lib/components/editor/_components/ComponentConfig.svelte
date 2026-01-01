<script lang="ts">
  import type {
    EditableComponent,
    CardComponent,
    RectangleShape,
  } from "$lib/types";
  import ConfigSection from "./ConfigSection.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import { templateStore } from "$lib/stores/templateElements";
  import type { ContainerElement } from "$lib/components/editor/types";

  let { component, part }: { component: EditableComponent; part?: string } =
    $props();

  // Check if this is a card component with shape info
  let cardComponent = $derived(
    "shape" in component ? (component as CardComponent) : null
  );
  let rectangleShape = $derived(
    cardComponent?.shape?.type === "rectangle"
      ? (cardComponent.shape as RectangleShape)
      : null
  );

  // Get the root element from the template store for styling
  const rootElement = $derived($templateStore.root as ContainerElement);
</script>

<ConfigSection>
  <ColorPicker
    label="Background Color"
    id="component-bg-color"
    value={rootElement.background?.color || "#ffffff"}
    onchange={(color) =>
      templateStore.updateElement("root", {
        background: {
          ...rootElement.background,
          color,
        },
      })}
  />
  <ColorPicker
    label="Bleed Area Color"
    id="bleed-area-color"
    value={rootElement.bleedAreaColor || "#ff0000"}
    onchange={(color) =>
      templateStore.updateElement("root", {
        bleedAreaColor: color,
      })}
  />
  <ColorPicker
    label="Safe Area Color"
    id="safe-area-color"
    value={rootElement.safeAreaColor || "#00ff00"}
    onchange={(color) =>
      templateStore.updateElement("root", {
        safeAreaColor: color,
      })}
  />

  <div class="info-group">
    <div class="info-item">
      <span class="info-label">Type</span>
      <span class="info-value">{component.type}</span>
    </div>

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
      <span class="info-value"
        >{component.dimensions.widthMm.toFixed(2)} mm</span
      >
    </div>

    <div class="info-item">
      <span class="info-label">Height</span>
      <span class="info-value"
        >{component.dimensions.heightMm.toFixed(2)} mm</span
      >
    </div>

    <div class="info-item">
      <span class="info-label">Bleed</span>
      <span class="info-value"
        >{component.dimensions.bleedMm.toFixed(2)} mm</span
      >
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
        <span class="info-value"
          >{rectangleShape.borderRadiusMm.toFixed(2)} mm</span
        >
      </div>
    </div>
  {/if}
</ConfigSection>

<style>
  .subsection-title {
    font-size: 0.813rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #555;
  }

  .info-group {
    display: flex;
    flex-direction: column;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid transparent;
  }
  .info-item:hover {
    border-color: rgba(0, 0, 0, 0.05);
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
