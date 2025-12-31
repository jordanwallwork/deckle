<script lang="ts">
  import type { ContainerElement } from "../types";
  import { templateStore } from "$lib/stores/templateElements";
  import ConfigSection from "./ConfigSection.svelte";
  import FieldWrapper from "./FieldWrapper.svelte";
  import SelectField from "./SelectField.svelte";
  import VisibilityCheckbox from "./VisibilityCheckbox.svelte";
  import LockCheckbox from "./LockCheckbox.svelte";
  import PositionControls from "./PositionControls.svelte";
  import DimensionInput from "./DimensionInput.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import PaddingControls from "./PaddingControls.svelte";
  import BorderConfig from "./BorderConfig.svelte";
  import Fields from "./Fields.svelte";
  import NumberField from "./NumberField.svelte";
  import AlignmentGrid from "./AlignmentGrid.svelte";
  import GapControl from "./GapControl.svelte";

  let { element }: { element: ContainerElement } = $props();

  function updateElement(updates: Partial<ContainerElement>) {
    templateStore.updateElement(element.id, updates);
  }

  // Determine if flex direction is column-based
  const isColumn = $derived(
    element.flexConfig?.direction === "column" ||
      element.flexConfig?.direction === "column-reverse"
  );
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

  <SelectField
    label="Display"
    id="display"
    value={element.display || "flex"}
    options={[
      { value: "flex", label: "Flex" },
      { value: "block", label: "Block" },
    ]}
    onchange={(value) => updateElement({ display: value as "flex" | "block" })}
  />

  {#if element.display === "flex"}
    <Fields>
      <SelectField
        label="Direction"
        id="flex-direction"
        value={element.flexConfig?.direction || "row"}
        options={[
          { value: "row", label: "Left to Right" },
          { value: "row-reverse", label: "Right to Left" },
          { value: "column", label: "Top to Bottom" },
          { value: "column-reverse", label: "Bottom to Top" },
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              direction: value as any,
            },
          })}
      />

      <SelectField
        label="Flex wrap"
        id="flex-wrap"
        value={element.flexConfig?.wrap || "nowrap"}
        options={[
          { value: "nowrap", label: "No Wrap" },
          { value: "wrap", label: "Wrap" },
          { value: "wrap-reverse", label: "Wrap Reverse" },
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              wrap: value as any,
            },
          })}
      />
    </Fields>

    <FieldWrapper label="Align children" htmlFor="align-children">
      <AlignmentGrid
        {isColumn}
        justifyContent={element.flexConfig?.justifyContent || "flex-start"}
        alignItems={element.flexConfig?.alignItems || "flex-start"}
        onchange={(updates) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              justifyContent: updates.justifyContent as any,
              alignItems: updates.alignItems as any,
            },
          })}
      />
    </FieldWrapper>

    <FieldWrapper label="Gap" htmlFor="gap">
      <GapControl
        value={element.flexConfig?.gap || 0}
        onchange={(gap) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              gap,
            },
          })}
      />
    </FieldWrapper>
  {/if}

  <ColorPicker
    label="Background Color"
    id="bg-color"
    value={element.background?.color || "#ffffff"}
    onchange={(color) =>
      updateElement({
        background: {
          ...element.background,
          color,
        },
      })}
  />

  <PaddingControls
    padding={element.padding}
    onchange={(padding) => updateElement({ padding })}
  />

  <BorderConfig
    border={element.border}
    onchange={(border) => updateElement({ border })}
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
</ConfigSection>

<style>
  .icon-toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
