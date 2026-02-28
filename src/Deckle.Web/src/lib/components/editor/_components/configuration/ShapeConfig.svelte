<script lang="ts">
  import type { ShapeElement, ShapeType, VisibilityMode } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import ConfigSection from '../config-controls/ConfigSection.svelte';
  import TextField from '../config-controls/TextField.svelte';
  import LockCheckbox from '../config-controls/LockCheckbox.svelte';
  import VisibilityControl from '../config-controls/VisibilityControl.svelte';
  import PositionControls from '../config-controls/PositionControls.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import NumberField from '../config-controls/NumberField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';
  import Fields from '../config-controls/Fields.svelte';

  let { element }: { element: ShapeElement } = $props();

  function updateElement(updates: Partial<ShapeElement>) {
    templateStore.updateElement(element.id, updates);
  }

  function toStringValue(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }
</script>

<ConfigSection>
  <div class="label-lock-row">
    <div style:flex="1">
      <TextField
        label="Label"
        id="label"
        placeholder={element.label ?? element.shapeType.charAt(0).toUpperCase() + element.shapeType.slice(1)}
        value={element.label}
        oninput={(e) => updateElement({ label: e.currentTarget.value })}
        hideLabel={true}
      />
    </div>
    <LockCheckbox locked={element.locked} onchange={(locked) => updateElement({ locked })} />
  </div>

  <VisibilityControl
    mode={element.visibilityMode ?? 'show'}
    condition={element.visibilityCondition ?? ''}
    onModeChange={(mode: VisibilityMode) => updateElement({ visibilityMode: mode })}
    onConditionChange={(condition: string) => updateElement({ visibilityCondition: condition })}
  />

  {#if element.position === 'absolute'}
    <PositionControls x={element.x} y={element.y} onchange={(updates) => updateElement(updates)} />
  {/if}

  <SelectField
    label="Shape"
    id="shape-type"
    value={element.shapeType}
    options={[
      { value: 'circle', label: 'Circle' },
      { value: 'square', label: 'Square' },
      { value: 'hexagon', label: 'Hexagon' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'heart', label: 'Heart' }
    ]}
    onchange={(value) => updateElement({ shapeType: value as ShapeType })}
  />

  <Fields>
    <DimensionInput
      label="Width"
      id="shape-width"
      value={toStringValue(element.dimensions?.width)}
      onchange={(width) =>
        updateElement({
          dimensions: { ...element.dimensions, width }
        })}
    />
    <DimensionInput
      label="Height"
      id="shape-height"
      value={toStringValue(element.dimensions?.height)}
      onchange={(height) =>
        updateElement({
          dimensions: { ...element.dimensions, height }
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

  <ColorPicker
    label="Color"
    id="shape-color"
    value={element.background?.color || '#000000'}
    onchange={(color) =>
      updateElement({
        background: { ...element.background, color }
      })}
  />
</ConfigSection>

<style>
  .label-lock-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
