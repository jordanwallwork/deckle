<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { VisibilityMode } from '../../types';
  import { fieldState } from '../../groupModel';
  import TextField from '../config-controls/TextField.svelte';
  import LockCheckbox from '../config-controls/LockCheckbox.svelte';
  import VisibilityControl from '../config-controls/VisibilityControl.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0]);
  const label = $derived(fieldState(elements, (e) => e.label));
  const locked = $derived(fieldState(elements, (e) => e.locked));
  const visMode = $derived(fieldState(elements, (e) => e.visibilityMode));
  const visCond = $derived(fieldState(elements, (e) => e.visibilityCondition));

  const defaultLabel = $derived(el.label ?? el.type.charAt(0).toUpperCase() + el.type.slice(1));
</script>

<div class="identity-group">
  <div class="label-lock-row">
    <div style:flex="1">
      <TextField
        label="Label"
        id="label"
        placeholder={defaultLabel}
        value={label.value ?? ''}
        oninput={(e) => update({ label: e.currentTarget.value || undefined }, `${el.id}:label`)}
        hideLabel={true}
      />
    </div>
    <LockCheckbox locked={locked.value ?? false} onchange={(v) => update({ locked: v || undefined })} />
  </div>

  <VisibilityControl
    mode={(visMode.value as VisibilityMode) ?? 'show'}
    condition={visCond.value ?? ''}
    onModeChange={(mode) => update({ visibilityMode: mode === 'show' ? undefined : mode })}
    onConditionChange={(condition) => update({ visibilityCondition: condition || undefined })}
  />
</div>

<style>
  .identity-group {
    display: flex;
    flex-direction: column;
  }

  .label-lock-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
