<script lang="ts">
  import type { TextElement } from "../types";
  import { templateStore } from "$lib/stores/templateElements";
  import ConfigSection from "./ConfigSection.svelte";
  import VisibilityCheckbox from "./VisibilityCheckbox.svelte";
  import LockCheckbox from "./LockCheckbox.svelte";
  import PositionControls from "./PositionControls.svelte";
  import DimensionInput from "./DimensionInput.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import PaddingControls from "./PaddingControls.svelte";
  import BorderConfig from "./BorderConfig.svelte";
  import TextAreaField from "./TextAreaField.svelte";
  import TextField from "./TextField.svelte";
  import NumberField from "./NumberField.svelte";
  import SelectField from "./SelectField.svelte";
  import Fields from "./Fields.svelte";

  let { element }: { element: TextElement } = $props();

  function updateElement(updates: Partial<TextElement>) {
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

  <label class="markdown-toggle">
    <input
      type="checkbox"
      checked={element.markdown ?? false}
      onchange={(e) => updateElement({ markdown: e.currentTarget.checked })}
    />
    <span>Enable Markdown</span>
  </label>

  <TextAreaField
    label="Content"
    id="content"
    rows={3}
    value={element.content}
    oninput={(e) => updateElement({ content: e.currentTarget.value })}
  />

  <Fields>
    <NumberField
      label="Font Size (px)"
      id="font-size"
      value={element.fontSize || 16}
      oninput={(e) =>
        updateElement({ fontSize: parseInt(e.currentTarget.value) || 16 })}
    />

    <SelectField
      label="Font Weight"
      id="font-weight"
      value={element.fontWeight?.toString() || "normal"}
      options={[
        { value: "normal", label: "Normal" },
        { value: "bold", label: "Bold" },
        { value: "300", label: "Light (300)" },
        { value: "400", label: "Regular (400)" },
        { value: "500", label: "Medium (500)" },
        { value: "600", label: "Semi-Bold (600)" },
        { value: "700", label: "Bold (700)" },
        { value: "800", label: "Extra-Bold (800)" },
      ]}
      onchange={(val) => {
        updateElement({
          fontWeight: isNaN(Number(val)) ? (val as any) : parseInt(val),
        });
      }}
    />

    <SelectField
      label="Text Align"
      id="text-align"
      value={element.textAlign || "left"}
      options={[
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "justify", label: "Justify" },
      ]}
      onchange={(value) => updateElement({ textAlign: value as any })}
    />
  </Fields>

  <Fields>
    <ColorPicker
      label="Text Color"
      id="color"
      value={element.color || "#000000"}
      onchange={(color) => updateElement({ color })}
    />

    <ColorPicker
      label="Background Color"
      id="bg-color"
      value={element.backgroundColor || "#ffffff"}
      onchange={(backgroundColor) => updateElement({ backgroundColor })}
    />
  </Fields>

  <Fields>
    <TextField
      label="Line Height"
      id="line-height"
      placeholder="1.5 or 24px"
      value={element.lineHeight?.toString() ?? ""}
      oninput={(e) => {
        const val = e.currentTarget.value;
        updateElement({
          lineHeight: isNaN(Number(val)) ? val : parseFloat(val),
        });
      }}
    />

    <NumberField
      label="Letter Spacing (px)"
      id="letter-spacing"
      step="0.1"
      value={element.letterSpacing ?? ""}
      oninput={(e) =>
        updateElement({
          letterSpacing: parseFloat(e.currentTarget.value) || undefined,
        })}
    />
  </Fields>

  <Fields>
    <SelectField
      label="Text Decoration"
      id="text-decoration"
      value={element.textDecoration || "none"}
      options={[
        { value: "none", label: "None" },
        { value: "underline", label: "Underline" },
        { value: "overline", label: "Overline" },
        { value: "line-through", label: "Line Through" },
      ]}
      onchange={(value) => updateElement({ textDecoration: value as any })}
    />

    <SelectField
      label="Text Transform"
      id="text-transform"
      value={element.textTransform || "none"}
      options={[
        { value: "none", label: "None" },
        { value: "uppercase", label: "Uppercase" },
        { value: "lowercase", label: "Lowercase" },
        { value: "capitalize", label: "Capitalize" },
      ]}
      onchange={(value) => updateElement({ textTransform: value as any })}
    />
  </Fields>

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

  .markdown-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .markdown-toggle input[type="checkbox"] {
    cursor: pointer;
  }

  .markdown-toggle span {
    user-select: none;
  }
</style>
