<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { ContainerElement, ShapeElement, Spacing } from '../../types';
  import SelectField from '../config-controls/SelectField.svelte';
  import FieldWrapper from '../config-controls/FieldWrapper.svelte';
  import AlignmentGrid from '../config-controls/AlignmentGrid.svelte';
  import GapControl from '../config-controls/GapControl.svelte';
  import PaddingControls from '../config-controls/PaddingControls.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const isContainer = $derived(el.type === 'container');
  const container = $derived(el as ContainerElement);
  const hasOverflow = $derived(el.type === 'container' || el.type === 'shape');

  const isFlex = $derived(isContainer && (container.display ?? 'flex') === 'flex');
  const isColumn = $derived(
    container.flexConfig?.direction === 'column' || container.flexConfig?.direction === 'column-reverse'
  );

  function patchFlex(updates: Partial<NonNullable<ContainerElement['flexConfig']>>) {
    update({ flexConfig: { ...container.flexConfig, ...updates } });
  }
</script>

<div class="group-body">
  {#if isContainer}
    <SelectField
      label="Display"
      id="layout-display"
      value={container.display ?? 'flex'}
      options={[
        { value: 'flex', label: 'Flex' },
        { value: 'block', label: 'Block' }
      ]}
      onchange={(v) => update({ display: v as 'flex' | 'block' })}
    />

    {#if isFlex}
      <SelectField
        label="Direction"
        id="layout-direction"
        value={container.flexConfig?.direction ?? 'column'}
        options={[
          { value: 'row', label: 'Left to Right' },
          { value: 'row-reverse', label: 'Right to Left' },
          { value: 'column', label: 'Top to Bottom' },
          { value: 'column-reverse', label: 'Bottom to Top' }
        ]}
        onchange={(v) => patchFlex({ direction: v as NonNullable<ContainerElement['flexConfig']>['direction'] })}
      />

      <SelectField
        label="Wrap"
        id="layout-wrap"
        value={container.flexConfig?.wrap ?? 'nowrap'}
        options={[
          { value: 'nowrap', label: 'No Wrap' },
          { value: 'wrap', label: 'Wrap' },
          { value: 'wrap-reverse', label: 'Wrap Reverse' }
        ]}
        onchange={(v) => patchFlex({ wrap: v as NonNullable<ContainerElement['flexConfig']>['wrap'] })}
      />

      <FieldWrapper label="Align children" htmlFor="layout-align">
        <AlignmentGrid
          {isColumn}
          justifyContent={container.flexConfig?.justifyContent ?? 'flex-start'}
          alignItems={container.flexConfig?.alignItems ?? 'flex-start'}
          onchange={(u) =>
            patchFlex({
              justifyContent: u.justifyContent as NonNullable<ContainerElement['flexConfig']>['justifyContent'],
              alignItems: u.alignItems as NonNullable<ContainerElement['flexConfig']>['alignItems']
            })}
        />
      </FieldWrapper>

      <FieldWrapper label="Gap" htmlFor="layout-gap">
        <GapControl value={container.flexConfig?.gap} onchange={(gap) => patchFlex({ gap })} />
      </FieldWrapper>
    {/if}
  {/if}

  <PaddingControls
    padding={el.padding as Spacing | undefined}
    onchange={(padding) => update({ padding })}
  />

  <PaddingControls
    label="Margin"
    idPrefix="margin"
    padding={el.margin as Spacing | undefined}
    onchange={(margin) => update({ margin })}
  />

  {#if hasOverflow}
    <SelectField
      label="Overflow"
      id="layout-overflow"
      value={(el as ShapeElement).overflow ?? 'visible'}
      options={[
        { value: 'visible', label: 'Visible' },
        { value: 'hidden', label: 'Hidden' },
        { value: 'scroll', label: 'Scroll' },
        { value: 'auto', label: 'Auto' }
      ]}
      onchange={(v) => update({ overflow: v as ShapeElement['overflow'] })}
    />
  {/if}
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }
</style>
