<script lang="ts">
  import type { BaseElement, ContainerElement } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import BaseElementConfig from './BaseElementConfig.svelte';
  import FieldWrapper from '../config-controls/FieldWrapper.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';
  import PaddingControls from '../config-controls/PaddingControls.svelte';
  import Fields from '../config-controls/Fields.svelte';
  import AlignmentGrid from '../config-controls/AlignmentGrid.svelte';
  import GapControl from '../config-controls/GapControl.svelte';

  let { element }: { element: ContainerElement } = $props();

  function updateElement(updates: Partial<ContainerElement>) {
    templateStore.updateElement(element.id, updates);
  }

  // Determine if flex direction is column-based
  const isColumn = $derived(
    element.flexConfig?.direction === 'column' || element.flexConfig?.direction === 'column-reverse'
  );
</script>

<BaseElementConfig
  {element}
  updateElement={updateElement as (updates: Partial<BaseElement>) => void}
>
  <SelectField
    label="Display"
    id="display"
    value={element.display || 'flex'}
    options={[
      { value: 'flex', label: 'Flex' },
      { value: 'block', label: 'Block' }
    ]}
    onchange={(value) => updateElement({ display: value as 'flex' | 'block' })}
  />

  {#if element.display === 'flex'}
    <Fields>
      <SelectField
        label="Direction"
        id="flex-direction"
        value={element.flexConfig?.direction || 'row'}
        options={[
          { value: 'row', label: 'Left to Right' },
          { value: 'row-reverse', label: 'Right to Left' },
          { value: 'column', label: 'Top to Bottom' },
          { value: 'column-reverse', label: 'Bottom to Top' }
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              direction: value as any
            }
          })}
      />

      <SelectField
        label="Flex wrap"
        id="flex-wrap"
        value={element.flexConfig?.wrap || 'nowrap'}
        options={[
          { value: 'nowrap', label: 'No Wrap' },
          { value: 'wrap', label: 'Wrap' },
          { value: 'wrap-reverse', label: 'Wrap Reverse' }
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              wrap: value as any
            }
          })}
      />
    </Fields>

    <FieldWrapper label="Align children" htmlFor="align-children">
      <AlignmentGrid
        {isColumn}
        justifyContent={element.flexConfig?.justifyContent || 'flex-start'}
        alignItems={element.flexConfig?.alignItems || 'flex-start'}
        onchange={(updates) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              justifyContent: updates.justifyContent as any,
              alignItems: updates.alignItems as any
            }
          })}
      />
    </FieldWrapper>

    <FieldWrapper label="Gap" htmlFor="gap">
      <GapControl
        value={element.flexConfig?.gap || 0}
        onchange={(gap) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              gap
            }
          })}
      />
    </FieldWrapper>
  {/if}

  <ColorPicker
    label="Background Color"
    id="bg-color"
    value={element.background?.color || '#ffffff'}
    onchange={(color) =>
      updateElement({
        background: {
          ...element.background,
          color
        }
      })}
  />

  <PaddingControls padding={element.padding} onchange={(padding) => updateElement({ padding })} />
</BaseElementConfig>
