<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { Shadow, ContainerElement } from '../../types';
  import { fieldState } from '../../groupModel';
  import PropertyField from './PropertyField.svelte';
  import OpacitySlider from './OpacitySlider.svelte';
  import ShadowListEditor from './ShadowListEditor.svelte';

  let { elements, update, seal }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  // Shadow lives on container / image / shape only (schema).
  const supportsShadow = $derived(
    el.type === 'container' || el.type === 'image' || el.type === 'shape'
  );

  const opacity = $derived(fieldState(elements, (e) => e.opacity));
  const shadowRaw = $derived((el as ContainerElement).shadow);
  const shadowList = $derived(
    shadowRaw ? (Array.isArray(shadowRaw) ? shadowRaw : [shadowRaw]) : ([] as Shadow[])
  );
  const shadowSet = $derived(shadowList.length > 0);

  function setShadows(list: Shadow[]) {
    update({ shadow: list.length ? list : undefined } as Partial<ContainerElement>);
  }
</script>

<div class="group-body">
  <PropertyField
    label="Opacity"
    set={opacity.set}
    mixed={opacity.mixed}
    onclear={() => update({ opacity: undefined })}
  >
    <OpacitySlider
      value={opacity.value}
      placeholder={1}
      sessionKey={`${el.id}:opacity`}
      onchange={(v, key) => update({ opacity: v }, key)}
      onseal={seal}
    />
  </PropertyField>

  {#if supportsShadow}
    <PropertyField
      label="Shadows"
      set={shadowSet}
      onclear={() => setShadows([])}
    >
      <ShadowListEditor shadows={shadowList} onchange={setShadows} />
    </PropertyField>
  {/if}
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }
</style>
