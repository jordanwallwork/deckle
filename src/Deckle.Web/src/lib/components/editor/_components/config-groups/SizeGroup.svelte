<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { Dimensions } from '../../types';
  import { fieldState } from '../../groupModel';
  import { getEffectiveDefault } from '../../effectiveDefaults';
  import PropertyField from './PropertyField.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0]);

  function dimUpdate(key: keyof Dimensions, value: number | string | undefined, session = false) {
    const current = (el.dimensions ?? {}) as Dimensions;
    update({ dimensions: { ...current, [key]: value } }, session ? `${el.id}:size:${key}` : undefined);
  }

  const width = $derived(fieldState(elements, (e) => e.dimensions?.width));
  const height = $derived(fieldState(elements, (e) => e.dimensions?.height));
  const minWidth = $derived(fieldState(elements, (e) => e.dimensions?.minWidth));
  const maxWidth = $derived(fieldState(elements, (e) => e.dimensions?.maxWidth));
  const minHeight = $derived(fieldState(elements, (e) => e.dimensions?.minHeight));
  const maxHeight = $derived(fieldState(elements, (e) => e.dimensions?.maxHeight));

  const wDefault = $derived(String(getEffectiveDefault(el.type, 'width') ?? 'auto'));
  const hDefault = $derived(String(getEffectiveDefault(el.type, 'height') ?? 'auto'));

  const fields = $derived([
    { key: 'width' as const, label: 'Width', state: width, ph: wDefault },
    { key: 'height' as const, label: 'Height', state: height, ph: hDefault },
    { key: 'minWidth' as const, label: 'Min width', state: minWidth, ph: 'none' },
    { key: 'maxWidth' as const, label: 'Max width', state: maxWidth, ph: 'none' },
    { key: 'minHeight' as const, label: 'Min height', state: minHeight, ph: 'none' },
    { key: 'maxHeight' as const, label: 'Max height', state: maxHeight, ph: 'none' }
  ]);
</script>

<div class="two-col">
  {#each fields as f (f.key)}
    <PropertyField
      label={f.label}
      set={f.state.set}
      mixed={f.state.mixed}
      onclear={() => dimUpdate(f.key, undefined)}
    >
      <DimensionInput
        label={f.label}
        id={`size-${f.key}`}
        hideLabel
        value={f.state.value}
        placeholder={f.state.mixed ? 'Mixed' : f.ph}
        onchange={(v) => dimUpdate(f.key, v, true)}
      />
    </PropertyField>
  {/each}
</div>

<style>
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
</style>
