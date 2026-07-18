<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { Background } from '../../types';
  import { fieldState } from '../../groupModel';
  import PropertyField from './PropertyField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';
  import BackgroundImageControl from './BackgroundImageControl.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0] as { background?: Background });
  const bg = $derived(el.background ?? {});

  const color = $derived(fieldState(elements, (e) => (e as { background?: Background }).background?.color));
  const image = $derived(fieldState(elements, (e) => (e as { background?: Background }).background?.image));

  /** Writes a new background, collapsing an empty object back to `undefined`. */
  function setBackground(next: Background) {
    const empty = next.color === undefined && next.image === undefined;
    update({ background: empty ? undefined : next });
  }
</script>

<div class="group-body">
  <PropertyField
    label="Background color"
    set={color.set}
    mixed={color.mixed}
    onclear={() => setBackground({ ...bg, color: undefined })}
  >
    <ColorPicker
      label="Background color"
      id="bg-color"
      hideLabel
      value={color.value ?? ''}
      placeholder={color.mixed ? 'Mixed' : 'None (transparent)'}
      onchange={(c) => setBackground({ ...bg, color: c || undefined })}
    />
  </PropertyField>

  <PropertyField
    label="Background image"
    set={image.set}
    mixed={image.mixed}
    onclear={() => setBackground({ ...bg, image: undefined })}
  >
    <BackgroundImageControl
      image={image.value}
      onchange={(img) => setBackground({ ...bg, image: img })}
    />
  </PropertyField>
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }
</style>
