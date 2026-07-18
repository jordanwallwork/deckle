<script lang="ts">
  import type { BaseElement, GridElement, GridVariant } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import BaseElementConfig from './BaseElementConfig.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import NumberField from '../config-controls/NumberField.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';
  import Fields from '../config-controls/Fields.svelte';

  let { element }: { element: GridElement } = $props();

  function updateElement(updates: Partial<GridElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<BaseElementConfig
  {element}
  updateElement={updateElement as (updates: Partial<BaseElement>) => void}
>
  <SelectField
    label="Variant"
    id="grid-variant"
    value={element.variant}
    options={[
      { value: 'checkerboard', label: 'Checkerboard' },
      { value: 'offset-checkerboard', label: 'Offset Checkerboard' },
      { value: 'hexagonal', label: 'Hexagonal' }
    ]}
    onchange={(value) => updateElement({ variant: value as GridVariant })}
  />

  <NumberField
    label="Cell size"
    id="grid-item-size"
    value={element.itemSize}
    min={4}
    max={500}
    step={1}
    unit="px"
    onchange={(itemSize) => updateElement({ itemSize })}
  />

  <ColorPicker
    label="Cell color"
    id="grid-cell-color"
    value={element.cellBackground?.color ?? '#cccccc'}
    onchange={(color) => updateElement({ cellBackground: { ...element.cellBackground, color } })}
  />

  <Fields>
    <DimensionInput
      label="Cell border"
      id="cell-border-width"
      value={element.cellBorder?.width}
      onchange={(width) =>
        updateElement({ cellBorder: { ...element.cellBorder, width, style: element.cellBorder?.style ?? 'solid' } })}
    />
    <ColorPicker
      label="Cell border color"
      id="cell-border-color"
      value={element.cellBorder?.color ?? '#000000'}
      onchange={(color) =>
        updateElement({ cellBorder: { ...element.cellBorder, color, style: element.cellBorder?.style ?? 'solid' } })}
    />
  </Fields>
</BaseElementConfig>
