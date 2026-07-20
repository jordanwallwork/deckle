<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import type { ShapeElement, ShapeType } from '../../../types';
  import SelectField from '../../config-controls/SelectField.svelte';

  let { elements, update }: GroupControlProps = $props();
  const el = $derived(elements[0] as ShapeElement);
</script>

<SelectField
  label="Shape"
  id="shape-type"
  value={el.shapeType}
  options={[
    { value: 'circle', label: 'Circle' },
    { value: 'hexagon', label: 'Hexagon' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'heart', label: 'Heart' }
  ]}
  onchange={(v) => update({ shapeType: v as ShapeType })}
/>
