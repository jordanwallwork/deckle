<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import type { GridElement, GridVariant } from '../../../types';
  import SelectField from '../../config-controls/SelectField.svelte';
  import NumberField from '../../config-controls/NumberField.svelte';
  import DimensionInput from '../../config-controls/DimensionInput.svelte';
  import ColorPicker from '../../config-controls/ColorPicker.svelte';
  import Fields from '../../config-controls/Fields.svelte';

  let { elements, update }: GroupControlProps = $props();
  const el = $derived(elements[0] as GridElement);
</script>

<div class="grid-fields">
  <SelectField
    label="Variant"
    id="grid-variant"
    value={el.variant}
    options={[
      { value: 'checkerboard', label: 'Checkerboard' },
      { value: 'offset-checkerboard', label: 'Offset Checkerboard' },
      { value: 'hexagonal', label: 'Hexagonal' }
    ]}
    onchange={(v) => update({ variant: v as GridVariant })}
  />

  <NumberField
    label="Cell size"
    id="grid-item-size"
    value={el.itemSize}
    min={4}
    max={500}
    step={1}
    unit="px"
    onchange={(itemSize) => update({ itemSize })}
  />

  <ColorPicker
    label="Cell color"
    id="grid-cell-color"
    value={el.cellBackground?.color ?? ''}
    placeholder="#cccccc"
    onchange={(color) => update({ cellBackground: { ...el.cellBackground, color: color || undefined } })}
  />

  <Fields>
    <DimensionInput
      label="Cell border"
      id="cell-border-width"
      value={el.cellBorder?.width}
      onchange={(width) =>
        update({ cellBorder: { ...el.cellBorder, width, style: el.cellBorder?.style ?? 'solid' } })}
    />
    <ColorPicker
      label="Cell border color"
      id="cell-border-color"
      value={el.cellBorder?.color ?? ''}
      placeholder="#000000"
      onchange={(color) =>
        update({ cellBorder: { ...el.cellBorder, color: color || undefined, style: el.cellBorder?.style ?? 'solid' } })}
    />
  </Fields>
</div>

<style>
  .grid-fields {
    display: flex;
    flex-direction: column;
  }
</style>
