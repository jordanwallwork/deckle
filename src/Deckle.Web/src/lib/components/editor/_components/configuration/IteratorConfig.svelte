<script lang="ts">
  import type { IteratorElement, VisibilityMode } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import ConfigSection from '../config-controls/ConfigSection.svelte';
  import TextField from '../config-controls/TextField.svelte';
  import Fields from '../config-controls/Fields.svelte';
  import LockCheckbox from '../config-controls/LockCheckbox.svelte';
  import VisibilityControl from '../config-controls/VisibilityControl.svelte';

  let { element }: { element: IteratorElement } = $props();

  function updateElement(updates: Partial<IteratorElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<ConfigSection>
  <div class="icon-toggle-group">
    <div style:flex="1">
      <TextField
        label="Label"
        id="label"
        placeholder={element.label ?? 'Iterator'}
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

  <TextField
    label="Variable Name"
    id="iterator-name"
    value={element.iteratorName}
    placeholder="i"
    oninput={(e) => updateElement({ iteratorName: e.currentTarget.value })}
  />

  <Fields>
    <TextField
      label="From"
      id="iterator-from"
      value={element.fromExpression}
      placeholder="1"
      oninput={(e) => updateElement({ fromExpression: e.currentTarget.value })}
    />

    <TextField
      label="To"
      id="iterator-to"
      value={element.toExpression}
      placeholder="3"
      oninput={(e) => updateElement({ toExpression: e.currentTarget.value })}
    />
  </Fields>
</ConfigSection>

<style>
  .icon-toggle-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
