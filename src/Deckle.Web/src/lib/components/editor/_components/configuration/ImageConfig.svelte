<script lang="ts">
  import type { ImageElement } from "../../types";
  import { templateStore } from "$lib/stores/templateElements";
  import ConfigSection from "../config-controls/ConfigSection.svelte";
  import VisibilityCheckbox from "../config-controls/VisibilityCheckbox.svelte";
  import LockCheckbox from "../config-controls/LockCheckbox.svelte";
  import PositionControls from "../config-controls/PositionControls.svelte";
  import DimensionInput from "../config-controls/DimensionInput.svelte";
  import BorderConfig from "../config-controls/BorderConfig.svelte";
  import TextField from "../config-controls/TextField.svelte";
  import NumberField from "../config-controls/NumberField.svelte";
  import SelectField from "../config-controls/SelectField.svelte";
  import Fields from "../config-controls/Fields.svelte";

  let { element }: { element: ImageElement } = $props();

  function updateElement(updates: Partial<ImageElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<ConfigSection>
  <div class="icon-toggle-group">
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

  <TextField
    label="Image URL"
    id="image-url"
    placeholder="https://example.com/image.jpg"
    value={element.imageId}
    oninput={(e) => updateElement({ imageId: e.currentTarget.value })}
  />

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

  <Fields>
    <SelectField
      label="Object Fit"
      id="object-fit"
      value={element.objectFit || "cover"}
      options={[
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
        { value: "none", label: "None" },
        { value: "scale-down", label: "Scale Down" },
      ]}
      onchange={(value) => updateElement({ objectFit: value as any })}
    />

    <TextField
      label="Object Position"
      id="object-position"
      placeholder="center, 50% 50%, top left"
      value={element.objectPosition ?? "center"}
      oninput={(e) => updateElement({ objectPosition: e.currentTarget.value })}
    />
  </Fields>

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
