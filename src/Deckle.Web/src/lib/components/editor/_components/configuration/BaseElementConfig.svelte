<script lang="ts">
  import type { BaseElement, ContainerElement, VisibilityMode } from '../../types';
  import ConfigSection from '../config-controls/ConfigSection.svelte';
  import VisibilityControl from '../config-controls/VisibilityControl.svelte';
  import LockCheckbox from '../config-controls/LockCheckbox.svelte';
  import PositionControls from '../config-controls/PositionControls.svelte';
  import NumberField from '../config-controls/NumberField.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import BorderConfig from '../config-controls/BorderConfig.svelte';
  import Fields from '../config-controls/Fields.svelte';
  import TextField from '../config-controls/TextField.svelte';

  let {
    element,
    updateElement,
    children
  }: {
    element: BaseElement;
    updateElement: (updates: Partial<BaseElement>) => void;
    children?: any;
  } = $props();

  // Helper to convert dimension value to string for DimensionInput
  function toStringValue(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }

  // For container elements, get inner border radius value
  const containerElement = $derived(
    element.type === 'container' ? (element as ContainerElement) : undefined
  );
  const innerBorderRadiusValue = $derived(
    containerElement?.innerBorderRadius !== undefined &&
      typeof containerElement.innerBorderRadius !== 'object'
      ? toStringValue(containerElement.innerBorderRadius)
      : undefined
  );

  // Helper to check if a width value is effectively zero
  function isWidthZero(width: number | string | undefined): boolean {
    if (width === undefined) return true;
    if (typeof width === 'number') return width === 0;
    const parsed = parseFloat(width);
    return isNaN(parsed) || parsed === 0;
  }

  // Check if inner border radius should be shown/disabled
  const hasSeparateBorderSides = $derived(
    !!(element.border?.top || element.border?.right || element.border?.bottom || element.border?.left)
  );
  const borderStyle = $derived(element.border?.style ?? 'solid');
  const isNonSolidBorder = $derived(borderStyle !== 'solid');

  // Determine if there's any visible border (same logic as BorderConfig)
  const hasVisibleBorder = $derived(() => {
    if (!hasSeparateBorderSides) {
      // All sides mode: check if style is not "none" and width > 0
      const style = element.border?.style ?? 'solid';
      if (style === 'none') return false;
      if (isWidthZero(element.border?.width)) return false;
      return true;
    } else {
      // Separate sides mode: check if any side has visible border
      const sides = ['top', 'right', 'bottom', 'left'] as const;
      return sides.some((side) => {
        const sideProps = element.border?.[side];
        if (!sideProps) return false;
        const style = sideProps.style ?? 'solid';
        if (style === 'none') return false;
        if (isWidthZero(sideProps.width)) return false;
        return true;
      });
    }
  });

  // Inner radius is disabled (but shown) when there's a visible border but we can't use inner radius
  const innerRadiusDisabled = $derived(hasSeparateBorderSides || isNonSolidBorder);
  const innerRadiusDisabledMessage = $derived(() => {
    if (hasSeparateBorderSides) {
      return 'Cannot set an inner radius when sides are styled separately';
    }
    if (isNonSolidBorder) {
      return `Cannot set an inner radius for ${borderStyle} borders`;
    }
    return undefined;
  });
</script>

<ConfigSection>
  <div class="icon-toggle-group">
    <div style:flex="1">
      <TextField
        label="Label"
        id="label"
        placeholder={element.label ?? element.type.charAt(0).toUpperCase() + element.type.slice(1)}
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

  <!-- Slot for element-specific configuration -->
  {@render children?.()}

  <Fields>
    <DimensionInput
      label="Width"
      id="width"
      value={element.dimensions?.width?.toString()}
      onchange={(width) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            width
          }
        })}
    />

    <DimensionInput
      label="Height"
      id="height"
      value={element.dimensions?.height?.toString()}
      onchange={(height) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            height
          }
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

  <BorderConfig
    border={element.border}
    onchange={(border) => updateElement({ border })}
    radiusLabel={element.type === 'container' ? 'Outer border radius' : 'Border radius'}
  />

  {#if element.type === 'container' && hasVisibleBorder()}
    <DimensionInput
      label="Inner border radius"
      id="inner-border-radius"
      value={innerBorderRadiusValue}
      onchange={(value) => updateElement({ innerBorderRadius: value } as Partial<BaseElement>)}
      disabled={innerRadiusDisabled}
      disabledMessage={innerRadiusDisabledMessage()}
    />
  {/if}
</ConfigSection>

<style>
  .icon-toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
