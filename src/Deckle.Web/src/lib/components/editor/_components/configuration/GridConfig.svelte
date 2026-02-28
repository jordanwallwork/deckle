<script lang="ts">
  import type { BaseElement, GridElement, GridVariant } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import BaseElementConfig from './BaseElementConfig.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import NumberField from '../config-controls/NumberField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';

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
    value={element.background?.color ?? '#cccccc'}
    onchange={(color) => updateElement({ background: { ...element.background, color } })}
  />
</BaseElementConfig>
