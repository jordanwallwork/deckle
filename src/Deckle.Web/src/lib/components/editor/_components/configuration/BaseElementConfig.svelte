<script lang="ts">
  import type { BaseElement } from "../../types";
  import ConfigSection from "../config-controls/ConfigSection.svelte";
  import VisibilityCheckbox from "../config-controls/VisibilityCheckbox.svelte";
  import LockCheckbox from "../config-controls/LockCheckbox.svelte";
  import PositionControls from "../config-controls/PositionControls.svelte";
  import NumberField from "../config-controls/NumberField.svelte";
  import DimensionInput from "../config-controls/DimensionInput.svelte";
  import BorderConfig from "../config-controls/BorderConfig.svelte";
  import Fields from "../config-controls/Fields.svelte";
  import TextField from "../config-controls/TextField.svelte";

  let {
    element,
    updateElement,
    children,
  }: {
    element: BaseElement;
    updateElement: (updates: Partial<BaseElement>) => void;
    children?: any;
  } = $props();
</script>

<ConfigSection>
  <div class="icon-toggle-group">
    <div style:flex="1">
      <TextField
        label="Label"
        id="label"
        placeholder={element.label ??
          element.type.charAt(0).toUpperCase() + element.type.slice(1)}
        value={element.label}
        oninput={(e) => updateElement({ label: e.currentTarget.value })}
        hideLabel={true}
      />
    </div>

    <VisibilityCheckbox
      visible={element.visible}
      onchange={(visible) => updateElement({ visible })}
    />

    <LockCheckbox
      locked={element.locked}
      onchange={(locked) => updateElement({ locked })}
    />
  </div>

  {#if element.position === "absolute"}
    <PositionControls
      x={element.x}
      y={element.y}
      onchange={(updates) => updateElement(updates)}
    />
  {/if}

  <!-- Slot for element-specific configuration -->
  {@render children?.()}

  <Fields>
    <DimensionInput
      label="Width"
      id="width"
      value={element.dimensions?.width?.toString()}
      onchange={(width) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            width,
          },
        })}
    />

    <DimensionInput
      label="Height"
      id="height"
      value={element.dimensions?.height?.toString()}
      onchange={(height) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            height,
          },
        })}
    />
  </Fields>

  <NumberField
    label="Rotation"
    id="rotation"
    value={element.rotation ?? 0}
    min={-360}
    max={360}
    step={1}
    unit="°"
    onchange={(rotation) => updateElement({ rotation })}
  />

  <BorderConfig
    border={element.border}
    onchange={(border) => updateElement({ border })}
  />
</ConfigSection>

<style>
  .icon-toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
