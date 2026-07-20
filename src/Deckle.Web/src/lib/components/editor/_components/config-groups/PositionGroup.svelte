<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import { fieldState } from '../../groupModel';
  import PropertyField from './PropertyField.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import NumberField from '../config-controls/NumberField.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const isAbsolute = $derived(el.position === 'absolute');

  const x = $derived(fieldState(elements, (e) => e.x));
  const y = $derived(fieldState(elements, (e) => e.y));
  const zIndex = $derived(fieldState(elements, (e) => e.zIndex));
  const rotation = $derived(fieldState(elements, (e) => e.rotation));
</script>

<div class="group-body">
  {#if isAbsolute}
    <div class="two-col">
      <PropertyField label="Left (X)" set={x.set} mixed={x.mixed} onclear={() => update({ x: undefined })}>
        <DimensionInput
          label="Left"
          id="pos-x"
          hideLabel
          value={x.value}
          placeholder={x.mixed ? 'Mixed' : '0'}
          onchange={(v) => update({ x: v }, `${el.id}:x`)}
        />
      </PropertyField>
      <PropertyField label="Top (Y)" set={y.set} mixed={y.mixed} onclear={() => update({ y: undefined })}>
        <DimensionInput
          label="Top"
          id="pos-y"
          hideLabel
          value={y.value}
          placeholder={y.mixed ? 'Mixed' : '0'}
          onchange={(v) => update({ y: v }, `${el.id}:y`)}
        />
      </PropertyField>
    </div>
  {/if}

  <PropertyField
    label="Z-index"
    set={zIndex.set}
    mixed={zIndex.mixed}
    onclear={() => update({ zIndex: undefined })}
  >
    <NumberField
      label="Z-index"
      id="pos-z"
      hideLabel
      step={1}
      value={zIndex.value ?? ''}
      placeholder={zIndex.mixed ? 'Mixed' : 'auto'}
      oninput={(e) => {
        const v = Number.parseInt(e.currentTarget.value, 10);
        update({ zIndex: Number.isNaN(v) ? undefined : v }, `${el.id}:zIndex`);
      }}
    />
  </PropertyField>

  <PropertyField
    label="Rotation"
    set={rotation.set}
    mixed={rotation.mixed}
    onclear={() => update({ rotation: undefined })}
  >
    <NumberField
      label="Rotation"
      id="pos-rotation"
      hideLabel
      unit="°"
      min={-360}
      max={360}
      step={1}
      value={rotation.value ?? ''}
      placeholder={rotation.mixed ? 'Mixed' : '0'}
      oninput={(e) => {
        const v = Number.parseFloat(e.currentTarget.value);
        update({ rotation: Number.isNaN(v) ? undefined : v }, `${el.id}:rotation`);
      }}
    />
  </PropertyField>
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
</style>
