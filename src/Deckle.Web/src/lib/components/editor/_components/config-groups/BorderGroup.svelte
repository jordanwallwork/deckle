<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { Border, ContainerElement } from '../../types';
  import { fieldState } from '../../groupModel';
  import BorderConfig from '../config-controls/BorderConfig.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import PropertyField from './PropertyField.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const isContainer = $derived(el.type === 'container');
  const container = $derived(el as ContainerElement);

  const border = $derived(fieldState(elements, (e) => e.border));

  function isWidthZero(width: number | string | undefined): boolean {
    if (width === undefined) return true;
    if (typeof width === 'number') return width === 0;
    const parsed = parseFloat(width);
    return Number.isNaN(parsed) || parsed === 0;
  }

  const b = $derived(el.border);
  const hasSeparateSides = $derived(!!(b?.top || b?.right || b?.bottom || b?.left));
  const borderStyle = $derived(b?.style ?? 'solid');
  const isNonSolid = $derived(borderStyle !== 'solid');

  const hasVisibleBorder = $derived.by(() => {
    if (!hasSeparateSides) {
      if ((b?.style ?? 'solid') === 'none') return false;
      return !isWidthZero(b?.width);
    }
    return (['top', 'right', 'bottom', 'left'] as const).some((side) => {
      const s = b?.[side];
      if (!s) return false;
      if ((s.style ?? 'solid') === 'none') return false;
      return !isWidthZero(s.width);
    });
  });

  const innerRadiusValue = $derived(
    container.innerBorderRadius !== undefined && typeof container.innerBorderRadius !== 'object'
      ? container.innerBorderRadius
      : undefined
  );
  const innerRadiusDisabled = $derived(hasSeparateSides || isNonSolid);
  const innerRadiusMessage = $derived(
    hasSeparateSides
      ? 'Cannot set an inner radius when sides are styled separately'
      : isNonSolid
        ? `Cannot set an inner radius for ${borderStyle} borders`
        : undefined
  );
</script>

<div class="group-body">
  <PropertyField
    label="Border"
    set={border.set}
    mixed={border.mixed}
    onclear={() => update({ border: undefined })}
  >
    <BorderConfig
      border={el.border}
      onchange={(newBorder: Border) => update({ border: newBorder })}
      radiusLabel={isContainer ? 'Outer border radius' : 'Border radius'}
    />
  </PropertyField>

  {#if isContainer && hasVisibleBorder}
    <DimensionInput
      label="Inner border radius"
      id="inner-border-radius"
      value={innerRadiusValue}
      onchange={(v) => update({ innerBorderRadius: v } as Partial<ContainerElement>)}
      disabled={innerRadiusDisabled}
      disabledMessage={innerRadiusMessage}
    />
  {/if}
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }
</style>
